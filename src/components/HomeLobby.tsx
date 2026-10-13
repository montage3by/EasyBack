import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Users, 
  Target, 
  Zap, 
  Flame, 
  ShieldCheck, 
  HelpCircle, 
  Heart,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Globe,
  Radio,
  Share2,
  Lock,
  UserCheck
} from 'lucide-react';
import { GameMode, Language, UserProfile } from '../types';
import { translations } from '../utils/i18n';
import { sound } from '../utils/audio';
import { multiplayer } from '../utils/multiplayer';
import { UserAvatar } from './UserAvatar';

interface HomeLobbyProps {
  user: UserProfile;
  lang: Language;
  onStartGame: (mode: GameMode) => void;
  onOpenOnlineModal: () => void;
  onOpenDonate: () => void;
  onOpenGuestLink: () => void;
  onOpenProfile: () => void;
  onOpenRules: () => void;
  onOpenAdmin: () => void;
}

export const HomeLobby: React.FC<HomeLobbyProps> = ({
  user,
  lang,
  onStartGame,
  onOpenOnlineModal,
  onOpenDonate,
  onOpenGuestLink,
  onOpenProfile,
  onOpenRules,
  onOpenAdmin,
}) => {
  const t = translations[lang];

  const [onlineCount, setOnlineCount] = useState<number>(multiplayer.getOnlineCount());
  const [activeBattles, setActiveBattles] = useState<number>(multiplayer.getActiveMatches());

  useEffect(() => {
    multiplayer.connect(user);
    const unsubscribe = multiplayer.subscribe((msg) => {
      if (msg.type === 'stats:update' || msg.type === 'connection:ack') {
        if (msg.onlinePlayers !== undefined) setOnlineCount(msg.onlinePlayers as number);
        if (msg.onlineCount !== undefined) setOnlineCount(msg.onlineCount as number);
        if (msg.activeMatches !== undefined) setActiveBattles(msg.activeMatches as number);
      }
    });

    const interval = setInterval(() => {
      setOnlineCount(multiplayer.getOnlineCount());
      setActiveBattles(multiplayer.getActiveMatches());
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user]);

  const handleModeClick = (mode: GameMode) => {
    sound.playGameStart();
    if (mode === 'online') {
      onOpenOnlineModal();
      return;
    }

    onStartGame(mode);
  };

  const getReactionTier = (ms: number) => {
    if (!ms || ms === 0) return { label: 'Unranked', color: 'text-neutral-400' };
    if (ms < 180) return { label: 'LIGHTNING ELITE', color: 'text-cyan-400' };
    if (ms < 210) return { label: 'PRO REFLEX', color: 'text-emerald-400' };
    if (ms < 250) return { label: 'FAST GUNSLINGER', color: 'text-amber-400' };
    return { label: 'WARMING UP', color: 'text-purple-400' };
  };

  const tier = getReactionTier(user.stats.bestReactionMs);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 flex flex-col gap-8">
      {/* Hero Banner / Greeting */}
      <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div 
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: user.color }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div 
              className="relative cursor-pointer group"
              onClick={onOpenProfile}
              title={lang === 'ru' ? 'Нажмите для изменения ника или аватара' : 'Click to edit nickname or avatar'}
            >
              <UserAvatar
                avatarUrl={user.avatarUrl}
                username={user.username}
                color={user.color}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-2xl transition-transform group-hover:scale-105"
                size="custom"
              />
              <span className="absolute -bottom-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-950 text-white border border-neutral-700">
                {user.country}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{user.username}</h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-mono">
                  {tier.label}
                </span>
                {user.isAdmin && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-md line-clamp-1">{user.bio || 'Игрок Reflex Duel'}</p>
              
              <div className="flex items-center gap-3 mt-2 text-xs font-mono flex-wrap">
                <span className="text-cyan-400 font-bold">
                  ⚡ {t.bestReaction}: {user.stats.bestReactionMs > 0 ? `${user.stats.bestReactionMs}ms` : '---'}
                </span>
                <span className="text-neutral-600">&bull;</span>
                <span className="text-amber-400 font-bold">
                  🏆 {user.stats.matchesWon} {t.wins}
                </span>
                <span className="text-neutral-600">&bull;</span>
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="text-neutral-400 hover:text-cyan-400 transition-colors underline cursor-pointer"
                >
                  {lang === 'ru' ? 'Изменить ник' : 'Edit profile'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions in Profile Area: Guest Link, Rules & Donate */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={onOpenGuestLink}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title={lang === 'ru' ? 'Постоянная гостевая ссылка (пригласить других)' : 'Permanent guest link'}
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ru' ? 'Гостевая ссылка' : lang === 'de' ? 'Gast-Link' : 'Guest Link'}</span>
            </button>
            <button
              onClick={onOpenRules}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>{t.rules}</span>
            </button>
            <button
              onClick={onOpenDonate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-rose-500/20 to-amber-500/20 hover:from-rose-500/30 hover:to-amber-500/30 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
              title={t.donateTitle}
            >
              <Heart className="w-4 h-4 fill-rose-500/40 text-rose-400 animate-pulse" />
              <span>{t.donate}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Real-Player Online PvP Section */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-neutral-900/80 to-neutral-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {lang === 'ru' 
                    ? 'Онлайн игра против реального игрока' 
                    : lang === 'de'
                      ? 'Online-Spiel gegen echte Spieler'
                      : lang === 'es'
                        ? 'Juego Online contra Jugador Real'
                        : 'Play Online Against Real Player'}
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE PVP
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {lang === 'ru'
                  ? 'Случайный соперник по сети или дуэль с другом по коду/ссылке через WebSockets в реальном времени.'
                  : lang === 'de'
                    ? 'Zufälliger Online-Gegner oder Duell mit Freund per Code/Link via Echtzeit-WebSockets.'
                    : lang === 'es'
                      ? 'Rival online aleatorio o duelo con amigo por código/enlace vía WebSockets en tiempo real.'
                      : 'Fast matchmaking vs online rivals or private room duel with a friend via WebSockets.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs font-mono text-neutral-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{onlineCount} {lang === 'ru' ? 'в сети' : lang === 'de' ? 'online' : lang === 'es' ? 'conectados' : 'online'}</span>
              <span className="text-neutral-600">&bull;</span>
              <span>{activeBattles} {lang === 'ru' ? 'битв' : lang === 'de' ? 'Duelle' : lang === 'es' ? 'duelos' : 'battles'}</span>
            </div>

            <button
              onClick={onOpenOnlineModal}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-extrabold text-xs uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Swords className="w-4 h-4" />
              <span>
                {lang === 'ru' 
                  ? 'Играть Онлайн' 
                  : lang === 'de' 
                    ? 'Online spielen' 
                    : lang === 'es' 
                      ? 'Jugar Online' 
                      : 'Play Online'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Game Mode Selection Cards */}
      <div>
        <h2 className="text-sm font-extrabold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Swords className="w-4 h-4 text-cyan-400" />
          <span>{lang === 'ru' ? 'Выберите режим битвы' : lang === 'de' ? 'Wähle den Duell-Modus' : lang === 'es' ? 'Elige el modo de batalla' : 'Choose Battle Mode'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode 1: Random Opponent (Online Matchmaking) */}
          <div
            onClick={() => handleModeClick('online')}
            className={`group relative rounded-3xl bg-neutral-900 border p-6 flex flex-col justify-between transition-all duration-300 shadow-xl cursor-pointer overflow-hidden ${
              !user.isRegistered 
                ? 'border-amber-500/30 hover:border-amber-500/60 hover:bg-neutral-900/90' 
                : 'border-neutral-800 hover:border-cyan-500/50 hover:bg-neutral-900/90'
            }`}
          >
            <div 
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity"
              style={{ backgroundColor: user.color }}
            />

            <div>
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg mb-4 group-hover:scale-110 transition-transform"
                style={{ borderColor: user.color, backgroundColor: `${user.color}20` }}
              >
                <Swords className="w-6 h-6" style={{ color: user.color }} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white group-hover:text-cyan-400 transition-colors">
                  {t.playOnline}
                </h3>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REAL PVP
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {lang === 'ru' 
                  ? 'Битва с реальным соперником! Случайный поиск, приватные комнаты с кодом или приглашения по ссылке.' 
                  : lang === 'de'
                    ? 'Duell gegen echte Spieler! Zufallssuche oder private Räume mit Code/Link.'
                    : 'Duel against real players! Random matchmaking or private rooms with code/link.'}
              </p>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800/80">
              <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase">
                ⚡ ONLINE PVP
              </span>
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>{lang === 'ru' ? 'В бой' : lang === 'de' ? 'Kämpfen' : lang === 'es' ? 'Al combate' : 'Battle'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Mode 2: Local 2-Player Duel on 1 Screen */}
          <div
            onClick={() => handleModeClick('local')}
            className="group relative rounded-3xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col justify-between hover:border-amber-500/50 hover:bg-neutral-900/90 transition-all duration-300 shadow-xl cursor-pointer overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity bg-amber-500" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-lg mb-4 text-amber-400 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">
                  {t.playLocal}
                </h3>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {lang === 'ru' ? '1 НА 1 НА ЭКРАНЕ' : '2P SPLIT'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {lang === 'ru' 
                  ? 'Битва двух игроков на одном компьютере или телефоне! Клавиши [A] и [L] или сенсорные зоны.' 
                  : lang === 'de'
                    ? 'Duell zweier Spieler auf einem Gerät! Tasten [A] und [L] oder geteilte Touchzonen.'
                    : lang === 'es'
                      ? 'Duelo de 2 jugadores en 1 dispositivo con teclas [A] y [L] o zonas táctiles.'
                      : 'Split screen 2-player reflex duel on 1 keyboard [A] & [L] or dual touch zones.'}
              </p>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800/80">
              <span className="text-[11px] font-mono text-neutral-500">
                2P &bull; Custom colors
              </span>
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                {lang === 'ru' ? 'Старт' : lang === 'de' ? 'Start' : lang === 'es' ? 'Iniciar' : 'Start'} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Mode 3: Solo Practice */}
          <div
            onClick={() => handleModeClick('practice')}
            className="group relative rounded-3xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col justify-between hover:border-purple-500/50 hover:bg-neutral-900/90 transition-all duration-300 shadow-xl cursor-pointer overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity bg-purple-500" />

            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shadow-lg mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white group-hover:text-purple-400 transition-colors">
                  {t.practice}
                </h3>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  {lang === 'ru' ? 'ТРЕНИРОВКА С БОТОМ' : 'SOLO PRACTICE'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {lang === 'ru' 
                  ? 'Спарринг с адаптивным ботом: раунд 1 — 250 мс, далее бот подстраивается и ускоряется на 10% от вашей реакции.' 
                  : lang === 'de'
                    ? 'Sparring mit adaptivem Bot: Runde 1 beginnt bei 250 ms, danach passt sich der Bot an und wird 10 % schneller.'
                    : lang === 'es'
                      ? 'Entrenamiento con bot adaptable: ronda 1 a 250 ms, luego se adapta siendo un 10% más veloz.'
                      : 'Duel an adaptive bot: round 1 starts at 250ms, then adapts by beating your previous speed by 10%.'}
              </p>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800/80">
              <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase">
                🤖 SOLO &bull; 100% FREE
              </span>
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                {lang === 'ru' ? 'Тренировка' : lang === 'de' ? 'Training' : lang === 'es' ? 'Práctica' : 'Practice'} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reflex Stats & Quick Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800">
          <span className="text-[11px] text-neutral-400 font-semibold block">{t.bestReaction}</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-1 block">
            {user.stats.bestReactionMs > 0 ? `${user.stats.bestReactionMs} ${t.ms}` : '---'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800">
          <span className="text-[11px] text-neutral-400 font-semibold block">{t.avgReaction}</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-1 block">
            {user.stats.avgReactionMs > 0 ? `${user.stats.avgReactionMs} ${t.ms}` : '---'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800">
          <span className="text-[11px] text-neutral-400 font-semibold block">{t.winRate}</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1 block">
            {user.stats.matchesPlayed > 0 
              ? `${Math.round((user.stats.matchesWon / user.stats.matchesPlayed) * 100)}%` 
              : '0%'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800">
          <span className="text-[11px] text-neutral-400 font-semibold block">{t.wins} / {t.losses}</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-white mt-1 block">
            {user.stats.matchesWon} <span className="text-neutral-500 text-sm font-normal">/ {user.stats.matchesLost}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
