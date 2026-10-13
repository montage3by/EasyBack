import { UserProfile, LeaderboardEntry, AntiCheatLog, MatchHistoryItem, DonationConfig, DonationRecord } from '../types';

export const STORAGE_KEYS = {
  CURRENT_USER: 'reflex_duel_user_v1',
  ALL_USERS: 'reflex_duel_all_users_v1',
  MATCH_HISTORY: 'reflex_duel_matches_v1',
  ANTI_CHEAT_LOGS: 'reflex_duel_anticheat_v1',
  LANGUAGE: 'reflex_duel_lang_v1',
  SOUND_MUTED: 'reflex_duel_muted_v1',
  ACCOUNTS: 'reflex_duel_accounts_v1',
  SENT_EMAILS: 'reflex_duel_sent_emails_v1',
  DONATION_CONFIG: 'reflex_duel_donation_config_v1',
  DONATIONS: 'reflex_duel_donations_v1',
  SESSION_USER: 'reflex_duel_session_user_v2',
  SESSION_LEADERBOARD: 'reflex_duel_session_leaderboard_v2',
};

export interface SentEmailNotification {
  id: string;
  to: string;
  subject: string;
  password: string;
  type: 'registration' | 'password_reset';
  timestamp: number;
}

export const COLOR_OPTIONS = [
  { id: 'cyan', name: 'Electric Cyan', hex: '#06b6d4', glow: 'shadow-cyan-500/50', border: 'border-cyan-400', bg: 'bg-cyan-500' },
  { id: 'emerald', name: 'Neon Emerald', hex: '#10b981', glow: 'shadow-emerald-500/50', border: 'border-emerald-400', bg: 'bg-emerald-500' },
  { id: 'amber', name: 'Amber Surge', hex: '#f59e0b', glow: 'shadow-amber-500/50', border: 'border-amber-400', bg: 'bg-amber-500' },
  { id: 'rose', name: 'Pulse Crimson', hex: '#f43f5e', glow: 'shadow-rose-500/50', border: 'border-rose-400', bg: 'bg-rose-500' },
  { id: 'purple', name: 'Ultra Violet', hex: '#a855f7', glow: 'shadow-purple-500/50', border: 'border-purple-400', bg: 'bg-purple-500' },
  { id: 'indigo', name: 'Cyber Indigo', hex: '#6366f1', glow: 'shadow-indigo-500/50', border: 'border-indigo-400', bg: 'bg-indigo-500' },
];

export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

// Helper to generate a random fun session nickname
export function generateRandomNickname(): string {
  const adjectives = ['Быстрый', 'Кибер', 'Молния', 'Фантом', 'Вихрь', 'Турбо', 'Снайпер', 'Нео', 'Титан', 'Шторм', 'Apex', 'Hyper'];
  const nouns = ['Стрелок', 'Самурай', 'Клинок', 'Ястреб', 'Ниндзя', 'Волк', 'Призрак', 'Гепард', 'Ас', 'Спринтер', 'Тигр', 'Дракон'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${adj}${noun}_${num}`;
}

/**
 * Checks if the user has already entered a login for the current browser session
 */
export function hasSessionUser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.SESSION_USER);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Boolean(parsed && parsed.username && parsed.username.trim().length > 0);
    }
  } catch {}
  return false;
}

/**
 * Creates a new session user tied ONLY to the current session
 */
export function createSessionUser(
  username: string, 
  color?: string, 
  avatarUrl?: string, 
  country?: string
): UserProfile {
  const colors = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#3b82f6'];
  const chosenColor = color || colors[Math.floor(Math.random() * colors.length)];
  
  const sessionUser: UserProfile = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username: username.trim() || generateRandomNickname(),
    email: '',
    isRegistered: false,
    avatarUrl: avatarUrl || '',
    bio: 'Игрок Reflex Duel. Сессионный доступ.',
    country: country || 'RU',
    color: chosenColor,
    createdAt: new Date().toISOString(),
    stats: {
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      realMatchesPlayed: 0,
      bestReactionMs: 0,
      avgReactionMs: 0,
      reactionHistory: [],
      winStreak: 0,
      bestWinStreak: 0,
    },
    coins: 150,
    energy: {
      current: 15,
      max: 15,
      lastRegenTimestamp: Date.now(),
    },
    twoFactorEnabled: false,
    isAdmin: false,
    isBanned: false,
    antiCheatFlags: [],
    lastActive: new Date().toISOString(),
  };

  saveSessionUser(sessionUser);
  syncUserToSessionLeaderboard(sessionUser);
  return sessionUser;
}

export function saveSessionUser(user: UserProfile) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save session user:', err);
  }
}

export function getAdminUser(): UserProfile {
  const adminEmail = 'meerkat.site@gmail.com';
  return {
    id: 'admin_user_01',
    username: 'ApexReflex',
    email: adminEmail,
    isRegistered: true,
    avatarUrl: '',
    bio: 'Reaction Master & Duel Champion. Always aim for sub-180ms.',
    country: 'RU',
    color: '#06b6d4',
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    stats: {
      matchesPlayed: 168,
      matchesWon: 144,
      matchesLost: 24,
      realMatchesPlayed: 168,
      bestReactionMs: 158,
      avgReactionMs: 184,
      reactionHistory: [182, 174, 168, 162, 158, 176, 169, 164],
      winStreak: 14,
      bestWinStreak: 21,
    },
    coins: 1850,
    energy: {
      current: 15,
      max: 15,
      lastRegenTimestamp: Date.now(),
    },
    twoFactorEnabled: false,
    twoFactorSecret: '749281',
    isAdmin: true,
    isBanned: false,
    antiCheatFlags: [],
    lastActive: new Date().toISOString(),
  };
}

export function getInitialUser(): UserProfile {
  return getAdminUser();
}

export function createNewGuestUser(customName?: string): UserProfile {
  return createSessionUser(customName || generateRandomNickname());
}

export function getGuestUser(): UserProfile {
  return createSessionUser(generateRandomNickname());
}

/**
 * Loads the current active user:
 * 1. From sessionStorage (current session user)
 * 2. If admin logged in, from localStorage
 * 3. Fallback: prompt needed or default placeholder session user
 */
export function loadCurrentUser(): UserProfile {
  try {
    if (typeof window !== 'undefined') {
      // Check session storage first
      const sessionRaw = sessionStorage.getItem(STORAGE_KEYS.SESSION_USER);
      if (sessionRaw) {
        const sessionUser = JSON.parse(sessionRaw);
        if (sessionUser && sessionUser.username) {
          return sessionUser;
        }
      }

      // Check if admin is currently active in localStorage
      const localRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (localRaw) {
        const localUser: UserProfile = JSON.parse(localRaw);
        if (localUser.isAdmin && localUser.email === 'meerkat.site@gmail.com') {
          return localUser;
        }
      }
    }

    // Default placeholder awaiting login prompt
    const placeholder = createSessionUser('Игрок');
    return placeholder;
  } catch {
    return createSessionUser('Игрок');
  }
}

export function saveCurrentUser(user: UserProfile) {
  try {
    if (typeof window !== 'undefined') {
      // If admin, persist in localStorage so admin session stays for the admin
      if (user.isAdmin && user.email === 'meerkat.site@gmail.com') {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      }
      // Always keep in sessionStorage for the active session
      sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
    }
    // Update session leaderboard with latest stats
    syncUserToSessionLeaderboard(user);
  } catch (err) {
    console.error('Failed to save current user:', err);
  }
}

export function loadAllUsers(): UserProfile[] {
  let users: UserProfile[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALL_USERS);
    if (raw) {
      users = JSON.parse(raw);
    }
  } catch {}

  const currentUser = loadCurrentUser();
  const existingIdx = users.findIndex(u => u.id === currentUser.id);

  if (existingIdx >= 0) {
    users[existingIdx] = currentUser;
  } else {
    users.unshift(currentUser);
  }

  saveAllUsers(users);
  return users;
}

export function saveAllUsers(users: UserProfile[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save all users:', err);
  }
}

// ----------------------------------------------------
// SESSION GLOBAL LEADERBOARD (Reset and formed PER SESSION)
// "Глобальный рейтинг будет складываться только в рамках одной сессии"
// ----------------------------------------------------

function getBaseSessionContenders(): LeaderboardEntry[] {
  return [
    {
      id: 'session_bot_01',
      username: 'Quantum_Strike',
      avatarUrl: AVATAR_PRESETS[0],
      country: 'RU',
      color: '#06b6d4',
      rating: 1390,
      bestReactionMs: 172,
      avgReactionMs: 195,
      winRate: 82,
      matchesWon: 9,
      timeframeScores: { all_time: 1390, month: 1180, week: 620 },
    },
    {
      id: 'session_bot_02',
      username: 'NeoPhantom',
      avatarUrl: AVATAR_PRESETS[1],
      country: 'KZ',
      color: '#10b981',
      rating: 1340,
      bestReactionMs: 184,
      avgReactionMs: 202,
      winRate: 75,
      matchesWon: 8,
      timeframeScores: { all_time: 1340, month: 1140, week: 600 },
    },
    {
      id: 'session_bot_03',
      username: 'VortexSpeed',
      avatarUrl: AVATAR_PRESETS[2],
      country: 'BY',
      color: '#f59e0b',
      rating: 1280,
      bestReactionMs: 191,
      avgReactionMs: 215,
      winRate: 68,
      matchesWon: 6,
      timeframeScores: { all_time: 1280, month: 1090, week: 575 },
    },
    {
      id: 'session_bot_04',
      username: 'PulseHunter',
      avatarUrl: AVATAR_PRESETS[3],
      country: 'RU',
      color: '#a855f7',
      rating: 1230,
      bestReactionMs: 198,
      avgReactionMs: 224,
      winRate: 60,
      matchesWon: 5,
      timeframeScores: { all_time: 1230, month: 1045, week: 550 },
    },
    {
      id: 'session_bot_05',
      username: 'CyberFalcon',
      avatarUrl: AVATAR_PRESETS[4],
      country: 'US',
      color: '#f43f5e',
      rating: 1190,
      bestReactionMs: 205,
      avgReactionMs: 231,
      winRate: 54,
      matchesWon: 4,
      timeframeScores: { all_time: 1190, month: 1010, week: 535 },
    },
    {
      id: 'session_bot_06',
      username: 'ShadowRider',
      avatarUrl: AVATAR_PRESETS[5],
      country: 'DE',
      color: '#6366f1',
      rating: 1150,
      bestReactionMs: 214,
      avgReactionMs: 239,
      winRate: 50,
      matchesWon: 3,
      timeframeScores: { all_time: 1150, month: 980, week: 518 },
    },
  ];
}

export function loadSessionLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return getBaseSessionContenders();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.SESSION_LEADERBOARD);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch {}

  // Initialize fresh session leaderboard
  const initial = getBaseSessionContenders();
  const currentUser = loadCurrentUser();
  if (currentUser && currentUser.username) {
    const userEntry = convertUserToLeaderboardEntry(currentUser);
    initial.push(userEntry);
  }

  saveSessionLeaderboard(initial);
  return initial;
}

export function saveSessionLeaderboard(entries: LeaderboardEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_LEADERBOARD, JSON.stringify(entries));
  } catch (err) {
    console.error('Failed to save session leaderboard:', err);
  }
}

function convertUserToLeaderboardEntry(u: UserProfile): LeaderboardEntry {
  const winRate = u.stats.matchesPlayed > 0
    ? Math.round((u.stats.matchesWon / u.stats.matchesPlayed) * 100)
    : 0;

  const baseRating = 1200 + u.stats.matchesWon * 35 - u.stats.matchesLost * 15;
  const rating = Math.max(800, baseRating);

  return {
    id: u.id,
    username: u.username,
    avatarUrl: u.avatarUrl,
    country: u.country,
    color: u.color,
    rating,
    bestReactionMs: u.stats.bestReactionMs || 999,
    avgReactionMs: u.stats.avgReactionMs || 999,
    winRate,
    matchesWon: u.stats.matchesWon,
    timeframeScores: {
      all_time: rating,
      month: Math.round(rating * 0.85),
      week: Math.round(rating * 0.5),
    },
  };
}

export function syncUserToSessionLeaderboard(user: UserProfile) {
  if (!user || !user.username) return;
  const list = loadSessionLeaderboard();
  const existingIdx = list.findIndex(e => e.id === user.id || e.username.toLowerCase() === user.username.toLowerCase());
  const entry = convertUserToLeaderboardEntry(user);

  if (existingIdx >= 0) {
    list[existingIdx] = entry;
  } else {
    list.push(entry);
  }

  saveSessionLeaderboard(list);
}

export function getLeaderboard(timeframe: 'all_time' | 'month' | 'week'): LeaderboardEntry[] {
  const entries = loadSessionLeaderboard();
  const currentUser = loadCurrentUser();
  if (currentUser && currentUser.username) {
    syncUserToSessionLeaderboard(currentUser);
  }

  return [...entries].sort((a, b) => {
    const scoreDiff = b.timeframeScores[timeframe] - a.timeframeScores[timeframe];
    if (scoreDiff !== 0) return scoreDiff;
    return a.bestReactionMs - b.bestReactionMs;
  });
}

// ----------------------------------------------------
// Authentication (Admin Only, as regular users don't need passwords)
// ----------------------------------------------------

export function loginWithEmail(
  rawEmail: string, 
  rawPass: string
): { success: boolean; user?: UserProfile; message?: string } {
  const email = rawEmail.trim().toLowerCase();
  const password = rawPass.trim();

  if (!email || !password) {
    return { success: false, message: 'Заполните email и пароль' };
  }

  // Admin access remains intact
  if (email === 'meerkat.site@gmail.com' && password === 'AdminReflex1') {
    const adminUser = getAdminUser();
    saveCurrentUser(adminUser);
    return { success: true, user: adminUser };
  }

  return { success: false, message: 'Неверные данные администратора' };
}

export function resetPasswordWithEmail(rawEmail: string): { 
  success: boolean; 
  newPassword?: string; 
  user?: UserProfile; 
  message?: string 
} {
  const email = rawEmail.trim().toLowerCase();
  if (email === 'meerkat.site@gmail.com') {
    return {
      success: true,
      newPassword: 'AdminReflex1',
      user: getAdminUser(),
      message: 'Пароль администратора подтверждён: AdminReflex1',
    };
  }
  return { success: false, message: 'Восстановление доступно только для администратора' };
}

export function logoutUser(): UserProfile {
  // Clearing admin from localStorage
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  } catch {}

  const newSession = createSessionUser(generateRandomNickname());
  return newSession;
}

export function logMatchHistory(item: MatchHistoryItem) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.MATCH_HISTORY);
    const list: MatchHistoryItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(item);
    sessionStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(list.slice(0, 50)));
  } catch {}
}

export function loadMatchHistory(): MatchHistoryItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.MATCH_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function logAntiCheatEvent(log: AntiCheatLog) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANTI_CHEAT_LOGS);
    const list: AntiCheatLog[] = raw ? JSON.parse(raw) : [];
    list.unshift(log);
    localStorage.setItem(STORAGE_KEYS.ANTI_CHEAT_LOGS, JSON.stringify(list.slice(0, 40)));
  } catch {}
}

export function loadAntiCheatLogs(): AntiCheatLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANTI_CHEAT_LOGS);
    return raw ? JSON.parse(raw) : [
      {
        timestamp: Date.now() - 1000 * 60 * 45,
        eventType: 'synthetic_click',
        details: 'Periodic script timing detected (interval jitter < 0.2ms)',
        actionTaken: 'Flagged & challenge issued',
      },
      {
        timestamp: Date.now() - 1000 * 60 * 180,
        eventType: 'impossible_speed',
        details: 'Reaction speed recorded at 34ms without cue signal',
        actionTaken: 'Match invalidated & warning recorded',
      },
    ];
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// DONATION SYSTEM PERSISTENCE (Only Linked Wallet, Arbitrary Amount)
// -------------------------------------------------------------

import { 
  AUTHORIZED_OWNER_EMAIL, 
  generateDonationSignature, 
  verifyDonationIntegrity 
} from './donationSecurity';

const baseDefaultConfig: DonationConfig = {
  enabled: true,
  targetType: 'wallet', // ONLY WALLET
  cardNumber: '',
  cardHolder: '',
  bankName: '',
  walletType: 'СБП (Номер телефона) / ЮMoney / USDT',
  walletNumber: '+7 (999) 042-88-19 (СБП)',
  appealMessage: 'Reflex Duel создан для честных и молниеносных дуэлей без рекламы и энергии. Любой ваш донат помогает оплачивать серверную инфраструктуру, базу данных и развитие игры!',
  directPaymentUrl: '',
  signedBy: AUTHORIZED_OWNER_EMAIL,
  signatureTimestamp: 1775000000000,
  updatedAt: new Date().toISOString(),
};

baseDefaultConfig.digitalSignature = generateDonationSignature(baseDefaultConfig);
baseDefaultConfig.securityHash = baseDefaultConfig.digitalSignature.slice(-8);

export const DEFAULT_DONATION_CONFIG: DonationConfig = baseDefaultConfig;

export function loadDonationConfig(): { config: DonationConfig; isSecure: boolean; alertReason?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DONATION_CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DONATION_CONFIG, JSON.stringify(DEFAULT_DONATION_CONFIG));
      return { config: DEFAULT_DONATION_CONFIG, isSecure: true };
    }
    const parsed: DonationConfig = { ...DEFAULT_DONATION_CONFIG, ...JSON.parse(raw) };
    parsed.targetType = 'wallet'; // Enforce wallet only
    const integrity = verifyDonationIntegrity(parsed);

    if (!integrity.isValid) {
      logAntiCheatEvent({
        timestamp: Date.now(),
        eventType: 'donation_security_alert',
        details: `Попытка подмены реквизитов: ${integrity.threatReason || 'Неверная подпись'} (Кошелек: ${parsed.walletNumber})`,
        actionTaken: 'Реквизиты заблокированы защитой, перевод на фальшивый кошелек остановлен',
      });
      return { 
        config: parsed, 
        isSecure: false, 
        alertReason: integrity.threatReason 
      };
    }

    return { config: parsed, isSecure: true };
  } catch {
    return { config: DEFAULT_DONATION_CONFIG, isSecure: true };
  }
}

export function saveDonationConfig(config: DonationConfig) {
  try {
    const clean: DonationConfig = {
      ...config,
      targetType: 'wallet',
      cardNumber: '',
      cardHolder: '',
      bankName: '',
    };
    const signature = generateDonationSignature(clean);
    const updated: DonationConfig = { 
      ...clean, 
      digitalSignature: signature,
      signedBy: AUTHORIZED_OWNER_EMAIL,
      signatureTimestamp: Date.now(),
      securityHash: signature.slice(-8),
      updatedAt: new Date().toISOString() 
    };
    localStorage.setItem(STORAGE_KEYS.DONATION_CONFIG, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save donation config:', err);
    return config;
  }
}

export const INITIAL_DONATION_RECORDS: DonationRecord[] = [
  {
    id: 'don_01',
    donorName: 'CyberNinja',
    amount: 500,
    currency: 'RUB',
    method: 'wallet',
    message: 'За отличный онлайн мультиплеер!',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3,
  },
  {
    id: 'don_02',
    donorName: 'SpeedDemon_RU',
    amount: 1000,
    currency: 'RUB',
    method: 'wallet',
    message: 'Турнирный режим огонь! Удачи проекту.',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
  {
    id: 'don_03',
    donorName: 'ReflexMaster',
    amount: 350,
    currency: 'RUB',
    method: 'wallet',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 12,
  },
];

export function loadDonations(): DonationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DONATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(INITIAL_DONATION_RECORDS));
      return INITIAL_DONATION_RECORDS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DONATION_RECORDS;
  }
}

export function saveDonationRecord(record: DonationRecord): DonationRecord[] {
  try {
    const current = loadDonations();
    const updated = [record, ...current].slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save donation record:', err);
    return [];
  }
}
