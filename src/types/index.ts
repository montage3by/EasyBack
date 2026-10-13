export type Language = 'ru' | 'en' | 'es' | 'de';

export interface UserStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  bestReactionMs: number; // e.g. 189
  avgReactionMs: number;
  reactionHistory: number[];
  winStreak: number;
  bestWinStreak: number;
  realMatchesPlayed?: number;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  isRegistered?: boolean;
  avatarUrl: string;
  bio: string;
  country: string; // ISO 2 code or name
  color: string; // hex or Tailwind key
  createdAt: string;
  stats: UserStats;
  coins?: number; // legacy optional
  energy?: {
    current: number;
    max: number;
    lastRegenTimestamp: number;
  };
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  isAdmin?: boolean;
  isBanned?: boolean;
  antiCheatFlags?: string[];
  lastActive: string;
}

export type DonationMethodType = 'card' | 'wallet' | 'both';

export interface DonationConfig {
  enabled: boolean;
  targetType: DonationMethodType;
  // Debit card details
  cardNumber: string; // e.g. "2202 2012 3456 7890"
  cardHolder: string; // e.g. "АЛЕКСАНДР М."
  bankName: string;   // e.g. "Т-Банк / Сбербанк"
  // Online wallet details
  walletType: string; // e.g. "СБП (Телефон)", "ЮMoney", "USDT (TRC20)", "PayPal"
  walletNumber: string; // e.g. "+7 999 123-45-67", "410011234567890"
  // Custom message from admin
  appealMessage: string;
  directPaymentUrl?: string; // Optional direct payment link (СБП, CloudTips, Boosty)
  updatedAt?: string;
  // Security & Anti-Tampering Protection
  digitalSignature?: string; // Cryptographic integrity signature
  signedBy?: string; // Authorized owner email ("meerkat.site@gmail.com")
  signatureTimestamp?: number;
  securityHash?: string;
}

export interface DonationRecord {
  id: string;
  donorName: string;
  amount: number;
  currency: 'RUB' | 'USD' | 'EUR';
  method: 'card' | 'wallet';
  message?: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatarUrl: string;
  country: string;
  color: string;
  rating: number; // ELO / Trophy
  bestReactionMs: number;
  avgReactionMs: number;
  winRate: number; // percentage
  matchesWon: number;
  timeframeScores: {
    all_time: number;
    month: number;
    week: number;
  };
}

export type GameMode = 'online' | 'local' | 'practice' | 'room';

export type GameStage =
  | 'idle'
  | 'searching'
  | 'ready'
  | 'countdown'
  | 'waiting_signal'
  | 'signal_active'
  | 'round_result'
  | 'match_over';

export interface DuelPlayer {
  id: string;
  username: string;
  avatarUrl: string;
  color: string;
  score: number;
  lastReactionMs?: number | null;
  hasFalseStarted?: boolean;
  isReady?: boolean;
}

export interface MatchHistoryItem {
  id: string;
  mode: GameMode;
  date: string;
  opponentName: string;
  opponentAvatar: string;
  result: 'win' | 'loss' | 'abandoned';
  score: [number, number];
  playerBestReaction: number;
  coinsEarned: number;
}

export interface AntiCheatLog {
  timestamp: number;
  eventType: 'impossible_speed' | 'zero_variance' | 'synthetic_click' | 'captcha_passed' | 'donation_security_alert' | 'donation_signature_verified' | 'donation_requisites_updated';
  details: string;
  actionTaken: string;
}
