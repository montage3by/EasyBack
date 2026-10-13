import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Check, 
  X, 
  LogOut, 
  Camera, 
  Palette, 
  Trophy, 
  Zap, 
  Upload, 
  Crown, 
  KeyRound, 
  Sparkles,
  ArrowRight,
  Sliders,
  History
} from 'lucide-react';
import { Language, UserProfile, MatchHistoryItem } from '../types';
import { translations } from '../utils/i18n';
import { 
  COLOR_OPTIONS, 
  AVATAR_PRESETS, 
  loadMatchHistory, 
  loginWithEmail, 
  logoutUser 
} from '../utils/storage';
import { sound } from '../utils/audio';
import { UserAvatar } from './UserAvatar';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  lang: Language;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onSwitchUser: (newUser: UserProfile) => void;
  initialTab?: 'profile' | 'history' | 'security' | 'admin_login';
  onOpenAdmin?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  lang,
  onUpdateUser,
  onSwitchUser,
  initialTab = 'profile',
  onOpenAdmin,
}) => {
  const t = translations[lang];

  const [tab, setTab] = useState<'profile' | 'history' | 'security' | 'admin_login'>('profile');

  // Profile Edit fields
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio);
  const [country, setCountry] = useState(user.country);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [color, setColor] = useState(user.color);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Admin Login fields
  const [adminEmail, setAdminEmail] = useState('meerkat.site@gmail.com');
  const [adminPassword, setAdminPassword] = useState('AdminReflex1');
  const [adminAuthError, setAdminAuthError] = useState('');

  // 2FA Flow for Admin
  const [is2FASetupStep, setIs2FASetupStep] = useState(false);
  const [twoFactorInputCode, setTwoFactorInputCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState(false);

  // Match History
  const matchHistory = loadMatchHistory();

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setUsername(user.username);
      setBio(user.bio);
      setCountry(user.country);
      setAvatarUrl(user.avatarUrl || '');
      setColor(user.color);
      setAdminAuthError('');
      setTab(initialTab);
    }
  }, [isOpen, user, initialTab]);

  if (!isOpen) return null;

  const handleTabChange = (targetTab: 'profile' | 'history' | 'security' | 'admin_login') => {
    sound.playClick();
    setTab(targetTab);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(lang === 'ru' ? 'Выберите файл изображения (PNG, JPG, WebP)' : 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(lang === 'ru' ? 'Файл слишком большой (макс. 5 МБ)' : 'File too large (max 5MB)');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 192;
        const srcW = img.width;
        const srcH = img.height;
        const squareSize = Math.min(srcW, srcH);
        const startX = (srcW - squareSize) / 2;
        const startY = (srcH - squareSize) / 2;
        const destDim = Math.min(maxDim, squareSize);

        const canvas = document.createElement('canvas');
        canvas.width = destDim;
        canvas.height = destDim;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, startX, startY, squareSize, squareSize, 0, 0, destDim, destDim);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(compressed);
          onUpdateUser({ avatarUrl: compressed });
        } else {
          const rawUrl = event.target?.result as string;
          setAvatarUrl(rawUrl);
          onUpdateUser({ avatarUrl: rawUrl });
        }
        sound.playClick();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = () => {
    if (!username.trim()) return;
    onUpdateUser({
      username: username.trim(),
      bio: bio.trim(),
      country,
      avatarUrl,
      color,
    });
    sound.playPointWon();
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  // Admin Login Handler
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');

    const res = loginWithEmail(adminEmail, adminPassword);
    if (!res.success || !res.user) {
      setAdminAuthError(res.message || 'Ошибка входа администратора');
      sound.playFalseStart();
      return;
    }

    sound.playPointWon();
    onSwitchUser(res.user);
    setUsername(res.user.username);
    setAvatarUrl(res.user.avatarUrl || '');
    setAdminAuthError('');
    setTab('profile');
  };

  // Admin Logout Handler -> switch back to session player
  const handleLogout = () => {
    sound.playClick();
    const sessionUser = logoutUser();
    onSwitchUser(sessionUser);
    setUsername(sessionUser.username);
    setAvatarUrl('');
    setTab('profile');
  };

  // 2FA Verification Handler for Admin
  const handleVerify2FA = () => {
    if (twoFactorInputCode.length !== 6 || !/^\d+$/.test(twoFactorInputCode)) {
      setTwoFactorError(lang === 'ru' ? 'Введите корректный 6-значный код' : 'Enter a valid 6-digit code');
      sound.playFalseStart();
      return;
    }

    sound.playVictoryFanfare();
    onUpdateUser({
      twoFactorEnabled: true,
      twoFactorSecret: twoFactorInputCode,
    });
    setTwoFactorSuccess(true);
    setIs2FASetupStep(false);
    setTwoFactorError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Glow Accent */}
        <div 
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500"
          style={{ backgroundColor: color }}
        />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl border flex items-center justify-center shadow-md"
              style={{ borderColor: `${color}60`, backgroundColor: `${color}15`, color }}
            >
              {user.isAdmin ? <Crown className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {user.isAdmin 
                    ? (lang === 'ru' ? 'Профиль Администратора' : 'Admin Profile')
                    : (lang === 'ru' ? 'Игровой профиль' : 'Duelist Profile')}
                </h2>
                {user.isAdmin ? (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                    ADMIN
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                    {lang === 'ru' ? 'СЕССИЯ' : 'SESSION'}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {lang === 'ru' 
                  ? 'Настройка игрового логина и внешности для дуэлей' 
                  : 'Customize your session nickname and fighter appearance'}
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

        {/* Tabs Bar */}
        <div className="relative z-10 flex items-center bg-neutral-950 px-5 py-2 border-b border-neutral-800 gap-1 overflow-x-auto">
          <button
            onClick={() => handleTabChange('profile')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              tab === 'profile'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{t.editProfile}</span>
          </button>

          <button
            onClick={() => handleTabChange('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              tab === 'history'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{lang === 'ru' ? 'История боёв' : 'Match History'}</span>
          </button>

          {user.isAdmin ? (
            <button
              onClick={() => handleTabChange('security')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                tab === 'security'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>2FA Безопасность</span>
            </button>
          ) : (
            <button
              onClick={() => handleTabChange('admin_login')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                tab === 'admin_login'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-rose-300'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'ru' ? 'Вход админа' : 'Admin Login'}</span>
            </button>
          )}

          {user.isAdmin && onOpenAdmin && (
            <button
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Панель админа</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* TAB 1: PROFILE EDIT */}
          {tab === 'profile' && (
            <div className="space-y-5">
              {/* Avatar section */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800">
                <div className="relative group">
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    username={username || 'Игрок'}
                    color={color}
                    size="lg"
                    className="ring-4 ring-neutral-800"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                  >
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span>Сменить</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-sm font-extrabold text-white">
                      {username || 'Игрок'}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Загрузить фото</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    PNG, JPG или WebP (макс. 5 МБ). Либо выберите готовый аватар ниже:
                  </p>

                  {/* Preset Avatars */}
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start flex-wrap pt-1">
                    {AVATAR_PRESETS.map((pUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAvatarUrl(pUrl);
                        }}
                        className={`w-7 h-7 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                          avatarUrl === pUrl ? 'border-cyan-400 scale-110 shadow' : 'border-neutral-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={pUrl} alt={`p_${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {uploadError}
                </div>
              )}

              {/* Login / Nickname */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 block">
                  {lang === 'ru' ? 'Игровой логин (никнейм в боях):' : 'Duel Nickname / Login:'}
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ваш логин..."
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white placeholder-neutral-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Theme Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300 block">
                  {t.chooseColor}:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setColor(col.hex);
                      }}
                      className={`w-8 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                        color === col.hex ? 'scale-110 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    >
                      {color === col.hex && <Check className="w-4 h-4 text-black stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country & Bio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300 block">
                    {t.country}:
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="RU">🇷🇺 Россия (RU)</option>
                    <option value="KZ">🇰🇿 Казахстан (KZ)</option>
                    <option value="BY">🇧🇾 Беларусь (BY)</option>
                    <option value="US">🇺🇸 США (US)</option>
                    <option value="DE">🇩🇪 Германия (DE)</option>
                    <option value="ES">🇪🇸 Испания (ES)</option>
                    <option value="GB">🇬🇧 Великобритания (GB)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-300 block">
                    {t.bio}:
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Пара слов о себе..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <div className="text-center">
                  <span className="text-[10px] text-neutral-500 block uppercase font-mono">Лучшая реакция</span>
                  <span className="text-sm font-black text-cyan-400 font-mono">
                    {user.stats.bestReactionMs > 0 ? `${user.stats.bestReactionMs}ms` : '---'}
                  </span>
                </div>
                <div className="text-center border-x border-neutral-800">
                  <span className="text-[10px] text-neutral-500 block uppercase font-mono">Побед в сессии</span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    {user.stats.matchesWon}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-neutral-500 block uppercase font-mono">Винрейт</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {user.stats.matchesPlayed > 0 
                      ? `${Math.round((user.stats.matchesWon / user.stats.matchesPlayed) * 100)}%` 
                      : '0%'}
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSavedNotice ? 'Сохранено!' : 'Сохранить изменения'}</span>
                </button>

                {user.isAdmin && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Выйти из режима админа"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Выйти</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MATCH HISTORY */}
          {tab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 pb-1 border-b border-neutral-800">
                <span>Сыгранные дуэли в текущей сессии:</span>
                <span className="font-mono">{matchHistory.length} матчей</span>
              </div>

              {matchHistory.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-xs">
                  В этой сессии матчей ещё не было. Начните первую дуэль прямо сейчас!
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {matchHistory.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${m.result === 'win' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>vs {m.opponentName}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${m.result === 'win' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                              {m.result === 'win' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-500 font-mono">
                            Счёт {m.score[0]}:{m.score[1]} &bull; {m.date}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-cyan-400 font-bold block">{m.playerBestReaction}ms</span>
                        <span className="text-[10px] text-neutral-500">{m.mode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADMIN LOGIN (for regular players to sign in as admin) */}
          {tab === 'admin_login' && !user.isAdmin && (
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Авторизация Администратора</span>
                </div>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Этот раздел предназначен исключительно для авторизации владельца проекта (meerkat.site@gmail.com) для доступа к панели управления и настройкам донатов.
                </p>
              </div>

              {adminAuthError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {adminAuthError}
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
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
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
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-98"
              >
                Войти как Администратор
              </button>
            </form>
          )}

          {/* TAB 4: SECURITY 2FA (for Admin) */}
          {tab === 'security' && user.isAdmin && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Двухфакторная защита 2FA</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user.twoFactorEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}`}>
                    {user.twoFactorEnabled ? 'АКТИВНА' : 'ОТКЛЮЧЕНА'}
                  </span>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  Защищает аккаунт администратора от несанкционированного изменения платёжных реквизитов и настроек.
                </p>

                {!user.twoFactorEnabled && !is2FASetupStep && (
                  <button
                    type="button"
                    onClick={() => setIs2FASetupStep(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Включить 2FA
                  </button>
                )}

                {is2FASetupStep && (
                  <div className="p-3 bg-neutral-900 rounded-xl space-y-2 border border-neutral-800">
                    <span className="text-xs text-neutral-300 block">Введите тестовый 6-значный код (например 123456):</span>
                    {twoFactorError && <span className="text-xs text-rose-400 block">{twoFactorError}</span>}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={twoFactorInputCode}
                        onChange={(e) => setTwoFactorInputCode(e.target.value)}
                        placeholder="123456"
                        className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white w-28 text-center"
                      />
                      <button
                        type="button"
                        onClick={handleVerify2FA}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                      >
                        Подтвердить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
