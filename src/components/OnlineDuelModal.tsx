import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Users, 
  Copy, 
  Check, 
  ExternalLink, 
  Swords, 
  X, 
  Radio, 
  ArrowRight, 
  Globe, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Language, UserProfile, DuelPlayer } from '../types';
import { translations } from '../utils/i18n';
import { multiplayer } from '../utils/multiplayer';
import { sound } from '../utils/audio';
import { getDuelInviteUrl, getLocalDevDuelUrl } from '../utils/shareUtils';

interface OnlineDuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  lang: Language;
  onStartDuel: (roomId: string, roomCode: string, opponent?: DuelPlayer) => void;
}

export const OnlineDuelModal: React.FC<OnlineDuelModalProps> = ({
  isOpen,
  onClose,
  user,
  lang,
  onStartDuel,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'quick' | 'create' | 'join'>('quick');
  const [createdRoomCode, setCreatedRoomCode] = useState<string>('');
  const [createdRoomId, setCreatedRoomId] = useState<string>('');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSearchingQueue, setIsSearchingQueue] = useState<boolean>(false);
  const [queueSize, setQueueSize] = useState<number>(1);
  const [searchSeconds, setSearchSeconds] = useState<number>(0);
  const [onlineCount, setOnlineCount] = useState<number>(multiplayer.getOnlineCount());
  const [activeMatches, setActiveMatches] = useState<number>(multiplayer.getActiveMatches());
  const [latency, setLatency] = useState<number>(multiplayer.getLatency());

  // Subscribe to multiplayer websocket events
  useEffect(() => {
    if (!isOpen) return;

    multiplayer.connect(user);

    const unsubscribe = multiplayer.subscribe((msg) => {
      if (msg.type === 'stats:update' || msg.type === 'connection:ack') {
        if (msg.onlinePlayers !== undefined) setOnlineCount(msg.onlinePlayers as number);
        if (msg.onlineCount !== undefined) setOnlineCount(msg.onlineCount as number);
        if (msg.activeMatches !== undefined) setActiveMatches(msg.activeMatches as number);
      } else if (msg.type === 'room:created') {
        setCreatedRoomCode(msg.roomCode as string);
        setCreatedRoomId(msg.roomId as string);
        setErrorMessage('');
      } else if (msg.type === 'queue:waiting') {
        setQueueSize((msg.queueSize as number) || 1);
      } else if (msg.type === 'match:found') {
        const rId = msg.roomId as string;
        const rCode = msg.roomCode as string;
        const oppData = msg.opponent as {
          id: string;
          username: string;
          avatarUrl: string;
          color: string;
          country?: string;
        };

        const oppPlayer: DuelPlayer = {
          id: oppData.id,
          username: oppData.username,
          avatarUrl: oppData.avatarUrl,
          color: oppData.color,
          score: 0,
          lastReactionMs: null,
          hasFalseStarted: false,
        };

        sound.playGameStart();
        onClose();
        onStartDuel(rId, rCode, oppPlayer);
      } else if (msg.type === 'room:error') {
        setErrorMessage(msg.message as string);
      }
    });

    const latencyInterval = setInterval(() => {
      setLatency(multiplayer.getLatency());
      setOnlineCount(multiplayer.getOnlineCount());
      setActiveMatches(multiplayer.getActiveMatches());
    }, 1500);

    return () => {
      unsubscribe();
      clearInterval(latencyInterval);
      if (isSearchingQueue) {
        multiplayer.leaveQueue();
      }
    };
  }, [isOpen, user, isSearchingQueue, onStartDuel, onClose]);

  // Queue timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSearchingQueue) {
      interval = setInterval(() => {
        setSearchSeconds(s => s + 1);
      }, 1000);
    } else {
      setSearchSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSearchingQueue]);

  if (!isOpen) return null;

  // Actions
  const handleStartQuickMatch = () => {
    sound.playClick();
    setErrorMessage('');
    setIsSearchingQueue(true);
    multiplayer.joinQueue(user);
  };

  const handleCancelQuickMatch = () => {
    sound.playClick();
    setIsSearchingQueue(false);
    multiplayer.leaveQueue();
  };

  const handleCreateRoom = () => {
    sound.playClick();
    setErrorMessage('');
    multiplayer.createRoom(user);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage(lang === 'ru' ? 'Введите код комнаты' : lang === 'de' ? 'Raumcode eingeben' : 'Enter room code');
      return;
    }
    sound.playClick();
    setErrorMessage('');
    multiplayer.joinRoom(cleanCode, user);
  };

  const getShareableDuelUrl = () => {
    return getDuelInviteUrl(createdRoomCode);
  };

  const handleCopyLink = () => {
    sound.playClick();
    const url = getShareableDuelUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      });
    }
  };

  const handleOpenSecondTab = () => {
    sound.playClick();
    const url = getLocalDevDuelUrl(createdRoomCode);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col gap-6">
        {/* Glow Accent */}
        <div 
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: user.color }}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg"
              style={{ borderColor: user.color, backgroundColor: `${user.color}20` }}
            >
              <Globe className="w-6 h-6" style={{ color: user.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">
                  {lang === 'ru' ? 'Онлайн игра с реальным игроком' : lang === 'de' ? 'Online-Spiel mit echtem Gegner' : 'Real Player Online Duel'}
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  PVP LIVE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {lang === 'ru'
                  ? 'Соревнуйтесь по WebSockets в реальном времени с защитой от фальстартов'
                  : lang === 'de'
                    ? 'Echtzeit-Duelle per WebSockets mit Frühstart-Erkennung'
                    : 'Compete in real-time WebSockets with synchronized reaction timing'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isSearchingQueue) handleCancelQuickMatch();
              onClose();
            }}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Network Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-neutral-950/70 border border-neutral-800 text-xs font-mono">
          <div className="flex items-center gap-2 text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="font-bold">{onlineCount}</span>
            <span className="text-neutral-400 font-sans text-[11px]">
              {lang === 'ru' ? 'в сети' : lang === 'de' ? 'online' : 'online'}
            </span>
          </div>

          <div className="text-neutral-400 text-[11px] font-sans">
            ⚔️ <span className="font-mono text-neutral-200 font-bold">{activeMatches}</span> {lang === 'ru' ? 'активных дуэлей' : lang === 'de' ? 'Duelle' : 'battles'}
          </div>

          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Ping: <strong className="text-cyan-400 font-mono">{latency}ms</strong></span>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-neutral-950/80 p-1.5 rounded-2xl border border-neutral-800 text-xs font-bold">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('quick');
              setErrorMessage('');
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
              activeTab === 'quick'
                ? 'bg-neutral-800 text-cyan-400 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {lang === 'ru' ? 'Случайный подбор' : lang === 'de' ? 'Schnellsuche' : 'Quick Match'}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('create');
              setErrorMessage('');
              if (!createdRoomCode) handleCreateRoom();
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
              activeTab === 'create'
                ? 'bg-neutral-800 text-amber-400 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {lang === 'ru' ? 'Создать комнату' : lang === 'de' ? 'Raum erstellen' : 'Create Room'}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('join');
              setErrorMessage('');
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
              activeTab === 'join'
                ? 'bg-neutral-800 text-purple-400 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {lang === 'ru' ? 'Войти по коду' : lang === 'de' ? 'Mit Code beitreten' : 'Join by Code'}
          </button>
        </div>

        {/* Tab 1: Quick Matchmaking */}
        {activeTab === 'quick' && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            {!isSearchingQueue ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Swords className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {lang === 'ru' ? 'Случайный подбор онлайн соперника' : lang === 'de' ? 'Zufällige Online-Gegnersuche' : 'Random Online Matchmaking'}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                    {lang === 'ru'
                      ? 'Сервер автоматически соединит вас с первым свободным реальным соперником в сети.'
                      : lang === 'de'
                        ? 'Der Server verbindet dich automatisch mit dem nächsten verfügbaren Online-Spieler.'
                        : 'Server will automatically pair you with the next active player worldwide.'}
                  </p>
                </div>

                <button
                  onClick={handleStartQuickMatch}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-black bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Wifi className="w-4 h-4" />
                  <span>{lang === 'ru' ? 'Найти реального соперника' : lang === 'de' ? 'Echten Gegner suchen' : 'Find Real Opponent'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4 w-full">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <Wifi className="w-8 h-8 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                </div>

                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      LIVE QUEUE
                    </span>
                    <span className="text-xs font-mono text-neutral-400">{searchSeconds}s</span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {lang === 'ru' ? 'Поиск реального соперника...' : lang === 'de' ? 'Suche nach echtem Gegner...' : 'Searching for Real Player...'}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    {lang === 'ru'
                      ? `Игроков в очереди ожидания: ${queueSize}. Ожидание подключения...`
                      : lang === 'de'
                        ? `Spieler in der Warteschlange: ${queueSize}. Bitte warten...`
                        : `Players in matchmaking queue: ${queueSize}. Stand by...`}
                  </p>
                </div>

                <button
                  onClick={handleCancelQuickMatch}
                  className="px-6 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create Private Room & Invite Real Friend */}
        {activeTab === 'create' && (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            {!createdRoomCode ? (
              <button
                onClick={handleCreateRoom}
                className="w-full py-3.5 rounded-2xl font-bold text-sm bg-neutral-800 hover:bg-neutral-700 text-amber-400 transition-all cursor-pointer"
              >
                {lang === 'ru' ? 'Сгенерировать комнату' : lang === 'de' ? 'Raum generieren' : 'Generate Room'}
              </button>
            ) : (
              <div className="w-full flex flex-col items-center gap-4">
                <span className="text-xs text-neutral-400 uppercase tracking-wider font-bold">
                  {lang === 'ru' ? 'Код вашей комнаты' : lang === 'de' ? 'Dein Raumcode' : 'Your Room Code'}
                </span>

                {/* Big Room Code Display */}
                <div className="flex items-center justify-center gap-2 py-3 px-6 bg-neutral-950 border border-amber-500/40 rounded-2xl shadow-inner">
                  {createdRoomCode.split('').map((char, idx) => (
                    <span
                      key={idx}
                      className="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-wider"
                    >
                      {char}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-neutral-400 max-w-md">
                  {lang === 'ru'
                    ? 'Отправьте код или ссылку другу. Как только второй игрок войдет, дуэль начнётся мгновенно!'
                    : lang === 'de'
                      ? 'Sende den Code oder Link an einen Freund. Das Duell beginnt sofort beim Beitritt!'
                      : 'Share this code or link with a friend. Match starts automatically when they join!'}
                </p>

                {/* Action Buttons for Room */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
                  <button
                    onClick={handleCopyLink}
                    className="py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? (lang === 'ru' ? 'Ссылка скопирована!' : lang === 'de' ? 'Link kopiert!' : 'Link Copied!') : (lang === 'ru' ? 'Скопировать ссылку' : lang === 'de' ? 'Link kopieren' : 'Copy Duel Link')}</span>
                  </button>

                  <button
                    onClick={handleOpenSecondTab}
                    className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-cyan-400 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 border border-neutral-700"
                    title={lang === 'de' ? 'In zweitem Tab öffnen (Test)' : 'Открыть дуэль во второй вкладке для проверки онлайн-режима'}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{lang === 'ru' ? 'Открыть 2-ю вкладку' : lang === 'de' ? '2. Tab öffnen' : 'Open 2nd Tab (Test)'}</span>
                  </button>
                </div>

                {/* Waiting indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 font-mono mt-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>{lang === 'ru' ? 'Ожидание подключения 2-го игрока...' : lang === 'de' ? 'Warte auf 2. Spieler...' : 'Waiting for Player 2 to join...'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Join Room by Code */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinByCode} className="flex flex-col gap-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-2">
                {lang === 'ru' ? 'Введите 5-значный код комнаты друга:' : lang === 'de' ? '5-stelligen Raumcode deines Freundes eingeben:' : 'Enter 5-character friend room code:'}
              </label>
              <input
                type="text"
                maxLength={8}
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="7X29A"
                className="w-full px-4 py-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-white font-mono text-center text-xl font-bold tracking-widest uppercase focus:outline-none focus:border-purple-500 transition-colors"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-purple-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Swords className="w-4 h-4" />
              <span>{lang === 'ru' ? 'Присоединиться к битве' : lang === 'de' ? 'Duell beitreten' : 'Join Battle'}</span>
            </button>
          </form>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
