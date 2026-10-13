import React from 'react';
import { 
  Zap, 
  Heart,
  Volume2, 
  VolumeX, 
  Globe, 
  ShieldCheck, 
  Trophy, 
  User as UserIcon, 
  Sliders,
  Swords,
  Share2
} from 'lucide-react';
import { Language, UserProfile } from '../types';
import { translations } from '../utils/i18n';
import { sound } from '../utils/audio';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  user: UserProfile;
  lang: Language;
  onSelectLang: (lang: Language) => void;
  onOpenProfile: () => void;
  onOpenDonate: () => void;
  onOpenGuestLink: () => void;
  onOpenLeaderboard: () => void;
  onOpenAdmin: () => void;
  onOpenRules: () => void;
  onOpenOnlineModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  lang,
  onSelectLang,
  onOpenProfile,
  onOpenDonate,
  onOpenGuestLink,
  onOpenLeaderboard,
  onOpenAdmin,
  onOpenRules,
  onOpenOnlineModal,
}) => {
  const t = translations[lang];
  const [isMuted, setIsMuted] = React.useState(sound.getMuted());
  const [volume, setVolume] = React.useState(Math.round(sound.getVolume() * 100));
  const [isAudioMenuOpen, setIsAudioMenuOpen] = React.useState(false);
  const audioMenuRef = React.useRef<HTMLDivElement>(null);

  // Language selector state with 1.5s hover delay
  const [isLangOpen, setIsLangOpen] = React.useState(false);
  const langTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const langContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (audioMenuRef.current && !audioMenuRef.current.contains(e.target as Node)) {
        setIsAudioMenuOpen(false);
      }
      if (langContainerRef.current && !langContainerRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
        if (langTimeoutRef.current) {
          clearTimeout(langTimeoutRef.current);
          langTimeoutRef.current = null;
        }
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      if (langTimeoutRef.current) {
        clearTimeout(langTimeoutRef.current);
      }
    };
  }, []);

  const handleLangMouseEnter = () => {
    if (langTimeoutRef.current) {
      clearTimeout(langTimeoutRef.current);
    }
    // 1.5 second hover delay as requested (1-2 seconds)
    langTimeoutRef.current = setTimeout(() => {
      setIsLangOpen(true);
    }, 1500);
  };

  const handleLangMouseLeave = () => {
    if (langTimeoutRef.current) {
      clearTimeout(langTimeoutRef.current);
      langTimeoutRef.current = null;
    }
    // Smooth grace period when moving away
    langTimeoutRef.current = setTimeout(() => {
      setIsLangOpen(false);
    }, 350);
  };

  const handleLangClick = () => {
    if (langTimeoutRef.current) {
      clearTimeout(langTimeoutRef.current);
      langTimeoutRef.current = null;
    }
    setIsLangOpen(prev => !prev);
  };

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
    if (!next) {
      sound.playClick();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    sound.setVolume(val / 100);
    if (isMuted && val > 0) {
      setIsMuted(false);
      sound.setMuted(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand / Title */}
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={onOpenRules}>
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105 shadow-lg"
            style={{ 
              backgroundColor: `${user.color}20`,
              borderColor: user.color,
              boxShadow: `0 0 15px ${user.color}40`
            }}
          >
            <Zap className="w-5 h-5 transition-transform group-hover:rotate-12" style={{ color: user.color }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                {t.appTitle}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hidden md:inline">
                2D PVP
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Resources & Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Donate / Support Button */}
          <button 
            onClick={onOpenDonate}
            title={t.donateTitle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/15 to-amber-500/15 hover:from-rose-500/25 hover:to-amber-500/25 border border-rose-500/30 hover:border-rose-500/50 transition-all text-xs font-bold text-rose-300 hover:text-white cursor-pointer shadow-sm active:scale-95"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500/40 text-rose-400 animate-pulse" />
            <span>{t.donate}</span>
          </button>

          {/* Permanent Guest Link Button */}
          <button
            onClick={onOpenGuestLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white transition-all text-xs font-bold cursor-pointer shadow-sm active:scale-95"
            title={lang === 'ru' ? 'Постоянная гостевая ссылка (пригласить друзей)' : lang === 'de' ? 'Permanenter Gast-Link' : 'Permanent guest link (invite friends)'}
          >
            <Share2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{lang === 'ru' ? 'Гостевая ссылка' : lang === 'de' ? 'Gast-Link' : 'Guest Link'}</span>
          </button>

          {/* Leaderboard Button */}
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 hover:bg-neutral-800/80 transition-all text-neutral-300 hover:text-amber-400 text-xs font-semibold cursor-pointer"
            title={t.leaderboard}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.leaderboard}</span>
          </button>

          {/* Online PvP Button */}
          {onOpenOnlineModal && (
            <button
              onClick={onOpenOnlineModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-all text-xs font-bold cursor-pointer"
              title={lang === 'ru' ? 'Онлайн игра против реального игрока' : lang === 'de' ? 'Online-Spiel gegen echten Gegner' : 'Online game vs real player'}
            >
              <Swords className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{lang === 'ru' ? 'Онлайн PvP' : 'Online PvP'}</span>
            </button>
          )}

          {/* Sound Controls Popover */}
          <div className="relative" ref={audioMenuRef}>
            <button
              onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)}
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 hover:bg-neutral-800/80 transition-all text-neutral-300 cursor-pointer flex items-center gap-1"
              title={t.soundEffects}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-neutral-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            {/* Audio Settings & SFX Test Dropdown */}
            {isAudioMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {t.soundEffects}
                    </span>
                  </div>
                  <button
                    onClick={toggleSound}
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                      isMuted 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isMuted ? 'Muted' : 'Active'}
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5 font-semibold">
                    <span>{t.volume}</span>
                    <span className="font-mono text-cyan-400">{isMuted ? 0 : volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                  />
                </div>

                {/* Test Sound Effects Section */}
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                    {t.testSfx}
                  </span>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Game Start SFX */}
                    <button
                      onClick={() => {
                        sound.playGameStart();
                      }}
                      className="px-2.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-cyan-500/50 hover:bg-neutral-800/60 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold text-neutral-300 group-hover:text-cyan-400 block truncate">
                        🚀 {t.sfxGameStart}
                      </span>
                      <span className="text-[9px] text-neutral-400 block">Riser + Kick</span>
                    </button>

                    {/* Success SFX */}
                    <button
                      onClick={() => {
                        sound.playSuccess(170);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/50 hover:bg-neutral-800/60 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold text-neutral-300 group-hover:text-emerald-400 block truncate">
                        🏆 {t.sfxSuccess}
                      </span>
                      <span className="text-[9px] text-neutral-400 block">Arpeggio Chime</span>
                    </button>

                    {/* False Start SFX */}
                    <button
                      onClick={() => {
                        sound.playFalseStart();
                      }}
                      className="px-2.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-rose-500/50 hover:bg-neutral-800/60 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold text-neutral-300 group-hover:text-rose-400 block truncate">
                        ⚠️ {t.sfxFalseStart}
                      </span>
                      <span className="text-[9px] text-neutral-400 block">Harsh Buzzer</span>
                    </button>

                    {/* Signal GO SFX */}
                    <button
                      onClick={() => {
                        sound.playSignalGo();
                      }}
                      className="px-2.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-800/60 text-left transition-all cursor-pointer group"
                    >
                      <span className="text-[10px] font-bold text-neutral-300 group-hover:text-amber-400 block truncate">
                        ⚡ {t.sfxSignal}
                      </span>
                      <span className="text-[9px] text-neutral-400 block">Laser Flash</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Language Selector with 1.5s hover delay */}
          <div 
            ref={langContainerRef}
            onMouseEnter={handleLangMouseEnter}
            onMouseLeave={handleLangMouseLeave}
            className="relative"
          >
            <button 
              onClick={handleLangClick}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-xl bg-neutral-900 border transition-all text-xs font-bold uppercase cursor-pointer ${
                isLangOpen 
                  ? 'border-cyan-500/60 text-cyan-400 bg-neutral-800/90 shadow-lg shadow-cyan-500/10' 
                  : 'border-neutral-800 hover:border-neutral-700 text-neutral-300'
              }`}
              title={lang === 'ru' ? 'Смена языка (наведите на 1.5 сек или нажмите)' : lang === 'de' ? 'Sprache wechseln (1,5 Sek. schweben oder klicken)' : 'Change language (hover for 1.5s or click)'}
            >
              <Globe className={`w-3.5 h-3.5 ${isLangOpen ? 'text-cyan-400' : 'text-neutral-400'}`} />
              <span>{lang}</span>
            </button>

            {isLangOpen && (
              <div className="absolute right-0 top-full mt-1.5 flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl p-1 shadow-2xl z-50 min-w-[95px] animate-in fade-in zoom-in-95 duration-150">
                {(['ru', 'en', 'es', 'de'] as Language[]).map(l => (
                  <button
                    key={l}
                    onClick={() => {
                      sound.playClick();
                      onSelectLang(l);
                      setIsLangOpen(false);
                      if (langTimeoutRef.current) {
                        clearTimeout(langTimeoutRef.current);
                        langTimeoutRef.current = null;
                      }
                    }}
                    className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
                      lang === l 
                        ? 'bg-cyan-500/20 text-cyan-400 font-bold' 
                        : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>
                      {l === 'ru' ? '🇷🇺 RU' : l === 'en' ? '🇬🇧 EN' : l === 'es' ? '🇪🇸 ES' : '🇩🇪 DE'}
                    </span>
                    {lang === l && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Admin Panel Access Button */}
          {user.isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/40 hover:border-rose-500 text-rose-400 text-xs font-bold transition-all cursor-pointer shadow-sm"
              title={t.adminPanel}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t.adminPanel}</span>
            </button>
          )}

          {/* User Profile Chip */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 hover:bg-neutral-800/80 transition-all cursor-pointer shadow-sm"
            title={lang === 'ru' ? 'Профиль игрока' : 'Player Profile'}
          >
            <UserAvatar
              avatarUrl={user.avatarUrl}
              username={user.username}
              color={user.color}
              size="xs"
            />
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-neutral-200 leading-tight max-w-[110px] truncate">
                {user.username}
              </div>
              <div className="text-[10px] text-cyan-400 font-mono -mt-0.5">
                {user.stats.bestReactionMs > 0 ? `${user.stats.bestReactionMs}ms` : (lang === 'ru' ? 'Сессия' : 'Session')}
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
