/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, Language, UserProfile, MatchHistoryItem, DuelPlayer } from './types';
import { 
  loadCurrentUser, 
  saveCurrentUser, 
  logMatchHistory, 
  logAntiCheatEvent,
  createNewGuestUser,
  getAdminUser,
  hasSessionUser
} from './utils/storage';
import { multiplayer } from './utils/multiplayer';
import { Navbar } from './components/Navbar';
import { HomeLobby } from './components/HomeLobby';
import { DuelArena } from './components/DuelArena';
import { LeaderboardModal } from './components/LeaderboardModal';
import { ProfileModal } from './components/ProfileModal';
import { DonationModal } from './components/DonationModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { RulesModal } from './components/RulesModal';
import { AntiCheatModal } from './components/AntiCheatModal';
import { OnlineDuelModal } from './components/OnlineDuelModal';
import { GuestLinkModal } from './components/GuestLinkModal';
import { SessionLoginModal } from './components/SessionLoginModal';

export default function App() {
  const [user, setUser] = useState<UserProfile>(() => loadCurrentUser());
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('reflex_duel_lang_v1');
    return (saved === 'ru' || saved === 'en' || saved === 'es' || saved === 'de') ? saved : 'ru';
  });

  const [activeScreen, setActiveScreen] = useState<'lobby' | 'duel'>('lobby');
  const [gameMode, setGameMode] = useState<GameMode>('online');

  // Room states for multiplayer
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [activeRoomCode, setActiveRoomCode] = useState<string>('');
  const [activeOpponent, setActiveOpponent] = useState<DuelPlayer | null>(null);

  // Initial Session Login Modal (shown if player hasn't entered nickname for this session yet)
  const [isSessionLoginOpen, setIsSessionLoginOpen] = useState<boolean>(() => !hasSessionUser() && !user.isAdmin);

  // Modals state
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isGuestLinkOpen, setIsGuestLinkOpen] = useState(false);
  const [guestWelcomeBanner, setGuestWelcomeBanner] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [antiCheatSpeed, setAntiCheatSpeed] = useState<number | null>(null);

  // Auto-connect to room from URL parameter or detect guest link on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    
    // Check permanent guest link
    const isGuestQuery = params.get('guest') === 'true' || params.get('invite') === 'guest';
    if (isGuestQuery) {
      setGuestWelcomeBanner(true);
    }

    const roomParam = params.get('room') || params.get('join') || params.get('duel');
    if (roomParam) {
      const code = roomParam.trim().toUpperCase();
      setActiveRoomCode(code);
      setGameMode('online');
      multiplayer.connect(user);
      multiplayer.joinRoom(code, user);
      setActiveScreen('duel');
    }
  }, []); // Run on initial mount

  // Quick switch helpers for testing guest mode in the current tab
  const handleSwitchToGuestMode = () => {
    const guest = createNewGuestUser();
    setUser(guest);
    saveCurrentUser(guest);
    setGuestWelcomeBanner(true);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('guest', 'true');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSwitchToAdminMode = () => {
    const admin = getAdminUser();
    setUser(admin);
    saveCurrentUser(admin);
    setGuestWelcomeBanner(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('guest');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Sync language selection
  const handleSelectLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('reflex_duel_lang_v1', newLang);
  };

  // Update current user helper
  const handleUpdateUser = (updatedProps: Partial<UserProfile>) => {
    const updated: UserProfile = { ...user, ...updatedProps };
    setUser(updated);
    saveCurrentUser(updated);
  };

  // Switch user profile
  const handleSwitchUser = (newUser: UserProfile) => {
    setUser(newUser);
    saveCurrentUser(newUser);
  };

  // Start game mode - completely unblocked for all users
  const handleStartGame = (mode: GameMode, roomId?: string, roomCode?: string, opponent?: DuelPlayer) => {
    if (mode === 'online') {
      if (!roomId && !roomCode) {
        setIsOnlineModalOpen(true);
        return;
      }
    }
    setGameMode(mode);
    setActiveRoomId(roomId || '');
    setActiveRoomCode(roomCode || '');
    setActiveOpponent(opponent || null);
    setActiveScreen('duel');
  };

  // Start online duel from OnlineDuelModal
  const handleStartOnlineDuel = (roomId: string, roomCode: string, opponent?: DuelPlayer) => {
    setGameMode('online');
    setActiveRoomId(roomId);
    setActiveRoomCode(roomCode);
    setActiveOpponent(opponent || null);
    setActiveScreen('duel');
    setIsOnlineModalOpen(false);
  };

  // Match completion handler
  const handleMatchComplete = useCallback(
    (
      result: 'win' | 'loss' | 'abandoned',
      opponentName: string,
      opponentAvatar: string,
      bestReaction: number,
      score: [number, number],
      isRealOpponent?: boolean
    ) => {
      setUser(prev => {
        const isWin = result === 'win' || result === 'abandoned';
        const newMatchesPlayed = prev.stats.matchesPlayed + 1;
        const isReal = isRealOpponent ?? (gameMode === 'local' || gameMode === 'room' || gameMode === 'online');
        const newRealMatches = (prev.stats.realMatchesPlayed || 0) + (isReal ? 1 : 0);
        const newMatchesWon = isWin ? prev.stats.matchesWon + 1 : prev.stats.matchesWon;
        const newMatchesLost = isWin ? prev.stats.matchesLost : prev.stats.matchesLost + 1;
        const newWinStreak = isWin ? prev.stats.winStreak + 1 : 0;
        const newBestStreak = Math.max(prev.stats.bestWinStreak, newWinStreak);

        const newBestReaction = bestReaction > 0 && bestReaction < 900
          ? prev.stats.bestReactionMs === 0 ? bestReaction : Math.min(prev.stats.bestReactionMs, bestReaction)
          : prev.stats.bestReactionMs;

        const history = [...prev.stats.reactionHistory];
        if (bestReaction > 0 && bestReaction < 900) {
          history.push(bestReaction);
        }
        const recentHistory = history.slice(-15);
        const newAvg = recentHistory.length > 0
          ? Math.round(recentHistory.reduce((a, b) => a + b, 0) / recentHistory.length)
          : prev.stats.avgReactionMs;

        const updated: UserProfile = {
          ...prev,
          stats: {
            ...prev.stats,
            matchesPlayed: newMatchesPlayed,
            realMatchesPlayed: newRealMatches,
            matchesWon: newMatchesWon,
            matchesLost: newMatchesLost,
            bestReactionMs: newBestReaction,
            avgReactionMs: newAvg,
            reactionHistory: recentHistory,
            winStreak: newWinStreak,
            bestWinStreak: newBestStreak,
          },
        };

        saveCurrentUser(updated);

        // Record history log
        const historyItem: MatchHistoryItem = {
          id: `match_${Date.now()}`,
          mode: gameMode,
          date: new Date().toISOString(),
          opponentName,
          opponentAvatar,
          result,
          score,
          playerBestReaction: bestReaction === 999 ? 0 : bestReaction,
          coinsEarned: 0,
        };
        logMatchHistory(historyItem);

        return updated;
      });
    },
    [gameMode]
  );

  // Anti-cheat detection trigger (< 80ms)
  const handleAntiCheatFlag = (reactionMs: number) => {
    logAntiCheatEvent({
      timestamp: Date.now(),
      eventType: 'impossible_speed',
      details: `Inhuman reaction measured: ${reactionMs}ms (visual minimum threshold: 80ms)`,
      actionTaken: 'Human verification challenge triggered',
    });
    setAntiCheatSpeed(reactionMs);
  };

  const handleAntiCheatVerified = () => {
    logAntiCheatEvent({
      timestamp: Date.now(),
      eventType: 'captcha_passed',
      details: 'Player passed anti-bot math verification',
      actionTaken: 'Fair play status cleared',
    });
    setAntiCheatSpeed(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Outfit',sans-serif] selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        user={user}
        lang={lang}
        onSelectLang={handleSelectLang}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenDonate={() => setIsDonationOpen(true)}
        onOpenGuestLink={() => setIsGuestLinkOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenOnlineModal={() => setIsOnlineModalOpen(true)}
      />

      {/* Guest Welcome Banner if arrived via link */}
      {guestWelcomeBanner && (
        <div className="bg-gradient-to-r from-cyan-950/90 via-neutral-900/90 to-emerald-950/90 border-b border-cyan-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-cyan-300 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 max-w-2xl">
            <span className="text-base">🎉</span>
            <span>
              {lang === 'ru'
                ? 'Вы вошли по постоянной ссылке! Все игровые режимы, онлайн дуэли и комнаты открыты.'
                : lang === 'de'
                  ? 'Du bist über einen Direktlink beigetreten! Alle Spielmodi und Duelle sind sofort geöffnet.'
                  : 'You joined via direct link! All game modes, online duels, and private rooms are open.'}
            </span>
          </div>
          <button
            onClick={() => setGuestWelcomeBanner(false)}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer ml-3 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {activeScreen === 'lobby' ? (
          <HomeLobby
            user={user}
            lang={lang}
            onStartGame={handleStartGame}
            onOpenOnlineModal={() => setIsOnlineModalOpen(true)}
            onOpenDonate={() => setIsDonationOpen(true)}
            onOpenGuestLink={() => setIsGuestLinkOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenRules={() => setIsRulesOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
          />
        ) : (
          <DuelArena
            mode={gameMode}
            user={user}
            lang={lang}
            roomId={activeRoomId}
            roomCode={activeRoomCode}
            initialOpponent={activeOpponent}
            onExit={() => {
              setActiveScreen('lobby');
              setActiveRoomId('');
              setActiveRoomCode('');
              setActiveOpponent(null);
            }}
            onMatchComplete={handleMatchComplete}
            onAntiCheatFlag={handleAntiCheatFlag}
          />
        )}
      </main>

      {/* Mandatory Single-Session Nickname / Login Modal */}
      <SessionLoginModal
        isOpen={isSessionLoginOpen}
        lang={lang}
        onLoginComplete={(newUser) => {
          setUser(newUser);
          setIsSessionLoginOpen(false);
        }}
      />

      {/* Online Duel Modal (Matchmaking, Room Creation, Join Code) */}
      <OnlineDuelModal
        isOpen={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        user={user}
        lang={lang}
        onStartDuel={handleStartOnlineDuel}
      />

      {/* Permanent Share Link Modal */}
      <GuestLinkModal
        isOpen={isGuestLinkOpen}
        onClose={() => setIsGuestLinkOpen(false)}
        lang={lang}
        user={user}
        currentRoomCode={activeRoomCode}
        onSwitchToGuest={handleSwitchToGuestMode}
        onSwitchToAdmin={handleSwitchToAdminMode}
      />

      {/* Other Modals */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        lang={lang}
        currentUser={user}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        lang={lang}
        onUpdateUser={handleUpdateUser}
        onSwitchUser={handleSwitchUser}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Donation Modal - Linked Wallet Only, Arbitrary Amount */}
      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
        user={user}
        lang={lang}
      />

      {/* Admin Panel Modal (Owner only) */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        lang={lang}
        currentUser={user}
        onUpdateCurrentUser={handleUpdateUser}
      />

      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        lang={lang}
      />

      <AntiCheatModal
        isOpen={antiCheatSpeed !== null}
        onClose={() => setAntiCheatSpeed(null)}
        lang={lang}
        flaggedSpeedMs={antiCheatSpeed || 0}
        onVerified={handleAntiCheatVerified}
      />
    </div>
  );
}
