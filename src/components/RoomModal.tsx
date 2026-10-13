import React, { useState, useEffect } from 'react';
import { Swords, Copy, Check, X, Users, ArrowRight, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { Language, UserProfile, DuelPlayer } from '../types';
import { translations } from '../utils/i18n';
import { sound } from '../utils/audio';
import { multiplayer } from '../utils/multiplayer';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  lang: Language;
  onRoomMatched: (roomId: string, roomCode: string, opponent: DuelPlayer) => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  user,
  lang,
  onRoomMatched,
}) => {
  const t = translations[lang];
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [createdRoomCode, setCreatedRoomCode] = useState<string>('');
  const [createdRoomId, setCreatedRoomId] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isWaitingPlayer, setIsWaitingPlayer] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setIsWaitingPlayer(false);
      setCreatedRoomCode('');
      setCreatedRoomId('');
      setInputCode('');
      setJoinError('');
      setIsJoining(false);
      return;
    }

    const unsubscribe = multiplayer.subscribe((msg) => {
      if (msg.type === 'room:created') {
        setCreatedRoomCode((msg.roomCode as string) || '');
        setCreatedRoomId((msg.roomId as string) || '');
        setIsWaitingPlayer(true);
      } else if (msg.type === 'match:found') {
        sound.playGameStart();
        const oppData = msg.opponent as {
          id: string;
          username: string;
          avatarUrl: string;
          color: string;
        };
        const oppPlayer: DuelPlayer = {
          id: oppData.id,
          username: oppData.username,
          avatarUrl: oppData.avatarUrl,
          color: oppData.color,
          score: 0,
        };
        onRoomMatched((msg.roomId as string) || '', (msg.roomCode as string) || '', oppPlayer);
        onClose();
      } else if (msg.type === 'room:error') {
        setIsJoining(false);
        setJoinError((msg.message as string) || 'Room error');
        sound.playFalseStart();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, onClose, onRoomMatched]);

  if (!isOpen) return null;

  const handleCreateRoom = () => {
    sound.playClick();
    setIsWaitingPlayer(true);
    multiplayer.createRoom(user);
  };

  const handleCopyCode = () => {
    if (!createdRoomCode) return;
    navigator.clipboard?.writeText(createdRoomCode);
    sound.playClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) {
      setJoinError(t.invalidCode);
      return;
    }
    sound.playClick();
    setIsJoining(true);
    setJoinError('');
    multiplayer.joinRoom(clean, user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg"
              style={{ backgroundColor: `${user.color}20`, borderColor: user.color }}
            >
              <Swords className="w-5 h-5" style={{ color: user.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{t.playRoom}</h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  REAL PVP
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {lang === 'ru' ? 'Сражение с реальным человеком по уникальному коду' : lang === 'de' ? 'Echtzeit-Duell mit einem anderen Spieler per Raumcode' : 'Real-time duel with another player via room code'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-neutral-950 p-2 border-b border-neutral-800 gap-2">
          <button
            onClick={() => {
              setTab('create');
              setJoinError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'create' ? 'bg-neutral-800 text-cyan-400 shadow-md' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t.createRoom}
          </button>
          <button
            onClick={() => {
              setTab('join');
              setJoinError('');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'join' ? 'bg-neutral-800 text-cyan-400 shadow-md' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t.joinRoom}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {tab === 'create' ? (
            <div className="flex flex-col items-center text-center gap-5">
              {!isWaitingPlayer ? (
                <>
                  <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      {lang === 'ru' ? 'Создать приватную дуэль' : lang === 'de' ? 'Privates Duell erstellen' : 'Host a Private Duel'}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                      {t.shareCodeDesc}
                    </p>
                  </div>
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-sm tracking-wider transition-all transform hover:scale-[1.02] shadow-xl cursor-pointer"
                  >
                    {t.createRoom}
                  </button>
                </>
              ) : (
                <div className="w-full flex flex-col items-center gap-5 animate-in zoom-in-95 duration-150">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin mb-3 flex items-center justify-center" />
                    <h4 className="text-base font-extrabold text-white">{t.waitingRealPlayer}</h4>
                    <p className="text-xs text-neutral-400 mt-0.5">{t.shareCodeDesc}</p>
                  </div>

                  {/* Room Code Display Box */}
                  <div className="w-full bg-neutral-950 border border-cyan-500/40 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                    <div className="text-left font-mono">
                      <span className="text-[10px] text-neutral-500 block uppercase font-bold">
                        {lang === 'ru' ? 'Код комнаты для второго игрока:' : lang === 'de' ? 'Raumcode für den 2. Spieler:' : 'Duel Room Code:'}
                      </span>
                      <span className="text-2xl font-black text-white tracking-widest">
                        {createdRoomCode || 'GENERATING...'}
                      </span>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? t.codeCopied : (lang === 'ru' ? 'Скопировать код' : lang === 'de' ? 'Code kopieren' : 'Copy Code')}</span>
                    </button>
                  </div>

                  <div className="text-xs text-neutral-500">
                    {lang === 'ru' ? 'Как только второй игрок введёт код, дуэль начнётся мгновенно!' : lang === 'de' ? 'Sobald der 2. Spieler den Code eingibt, beginnt das Duell sofort!' : 'As soon as your friend enters this code, the duel will start immediately!'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab: Join Room */
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-base font-extrabold text-white">
                  {lang === 'ru' ? 'Присоединиться к дуэли' : lang === 'de' ? 'Duell beitreten' : 'Join Duel Room'}
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  {lang === 'ru' ? 'Введите 5-значный код комнаты, полученный от друга' : lang === 'de' ? 'Gib den 5-stelligen Raumcode deines Freundes ein' : 'Enter the 5-char code received from your friend'}
                </p>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={10}
                  required
                  autoFocus
                  placeholder="DUEL-CODE"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3.5 text-center font-mono text-2xl font-black text-cyan-400 tracking-widest placeholder-neutral-700 focus:outline-none focus:border-cyan-500 shadow-inner"
                />
              </div>

              {joinError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center animate-in fade-in">
                  {joinError}
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining}
                className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black uppercase text-sm tracking-wider flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shadow-xl cursor-pointer"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ru' ? 'Подключение...' : lang === 'de' ? 'Verbindung wird hergestellt...' : 'Connecting...'}</span>
                  </>
                ) : (
                  <>
                    <span>{t.joinRoom}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'ru' ? 'Серверная синхронизация без задержек' : lang === 'de' ? 'Server-Präzisions-Synchronisierung' : 'Server-authoritative synchronization'}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
