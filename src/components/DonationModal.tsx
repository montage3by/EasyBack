import React, { useState } from 'react';
import { 
  Heart, 
  X, 
  Wallet, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert,
  User, 
  MessageSquare, 
  Send, 
  Award,
  RefreshCw,
  Clock,
  DollarSign
} from 'lucide-react';
import { Language, UserProfile, DonationConfig, DonationRecord } from '../types';
import { translations } from '../utils/i18n';
import { sound } from '../utils/audio';
import { 
  loadDonationConfig, 
  saveDonationConfig, 
  loadDonations, 
  saveDonationRecord,
  DEFAULT_DONATION_CONFIG 
} from '../utils/storage';
import { 
  AUTHORIZED_OWNER_EMAIL, 
  verifyClipboardSafety, 
  isTrustedPaymentUrl 
} from '../utils/donationSecurity';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  lang: Language;
}

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  user,
  lang,
}) => {
  const t = translations[lang];
  const [donationState, setDonationState] = useState(() => loadDonationConfig());
  const [donations, setDonations] = useState<DonationRecord[]>(() => loadDonations());

  const config = donationState.config;
  const isSecure = donationState.isSecure;
  const alertReason = donationState.alertReason;

  const [copiedWallet, setCopiedWallet] = useState<boolean>(false);
  const [clipboardTamperWarning, setClipboardTamperWarning] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('300');
  const [currency, setCurrency] = useState<'RUB' | 'USD' | 'EUR'>('RUB');
  const [donorName, setDonorName] = useState<string>(
    user.username && user.username !== 'Гость' ? user.username : ''
  );
  const [donorMessage, setDonorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'donate' | 'hall_of_fame'>('donate');
  const [showThankYou, setShowThankYou] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyWallet = async () => {
    sound.playClick();
    setClipboardTamperWarning(null);
    if (navigator.clipboard && config.walletNumber) {
      await navigator.clipboard.writeText(config.walletNumber);
      const isSafe = await verifyClipboardSafety(config.walletNumber);
      if (!isSafe) {
        setClipboardTamperWarning('Обнаружен подозрительный перехват буфера обмена сторонней программой! Будьте внимательны при вставке.');
      } else {
        setCopiedWallet(true);
        setTimeout(() => setCopiedWallet(false), 2500);
      }
    }
  };

  const handleResetToVerified = () => {
    sound.playPointWon();
    saveDonationConfig(DEFAULT_DONATION_CONFIG);
    setDonationState(loadDonationConfig());
  };

  const handleConfirmDonation = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playVictoryFanfare();

    const parsedAmount = parseInt(customAmount, 10);
    const finalAmount = !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : 100;
    const finalName = donorName.trim() || user.username || 'Анонимный боец';

    const newRecord: DonationRecord = {
      id: `don_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      donorName: finalName,
      amount: finalAmount,
      currency,
      method: 'wallet',
      message: donorMessage.trim() || undefined,
      timestamp: Date.now(),
    };

    const updated = saveDonationRecord(newRecord);
    setDonations(updated);
    setShowThankYou(true);
  };

  const currencySymbol = currency === 'RUB' ? '₽' : currency === 'USD' ? '$' : '€';
  const directLinkCheck = isTrustedPaymentUrl(config.directPaymentUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-md">
              <Heart className="w-6 h-6 fill-rose-500/30 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{t.donateTitle}</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  NO ENERGY &bull; 100% FREE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {lang === 'ru' 
                  ? 'Поддержка проекта на привязанный кошелёк' 
                  : 'Support the game via linked wallet'}
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

        {/* Sub-Tabs: Donate vs Hall of Fame */}
        <div className="relative z-10 flex items-center bg-neutral-950 px-5 py-2 border-b border-neutral-800 gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('donate');
              setShowThankYou(false);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'donate'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>{t.donate}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('hall_of_fame');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'hall_of_fame'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{t.recentDonors} ({donations.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 space-y-5">
          {/* SECURITY TAMPER DEFENSE BANNER */}
          {!isSecure ? (
            <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/60 text-xs space-y-3 animate-in shake duration-300">
              <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>ВНИМАНИЕ: СИСТЕМА БЕЗОПАСНОСТИ ЗАБЛОКИРОВАЛА РЕКВИЗИТЫ</span>
              </div>
              <p className="text-neutral-300 text-xs leading-relaxed">
                {alertReason || 'Обнаружена попытка подмены платёжных данных. Цифровая подпись разработчика meerkat.site@gmail.com нарушена.'}
              </p>
              <div className="p-3 bg-black/50 rounded-xl font-mono text-[11px] text-rose-300 border border-rose-500/30">
                Защита от перехвата: отправка доната на эти неподтверждённые реквизиты отключена, чтобы ваши средства не попали злоумышленникам.
              </div>
              <button
                type="button"
                onClick={handleResetToVerified}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-xs uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Восстановить подлинные реквизиты автора</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-neutral-950 to-neutral-950 border border-emerald-500/30 text-xs flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Реквизиты кошелька заверены цифровой подписью</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                      SECURE
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                    {AUTHORIZED_OWNER_EMAIL} &bull; Seal: {config.securityHash || 'RD-9821'}
                  </div>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                  Перехват невозможен
                </span>
                <span className="text-[9px] text-neutral-500">Защита от MITM &amp; XSS</span>
              </div>
            </div>
          )}

          {clipboardTamperWarning && (
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{clipboardTamperWarning}</span>
            </div>
          )}

          {/* THANK YOU SCREEN */}
          {showThankYou ? (
            <div className="flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-rose-950/30 to-neutral-950 border border-rose-500/30 rounded-3xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 shadow-xl">
                <Sparkles className="w-9 h-9 animate-spin" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">{t.thankYouDonation}</h3>
                <p className="text-xs text-neutral-300 mt-1.5 max-w-md leading-relaxed">
                  {lang === 'ru'
                    ? 'Ваша поддержка помогает держать сервера онлайн, развивать честный античит и совершенствовать турнирную систему Reflex Duel!'
                    : 'Your support helps keep servers online, strengthen anti-cheat systems, and upgrade Reflex Duel tournaments!'}
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Запись внесена в Зал славы меценатов!</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setActiveTab('hall_of_fame')}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Посмотреть Зал славы
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-all cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </div>
          ) : activeTab === 'donate' && isSecure ? (
            <>
              {/* Admin Appeal Message */}
              {config.appealMessage && (
                <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-300 leading-relaxed shadow-inner">
                  <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Обращение разработчиков:</span>
                  </div>
                  <p>{config.appealMessage}</p>
                </div>
              )}

              {/* WALLET ONLY REQUISITES */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-amber-400" />
                    <span>Привязанный кошелёк для доната</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Проверенный кошелёк</span>
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 hover:border-amber-500/50 transition-all flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4" />
                        <span>{config.walletType || 'СБП / Электронный кошелёк'}</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                        VERIFIED WALLET
                      </span>
                    </div>

                    <div className="font-mono text-base font-black text-white tracking-wider my-2 bg-black/50 px-4 py-3 rounded-xl border border-neutral-800 select-all">
                      {config.walletNumber || '+7 (999) 042-88-19'}
                    </div>

                    <p className="text-[11px] text-neutral-400">
                      Перевод по номеру телефона (СБП) или номеру кошелька без комиссии.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyWallet}
                    className="mt-4 w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
                  >
                    {copiedWallet ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">✓ Реквизиты скопированы</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Скопировать кошелёк</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Payment Link (if safe) */}
                {config.directPaymentUrl && directLinkCheck.trusted && (
                  <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                      <span className="text-neutral-300">
                        Официальная платёжная страница ({directLinkCheck.domain}):
                      </span>
                    </div>
                    <a
                      href={config.directPaymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Перейти к оплате</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* ONLY ARBITRARY AMOUNT INPUT (No preset buttons) */}
              <div className="space-y-2.5 bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Произвольная сумма доната:</span>
                  </span>

                  {/* Currency Toggle */}
                  <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
                    {(['RUB', 'USD', 'EUR'] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setCurrency(c);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          currency === c ? 'bg-amber-500 text-black shadow' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {c === 'RUB' ? '₽ RUB' : c === 'USD' ? '$ USD' : '€ EUR'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount Input Field ONLY */}
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    placeholder="Введите любую сумму..."
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-sm font-mono font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-amber-400 font-mono">
                    {currencySymbol}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Вы можете указать любую произвольную сумму поддержки на ваше усмотрение.
                </p>
              </div>

              {/* DONOR FORM & CONFIRMATION */}
              <form onSubmit={handleConfirmDonation} className="space-y-3 pt-2 border-t border-neutral-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                      {t.donorName}
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                      <input
                        type="text"
                        maxLength={25}
                        placeholder={user.username || 'Ваш никнейм'}
                        value={donorName}
                        onChange={e => setDonorName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                      {t.donorMessage}
                    </label>
                    <div className="relative">
                      <MessageSquare className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
                      <input
                        type="text"
                        maxLength={80}
                        placeholder="Сообщение или пожелание..."
                        value={donorMessage}
                        onChange={e => setDonorMessage(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-rose-400 hover:from-amber-300 hover:to-rose-300 text-black font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-amber-500/20 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 stroke-[3]" />
                  <span>
                    Подтвердить донат ({customAmount || '0'} {currencySymbol})
                  </span>
                </button>
              </form>
            </>
          ) : (
            /* HALL OF FAME TAB */
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Award className="w-4 h-4" />
                  <span>Зал славы меценатов Reflex Duel</span>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  Всего записей: {donations.length}
                </span>
              </div>

              {donations.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  Пока нет записей. Станьте первым меценатом проекта!
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {donations.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono">
                          ⚡
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{d.donorName}</span>
                            <span className="text-[10px] text-amber-400 font-mono">
                              ({d.amount} {d.currency === 'RUB' ? '₽' : d.currency === 'USD' ? '$' : '€'})
                            </span>
                          </div>
                          {d.message && (
                            <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                              «{d.message}»
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-[10px] text-neutral-500 font-mono">
                        <div className="flex items-center gap-1 justify-end text-neutral-400">
                          <Wallet className="w-3 h-3 text-amber-400" />
                          <span>Кошелёк</span>
                        </div>
                        <div>{new Date(d.timestamp).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 p-4 border-t border-neutral-800 bg-neutral-950/90 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>Спасибо за поддержку развития Reflex Duel</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold cursor-pointer transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
