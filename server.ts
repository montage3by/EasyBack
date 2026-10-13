import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Enable permissive CORS for all shared and external previews
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

interface PlayerData {
  id: string; // Guaranteed unique per connection
  username: string;
  avatarUrl: string;
  color: string;
  country?: string;
  rating?: number;
  score: number;
  isReady: boolean;
  ws: WebSocket;
}

interface GameRoom {
  id: string;
  code: string;
  players: Map<string, PlayerData>; // id -> PlayerData
  status: 'waiting' | 'ready' | 'countdown' | 'waiting_signal' | 'signal_active' | 'round_result' | 'finished';
  roundNumber: number;
  scores: Record<string, number>; // playerId -> score
  signalTimestamp: number;
  randomDelayTimer?: NodeJS.Timeout;
  countdownTimer?: NodeJS.Timeout;
  nextRoundTimer?: NodeJS.Timeout;
  hasTappedThisRound: Set<string>;
}

// Global active rooms and queue
const rooms = new Map<string, GameRoom>(); // roomId -> GameRoom
const roomByCode = new Map<string, string>(); // code -> roomId
const matchmakingQueue: { playerId: string; player: PlayerData }[] = [];
const clientMap = new Map<WebSocket, { id: string; currentRoomId?: string }>();

// Broadcast online counts to all connected clients
function broadcastOnlineStats() {
  const payload = JSON.stringify({
    type: 'stats:update',
    onlinePlayers: Math.max(1, clientMap.size),
    waitingInQueue: matchmakingQueue.length,
    activeMatches: rooms.size,
  });
  for (const client of clientMap.keys()) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Broadcast to room helper
function broadcastToRoom(room: GameRoom, message: object) {
  const payload = JSON.stringify(message);
  for (const player of room.players.values()) {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(payload);
    }
  }
}

// Clear all active timers in a room
function clearRoomTimers(room: GameRoom) {
  if (room.randomDelayTimer) clearTimeout(room.randomDelayTimer);
  if (room.countdownTimer) clearInterval(room.countdownTimer);
  if (room.nextRoundTimer) clearTimeout(room.nextRoundTimer);
  room.randomDelayTimer = undefined;
  room.countdownTimer = undefined;
  room.nextRoundTimer = undefined;
}

// Start a server-authoritative round
function startServerRound(room: GameRoom) {
  clearRoomTimers(room);
  room.hasTappedThisRound.clear();
  room.status = 'countdown';

  let currentCount = 3;
  broadcastToRoom(room, {
    type: 'round:countdown',
    count: currentCount,
    roundNumber: room.roundNumber,
  });

  room.countdownTimer = setInterval(() => {
    currentCount -= 1;
    if (currentCount > 0) {
      broadcastToRoom(room, {
        type: 'round:countdown',
        count: currentCount,
        roundNumber: room.roundNumber,
      });
    } else {
      if (room.countdownTimer) clearInterval(room.countdownTimer);
      room.countdownTimer = undefined;

      // Enter server-authoritative random delay window (500ms to 10000ms = 0.5s to 10.0s)
      room.status = 'waiting_signal';
      const randomDelay = Math.floor(Math.random() * 9500) + 500;

      broadcastToRoom(room, {
        type: 'round:waiting_signal',
        roundNumber: room.roundNumber,
      });

      room.randomDelayTimer = setTimeout(() => {
        if (room.status !== 'waiting_signal') return;

        room.status = 'signal_active';
        room.signalTimestamp = Date.now();

        broadcastToRoom(room, {
          type: 'round:signal',
          signalTimestamp: room.signalTimestamp,
          roundNumber: room.roundNumber,
        });
      }, randomDelay);
    }
  }, 1000);
}

// Handle False Start (pressing before signal)
function handleFalseStart(room: GameRoom, offenderId: string) {
  clearRoomTimers(room);
  room.status = 'round_result';

  // Zero-out offender's score
  room.scores[offenderId] = 0;
  const offender = room.players.get(offenderId);

  broadcastToRoom(room, {
    type: 'round:false_start',
    offenderId,
    offenderName: offender?.username || 'Player',
    scores: room.scores,
  });

  // Next round after brief punishment screen
  room.nextRoundTimer = setTimeout(() => {
    if (room.status !== 'finished' && room.players.size >= 2) {
      startServerRound(room);
    }
  }, 2600);
}

// Handle player tap during active signal
function handleValidTap(room: GameRoom, tapPlayerId: string, clientReactionMs?: number) {
  if (room.hasTappedThisRound.has(tapPlayerId)) return;
  room.hasTappedThisRound.add(tapPlayerId);

  // If another player already won this round
  if (room.status !== 'signal_active') return;

  room.status = 'round_result';
  clearRoomTimers(room);

  const serverCalculatedMs = Math.max(1, Date.now() - room.signalTimestamp);
  const finalReactionMs = clientReactionMs && Math.abs(clientReactionMs - serverCalculatedMs) < 300
    ? clientReactionMs
    : serverCalculatedMs;

  room.scores[tapPlayerId] = (room.scores[tapPlayerId] || 0) + 1;
  const newScore = room.scores[tapPlayerId];
  const winner = room.players.get(tapPlayerId);
  const isMatchOver = newScore >= 3;

  broadcastToRoom(room, {
    type: 'round:result',
    winnerId: tapPlayerId,
    winnerName: winner?.username || 'Player',
    reactionMs: finalReactionMs,
    scores: room.scores,
    isMatchOver,
  });

  if (isMatchOver) {
    room.status = 'finished';
    broadcastToRoom(room, {
      type: 'match:game_over',
      winnerId: tapPlayerId,
      scores: room.scores,
      reason: 'normal',
    });
  } else {
    room.roundNumber += 1;
    room.nextRoundTimer = setTimeout(() => {
      if (room.status !== 'finished' && room.players.size >= 2) {
        startServerRound(room);
      }
    }, 2200);
  }
}

// Handle player voluntarily forfeiting current round (opponent wins round point)
function handlePlayerForfeitRound(room: GameRoom, forfeitPlayerId: string) {
  if (room.status === 'round_result' || room.status === 'finished') return;
  clearRoomTimers(room);
  room.status = 'round_result';

  // Find opponent
  const opponent = Array.from(room.players.values()).find(p => p.id !== forfeitPlayerId);
  if (!opponent) return;

  const forfeitPlayer = room.players.get(forfeitPlayerId);
  room.scores[opponent.id] = (room.scores[opponent.id] || 0) + 1;
  const oppScore = room.scores[opponent.id];
  const isMatchOver = oppScore >= 3;

  broadcastToRoom(room, {
    type: 'round:result',
    winnerId: opponent.id,
    winnerName: opponent.username,
    reactionMs: 0,
    scores: room.scores,
    reason: 'forfeit',
    forfeitedPlayerId: forfeitPlayerId,
    forfeitedPlayerName: forfeitPlayer?.username || 'Player',
    isMatchOver,
  });

  if (isMatchOver) {
    room.status = 'finished';
    broadcastToRoom(room, {
      type: 'match:game_over',
      winnerId: opponent.id,
      scores: room.scores,
      reason: 'forfeit',
      forfeitedPlayerId: forfeitPlayerId,
      forfeitedPlayerName: forfeitPlayer?.username || 'Player',
    });
  } else {
    room.roundNumber += 1;
    room.nextRoundTimer = setTimeout(() => {
      if (room.status !== 'finished' && room.players.size >= 2) {
        startServerRound(room);
      }
    }, 2400);
  }
}

// Handle player disconnection or forfeit
function handlePlayerLeft(roomId: string, leavingPlayerId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  clearRoomTimers(room);
  room.players.delete(leavingPlayerId);

  // If match was active, award technical victory to remaining player
  if (room.players.size === 1) {
    const remaining = Array.from(room.players.values())[0];
    room.status = 'finished';
    room.scores[remaining.id] = 3;

    broadcastToRoom(room, {
      type: 'match:game_over',
      winnerId: remaining.id,
      scores: room.scores,
      reason: 'abandoned',
      disconnectedPlayerId: leavingPlayerId,
    });
  } else if (room.players.size === 0) {
    // Delete room
    roomByCode.delete(room.code);
    rooms.delete(roomId);
  }
  broadcastOnlineStats();
}

// WebSocket Server initialization on port 3000 alongside Express
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  clientMap.set(ws, { id: clientId });

  ws.send(JSON.stringify({
    type: 'connection:ack',
    clientId,
    onlineCount: Math.max(1, clientMap.size),
    activeMatches: rooms.size,
  }));
  broadcastOnlineStats();

  ws.on('message', (raw: string) => {
    try {
      const msg = JSON.parse(raw.toString());
      const clientInfo = clientMap.get(ws);
      if (!clientInfo) return;

      switch (msg.type) {
        // PING / PONG FOR LATENCY MEASUREMENT
        case 'ping': {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: msg.timestamp,
          }));
          break;
        }

        // 1. QUICK MATCHMAKING QUEUE (RANDOM OPPONENT)
        case 'queue:join': {
          const user = msg.user || {};
          // Ensure unique ID per connection even if multiple tabs share same guest profile
          const uniquePlayerId = `${user.id || 'p'}_${clientInfo.id.slice(-5)}`;
          const player: PlayerData = {
            id: uniquePlayerId,
            username: user.username || 'Player',
            avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            color: user.color || '#06b6d4',
            country: user.country || 'RU',
            rating: user.stats?.bestReactionMs || 1200,
            score: 0,
            isReady: true,
            ws,
          };

          // Remove any existing entry from queue for this socket
          const existingIdx = matchmakingQueue.findIndex(q => q.player.ws === ws);
          if (existingIdx >= 0) matchmakingQueue.splice(existingIdx, 1);

          // Check if someone else is waiting in queue
          if (matchmakingQueue.length > 0) {
            const opponentEntry = matchmakingQueue.shift()!;
            const opponent = opponentEntry.player;

            // Create room for these 2 real players!
            const roomId = `room_pvp_${Date.now()}`;
            const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

            const newRoom: GameRoom = {
              id: roomId,
              code: roomCode,
              players: new Map([
                [player.id, player],
                [opponent.id, opponent],
              ]),
              status: 'ready',
              roundNumber: 1,
              scores: {
                [player.id]: 0,
                [opponent.id]: 0,
              },
              signalTimestamp: 0,
              hasTappedThisRound: new Set(),
            };

            rooms.set(roomId, newRoom);
            roomByCode.set(roomCode, roomId);

            clientMap.set(ws, { ...clientInfo, currentRoomId: roomId });
            const oppClientInfo = clientMap.get(opponent.ws);
            if (oppClientInfo) {
              clientMap.set(opponent.ws, { ...oppClientInfo, currentRoomId: roomId });
            }

            // Notify player 1
            ws.send(JSON.stringify({
              type: 'match:found',
              roomId,
              roomCode,
              yourPlayerId: player.id,
              you: { id: player.id, username: player.username, avatarUrl: player.avatarUrl, color: player.color, country: player.country },
              opponent: { id: opponent.id, username: opponent.username, avatarUrl: opponent.avatarUrl, color: opponent.color, country: opponent.country },
            }));

            // Notify player 2
            opponent.ws.send(JSON.stringify({
              type: 'match:found',
              roomId,
              roomCode,
              yourPlayerId: opponent.id,
              you: { id: opponent.id, username: opponent.username, avatarUrl: opponent.avatarUrl, color: opponent.color, country: opponent.country },
              opponent: { id: player.id, username: player.username, avatarUrl: player.avatarUrl, color: player.color, country: player.country },
            }));

            broadcastOnlineStats();

            // Auto start first round after ready sync
            setTimeout(() => {
              if (newRoom.status === 'ready') {
                startServerRound(newRoom);
              }
            }, 1200);

          } else {
            // Wait in queue
            matchmakingQueue.push({ playerId: player.id, player });
            ws.send(JSON.stringify({
              type: 'queue:waiting',
              queueSize: matchmakingQueue.length,
            }));
            broadcastOnlineStats();
          }
          break;
        }

        case 'queue:leave': {
          const idx = matchmakingQueue.findIndex(q => q.player.ws === ws);
          if (idx >= 0) matchmakingQueue.splice(idx, 1);
          ws.send(JSON.stringify({ type: 'queue:left' }));
          broadcastOnlineStats();
          break;
        }

        // 2. CREATE PRIVATE ROOM WITH CODE
        case 'room:create': {
          const user = msg.user || {};
          const uniquePlayerId = `${user.id || 'host'}_${clientInfo.id.slice(-5)}`;
          const roomId = `room_pvp_${Date.now()}`;
          const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

          const player: PlayerData = {
            id: uniquePlayerId,
            username: user.username || 'HostPlayer',
            avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            color: user.color || '#06b6d4',
            country: user.country || 'RU',
            score: 0,
            isReady: false,
            ws,
          };

          const newRoom: GameRoom = {
            id: roomId,
            code: roomCode,
            players: new Map([[player.id, player]]),
            status: 'waiting',
            roundNumber: 1,
            scores: { [player.id]: 0 },
            signalTimestamp: 0,
            hasTappedThisRound: new Set(),
          };

          rooms.set(roomId, newRoom);
          roomByCode.set(roomCode, roomId);
          clientMap.set(ws, { ...clientInfo, currentRoomId: roomId });

          ws.send(JSON.stringify({
            type: 'room:created',
            roomId,
            roomCode,
            yourPlayerId: player.id,
          }));
          broadcastOnlineStats();
          break;
        }

        // 3. JOIN PRIVATE ROOM BY CODE
        case 'room:join': {
          const targetCode = (msg.roomCode || '').trim().toUpperCase();
          const targetRoomId = roomByCode.get(targetCode) || msg.roomId;
          const room = rooms.get(targetRoomId);

          if (!room) {
            ws.send(JSON.stringify({
              type: 'room:error',
              message: 'Комната не найдена / Room not found',
            }));
            return;
          }

          if (room.players.size >= 2) {
            ws.send(JSON.stringify({
              type: 'room:error',
              message: 'Комната уже заполнена / Room is full',
            }));
            return;
          }

          const user = msg.user || {};
          const uniquePlayerId = `${user.id || 'challenger'}_${clientInfo.id.slice(-5)}`;
          const joiningPlayer: PlayerData = {
            id: uniquePlayerId,
            username: user.username || 'Challenger',
            avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
            color: user.color || '#f59e0b',
            country: user.country || 'US',
            score: 0,
            isReady: false,
            ws,
          };

          room.players.set(joiningPlayer.id, joiningPlayer);
          room.scores[joiningPlayer.id] = 0;
          clientMap.set(ws, { ...clientInfo, currentRoomId: room.id });

          // Get host player
          const hostPlayer = Array.from(room.players.values()).find(p => p.id !== joiningPlayer.id)!;

          // Notify host
          hostPlayer.ws.send(JSON.stringify({
            type: 'match:found',
            roomId: room.id,
            roomCode: room.code,
            yourPlayerId: hostPlayer.id,
            you: { id: hostPlayer.id, username: hostPlayer.username, avatarUrl: hostPlayer.avatarUrl, color: hostPlayer.color, country: hostPlayer.country },
            opponent: { id: joiningPlayer.id, username: joiningPlayer.username, avatarUrl: joiningPlayer.avatarUrl, color: joiningPlayer.color, country: joiningPlayer.country },
          }));

          // Notify joiner
          joiningPlayer.ws.send(JSON.stringify({
            type: 'match:found',
            roomId: room.id,
            roomCode: room.code,
            yourPlayerId: joiningPlayer.id,
            you: { id: joiningPlayer.id, username: joiningPlayer.username, avatarUrl: joiningPlayer.avatarUrl, color: joiningPlayer.color, country: joiningPlayer.country },
            opponent: { id: hostPlayer.id, username: hostPlayer.username, avatarUrl: hostPlayer.avatarUrl, color: hostPlayer.color, country: hostPlayer.country },
          }));

          room.status = 'ready';
          broadcastOnlineStats();

          setTimeout(() => {
            if (room.status === 'ready') {
              startServerRound(room);
            }
          }, 1500);
          break;
        }

        // 4. PLAYER ACTION TAP (TRIGGER / HIT)
        case 'action:tap': {
          const roomId = msg.roomId || clientInfo.currentRoomId;
          const room = rooms.get(roomId);
          if (!room) return;

          const playerId = msg.playerId || clientInfo.id;

          // FALSE START: Tapped during countdown or waiting signal phase!
          if (room.status === 'countdown' || room.status === 'waiting_signal') {
            handleFalseStart(room, playerId);
            return;
          }

          // VALID HIT: Tapped while signal is active!
          if (room.status === 'signal_active') {
            handleValidTap(room, playerId, msg.reactionMs);
            return;
          }
          break;
        }

        // 4.1 VOLUNTARY ROUND FORFEIT (Whoever surrenders loses the round, opponent gets +1 point)
        case 'action:forfeit_round': {
          const roomId = msg.roomId || clientInfo.currentRoomId;
          const room = rooms.get(roomId);
          if (!room) return;
          const playerId = msg.playerId || clientInfo.id;
          handlePlayerForfeitRound(room, playerId);
          break;
        }

        // 5. REMATCH LOGIC
        case 'match:rematch_request': {
          const roomId = msg.roomId || clientInfo.currentRoomId;
          const room = rooms.get(roomId);
          if (!room) return;

          broadcastToRoom(room, {
            type: 'match:rematch_offered',
            offeredBy: msg.playerId || clientInfo.id,
          });
          break;
        }

        case 'match:rematch_accept': {
          const roomId = msg.roomId || clientInfo.currentRoomId;
          const room = rooms.get(roomId);
          if (!room || room.players.size < 2) return;

          for (const pid of room.players.keys()) {
            room.scores[pid] = 0;
          }
          room.roundNumber = 1;
          room.status = 'ready';

          broadcastToRoom(room, {
            type: 'match:rematch_started',
            scores: room.scores,
          });

          setTimeout(() => {
            if (room.status === 'ready') {
              startServerRound(room);
            }
          }, 1200);
          break;
        }

        // 6. IN-GAME QUICK EMOTE
        case 'action:emote': {
          const roomId = msg.roomId || clientInfo.currentRoomId;
          const room = rooms.get(roomId);
          if (!room) return;

          broadcastToRoom(room, {
            type: 'action:emote',
            playerId: msg.playerId || clientInfo.id,
            emote: msg.emote,
          });
          break;
        }

        // 7. PLAYER VOLUNTARILY LEAVES MATCH
        case 'match:leave': {
          const roomId = msg.roomId || clientInfo.currentRoomId;
          if (roomId) {
            handlePlayerLeft(roomId, msg.playerId || clientInfo.id);
          }
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    const clientInfo = clientMap.get(ws);
    if (clientInfo) {
      // Remove from matchmaking queue if present
      const qIdx = matchmakingQueue.findIndex(q => q.player.ws === ws);
      if (qIdx >= 0) matchmakingQueue.splice(qIdx, 1);

      // Handle leaving active room if in one
      if (clientInfo.currentRoomId) {
        handlePlayerLeft(clientInfo.currentRoomId, clientInfo.id);
      }
      clientMap.delete(ws);
      broadcastOnlineStats();
    }
  });
});

// REST endpoint for status & stats
app.get('/api/online-stats', (_req, res) => {
  res.json({
    onlinePlayers: Math.max(1, clientMap.size),
    waitingInQueue: matchmakingQueue.length,
    activeMatches: rooms.size,
  });
});

// Public base URL: APP_URL if set, otherwise derived from the incoming request
// (works behind Railway's proxy, which sets X-Forwarded-Proto / X-Forwarded-Host).
function getPublicAppUrl(req: express.Request): string {
  const envUrl = (process.env.APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '').trim();
  if (envUrl) {
    const withProto = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
    return withProto.replace(/\/+$/, '');
  }
  const proto = (req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    publicAppUrl: getPublicAppUrl(req),
  });
});

app.get('/api/public-url', (req, res) => {
  const publicAppUrl = getPublicAppUrl(req);
  res.json({
    publicAppUrl,
    guestPermanentUrl: `${publicAppUrl}/?guest=true`,
  });
});

app.get('/api/public-status', (req, res) => {
  const publicAppUrl = getPublicAppUrl(req);
  // If this request reached us, the app is publicly reachable.
  res.json({
    isLive: true,
    statusCode: 200,
    publicAppUrl,
    devAppUrl: publicAppUrl,
    needsSharePublication: false,
  });
});

// Serve frontend in production or through Vite in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for HTML5 history API navigation and room URL parameters
    app.get('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/ws')) {
        return next();
      }
      try {
        const fs = await import('fs');
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
