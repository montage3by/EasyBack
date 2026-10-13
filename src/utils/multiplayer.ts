import { UserProfile } from '../types';

export interface ServerMessage {
  type: string;
  [key: string]: unknown;
}

export interface MatchFoundData {
  roomId: string;
  roomCode: string;
  yourPlayerId?: string;
  you: {
    id: string;
    username: string;
    avatarUrl: string;
    color: string;
    country?: string;
  };
  opponent: {
    id: string;
    username: string;
    avatarUrl: string;
    color: string;
    country?: string;
  };
}

export type MultiplayerEventListener = (msg: ServerMessage) => void;

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MultiplayerEventListener> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private onlineCount: number = 1;
  private activeMatches: number = 0;
  private lastUser: UserProfile | null = null;
  private currentLatencyMs: number = 24;
  private pendingQueue: object[] = [];

  public connect(user?: UserProfile) {
    if (user) this.lastUser = user;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (typeof window === 'undefined') return;

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }

        // Flush any pending queued messages immediately
        while (this.pendingQueue.length > 0) {
          const queued = this.pendingQueue.shift();
          if (queued && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(queued));
          }
        }

        // Start ping ticker for latency measurement
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.send({ type: 'ping', timestamp: Date.now() });
          }
        }, 3500);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as ServerMessage;
          if (data.type === 'connection:ack') {
            this.onlineCount = (data.onlineCount as number) || 1;
            this.activeMatches = (data.activeMatches as number) || 0;
          } else if (data.type === 'stats:update') {
            this.onlineCount = (data.onlinePlayers as number) || 1;
            this.activeMatches = (data.activeMatches as number) || 0;
          } else if (data.type === 'pong') {
            const sent = data.timestamp as number;
            if (sent) {
              this.currentLatencyMs = Math.max(1, Date.now() - sent);
            }
          }
          this.listeners.forEach((listener) => listener(data));
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        // Auto-reconnect if dropped
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            if (this.lastUser) this.connect(this.lastUser);
          }, 2000);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        this.ws?.close();
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      this.isConnecting = false;
    }
  }

  public subscribe(listener: MultiplayerEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public send(msg: object) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingQueue.push(msg);
      if (!this.isConnecting) {
        this.connect();
      }
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  public joinQueue(user: UserProfile) {
    this.lastUser = user;
    this.connect(user);
    this.send({
      type: 'queue:join',
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        color: user.color,
        country: user.country,
        stats: user.stats,
      },
    });
  }

  public leaveQueue() {
    this.send({ type: 'queue:leave' });
  }

  public createRoom(user: UserProfile) {
    this.lastUser = user;
    this.connect(user);
    this.send({
      type: 'room:create',
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        color: user.color,
        country: user.country,
        stats: user.stats,
      },
    });
  }

  public joinRoom(roomCode: string, user: UserProfile) {
    this.lastUser = user;
    this.connect(user);
    this.send({
      type: 'room:join',
      roomCode,
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        color: user.color,
        country: user.country,
        stats: user.stats,
      },
    });
  }

  public tap(roomId: string, playerId: string, reactionMs?: number) {
    this.send({
      type: 'action:tap',
      roomId,
      playerId,
      reactionMs,
    });
  }

  public requestRematch(roomId: string, playerId: string) {
    this.send({
      type: 'match:rematch_request',
      roomId,
      playerId,
    });
  }

  public acceptRematch(roomId: string, playerId: string) {
    this.send({
      type: 'match:rematch_accept',
      roomId,
      playerId,
    });
  }

  public sendEmote(roomId: string, playerId: string, emote: string) {
    this.send({
      type: 'action:emote',
      roomId,
      playerId,
      emote,
    });
  }

  public forfeitRound(roomId: string, playerId: string) {
    this.send({
      type: 'action:forfeit_round',
      roomId,
      playerId,
    });
  }

  public leaveMatch(roomId: string, playerId?: string) {
    this.send({
      type: 'match:leave',
      roomId,
      playerId,
    });
  }

  public getOnlineCount(): number {
    return Math.max(1, this.onlineCount);
  }

  public getActiveMatches(): number {
    return this.activeMatches;
  }

  public getLatency(): number {
    return this.currentLatencyMs;
  }
}

export const multiplayer = new MultiplayerClient();
