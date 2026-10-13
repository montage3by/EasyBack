import React, { useState, useEffect } from 'react';
import { 
  Share2, 
  X, 
  Copy, 
  Check, 
  QrCode, 
  ExternalLink, 
  Sparkles, 
  Users, 
  Swords, 
  Send,
  MessageCircle,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Info,
  Facebook
} from 'lucide-react';
import QRCode from 'qrcode';
import { Language, UserProfile } from '../types';
import { sound } from '../utils/audio';
import { 
  getPermanentGuestUrl, 
  getDuelInviteUrl, 
  getLocalDevGuestUrl,
  getLocalDevDuelUrl,
  isPrivateDevEnvironment, 
  fetchPublicStatus,
  PublicStatusResponse
} from '../utils/shareUtils';

interface GuestLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  user: UserProfile;
  currentRoomCode?: string;
  onSwitchToGuest?: () => void;
  onSwitchToAdmin?: () => void;
}

export const GuestLinkModal: React.FC<GuestLinkModalProps> = ({
  isOpen,
  onClose,
  lang,
  user,
  currentRoomCode,
  onSwitchToGuest,
  onSwitchToAdmin,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [linkType, setLinkType] = useState<'guest' | 'room'>('guest');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [publicStatus, setPublicStatus] = useState<PublicStatusResponse | null>(null);
  
  // Custom room code for duel link tab
  const [duelRoomCode] = useState(() => 
    currentRoomCode || Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  const guestPermanentUrl = getPermanentGuestUrl();
  const roomInviteUrl = getDuelInviteUrl(duelRoomCode);

  const activeUrl = linkType === 'guest' ? guestPermanentUrl : roomInviteUrl;
  const isDev = isPrivateDevEnvironment();

  // Check public status when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetchPublicStatus().then(status => setPublicStatus(status));
  }, [isOpen]);

  // Generate QR code whenever activeUrl or isOpen changes
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(activeUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#06b6d4', // cyan-500
        light: '#0a0a0a', // neutral-950
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate QR code:', err));
  }, [activeUrl, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    sound.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyCode = () => {
    sound.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(duelRoomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleInstantSwitchGuest = () => {
    sound.playClick();
    if (onSwitchToGuest) {
      onSwitchToGuest();
      onClose();
    }
  };

  const handleInstantSwitchAdmin = () => {
    sound.playClick();
    if (onSwitchToAdmin) {
      onSwitchToAdmin();
      onClose();
    }
  };

  const handleOpenLocalTab = () => {
    sound.playClick();
    const url = linkType === 'guest' ? getLocalDevGuestUrl() : getLocalDevDuelUrl(duelRoomCode);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const shareText = lang === 'ru'
    ? '⚔️ Сыграем в Reflex Duel? Проверь свою скорость реакции в 1 клик!'
    : lang === 'de'
      ? '⚔️ Lust auf Reflex Duel? Teste deine Reaktionsgeschwindigkeit sofort!'
      : lang === 'es'
        ? '⚔️ ¿Jugamos a Reflex Duel? ¡Pon a prueba tus reflejos al instante!'
        : '⚔️ Ready for Reflex Duel? Test your reaction speed instantly!';

  const handleTelegramShare = () => {
    sound.playClick();
    const url = `https://t.me/share/url?url=${encodeURIComponent(activeUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWhatsAppShare = () => {
    sound.playClick();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${activeUrl}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleFacebookShare = () => {
    sound.playClick();
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(activeUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
              <Share2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {lang === 'ru' ? 'Гостевой доступ и приглашения' : lang === 'de' ? 'Gastzugang & Einladungen' : 'Guest Access & Invites'}
                </h2>
                {!user.isRegistered && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    ГОСТЬ АКТИВЕН
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {lang === 'ru' 
                  ? 'Мгновенный вход в игру по постоянной ссылке' 
                  : 'Instant game entry via permanent link'}
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

        {/* Instant In-App Test Banner */}
        <div className="relative z-10 bg-neutral-950 px-5 py-3 border-b border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-white block">
                {lang === 'ru' ? 'Проверить переход прямо сейчас в этом окне:' : 'Test guest transition now in this window:'}
              </span>
              <span className="text-[11px] text-neutral-400">
                {user.isRegistered 
                  ? (lang === 'ru' ? 'Вы сейчас авторизованы как Владелец/Админ' : 'Currently logged in as Owner/Admin')
                  : (lang === 'ru' ? `Вы сейчас в режиме: ${user.username}` : `Current mode: ${user.username}`)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {user.isRegistered ? (
              <button
                type="button"
                onClick={handleInstantSwitchGuest}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Войти как Гость' : 'Switch to Guest'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleInstantSwitchAdmin}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'ru' ? 'Вернуться в Админ' : 'Return to Admin'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tabs: Permanent Guest vs Duel Room */}
        <div className="relative z-10 flex bg-neutral-950 px-5 py-2 border-b border-neutral-800 gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setLinkType('guest');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              linkType === 'guest'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'ru' ? 'Постоянная гостевая ссылка' : 'Permanent Guest Link'}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setLinkType('room');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              linkType === 'room'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>{lang === 'ru' ? `Дуэль 1-на-1 (#${duelRoomCode})` : `1v1 Duel (#${duelRoomCode})`}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 space-y-4">
          {/* Public Link Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <span>{lang === 'ru' ? 'Ссылка для отправки друзьям:' : 'Link for friends:'}</span>
              </label>
              
              {/* How AI Studio Sharing works badge */}
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                <span>{lang === 'ru' ? 'Как открыть доступ без 403?' : 'How to allow public access?'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 bg-neutral-950 p-2 rounded-2xl border border-neutral-800">
              <input
                type="text"
                readOnly
                value={activeUrl}
                className="flex-1 bg-transparent px-2 text-xs font-mono text-cyan-300 outline-none select-all truncate"
              />
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-black" />
                    <span>{lang === 'ru' ? 'Скопировано!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-black" />
                    <span>{lang === 'ru' ? 'Копировать' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Room Code copy if in duel tab */}
            {linkType === 'room' && (
              <div className="p-3 rounded-2xl bg-neutral-950/80 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-neutral-400 block text-[11px]">
                    {lang === 'ru' ? 'Код комнаты (можно ввести вручную в игре):' : 'Room Code (can enter manually):'}
                  </span>
                  <span className="font-mono font-black text-base text-emerald-400 tracking-wider">
                    #{duelRoomCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Код скопирован!' : 'Копировать код'}</span>
                </button>
              </div>
            )}

            {/* AI Studio Publication Guidance (only relevant inside the AI Studio dev workspace) */}
            {isDev && (
            <div className="p-3 rounded-2xl bg-neutral-950 border border-amber-500/30 text-xs text-neutral-300 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{lang === 'ru' ? 'Важно для перехода других пользователей:' : 'Crucial for other users:'}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-300">
                {lang === 'ru' ? (
                  <>
                    В среде <strong>Google AI Studio</strong> внешняя ссылка (<span className="text-cyan-300 font-mono">ais-pre-...</span>) активируется после нажатия кнопки <strong>«Share» (Поделиться)</strong> в правом верхнем углу интерфейса AI Studio. 
                    До публикации ссылка может возвращать 404 или 403 сторонним людям.
                  </>
                ) : (
                  <>
                    In Google AI Studio, public URLs require clicking the <strong>«Share»</strong> button in the top-right toolbar. Until published, Cloud Run denies unauthorized visitors.
                  </>
                )}
              </p>

              {/* Developer local test tab button */}
              <div className="pt-1 flex items-center justify-between border-t border-neutral-800 text-[11px]">
                <span className="text-neutral-400">
                  {lang === 'ru' ? 'Тестируете сами в браузере?' : 'Testing in browser?'}
                </span>
                <button
                  type="button"
                  onClick={handleOpenLocalTab}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>{lang === 'ru' ? 'Открыть во 2-й вкладке разработчика' : 'Open in 2nd tab'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
            )}
          </div>

          {/* QR Code and Smartphone Scanning */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative p-2 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl shrink-0">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-28 h-28 rounded-xl object-contain"
                />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center text-neutral-600">
                  <QrCode className="w-10 h-10 animate-pulse" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-neutral-950 border border-cyan-500/50 text-cyan-400">
                <Smartphone className="w-3 h-3" />
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ru' ? 'Вход по QR-коду с телефона' : 'Scan via Phone'}</span>
              </span>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {lang === 'ru'
                  ? 'Отсканируйте камерой телефона для входа в игру как гость. Игра адаптирована под сенсорный экран.'
                  : 'Scan with phone camera to enter game instantly as a guest.'}
              </p>
            </div>
          </div>

          {/* 1-Click Messengers Share Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider block">
              {lang === 'ru' ? 'Отправить в мессенджеры:' : 'Send to messengers:'}
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleTelegramShare}
                className="py-2.5 px-3 rounded-xl bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border border-[#229ED9]/30 text-[#229ED9] hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegram</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="py-2.5 px-3 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleFacebookShare}
                className="py-2.5 px-3 rounded-xl bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border border-[#1877F2]/30 text-[#1877F2] hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Facebook className="w-3.5 h-3.5 fill-current" />
                <span>Facebook</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'ru' ? 'Гости могут играть во все режимы и дуэли' : 'Guests have full access to all duel modes'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            {lang === 'ru' ? 'Закрыть' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
