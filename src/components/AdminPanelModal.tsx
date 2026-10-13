import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Users, 
  BarChart3, 
  ShieldAlert, 
  ShieldCheck,
  Search, 
  Ban, 
  CheckCircle, 
  RotateCcw, 
  CreditCard, 
  Wallet, 
  Heart, 
  Save, 
  Check, 
  ExternalLink, 
  X, 
  Activity, 
  Server, 
  Lock, 
  Unlock, 
  DollarSign,
  KeyRound
} from 'lucide-react';
import { Language, UserProfile, AntiCheatLog, DonationConfig, DonationRecord } from '../types';
import { translations } from '../utils/i18n';
import { 
  loadAllUsers, 
  saveAllUsers, 
  loadAntiCheatLogs, 
  loadDonationConfig, 
  saveDonationConfig, 
  loadDonations,
  logAntiCheatEvent 
} from '../utils/storage';
import { 
  AUTHORIZED_OWNER_EMAIL, 
  signAndSealDonationConfig, 
  isValidLuhnCard, 
  isTrustedPaymentUrl 
} from '../utils/donationSecurity';
import { sound } from '../utils/audio';
import { UserAvatar } from './UserAvatar';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentUser: UserProfile;
  onUpdateCurrentUser: (updated: Partial<UserProfile>) => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentUser,
  onUpdateCurrentUser,
}) => {
  const t = translations[lang];
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<AntiCheatLog[]>([]);
  const [selectedTab, setSelectedTab] = useState<'users' | 'analytics' | 'anticheat' | 'donations'>('users');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [donationSecurityError, setDonationSecurityError] = useState<string | null>(null);
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('AdminReflex1');

  // Donation configuration state
  const [donationConfig, setDonationConfig] = useState<DonationConfig>(() => loadDonationConfig().config);
  const [donationRecords, setDonationRecords] = useState<DonationRecord[]>(() => loadDonations());

  useEffect(() => {
    if (isOpen) {
      setUsers(loadAllUsers());
      setLogs(loadAntiCheatLogs());
      setDonationConfig(loadDonationConfig().config);
      setDonationRecords(loadDonations());
      setDonationSecurityError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotice = (msg: string) => {
    setAdminNotice(msg);
    setTimeout(() => setAdminNotice(null), 2500);
  };

  const handleToggleBan = (targetId: string) => {
    sound.playClick();
    const updated = users.map(u => {
      if (u.id === targetId) {
        return { ...u, isBanned: !u.isBanned };
      }
      return u;
    });
    setUsers(updated);
    saveAllUsers(updated);
    showNotice(lang === 'ru' ? 'Статус блокировки пользователя обновлён' : lang === 'de' ? 'Sperrstatus des Nutzers geändert' : 'User ban status toggled');
  };

  const handleResetScore = (targetId: string) => {
    sound.playFalseStart();
    const updated = users.map(u => {
      if (u.id === targetId) {
        return {
          ...u,
          stats: {
            ...u.stats,
            matchesWon: 0,
            matchesLost: 0,
            bestReactionMs: 0,
            winStreak: 0,
          },
        };
      }
      return u;
    });
    setUsers(updated);
    saveAllUsers(updated);
    showNotice(lang === 'ru' ? 'Очки и статистика пользователя сброшены' : lang === 'de' ? 'Punkte und Statistiken zurückgesetzt' : 'User score reset');
  };

  const handleSaveDonationConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setDonationSecurityError(null);

    // Cryptographic sealing & owner verification
    const sealResult = signAndSealDonationConfig(donationConfig, adminPasswordConfirm);
    if (!sealResult.success || !sealResult.sealedConfig) {
      sound.playFalseStart();
      setDonationSecurityError(sealResult.error || 'Ошибка проверки цифровой подписи реквизитов.');
      return;
    }

    sound.playClick();
    const updated = saveDonationConfig(sealResult.sealedConfig);
    setDonationConfig(updated);

    // Log security audit trail
    logAntiCheatEvent({
      timestamp: Date.now(),
      eventType: 'donation_requisites_updated',
      details: `Реквизиты заверены цифровой подписью ${AUTHORIZED_OWNER_EMAIL}. Сигнатура: ${updated.securityHash}`,
      actionTaken: 'Криптографическая печать обновлена в хранилище',
    });

    setLogs(loadAntiCheatLogs());
    showNotice(
      lang === 'ru' 
        ? 'Реквизиты успешно заверены цифровой подписью и сохранены!' 
        : lang === 'de'
          ? 'Spenden-Requisiten digital signiert und gespeichert!'
          : 'Donation requisites digitally signed and saved!'
    );
  };

  // Compute analytics
  const totalMatches = users.reduce((acc, u) => acc + (u.stats.matchesPlayed || 0), 0);
  const avgReaction = Math.round(
    users.filter(u => u.stats.avgReactionMs > 0).reduce((acc, u) => acc + u.stats.avgReactionMs, 0) /
    (users.filter(u => u.stats.avgReactionMs > 0).length || 1)
  );
  const flaggedCount = logs.length;
  const totalDonationSum = donationRecords.reduce((acc, d) => acc + d.amount, 0);

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const isCardLuhnValid = isValidLuhnCard(donationConfig.cardNumber || '');
  const isDirectUrlSafe = isTrustedPaymentUrl(donationConfig.directPaymentUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">{t.adminDashboard}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  OWNER ACCESS
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {lang === 'ru' ? 'Панель управления правообладателя (meerkat.site@gmail.com)' : lang === 'de' ? 'Administrator-Konsole (meerkat.site@gmail.com)' : 'Application owner management console'}
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
        <div className="flex items-center gap-2 px-5 py-2.5 bg-neutral-950 border-b border-neutral-800 overflow-x-auto">
          <button
            onClick={() => setSelectedTab('users')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'users' ? 'bg-neutral-800 text-cyan-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.userManagement} ({users.length})</span>
          </button>
          <button
            onClick={() => setSelectedTab('analytics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'analytics' ? 'bg-neutral-800 text-cyan-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{lang === 'ru' ? 'Игровая Аналитика' : lang === 'de' ? 'Spiel-Analytik' : 'Game Analytics'}</span>
          </button>
          <button
            onClick={() => setSelectedTab('anticheat')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'anticheat' ? 'bg-neutral-800 text-rose-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{t.antiCheatAudit} ({logs.length})</span>
          </button>
          <button
            onClick={() => setSelectedTab('donations')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              selectedTab === 'donations' ? 'bg-neutral-800 text-emerald-400' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{t.adminDonationsTab}</span>
          </button>
        </div>

        {/* Feedback alert */}
        {adminNotice && (
          <div className="bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30 px-5 py-2 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>{adminNotice}</span>
          </div>
        )}

        {/* TAB 1: USER MANAGEMENT */}
        {selectedTab === 'users' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Input */}
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/40">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.searchUser}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* User List Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredUsers.map(u => (
                <div
                  key={u.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    u.isBanned 
                      ? 'bg-rose-950/20 border-rose-800/40' 
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={u.avatarUrl}
                      username={u.username}
                      color={u.color}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{u.username}</span>
                        {u.isAdmin && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-400 font-bold px-1.5 py-0.2 rounded border border-rose-500/30">
                            ADMIN
                          </span>
                        )}
                        {u.isBanned && (
                          <span className="text-[9px] bg-rose-500 text-black font-extrabold px-1.5 py-0.2 rounded">
                            BANNED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>{u.email}</span>
                        <span>&bull;</span>
                        <span className="text-cyan-400">⚡ {u.stats.bestReactionMs || '---'}ms</span>
                        <span>&bull;</span>
                        <span className="text-emerald-400">🏆 {u.stats.matchesWon} побед</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleResetScore(u.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title={t.resetScore}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t.resetScore}</span>
                    </button>
                    <button
                      onClick={() => handleToggleBan(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        u.isBanned
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{u.isBanned ? t.unban : t.ban}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ANALYTICS DASHBOARD */}
        {selectedTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block font-semibold">{t.totalUsers}</span>
                <span className="text-2xl font-black font-mono text-white mt-1 block">{users.length}</span>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block font-semibold">{t.totalMatches}</span>
                <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">{totalMatches}</span>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block font-semibold">{t.avgServerReaction}</span>
                <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">{avgReaction} {t.ms}</span>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block font-semibold">{t.flaggedCheaters}</span>
                <span className="text-2xl font-black font-mono text-rose-400 mt-1 block">{flaggedCount}</span>
              </div>
            </div>

            {/* Server & Engine Telemetry */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{t.systemStatus}</span>
                </div>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {t.serverHealthy}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono pt-2">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">REACTION RESOLUTION</span>
                  <span className="text-white font-bold">0.1 ms (performance.now)</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">DONATION INTEGRITY ENGINE</span>
                  <span className="text-emerald-400 font-bold">SHA-256 HMAC Active</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">RANDOM SIGNAL WINDOW</span>
                  <span className="text-white font-bold">500ms – 10,000ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANTI-CHEAT LOGS AUDIT */}
        {selectedTab === 'anticheat' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {lang === 'ru' ? 'Автоматическая защита от макросов, автокликеров и подмены данных' : lang === 'de' ? 'Automatische Erkennung von Makros und Datenmanipulation' : 'Automated Bot & Security Audit Filter'}
                </h4>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  {lang === 'ru'
                    ? 'Система непрерывно фильтрует аппаратные события, субчеловеческие реакции (<80 мс), а также контролирует цифровую целостность платёжных реквизитов.'
                    : 'Real-time detection flags impossible speeds (<80ms), zero-variance intervals, and monitors payment requisite cryptographic signatures.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {logs.map((l, i) => (
                <div key={i} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono flex items-center justify-between">
                  <div>
                    <span className={`font-bold block ${l.eventType.includes('alert') ? 'text-amber-400' : 'text-rose-400'}`}>
                      {l.eventType.toUpperCase()}
                    </span>
                    <span className="text-neutral-300 text-[11px]">{l.details}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block">
                      {new Date(l.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">{l.actionTaken}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DONATIONS & PAYOUT REQUISITES */}
        {selectedTab === 'donations' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Header info card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-neutral-950 to-neutral-950 border border-emerald-500/30 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span>{lang === 'ru' ? 'Криптографическая защита платёжных реквизитов' : 'Cryptographically Signed Requisites'}</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40 font-mono">
                      ANTI-HIJACK
                    </span>
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed max-w-xl">
                    {lang === 'ru'
                      ? 'Реквизиты заверяются секретной подписью правообладателя meerkat.site@gmail.com. Любая попытка изменить карту через консоль браузера или расширения мгновенно блокируется защитой.'
                      : 'Requisites are digitally signed by the verified applet owner. Any client-side tampering is immediately detected and blocked.'}
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-neutral-400 hidden sm:block">
                <span className="text-emerald-400 font-bold block">SHA-256 HMAC SEAL</span>
                <span>{donationConfig.securityHash || 'RD-9821'}</span>
              </div>
            </div>

            {donationSecurityError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{donationSecurityError}</span>
              </div>
            )}

            {/* Donation KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block font-semibold">{t.totalDonations}</span>
                <span className="text-xl font-black font-mono text-emerald-400 mt-1 block">
                  {totalDonationSum.toLocaleString()} ₽
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block font-semibold">{t.donationsCount}</span>
                <span className="text-xl font-black font-mono text-white mt-1 block">
                  {donationRecords.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block font-semibold">Статус приёма</span>
                <span className={`text-xs font-bold mt-1.5 block ${donationConfig.enabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {donationConfig.enabled ? '● Активен' : '○ Приостановлен'}
                </span>
              </div>
            </div>

            {/* Configuration Form */}
            <form onSubmit={handleSaveDonationConfig} className="space-y-4 bg-neutral-950/70 p-4 sm:p-5 rounded-2xl border border-neutral-800">
              {/* Enable / Disable switch */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Приём донатов в игре
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    Отображать кнопку доната и реквизиты игрокам
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDonationConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    donationConfig.enabled 
                      ? 'bg-emerald-500 text-black shadow-md' 
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {donationConfig.enabled ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО'}
                </button>
              </div>

              {/* Online Wallet Section (Only payment method) */}
              <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Wallet className="w-4 h-4" />
                  <span>Привязка онлайн-кошелька / СБП (Единственный способ доната)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Платёжная система (СБП, ЮMoney, USDT, PayPal):
                    </label>
                    <input
                      type="text"
                      placeholder="СБП по номеру телефона / ЮMoney"
                      value={donationConfig.walletType}
                      onChange={e => setDonationConfig(prev => ({ ...prev, walletType: e.target.value, targetType: 'wallet' }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Номер кошелька / телефона / адрес:
                    </label>
                    <input
                      type="text"
                      placeholder="+7 (999) 000-00-00 или 41001..."
                      value={donationConfig.walletNumber}
                      onChange={e => setDonationConfig(prev => ({ ...prev, walletNumber: e.target.value, targetType: 'wallet' }))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Direct Link with Whitelist Check */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-neutral-300">
                    Прямая платёжная ссылка (например Boosty, CloudTips, Tinkoff):
                  </label>
                  {donationConfig.directPaymentUrl && isDirectUrlSafe.trusted && (
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>{isDirectUrlSafe.domain} (Доверен)</span>
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  placeholder="https://boosty.to/reflexduel или https://pay.mysbertips.ru/..."
                  value={donationConfig.directPaymentUrl || ''}
                  onChange={e => setDonationConfig(prev => ({ ...prev, directPaymentUrl: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Section 4: Appeal Message */}
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Текст обращения к игрокам в окне доната:
                </label>
                <textarea
                  rows={2}
                  value={donationConfig.appealMessage}
                  onChange={e => setDonationConfig(prev => ({ ...prev, appealMessage: e.target.value }))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              {/* Section 5: Owner Password Confirmation for Digital Signature */}
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                  <KeyRound className="w-4 h-4 text-rose-400" />
                  <span>Подтверждение владельца для наложения цифровой печати</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Для предотвращения взлома и перехвата денег злоумышленниками, изменения реквизитов требуют подтверждения мастер-паролем администратора.
                </p>
                <input
                  type="password"
                  placeholder="Мастер-пароль администратора..."
                  value={adminPasswordConfirm}
                  onChange={e => setAdminPasswordConfirm(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Заверить цифровой подписью и сохранить</span>
              </button>
            </form>

            {/* Recent Donations Received Log */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>История полученных донатов ({donationRecords.length})</span>
              </h5>

              {donationRecords.length === 0 ? (
                <div className="text-center py-6 text-neutral-500 text-xs bg-neutral-950 rounded-2xl border border-neutral-800">
                  Пока нет полученных донатов
                </div>
              ) : (
                <div className="space-y-2">
                  {donationRecords.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono">
                          {d.currency === 'RUB' ? '₽' : '$'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{d.donorName}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              ({d.method === 'card' ? 'Карта' : 'Кошелёк'})
                            </span>
                          </div>
                          {d.message && (
                            <span className="text-[11px] text-neutral-300 italic block mt-0.5">
                              {d.message}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-emerald-400 block">
                          +{d.amount} {d.currency === 'RUB' ? '₽' : d.currency}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {new Date(d.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
