import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Zap, 
  RotateCcw, 
  ArrowLeft, 
  AlertTriangle, 
  Trophy, 
  Clock, 
  Wifi, 
  Flag,
  Sparkles,
  Swords,
  Timer,
  Copy,
  Check,
  ExternalLink,
  Smile,
  Radio,
  Bot
} from 'lucide-react';
import { GameMode, GameStage, Language, UserProfile, DuelPlayer, MatchHistoryItem } from '../types';
import { translations } from '../utils/i18n';
import { sound } from '../utils/audio';
import { COLOR_OPTIONS } from '../utils/storage';
import { multiplayer } from '../utils/multiplayer';
import { getDuelInviteUrl, getLocalDevDuelUrl } from '../utils/shareUtils';
import { UserAvatar } from './UserAvatar';

interface DuelArenaProps {
  mode: GameMode;
  user: UserProfile;
  lang: Language;
  roomId?: string;
  roomCode?: string;
  initialOpponent?: DuelPlayer | null;
  onExit: () => void;
  onMatchComplete: (
    result: 'win' | 'loss' | 'abandoned',
    opponentName: string,
    opponentAvatar: string,
    bestReaction: number,
    score: [number, number],
    isReal?: boolean
  ) => void;
  onAntiCheatFlag: (reactionMs: number) => void;
}

const QUICK_EMOTES = ['⚡', '🔥', '😎', '🏆', '😱', '👏'];

export const DuelArena: React.FC<DuelArenaProps> = ({
  mode,
  user,
  lang,
  roomId: propRoomId,
  roomCode: propRoomCode,
  initialOpponent,
  onExit,
  onMatchComplete,
  onAntiCheatFlag,
}) => {
  const t = translations[lang];

  const [activeRoomId, setActiveRoomId] = useState<string>(propRoomId || '');
  const [activeRoomCode, setActiveRoomCode] = useState<string>(propRoomCode || '');
  const [isRealOpponent, setIsRealOpponent] = useState<boolean>(Boolean(propRoomId || initialOpponent));
  const [myAssignedId, setMyAssignedId] = useState<string>(user.id);
  const [queueWaitingCount, setQueueWaitingCount] = useState<number>(1);
  const [queueTime, setQueueTime] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(multiplayer.getLatency());
  const [isExitDialogOpen, setIsExitDialogOpen] = useState<boolean>(false);

  // Rematch and Emotes states
  const [rematchOfferedByOpponent, setRematchOfferedByOpponent] = useState<boolean>(false);
  const [rematchRequestedByMe, setRematchRequestedByMe] = useState<boolean>(false);
  const [p1Emote, setP1Emote] = useState<string | null>(null);
  const [p2Emote, setP2Emote] = useState<string | null>(null);

  // Players
  const [player1, setPlayer1] = useState<DuelPlayer>({
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    color: user.color,
    score: 0,
    lastReactionMs: null,
    hasFalseStarted: false,
  });

  const [player2, setPlayer2] = useState<DuelPlayer>(initialOpponent || {
    id: 'opponent_01',
    username: mode === 'local' 
      ? (lang === 'ru' ? 'Игрок 2' : lang === 'de' ? 'Spieler 2' : 'Player 2') 
      : (mode === 'practice' 
          ? (lang === 'ru' ? 'Адаптивный Бот' : lang === 'de' ? 'Adaptiver Bot' : 'Adaptive Bot') 
          : 'GhostStriker'),
    avatarUrl: mode === 'practice'
      ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    color: mode === 'practice' ? '#a855f7' : COLOR_OPTIONS[2].hex,
    score: 0,
    lastReactionMs: null,
    hasFalseStarted: false,
  });

  // Synchronized refs for stage and game flow
  const initialStage: GameStage = (mode === 'online' && !initialOpponent && !propRoomId) ? 'searching' : 'ready';
  const [_stage, _setStage] = useState<GameStage>(initialStage);
  const stageRef = useRef<GameStage>(initialStage);
  const stage = _stage;
  const setStage = useCallback((s: GameStage | ((prev: GameStage) => GameStage)) => {
    _setStage(prev => {
      const next = typeof s === 'function' ? s(prev) : s;
      stageRef.current = next;
      return next;
    });
  }, []);

  const [countdown, setCountdown] = useState<number>(3);
  const [_roundNumber, _setRoundNumber] = useState<number>(1);
  const roundNumberRef = useRef<number>(1);
  const roundNumber = _roundNumber;
  const setRoundNumber = useCallback((r: number | ((prev: number) => number)) => {
    _setRoundNumber(prev => {
      const next = typeof r === 'function' ? r(prev) : r;
      roundNumberRef.current = next;
      return next;
    });
  }, []);

  const modeRef = useRef<GameMode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const isRealOpponentRef = useRef<boolean>(isRealOpponent);
  useEffect(() => {
    isRealOpponentRef.current = isRealOpponent;
  }, [isRealOpponent]);

  const [roundWinnerMessage, setRoundWinnerMessage] = useState<string>('');
  const [matchWinner, setMatchWinner] = useState<'p1' | 'p2' | null>(null);
  const [matchFinished, setMatchFinished] = useState<boolean>(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState<boolean>(false);
  const [userBestReactionThisMatch, setUserBestReactionThisMatch] = useState<number>(999);
  const [practiceCountdown, setPracticeCountdown] = useState<number>(10);

  // Reaction measurement refs
  const signalTimestampRef = useRef<number>(0);
  const randomDelayTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const botReactionTimerRef = useRef<number | null>(null);
  const roundResolvedRef = useRef<boolean>(false);
  const isWaitingSignalRef = useRef<boolean>(false);

  // Adaptive bot state for Solo Practice
  const lastUserReactionMsRef = useRef<number | null>(null);
  const currentBotTargetMsRef = useRef<number>(250);

  // Ping interval for real-time latency updates
  useEffect(() => {
    const timer = setInterval(() => {
      setLatencyMs(multiplayer.getLatency());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // WebSocket Server Real-Time Subscription
  useEffect(() => {
    if (mode === 'local' || mode === 'practice') return;

    multiplayer.connect(user);

    // Join matchmaking queue if starting online match without prior room
    if (mode === 'online' && !propRoomId) {
      multiplayer.joinQueue(user);
    }

    const unsubscribe = multiplayer.subscribe((msg) => {
      if (msg.type === 'queue:waiting') {
        setQueueWaitingCount((msg.queueSize as number) || 1);
      } else if (msg.type === 'match:found') {
        const rId = msg.roomId as string;
        const rCode = msg.roomCode as string;
        const oppData = msg.opponent as { id: string; username: string; avatarUrl: string; color: string; country?: string };
        const myData = msg.you as { id: string };

        if (msg.yourPlayerId) {
          setMyAssignedId(msg.yourPlayerId as string);
        } else if (myData?.id) {
          setMyAssignedId(myData.id);
        }

        setActiveRoomId(rId);
        setActiveRoomCode(rCode);
        setIsRealOpponent(true);
        sound.playGameStart();
        setPlayer2({
          id: oppData.id,
          username: oppData.username,
          avatarUrl: oppData.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          color: oppData.color || '#f59e0b',
          score: 0,
          lastReactionMs: null,
          hasFalseStarted: false,
        });
        setStage('ready');
      } else if (msg.type === 'round:countdown') {
        clearAllTimers();
        roundResolvedRef.current = false;
        isWaitingSignalRef.current = false;
        setStage('countdown');
        setCountdown(msg.count as number);
        setRoundWinnerMessage('');
        sound.playCountdownTick(msg.count as number);
      } else if (msg.type === 'round:waiting_signal') {
        setStage('waiting_signal');
        isWaitingSignalRef.current = true;
        sound.startSuspenseDrone();
      } else if (msg.type === 'round:signal') {
        isWaitingSignalRef.current = false;
        setStage('signal_active');
        signalTimestampRef.current = performance.now();
        sound.stopSuspenseDrone();
        sound.playSignalGo();
      } else if (msg.type === 'round:false_start') {
        sound.stopSuspenseDrone();
        sound.playFalseStart();
        isWaitingSignalRef.current = false;
        roundResolvedRef.current = true;

        const offenderId = msg.offenderId as string;
        const offenderName = msg.offenderName as string;
        const scores = (msg.scores as Record<string, number>) || {};

        const isUserOffender = offenderId === myAssignedId || offenderId === user.id;

        setPlayer1(p => ({
          ...p,
          score: scores[myAssignedId] ?? scores[user.id] ?? (isUserOffender ? 0 : p.score),
          hasFalseStarted: isUserOffender,
        }));
        setPlayer2(p => ({
          ...p,
          score: scores[p.id] ?? (!isUserOffender ? 0 : p.score),
          hasFalseStarted: !isUserOffender,
        }));

        setRoundWinnerMessage(
          lang === 'ru'
            ? `ФАЛЬСТАРТ у ${offenderName}! Очки обнулены!`
            : `FALSE START by ${offenderName}! Score reset to 0!`
        );
        setStage('round_result');
      } else if (msg.type === 'round:result') {
        sound.stopSuspenseDrone();
        roundResolvedRef.current = true;
        const winnerId = msg.winnerId as string;
        const winnerName = msg.winnerName as string;
        const reactionMs = (msg.reactionMs as number) || 0;
        const scores = (msg.scores as Record<string, number>) || {};
        const reason = msg.reason as string | undefined;
        const forfeitedPlayerName = msg.forfeitedPlayerName as string | undefined;

        const isUserWinner = winnerId === myAssignedId || winnerId === user.id;
        if (isUserWinner) {
          sound.playSuccess(reactionMs > 0 ? reactionMs : 250);
          if (reactionMs > 0) {
            setUserBestReactionThisMatch(prev => Math.min(prev, reactionMs));
          }
        } else {
          sound.playFalseStart();
        }

        setPlayer1(p => ({
          ...p,
          score: scores[myAssignedId] ?? scores[user.id] ?? (isUserWinner ? p.score + 1 : p.score),
          lastReactionMs: isUserWinner ? (reactionMs > 0 ? reactionMs : null) : p.lastReactionMs,
        }));
        setPlayer2(p => ({
          ...p,
          score: scores[p.id] ?? (!isUserWinner ? p.score + 1 : p.score),
          lastReactionMs: !isUserWinner ? (reactionMs > 0 ? reactionMs : null) : p.lastReactionMs,
        }));

        if (reason === 'forfeit') {
          setRoundWinnerMessage(
            isUserWinner
              ? (lang === 'ru' 
                  ? `Соперник ${forfeitedPlayerName || ''} сдался в раунде! Очко ваше!` 
                  : lang === 'de'
                    ? `Gegner ${forfeitedPlayerName || ''} hat die Runde aufgegeben! Punkt für dich!`
                    : `Opponent surrendered the round! Point is yours!`)
              : (lang === 'ru' 
                  ? `Вы сдались в этом раунде! Очко достаётся сопернику.` 
                  : lang === 'de'
                    ? `Du hast diese Runde aufgegeben! Punkt für den Gegner.`
                    : `You surrendered this round! Point to opponent.`)
          );
        } else {
          setRoundWinnerMessage(
            lang === 'ru'
              ? `Очко! ${winnerName} победил за ${reactionMs} мс`
              : lang === 'de'
                ? `Punkt! ${winnerName} hat in ${reactionMs} ms gewonnen`
                : `Point! ${winnerName} won in ${reactionMs} ms`
          );
        }
        setStage('round_result');
        setRoundNumber(r => r + 1);
      } else if (msg.type === 'match:game_over') {
        sound.stopSuspenseDrone();
        const winnerId = msg.winnerId as string;
        const reason = msg.reason as string;
        const scores = (msg.scores as Record<string, number>) || {};
        const isUserWinner = winnerId === myAssignedId || winnerId === user.id;

        if (reason === 'abandoned' || reason === 'forfeit') {
          if (isUserWinner) {
            simulateOpponentForfeit();
          } else {
            finishMatch(
              'p2',
              scores[myAssignedId] ?? scores[user.id] ?? player1.score,
              scores[player2.id] ?? 3
            );
          }
        } else {
          finishMatch(
            isUserWinner ? 'p1' : 'p2',
            scores[myAssignedId] ?? scores[user.id] ?? player1.score,
            scores[player2.id] ?? player2.score
          );
        }
      } else if (msg.type === 'match:rematch_offered') {
        const fromId = msg.offeredBy as string;
        if (fromId !== myAssignedId && fromId !== user.id) {
          setRematchOfferedByOpponent(true);
        }
      } else if (msg.type === 'match:rematch_started') {
        setRematchOfferedByOpponent(false);
        setRematchRequestedByMe(false);
        setMatchWinner(null);
        setMatchFinished(false);
        setOpponentDisconnected(false);
        setRoundNumber(1);
        setUserBestReactionThisMatch(999);
        setPlayer1(p => ({ ...p, score: 0, lastReactionMs: null, hasFalseStarted: false }));
        setPlayer2(p => ({ ...p, score: 0, lastReactionMs: null, hasFalseStarted: false }));
        setStage('ready');
      } else if (msg.type === 'action:emote') {
        const senderId = msg.playerId as string;
        const emote = msg.emote as string;
        const isP1 = senderId === myAssignedId || senderId === user.id;
        if (isP1) {
          setP1Emote(emote);
          setTimeout(() => setP1Emote(null), 2500);
        } else {
          setP2Emote(emote);
          setTimeout(() => setP2Emote(null), 2500);
        }
      }
    });

    return () => {
      unsubscribe();
      multiplayer.leaveQueue();
      if (activeRoomId) {
        multiplayer.leaveMatch(activeRoomId, myAssignedId);
      }
    };
  }, [mode, propRoomId, user, lang, myAssignedId, activeRoomId]);

  // Queue timer counter for search state
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (stage === 'searching') {
      interval = setInterval(() => {
        setQueueTime(q => q + 1);
      }, 1000);
    } else {
      setQueueTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [stage]);

  // Fallback Sparring Bot if user chooses to start instantly while waiting
  const handleStartSparringBot = () => {
    multiplayer.leaveQueue();
    const opponentNames = ['CyberFalcon', 'VortexKnight', 'QuantumBlade', 'NovaPulse', 'ZenithStorm', 'ShadowSurge'];
    const chosenName = opponentNames[Math.floor(Math.random() * opponentNames.length)];
    const chosenColor = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)].hex;
    const avatars = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    ];
    setPlayer2({
      id: `bot_${Date.now()}`,
      username: chosenName,
      avatarUrl: avatars[Math.floor(Math.random() * avatars.length)],
      color: chosenColor,
      score: 0,
      lastReactionMs: null,
      hasFalseStarted: false,
    });
    setIsRealOpponent(false);
    setStage('ready');
  };

  // Clean timers helper
  const clearAllTimers = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (randomDelayTimerRef.current) clearTimeout(randomDelayTimerRef.current);
    if (botReactionTimerRef.current) clearTimeout(botReactionTimerRef.current);
    sound.stopSuspenseDrone();
    isWaitingSignalRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
      sound.stopSuspenseDrone();
    };
  }, [clearAllTimers]);

  // Start round cycle for local/offline modes
  const startRound = useCallback((isMatchStart = false) => {
    clearAllTimers();
    roundResolvedRef.current = false;
    isWaitingSignalRef.current = false;
    setStage('countdown');
    setCountdown(3);
    setRoundWinnerMessage('');

    const curRound = roundNumberRef.current;

    if (isMatchStart || curRound === 1) {
      sound.playGameStart();
    }

    sound.playCountdownTick(3);

    // Set planned bot reaction for Practice Mode:
    // Round 1: 250 ms
    // Round 2 and 3+: adapt to player, subtracting 10% from player's previous reaction
    if (modeRef.current === 'practice') {
      if (curRound === 1) {
        currentBotTargetMsRef.current = 250;
      } else {
        const prevReaction = lastUserReactionMsRef.current;
        if (prevReaction && prevReaction > 0) {
          currentBotTargetMsRef.current = Math.max(80, Math.round(prevReaction * 0.9));
        } else {
          currentBotTargetMsRef.current = Math.round(250 * 0.9); // 225 ms fallback
        }
      }
    }

    let currentCount = 3;
    countdownIntervalRef.current = window.setInterval(() => {
      currentCount -= 1;
      setCountdown(currentCount);

      if (currentCount > 0) {
        sound.playCountdownTick(currentCount);
      } else {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        
        // ENTER RANDOM DELAY PHASE (1.2s - 3.4s in practice for responsive dueling)
        setStage('waiting_signal');
        isWaitingSignalRef.current = true;
        sound.startSuspenseDrone();

        const randomDelay = modeRef.current === 'practice'
          ? Math.floor(Math.random() * 2200) + 1200
          : Math.floor(Math.random() * 4000) + 1000;

        randomDelayTimerRef.current = window.setTimeout(() => {
          if (!isWaitingSignalRef.current) return;

          setStage('signal_active');
          signalTimestampRef.current = performance.now();
          isWaitingSignalRef.current = false;

          sound.stopSuspenseDrone();
          sound.playSignalGo();

          // Bot opponent reaction (Practice mode or simulated offline sparring bot)
          if (modeRef.current === 'practice' || (modeRef.current === 'online' && !isRealOpponentRef.current)) {
            scheduleSimulatedOpponentReaction();
          }
        }, randomDelay);
      }
    }, 1000);
  }, [setStage, clearAllTimers]);

  // Simulated bot reaction
  const scheduleSimulatedOpponentReaction = () => {
    let botReaction: number;
    if (modeRef.current === 'practice') {
      botReaction = currentBotTargetMsRef.current || 250;
    } else {
      botReaction = Math.floor(Math.random() * 90) + 195;
    }

    if (botReactionTimerRef.current) {
      clearTimeout(botReactionTimerRef.current);
    }

    botReactionTimerRef.current = window.setTimeout(() => {
      if (roundResolvedRef.current) return;
      handlePlayerHit(2, botReaction);
    }, botReaction);
  };

  // Player tap / hit handler
  const handlePlayerHit = (playerNum: 1 | 2, overrideTime?: number) => {
    // Real online multiplayer over WebSocket
    if (isRealOpponentRef.current && activeRoomId) {
      const now = performance.now();
      const reactionMs = stageRef.current === 'signal_active'
        ? Math.round(now - signalTimestampRef.current)
        : 0;

      if (reactionMs > 0 && reactionMs < 80) {
        onAntiCheatFlag(reactionMs);
      }

      multiplayer.tap(activeRoomId, myAssignedId, reactionMs);
      return;
    }

    // Local / practice fallback handling
    // FALSE START CHECK: If pressed during 'countdown' or 'waiting_signal'
    if (isWaitingSignalRef.current || stageRef.current === 'countdown') {
      triggerFalseStart(playerNum);
      return;
    }

    // Capture player late reaction if they pressed right after bot scored in round_result
    if (roundResolvedRef.current) {
      if (stageRef.current === 'round_result' && playerNum === 1 && signalTimestampRef.current > 0) {
        const lateReaction = Math.round(performance.now() - signalTimestampRef.current);
        if (lateReaction > 0 && lateReaction < 3000 && player1.lastReactionMs === null) {
          lastUserReactionMsRef.current = lateReaction;
          setPlayer1(p => ({ ...p, lastReactionMs: lateReaction }));
        }
      }
      return;
    }

    // For player 1, must be in signal_active. For player 2 (the bot), execute hit directly
    if (stageRef.current !== 'signal_active' && playerNum !== 2) {
      return;
    }

    roundResolvedRef.current = true;
    clearAllTimers();
    sound.stopSuspenseDrone();

    const now = performance.now();
    const reactionMs = overrideTime !== undefined ? overrideTime : Math.round(now - signalTimestampRef.current);

    // Anti-cheat check (< 80ms)
    if (playerNum === 1 && reactionMs < 80) {
      onAntiCheatFlag(reactionMs);
    }

    if (playerNum === 1) {
      setUserBestReactionThisMatch(prev => Math.min(prev, reactionMs));
      lastUserReactionMsRef.current = reactionMs;
      const botPlannedMs = currentBotTargetMsRef.current;

      setPlayer1(p => ({
        ...p,
        score: p.score + 1,
        lastReactionMs: reactionMs,
        hasFalseStarted: false,
      }));
      setPlayer2(p => ({
        ...p,
        lastReactionMs: mode === 'practice' 
          ? botPlannedMs 
          : (mode === 'online' ? Math.round(reactionMs + Math.random() * 45 + 15) : p.lastReactionMs),
      }));

      sound.playSuccess(reactionMs);

      const newScore = player1.score + 1;
      if (newScore >= 3) {
        finishMatch('p1', newScore, player2.score);
      } else {
        const nextBotTarget = Math.round(reactionMs * 0.9);
        const adaptationMsg = mode === 'practice' 
          ? (lang === 'ru' 
              ? ` (В след. раунде бот: ${nextBotTarget} мс)` 
              : lang === 'de'
                ? ` (Nächste Runde Bot: ${nextBotTarget} ms)`
                : ` (Next round bot: ${nextBotTarget} ms)`)
          : '';

        setRoundWinnerMessage(
          lang === 'ru' 
            ? `Очко! ${player1.username} победил за ${reactionMs} мс${adaptationMsg}` 
            : lang === 'de'
              ? `Punkt! ${player1.username} hat in ${reactionMs} ms gewonnen${adaptationMsg}`
              : `Point! ${player1.username} won in ${reactionMs} ms${adaptationMsg}`
        );
        setStage('round_result');
        setRoundNumber(r => r + 1);
        setTimeout(() => {
          startRound();
        }, 2200);
      }
    } else {
      // Player 2 scores (Bot or Local P2)
      const botReaction = reactionMs;
      // Default fallback reaction for player if they don't tap after bot
      lastUserReactionMsRef.current = Math.round(botReaction * 1.15);

      setPlayer2(p => ({
        ...p,
        score: p.score + 1,
        lastReactionMs: botReaction,
        hasFalseStarted: false,
      }));
      setPlayer1(p => ({
        ...p,
        lastReactionMs: mode === 'practice' ? null : (mode === 'online' ? Math.round(reactionMs + Math.random() * 35 + 20) : p.lastReactionMs),
      }));

      sound.playSuccess(reactionMs);

      const newScore = player2.score + 1;
      if (newScore >= 3) {
        finishMatch('p2', player1.score, newScore);
      } else {
        setRoundWinnerMessage(
          lang === 'ru'
            ? `Очко! ${player2.username} победил за ${reactionMs} мс`
            : lang === 'de'
              ? `Punkt! ${player2.username} hat in ${reactionMs} ms gewonnen`
              : `Point! ${player2.username} won in ${reactionMs} ms`
        );
        setStage('round_result');
        setRoundNumber(r => r + 1);
        setTimeout(() => {
          startRound();
        }, 2200);
      }
    }
  };

  // Auto-start practice mode countdown after 10 seconds preview (10 sec)
  useEffect(() => {
    if (mode !== 'practice' || stage !== 'ready' || matchFinished) {
      setPracticeCountdown(10);
      return;
    }

    setPracticeCountdown(10);

    const interval = window.setInterval(() => {
      setPracticeCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          startRound(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, stage, matchFinished, startRound]);

  // False Start Punishment: Resets player's points to 0
  const triggerFalseStart = (playerNum: 1 | 2) => {
    if (roundResolvedRef.current) return;
    roundResolvedRef.current = true;
    isWaitingSignalRef.current = false;
    clearAllTimers();

    sound.stopSuspenseDrone();
    sound.playFalseStart();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    if (playerNum === 1) {
      if (mode === 'practice') {
        lastUserReactionMsRef.current = 250;
      }
      setPlayer1(p => ({
        ...p,
        score: 0, // POINTS RESET TO ZERO
        hasFalseStarted: true,
        lastReactionMs: null,
      }));
      setRoundWinnerMessage(
        lang === 'ru'
          ? `ФАЛЬСТАРТ у ${player1.username}! Очки обнулены!`
          : lang === 'de'
            ? `FEHLSTART von ${player1.username}! Punkte auf 0 zurückgesetzt!`
            : `FALSE START by ${player1.username}! Score reset to 0!`
      );
    } else {
      setPlayer2(p => ({
        ...p,
        score: 0, // POINTS RESET TO ZERO
        hasFalseStarted: true,
        lastReactionMs: null,
      }));
      setRoundWinnerMessage(
        lang === 'ru'
          ? `ФАЛЬСТАРТ у ${player2.username}! Очки обнулены!`
          : lang === 'de'
            ? `FEHLSTART von ${player2.username}! Punkte auf 0 zurückgesetzt!`
            : `FALSE START by ${player2.username}! Score reset to 0!`
      );
    }

    setStage('round_result');

    setTimeout(() => {
      setPlayer1(p => ({ ...p, hasFalseStarted: false }));
      setPlayer2(p => ({ ...p, hasFalseStarted: false }));
      startRound();
    }, 2500);
  };

  // Match Finish
  const finishMatch = (winner: 'p1' | 'p2', finalP1Score: number, finalP2Score: number) => {
    setMatchWinner(winner);
    setMatchFinished(true);
    setStage('match_over');

    const isReal = isRealOpponent || mode === 'local' || mode === 'room' || (mode === 'online' && !player2.id.startsWith('bot_'));
    if (winner === 'p1') {
      sound.playVictoryFanfare();
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.6 },
        colors: [user.color, '#06b6d4', '#10b981', '#f59e0b'],
      });
      onMatchComplete('win', player2.username, player2.avatarUrl, userBestReactionThisMatch, [finalP1Score, finalP2Score], isReal);
    } else {
      onMatchComplete('loss', player2.username, player2.avatarUrl, userBestReactionThisMatch, [finalP1Score, finalP2Score], isReal);
    }
  };

  // Opponent leaves early handler
  const simulateOpponentForfeit = () => {
    clearAllTimers();
    setOpponentDisconnected(true);
    setMatchWinner('p1');
    setMatchFinished(true);
    setStage('match_over');
    sound.playVictoryFanfare();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.5 },
    });
    const isReal = isRealOpponent || mode === 'local' || mode === 'room' || (mode === 'online' && !player2.id.startsWith('bot_'));
    onMatchComplete('abandoned', player2.username, player2.avatarUrl, userBestReactionThisMatch === 999 ? 200 : userBestReactionThisMatch, [3, player2.score], isReal);
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchFinished || stage === 'searching' || stage === 'idle') return;

      if (e.code === 'KeyA' || (mode !== 'local' && e.code === 'Space')) {
        e.preventDefault();
        handlePlayerHit(1);
      } else if (e.code === 'KeyL' && mode === 'local') {
        e.preventDefault();
        handlePlayerHit(2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage, matchFinished, mode]);

  // Restart match handler (local or solo)
  const handleRestart = () => {
    lastUserReactionMsRef.current = null;
    currentBotTargetMsRef.current = 250;
    setPlayer1(p => ({ ...p, score: 0, lastReactionMs: null, hasFalseStarted: false }));
    setPlayer2(p => ({ ...p, score: 0, lastReactionMs: null, hasFalseStarted: false }));
    setRoundNumber(1);
    setMatchWinner(null);
    setMatchFinished(false);
    setOpponentDisconnected(false);
    setUserBestReactionThisMatch(999);
    startRound(true);
  };

  // Rematch request over WebSocket
  const handleRequestRematch = () => {
    sound.playClick();
    setRematchRequestedByMe(true);
    multiplayer.requestRematch(activeRoomId, myAssignedId);
  };

  const handleAcceptRematch = () => {
    sound.playClick();
    multiplayer.acceptRematch(activeRoomId, myAssignedId);
  };

  // Send quick in-game reaction emote
  const handleSendEmote = (emote: string) => {
    sound.playClick();
    setP1Emote(emote);
    setTimeout(() => setP1Emote(null), 2500);
    if (isRealOpponent && activeRoomId) {
      multiplayer.sendEmote(activeRoomId, myAssignedId, emote);
    }
  };

  // Copy Duel Link helper
  const getDuelShareUrl = () => {
    return getDuelInviteUrl(activeRoomCode);
  };

  const handleCopyDuelLink = () => {
    sound.playClick();
    const url = getDuelShareUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleOpenSecondTab = () => {
    sound.playClick();
    const url = getLocalDevDuelUrl(activeRoomCode);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  // User forfeits the current round (opponent gets point, match continues)
  const handleForfeitRound = () => {
    sound.playClick();
    setIsExitDialogOpen(false);

    if (isRealOpponent && activeRoomId) {
      multiplayer.forfeitRound(activeRoomId, myAssignedId);
      return;
    }

    // Local / Practice bot forfeit round
    roundResolvedRef.current = true;
    clearAllTimers();
    sound.stopSuspenseDrone();
    sound.playFalseStart();

    const newOppScore = player2.score + 1;
    setPlayer2(p => ({ ...p, score: newOppScore }));
    setRoundWinnerMessage(
      lang === 'ru'
        ? `${player1.username} сдался в этом раунде! Очко достаётся ${player2.username}`
        : lang === 'de'
          ? `${player1.username} hat diese Runde aufgegeben! Punkt für ${player2.username}`
          : `${player1.username} conceded this round! Point to ${player2.username}`
    );

    if (newOppScore >= 3) {
      finishMatch('p2', player1.score, newOppScore);
    } else {
      setStage('round_result');
      setRoundNumber(r => r + 1);
      setTimeout(() => {
        startRound();
      }, 2200);
    }
  };

  // User forfeits entire duel and leaves
  const handleForfeitMatchAndExit = () => {
    sound.playClick();
    setIsExitDialogOpen(false);

    if (isRealOpponent && activeRoomId) {
      multiplayer.leaveMatch(activeRoomId, myAssignedId);
    }

    const isReal = isRealOpponent || mode === 'local' || mode === 'room' || (mode === 'online' && !player2.id.startsWith('bot_'));
    onMatchComplete(
      'loss',
      player2.username,
      player2.avatarUrl,
      userBestReactionThisMatch === 999 ? 0 : userBestReactionThisMatch,
      [player1.score, 3],
      isReal
    );

    onExit();
  };

  // Click on top bar exit button
  const handleTopBarExit = () => {
    sound.playClick();
    if (matchFinished || stage === 'searching' || stage === 'idle') {
      onExit();
    } else {
      setIsExitDialogOpen(true);
    }
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-65px)] flex flex-col justify-between p-3 sm:p-6 overflow-hidden">
      {/* Background glow */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none transition-colors duration-700"
        style={{
          background: stage === 'signal_active' 
            ? 'radial-gradient(circle at center, #10b981 0%, transparent 70%)'
            : stage === 'waiting_signal'
            ? 'radial-gradient(circle at center, #ef4444 0%, transparent 60%)'
            : 'radial-gradient(circle at center, #06b6d4 0%, transparent 50%)'
        }}
      />

      {/* Top Match Bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-md">
        {/* Leave / Forfeit buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTopBarExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            title={t.backToMenu}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t.backToMenu}</span>
          </button>

          {!matchFinished && stage !== 'searching' && stage !== 'idle' && (
            <button
              onClick={() => setIsExitDialogOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-all cursor-pointer"
              title={lang === 'ru' ? 'Сдаться в раунде или матче' : lang === 'de' ? 'Runde oder Match aufgeben' : 'Concede round or match'}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{t.forfeitBtn}</span>
            </button>
          )}
        </div>

        {/* Round & Game Mode Badge */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400">
              {mode === 'online' ? t.playOnline : mode === 'local' ? t.playLocal : t.practice}
            </span>
            {isRealOpponent && (
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                REAL PVP
              </span>
            )}
          </div>
          <span className="text-sm font-extrabold font-mono text-neutral-200">
            {t.round} {roundNumber} &bull; <span className="text-amber-400">{t.firstToThree}</span>
          </span>
        </div>

        {/* Room Code Badge & Ping */}
        <div className="flex items-center gap-2">
          {activeRoomCode && (
            <button
              onClick={handleCopyDuelLink}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold transition-all cursor-pointer"
              title="Нажмите, чтобы скопировать ссылку"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{activeRoomCode}</span>
            </button>
          )}

          {isRealOpponent && (
            <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
              ⚡ <strong className="text-cyan-400">{latencyMs}ms</strong>
            </span>
          )}

          {/* Test early disconnect */}
          {mode === 'online' && !matchFinished && (
            <button
              onClick={simulateOpponentForfeit}
              className="text-[10px] text-neutral-400 hover:text-rose-400 underline transition-colors cursor-pointer"
              title={lang === 'ru' ? 'Тест ситуации: соперник покинул игру досрочно' : lang === 'de' ? 'Testfall: Gegner hat das Spiel vorzeitig verlassen' : 'Test early forfeit'}
            >
              {lang === 'ru' ? 'Тест выхода' : lang === 'de' ? 'Verlassen testen' : 'Test quit'}
            </button>
          )}
        </div>
      </div>

      {/* Duel Arena Center Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-4">
        {/* Searching for opponent overlay */}
        {stage === 'searching' && (
          <div className="flex flex-col items-center gap-4 text-center p-6 sm:p-8 bg-neutral-900/90 border border-neutral-800 rounded-3xl max-w-md w-full shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin flex items-center justify-center" />
              <Wifi className="w-8 h-8 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {activeRoomCode ? 'PRIVATE ROOM' : 'LIVE MATCHMAKING'}
                </span>
                <span className="text-xs font-mono text-neutral-400">{queueTime}s</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">{t.searchingOpponent}</h3>
              <p className="text-xs text-neutral-400 mt-1">
                {activeRoomCode
                  ? (lang === 'ru' 
                      ? 'Ожидание подключения второго игрока по коду или ссылке...' 
                      : lang === 'de'
                        ? 'Warten auf Spieler 2 per Code oder Einladungslink...'
                        : 'Waiting for Player 2 to join via code or invite link...')
                  : (lang === 'ru' 
                      ? 'Поиск подключённого реального игрока через WebSockets...' 
                      : lang === 'de'
                        ? 'Suche nach aktivem Spieler im Netzwerk via WebSockets...'
                        : 'Searching for an active real player on the network...')}
              </p>
            </div>

            {/* Room code copy box if waiting in a room */}
            {activeRoomCode && (
              <div className="w-full bg-neutral-950 border border-amber-500/30 rounded-2xl p-3 flex flex-col items-center gap-2">
                <div className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">
                  {lang === 'ru' ? 'Код вашей дуэли:' : lang === 'de' ? 'Dein Duell-Code:' : 'Your Duel Code:'}
                </div>
                <div className="text-2xl font-black font-mono text-amber-400 tracking-widest">
                  {activeRoomCode}
                </div>
                <div className="grid grid-cols-2 gap-2 w-full pt-1">
                  <button
                    onClick={handleCopyDuelLink}
                    className="py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? (lang === 'ru' ? 'Скопировано!' : lang === 'de' ? 'Kopiert!' : 'Copied!') : (lang === 'ru' ? 'Ссылка' : lang === 'de' ? 'Link kopieren' : 'Copy Link')}</span>
                  </button>
                  <button
                    onClick={handleOpenSecondTab}
                    className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-cyan-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title={lang === 'de' ? 'In zweitem Tab öffnen' : 'Open in second tab'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{lang === 'ru' ? '2-я вкладка' : lang === 'de' ? '2. Tab' : '2nd Tab'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick options if waiting in queue */}
            {!activeRoomCode && (
              <div className="w-full pt-2 flex flex-col gap-2 border-t border-neutral-800">
                <div className="text-[11px] text-neutral-500">
                  {lang === 'ru' 
                    ? 'Нет соперников прямо сейчас? Сыграйте тренировочный спарринг:' 
                    : lang === 'de'
                      ? 'Gerade keine Gegner da? Teste dein Können gegen den Sparring-Bot:'
                      : 'Waiting for opponent? Practice against sparring bot:'}
                </div>
                <button
                  onClick={handleStartSparringBot}
                  className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-cyan-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Swords className="w-4 h-4" />
                  <span>{lang === 'ru' ? 'Спарринг-бот (Мгновенный старт)' : lang === 'de' ? 'Sparring-Bot (Sofortstart)' : 'Sparring Bot (Instant Start)'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Ready to start screen */}
        {stage === 'ready' && !matchFinished && (
          <div className="flex flex-col items-center gap-6 text-center max-w-lg w-full bg-neutral-900/85 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-center gap-6 w-full">
              {/* P1 Card */}
              <div className="flex flex-col items-center gap-2">
                <UserAvatar
                  avatarUrl={player1.avatarUrl}
                  username={player1.username}
                  color={player1.color}
                  size="xl"
                />
                <span className="font-bold text-sm text-neutral-200">{player1.username}</span>
                <span className="text-[11px] font-mono text-cyan-400 font-semibold">{t.player1Key}</span>
              </div>

              <div className="flex flex-col items-center">
                <Swords className="w-8 h-8 text-amber-400 animate-bounce" />
                <span className="text-xs font-black text-neutral-400 mt-1">VS</span>
              </div>

              {/* P2 Card */}
              <div className="flex flex-col items-center gap-2">
                <UserAvatar
                  avatarUrl={player2.avatarUrl}
                  username={player2.username}
                  color={player2.color}
                  size="xl"
                />
                <span className="font-bold text-sm text-neutral-200">{player2.username}</span>
                <span className="text-[11px] font-mono text-amber-400 font-semibold">
                  {isRealOpponent ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ONLINE
                    </span>
                  ) : mode === 'local' ? t.player2Key : (mode === 'practice' ? (lang === 'ru' ? 'АДАПТИВНЫЙ БОТ' : lang === 'de' ? 'ADAPTIVER BOT' : 'ADAPTIVE BOT') : 'BOT')}
                </span>
              </div>
            </div>

            {/* In practice mode, explain bot adaptation with 10s countdown */}
            {mode === 'practice' && (
              <div className="w-full p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-left text-xs">
                <div className="flex items-center justify-between font-bold text-purple-300 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-400" />
                    <span>{lang === 'ru' ? 'Тренировка с адаптивным ботом' : lang === 'de' ? 'Training mit adaptivem Bot' : 'Adaptive Bot Practice'}</span>
                  </div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse font-bold">
                    {lang === 'ru' ? `Автостарт: ${practiceCountdown} сек` : lang === 'de' ? `Autostart: ${practiceCountdown}s` : `Auto-start: ${practiceCountdown}s`}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed mb-2.5">
                  {lang === 'ru'
                    ? 'Раунд 1: скорость бота 250 мс. Раунды 2 и 3: бот подстраивается под вашу скорость реакции, ускоряясь на 10% (-10% от времени игрока).'
                    : lang === 'de'
                      ? 'Runde 1: Reaktionszeit des Bots 250 ms. Runden 2 und 3: Der Bot passt sich deiner Geschwindigkeit an und ist 10% schneller (-10% deiner Zeit).'
                      : 'Round 1: bot reacts in 250ms. Rounds 2 & 3: bot adapts to your reaction speed, beating it by 10%.'}
                </p>
                {/* 10-second countdown progress bar */}
                <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden border border-purple-500/30">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, (practiceCountdown / 10) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* In local mode, color picker for P2 */}
            {mode === 'local' && (
              <div className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3">
                <div className="text-xs text-neutral-400 font-semibold mb-2 text-center">
                  {lang === 'ru' ? 'Цвет Игрока 2:' : lang === 'de' ? 'Farbe von Spieler 2:' : 'Player 2 Color:'}
                </div>
                <div className="flex items-center justify-center gap-2">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => {
                        sound.playClick();
                        setPlayer2(p => ({ ...p, color: col.hex }));
                      }}
                      className={`w-7 h-7 rounded-xl border-2 transition-transform cursor-pointer ${
                        player2.color === col.hex ? 'scale-115 border-white shadow-lg' : 'border-transparent opacity-70'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ready indicator */}
            {isRealOpponent ? (
              <div className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-2 animate-pulse">
                <Radio className="w-4 h-4" />
                <span>{lang === 'ru' ? 'Соперник подключён! Старт раунда...' : lang === 'de' ? 'Gegner verbunden! Runde startet...' : 'Opponent connected! Starting round...'}</span>
              </div>
            ) : mode === 'practice' ? (
              <button
                onClick={() => startRound(true)}
                className="w-full py-4 rounded-2xl font-black text-base sm:text-lg uppercase tracking-wider text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-400/40"
              >
                <Bot className="w-5 h-5" />
                <span>
                  {lang === 'ru' 
                    ? `Начать сейчас (${practiceCountdown} сек)` 
                    : lang === 'de'
                      ? `Jetzt starten (${practiceCountdown}s)`
                      : `Start Now (${practiceCountdown}s)`}
                </span>
              </button>
            ) : (
              <button
                onClick={() => startRound(true)}
                className="w-full py-4 rounded-2xl font-black text-lg uppercase tracking-wider text-black transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl cursor-pointer"
                style={{ backgroundColor: player1.color }}
              >
                {t.getReady}
              </button>
            )}
          </div>
        )}

        {/* ACTIVE DUEL ARENA (COUNTDOWN / WAITING / SIGNAL / RESULT) */}
        {!['searching', 'ready', 'match_over'].includes(stage) && (
          <div className="w-full max-w-2xl flex flex-col items-center">
            {/* Practice Mode Adaptive Bot Indicator */}
            {mode === 'practice' && (
              <div className="w-full flex items-center justify-between px-3.5 py-2 mb-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs shadow-md backdrop-blur-md">
                <div className="flex items-center gap-2 text-purple-300 font-bold">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>{lang === 'ru' ? 'Адаптивный Бот' : lang === 'de' ? 'Adaptiver Bot' : 'Adaptive Bot'}</span>
                </div>
                <div className="font-mono text-purple-300 text-xs font-bold">
                  {roundNumber === 1 ? (
                    <span className="text-amber-300">{lang === 'ru' ? 'Раунд 1: Бот 250 мс' : lang === 'de' ? 'Runde 1: Bot 250 ms' : 'Round 1: Bot 250 ms'}</span>
                  ) : (
                    <span className="text-purple-300">
                      {lang === 'ru' 
                        ? `Раунд ${roundNumber}: Бот ${currentBotTargetMsRef.current} мс (-10%)` 
                        : lang === 'de'
                          ? `Runde ${roundNumber}: Bot ${currentBotTargetMsRef.current} ms (-10%)`
                          : `Round ${roundNumber}: Bot ${currentBotTargetMsRef.current} ms (-10%)`}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Top Score & Reaction Times Header */}
            <div className="w-full flex items-center justify-between bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3 sm:p-4 mb-4 shadow-xl">
              {/* P1 Score */}
              <div className="relative flex items-center gap-3">
                {/* Floating emote */}
                {p1Emote && (
                  <div className="absolute -top-10 left-4 text-3xl animate-bounce pointer-events-none drop-shadow-lg">
                    {p1Emote}
                  </div>
                )}
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black font-mono text-2xl border-2 shadow-lg"
                  style={{ 
                    borderColor: player1.color,
                    backgroundColor: `${player1.color}25`,
                    color: player1.color
                  }}
                >
                  {player1.score}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-neutral-100">{player1.username}</div>
                  {player1.lastReactionMs && (
                    <div className="text-xs font-mono text-cyan-400 font-bold">
                      {player1.lastReactionMs} {t.ms}
                    </div>
                  )}
                  {player1.hasFalseStarted && (
                    <div className="text-[10px] font-bold text-rose-500 uppercase animate-pulse">
                      {t.falseStart}
                    </div>
                  )}
                </div>
              </div>

              {/* Target 3 score indicator */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(dot => (
                    <div
                      key={dot}
                      className={`w-3 h-3 rounded-full transition-all ${
                        player1.score > dot
                          ? 'scale-110 shadow-lg'
                          : 'bg-neutral-800'
                      }`}
                      style={{
                        backgroundColor: player1.score > dot ? player1.color : undefined,
                      }}
                    />
                  ))}
                  <span className="text-neutral-500 font-mono text-xs font-black mx-1">:</span>
                  {[0, 1, 2].map(dot => (
                    <div
                      key={dot}
                      className={`w-3 h-3 rounded-full transition-all ${
                        player2.score > dot
                          ? 'scale-110 shadow-lg'
                          : 'bg-neutral-800'
                      }`}
                      style={{
                        backgroundColor: player2.score > dot ? player2.color : undefined,
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-1">
                  {t.firstToThree}
                </span>
              </div>

              {/* P2 Score */}
              <div className="relative flex items-center gap-3 text-right">
                {/* Floating emote */}
                {p2Emote && (
                  <div className="absolute -top-10 right-4 text-3xl animate-bounce pointer-events-none drop-shadow-lg">
                    {p2Emote}
                  </div>
                )}
                <div>
                  <div className="font-extrabold text-sm text-neutral-100">{player2.username}</div>
                  {player2.lastReactionMs && (
                    <div className="text-xs font-mono text-amber-400 font-bold">
                      {player2.lastReactionMs} {t.ms}
                    </div>
                  )}
                  {player2.hasFalseStarted && (
                    <div className="text-[10px] font-bold text-rose-500 uppercase animate-pulse">
                      {t.falseStart}
                    </div>
                  )}
                </div>
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black font-mono text-2xl border-2 shadow-lg"
                  style={{ 
                    borderColor: player2.color,
                    backgroundColor: `${player2.color}25`,
                    color: player2.color
                  }}
                >
                  {player2.score}
                </div>
              </div>
            </div>

            {/* Central Signal Screen / Action Arena */}
            <div 
              className={`w-full max-w-2xl h-72 sm:h-80 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200 select-none shadow-2xl border-2 ${
                stage === 'countdown'
                  ? 'bg-neutral-900/90 border-neutral-800'
                  : stage === 'waiting_signal'
                  ? 'bg-rose-950/40 border-rose-600/80 animate-pulse'
                  : stage === 'signal_active'
                  ? 'bg-emerald-500 border-white scale-[1.02] shadow-emerald-500/80'
                  : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              {/* STAGE: COUNTDOWN (3... 2... 1...) */}
              {stage === 'countdown' && (
                <div className="flex flex-col items-center gap-2 animate-in zoom-in-50 duration-200">
                  <span className="text-7xl sm:text-9xl font-black font-mono text-white tracking-tighter drop-shadow-2xl">
                    {countdown}
                  </span>
                  <span className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">
                    {t.readyCountdown}
                  </span>
                </div>
              )}

              {/* STAGE: WAITING FOR RANDOM SIGNAL (0.5s - 10s) */}
              {stage === 'waiting_signal' && (
                <div className="flex flex-col items-center gap-3 text-center px-4 animate-in fade-in duration-150">
                  <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center animate-ping">
                    <Timer className="w-7 h-7 text-rose-400" />
                  </div>
                  <div className="text-2xl sm:text-4xl font-black text-rose-400 tracking-wider">
                    {t.waitingSignal}
                  </div>
                  <div className="text-xs sm:text-sm text-neutral-400 max-w-sm">
                    {lang === 'ru' 
                      ? 'Случайная задержка (0.5 - 10 сек). НЕ НАЖИМАЙТЕ раньше — фальстарт обнулит очки!' 
                      : lang === 'de'
                        ? 'Zufällige Verzögerung (0,5 - 10 Sek.). NICHT zu früh drücken – Fehlstart setzt Punkte auf 0!'
                        : 'Random delay (0.5 - 10s). DO NOT tap early — false start resets points to 0!'}
                  </div>
                </div>
              )}

              {/* STAGE: SIGNAL ACTIVE - TAP NOW! */}
              {stage === 'signal_active' && (
                <div className="flex flex-col items-center gap-2 text-center animate-in zoom-in-90 duration-75">
                  <Sparkles className="w-12 h-12 text-white animate-spin" />
                  <span className="text-5xl sm:text-7xl font-black text-white tracking-tighter drop-shadow-lg">
                    {t.signalGo}
                  </span>
                  <span className="text-xs uppercase font-bold tracking-widest text-emerald-950 bg-white/80 px-3 py-1 rounded-full">
                    {mode === 'local' ? '[A] / [L]' : t.pressOrClick}
                  </span>
                </div>
              )}

              {/* STAGE: ROUND RESULT */}
              {stage === 'round_result' && (
                <div className="flex flex-col items-center gap-3 text-center px-4">
                  <div className="text-xl sm:text-2xl font-black text-white drop-shadow">
                    {roundWinnerMessage}
                  </div>
                  <div className="text-xs text-neutral-400 animate-pulse">
                    {lang === 'ru' ? 'Следующий раунд начинается...' : lang === 'de' ? 'Nächste Runde beginnt...' : 'Next round starting...'}
                  </div>
                </div>
              )}
            </div>

            {/* Split Screen Click Zones */}
            {mode === 'local' ? (
              <div className="w-full max-w-2xl grid grid-cols-2 gap-3 mt-4">
                {/* Player 1 Click Zone */}
                <button
                  onPointerDown={() => handlePlayerHit(1)}
                  className="h-28 sm:h-36 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 font-black transition-all active:scale-95 shadow-xl cursor-pointer"
                  style={{
                    borderColor: player1.color,
                    backgroundColor: `${player1.color}20`,
                    color: player1.color,
                  }}
                >
                  <span className="text-base sm:text-lg uppercase">{player1.username}</span>
                  <span className="text-xs font-mono opacity-80">{t.player1Key}</span>
                  <span className="text-[10px] text-neutral-400">{t.player1Touch}</span>
                </button>

                {/* Player 2 Click Zone */}
                <button
                  onPointerDown={() => handlePlayerHit(2)}
                  className="h-28 sm:h-36 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 font-black transition-all active:scale-95 shadow-xl cursor-pointer"
                  style={{
                    borderColor: player2.color,
                    backgroundColor: `${player2.color}20`,
                    color: player2.color,
                  }}
                >
                  <span className="text-base sm:text-lg uppercase">{player2.username}</span>
                  <span className="text-xs font-mono opacity-80">{t.player2Key}</span>
                  <span className="text-[10px] text-neutral-400">{t.player2Touch}</span>
                </button>
              </div>
            ) : (
              /* Single Big Tap Zone for Online / Solo Practice */
              <div className="w-full max-w-2xl mt-4">
                <button
                  onPointerDown={() => handlePlayerHit(1)}
                  className="w-full h-24 sm:h-28 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 font-black transition-all active:scale-95 shadow-xl cursor-pointer select-none"
                  style={{
                    borderColor: player1.color,
                    backgroundColor: `${player1.color}20`,
                    color: player1.color,
                  }}
                >
                  <span className="text-lg sm:text-xl uppercase tracking-wider">{t.signalGo}</span>
                  <span className="text-xs font-mono opacity-80">{t.pressOrClick} / [A]</span>
                </button>
              </div>
            )}

            {/* In-game Quick Emotes Bar for Online Duel */}
            {isRealOpponent && (
              <div className="flex items-center gap-2 mt-3 bg-neutral-900/80 border border-neutral-800 rounded-2xl px-3 py-1.5 shadow-lg">
                <span className="text-[11px] text-neutral-400 font-semibold mr-1">
                  {lang === 'ru' ? 'Реакция:' : lang === 'de' ? 'Reaktion:' : 'Emote:'}
                </span>
                {QUICK_EMOTES.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleSendEmote(emoji)}
                    className="text-lg p-1.5 hover:scale-125 transition-transform cursor-pointer"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MATCH FINISHED MODAL / SCREEN */}
        {matchFinished && (
          <div className="flex flex-col items-center gap-6 text-center max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-xl"
              style={{
                borderColor: matchWinner === 'p1' ? player1.color : player2.color,
                backgroundColor: matchWinner === 'p1' ? `${player1.color}30` : `${player2.color}30`,
              }}
            >
              <Trophy className="w-10 h-10" style={{ color: matchWinner === 'p1' ? player1.color : player2.color }} />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {opponentDisconnected
                  ? t.technicalVictory
                  : matchWinner === 'p1'
                  ? `${player1.username} ${t.matchWon}`
                  : `${player2.username} ${t.matchWon}`}
              </h2>
              {opponentDisconnected && (
                <p className="text-xs text-amber-400 mt-1 font-semibold">
                  {t.opponentAbandoned}
                </p>
              )}
            </div>

            {/* Score & Reaction Summary */}
            <div className="w-full bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 font-mono">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">{player1.username}</span>
                <span className="text-xl font-black" style={{ color: player1.color }}>{player1.score}</span>
              </div>
              <div className="h-px bg-neutral-800" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-400">{player2.username}</span>
                <span className="text-xl font-black" style={{ color: player2.color }}>{player2.score}</span>
              </div>
              {userBestReactionThisMatch < 900 && (
                <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between text-xs text-cyan-400">
                  <span>{t.bestReaction}:</span>
                  <span className="font-bold">{userBestReactionThisMatch} {t.ms}</span>
                </div>
              )}
            </div>

            {/* Action buttons with Rematch */}
            <div className="flex flex-col gap-2.5 w-full">
              {isRealOpponent && activeRoomId ? (
                rematchOfferedByOpponent ? (
                  <button
                    onClick={handleAcceptRematch}
                    className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer"
                  >
                    {lang === 'ru' ? '⚔️ Принять реванш соперника!' : lang === 'de' ? '⚔️ Revanche annehmen!' : '⚔️ Accept Rematch!'}
                  </button>
                ) : rematchRequestedByMe ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-xl font-bold text-neutral-400 bg-neutral-800 uppercase tracking-wider text-xs flex items-center justify-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>{lang === 'ru' ? 'Ожидание ответа на реванш...' : lang === 'de' ? 'Warte auf Antwort zur Revanche...' : 'Waiting for rematch answer...'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRequestRematch}
                    className="w-full py-3.5 rounded-xl font-bold text-black uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer"
                    style={{ backgroundColor: player1.color }}
                  >
                    {lang === 'ru' ? '⚔️ Предложить реванш' : lang === 'de' ? '⚔️ Revanche anbieten' : '⚔️ Offer Rematch'}
                  </button>
                )
              ) : (
                <button
                  onClick={handleRestart}
                  className="w-full py-3.5 rounded-xl font-bold text-black uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg cursor-pointer"
                  style={{ backgroundColor: player1.color }}
                >
                  {t.playAgain}
                </button>
              )}

              <button
                onClick={onExit}
                className="w-full py-3 rounded-xl font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-all cursor-pointer text-sm"
              >
                {t.backToMenu}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="relative z-10 text-center py-2 text-xs text-neutral-500">
        {mode === 'local' 
          ? (lang === 'ru' 
              ? 'Слева: Игрок 1 [клавиша A] • Справа: Игрок 2 [клавиша L]' 
              : lang === 'de'
                ? 'Links: Spieler 1 [Taste A] • Rechts: Spieler 2 [Taste L]'
                : 'Left: Player 1 [A] • Right: Player 2 [L]')
          : (lang === 'ru' 
              ? 'Нажмите Пробел или коснитесь экрана по сигналу' 
              : lang === 'de'
                ? 'Drücke Leertaste oder tippe auf den Bildschirm beim Signal'
                : 'Press Space or tap screen when signal flashes')}
      </div>

      {/* Forfeit / Exit Confirmation Dialog */}
      {isExitDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-lg">
              <Flag className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">{t.exitConfirmTitle}</h3>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {t.exitConfirmDesc}
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              {/* Option 1: Forfeit current round (opponent gets point, match continues) */}
              <button
                onClick={handleForfeitRound}
                className="w-full py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Flag className="w-4 h-4" />
                <span>{t.forfeitRound} (+1 {lang === 'ru' ? 'очко сопернику' : lang === 'de' ? 'Punkt für den Gegner' : 'point to opponent'})</span>
              </button>

              {/* Option 2: Forfeit match and leave to lobby */}
              <button
                onClick={handleForfeitMatchAndExit}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.forfeitMatch} ({lang === 'ru' ? 'Техническое поражение' : lang === 'de' ? 'Technische Niederlage' : 'Technical loss'})</span>
              </button>

              {/* Option 3: Cancel and continue fighting */}
              <button
                onClick={() => setIsExitDialogOpen(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-all cursor-pointer"
              >
                {t.cancelStay}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
