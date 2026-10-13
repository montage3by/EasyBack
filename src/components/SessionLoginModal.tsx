import React, { useState } from 'react';
import { 
  Swords, 
  Sparkles, 
  Dice5, 
  Check, 
  Lock, 
  KeyRound, 
  ArrowRight,
  ShieldCheck,
  User,
  Zap
} from 'lucide-react';
import { Language, UserProfile } from '../types';
import { sound } from '../utils/audio';
import { 
  COLOR_OPTIONS, 
  AVATAR_PRESETS, 
  createSessionUser, 
  generateRandomNickname, 
  loginWithEmail 
} from '../utils/storage';
import { UserAvatar } from './UserAvatar';

interface SessionLoginModalProps {
  isOpen: boolean;
  onLoginComplete: (user: UserProfile) => void;
  lang: Language;
}

export const SessionLoginModal: React.FC<SessionLoginModalProps> = ({
  isOpen,
  onLoginComplete,
  lang,
}) => {
  const [username, setUsername] = useState(() => generateRandomNickname());
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].hex);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0]);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Admin credentials state
  const [adminEmail, setAdminEmail] = useState('meerkat.site@gmail.com');
  const [adminPassword, setAdminPassword] = useState('AdminReflex1');
  const [adminError, setAdminError] = useState('');

  if (!isOpen) return null;

  const handleGenerateRandom = () => {
    sound.playClick();
    const newName = generateRandomNickname();
    setUsername(newName);
    const randomColor = COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)].hex;
    setSelectedColor(randomColor);
    const randomAvatar = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
    setSelectedAvatar(randomAvatar);
  };

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim();
    if (!clean) return;

    sound.playGameStart();
    const newUser = createSessionUser(clean, selectedColor, selectedAvatar);
    onLoginComplete(newUser);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    const res = loginWithEmail(adminEmail, adminPassword);
    if (res.success && res.user) {
      sound.playPointWon();
      onLoginComplete(res.user);
    } else {
      sound.playFalseStart();
      setAdminError(res.message || 'Ошибка входа администратора');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow ambient background accents */}
        <div 
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500" 
          style={{ backgroundColor: selectedColor }}
        />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 p-5 sm:p-6 border-b border-neutral-800 bg-neutral-950/80 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-3 shadow-lg">
            <Swords className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            {isAdminMode 
              ? (lang === 'ru' ? 'Вход для Администратора' : 'Admin Authorization')
              : (lang === 'ru' ? 'Добро пожаловать в Reflex Duel!' : 'Welcome to Reflex Duel!')}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {isAdminMode
              ? (lang === 'ru' ? 'Управление турнирами, игроками и античитом' : 'Manage tournaments, players & anti-cheat')
              : (lang === 'ru' 
                  ? 'Введите ваш логин для текущей сессии — игра полностью открыта для всех!' 
                  : 'Enter your session nickname to play — instant access for everyone!')}
          </p>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {!isAdminMode ? (
            <form onSubmit={handleSessionSubmit} className="space-y-5">
              {/* Avatar Preview & Random Name Generator */}
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <UserAvatar
                    avatarUrl={selectedAvatar}
                    username={username || 'Игрок'}
                    color={selectedColor}
                    size="lg"
                    className="ring-4 ring-neutral-800 shadow-xl"
                  />
                  <div 
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-neutral-900 flex items-center justify-center shadow"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <Zap className="w-3.5 h-3.5 text-black fill-black" />
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-xs font-mono text-cyan-400 font-bold block">
                    {lang === 'ru' ? 'Сессионный боец' : 'Session Duelist'}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {lang === 'ru' ? 'Логин и статистика действуют в рамках сессии' : 'Nickname & stats active for this session'}
                  </span>
                </div>
              </div>

              {/* Login / Nickname Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                  <label htmlFor="session-login-input">
                    {lang === 'ru' ? 'Ваш игровой логин (никнейм):' : 'Your game nickname / login:'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateRandom}
                    className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Dice5 className="w-3.5 h-3.5" />
                    <span>{lang === 'ru' ? 'Случайный' : 'Randomize'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="session-login-input"
                    type="text"
                    required
                    maxLength={24}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={lang === 'ru' ? 'Введите игровой никнейм...' : 'Enter your nickname...'}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-2xl px-4 py-3 text-sm font-bold text-white placeholder-neutral-500 focus:outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Color Chooser */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 block">
                  {lang === 'ru' ? 'Цвет бойца:' : 'Fighter Theme:'}
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedColor(col.hex);
                      }}
                      className={`w-8 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        selectedColor === col.hex ? 'scale-110 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    >
                      {selectedColor === col.hex && <Check className="w-4 h-4 text-black stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Chooser */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-400 block">
                  {lang === 'ru' ? 'Выберите аватар:' : 'Select Avatar:'}
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_PRESETS.map((avUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedAvatar(avUrl);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedAvatar === avUrl ? 'border-cyan-400 scale-105 shadow-md' : 'border-neutral-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={avUrl} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                      {selectedAvatar === avUrl && (
                        <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!username.trim()}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 disabled:opacity-50 text-black font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-cyan-500/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{lang === 'ru' ? 'Войти в игру' : 'Enter Game'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-1">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{lang === 'ru' ? 'Доступ Администратора' : 'Admin Credentials'}</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  {lang === 'ru' 
                    ? 'Для администратора сохранён полный доступ к панели управления и настройкам.' 
                    : 'Owner & Admin privileges preserved.'}
                </p>
              </div>

              {adminError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {adminError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 block">
                  Email администратора:
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 block">
                  Пароль администратора:
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                >
                  {lang === 'ru' ? 'Войти как Администратор' : 'Log In as Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdminMode(false)}
                  className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all cursor-pointer"
                >
                  {lang === 'ru' ? 'Назад' : 'Back'}
                </button>
              </div>
            </form>
          )}

          {/* Bottom Switcher: Regular Session vs Admin */}
          <div className="pt-2 text-center border-t border-neutral-800/80">
            {!isAdminMode ? (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsAdminMode(true);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1.5 mx-auto transition-colors cursor-pointer py-1"
              >
                <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
                <span>{lang === 'ru' ? 'Вход для администратора' : 'Admin Login'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsAdminMode(false);
                }}
                className="text-xs text-neutral-400 hover:text-cyan-400 flex items-center gap-1.5 mx-auto transition-colors cursor-pointer py-1"
              >
                <User className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Играть как обычный игрок' : 'Play as Regular Player'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
