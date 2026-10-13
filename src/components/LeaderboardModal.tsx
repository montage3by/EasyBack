import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  X, 
  Search, 
  Clock, 
  Zap, 
  Crown, 
  Users, 
  Info, 
  ChevronUp, 
  ChevronDown, 
  Target, 
  Gamepad2,
  Eye
} from 'lucide-react';
import { Language, LeaderboardEntry, UserProfile } from '../types';
import { translations } from '../utils/i18n';
import { getLeaderboard } from '../utils/storage';
import { UserAvatar } from './UserAvatar';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentUser: UserProfile;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  lang,
  currentUser,
}) => {
  const t = translations[lang];
  const [timeframe, setTimeframe] = useState<'all_time' | 'month' | 'week'>('all_time');
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [adminViewAll, setAdminViewAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEntries(getLeaderboard(timeframe));
    }
  }, [isOpen, timeframe]);

  if (!isOpen) return null;

  // Find current user's global index in full ranking
  const userGlobalIndex = entries.findIndex(e => e.id === currentUser.id);

  // Determine slice and visible entries
  let visibleEntriesWithRanks: { player: LeaderboardEntry; globalRank: number }[] = [];
  let playersAboveCount = 0;
  let playersBelowCount = 0;

  if (searchQuery.trim()) {
    // When searching, filter across all entries and keep original global rank
    visibleEntriesWithRanks = entries
      .map((player, idx) => ({ player, globalRank: idx + 1 }))
      .filter(({ player }) =>
        player.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.country.toLowerCase().includes(searchQuery.toLowerCase())
      );
  } else if (currentUser.isAdmin && adminViewAll) {
    visibleEntriesWithRanks = entries.map((player, idx) => ({ player, globalRank: idx + 1 }));
  } else if (userGlobalIndex !== -1) {
    // Focused window: 10 players above current user, current user, 10 players below
    const startIndex = Math.max(0, userGlobalIndex - 10);
    const endIndex = Math.min(entries.length, userGlobalIndex + 11); // +11 because slice is exclusive of end index
    playersAboveCount = startIndex;
    playersBelowCount = Math.max(0, entries.length - endIndex);

    visibleEntriesWithRanks = entries
      .slice(startIndex, endIndex)
      .map((player, sliceIdx) => ({
        player,
        globalRank: startIndex + sliceIdx + 1,
      }));
  } else {
    // Current user hasn't played a real duel yet: show top contenders
    const endIndex = Math.min(entries.length, 20);
    playersBelowCount = Math.max(0, entries.length - endIndex);
    visibleEntriesWithRanks = entries
      .slice(0, endIndex)
      .map((player, idx) => ({ player, globalRank: idx + 1 }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                {t.leaderboard}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {lang === 'ru' 
                    ? 'Текущая сессия' 
                    : lang === 'de' 
                      ? 'Aktuelle Sitzung' 
                      : lang === 'es' 
                        ? 'Sesión Actual' 
                        : 'Current Session'}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {lang === 'ru' 
                  ? 'Глобальный рейтинг бойцов, складывающийся в рамках текущей игровой сессии' 
                  : lang === 'de'
                    ? 'Globale Rangliste der Spieler innerhalb der aktuellen Spielsitzung'
                    : lang === 'es'
                      ? 'Clasificación global de jugadores acumulada en la sesión actual'
                      : 'Live global duel ranking accumulated during the active session'}
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

        {/* Filter Bar: Timeframe tabs, formula toggle & search */}
        <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-neutral-950/40">
          {/* Tabs */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-2xl border border-neutral-800 w-full sm:w-auto">
            {(['all_time', 'month', 'week'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-neutral-800 text-cyan-400 shadow-md'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tf === 'all_time' ? t.allTime : tf === 'month' ? t.thisMonth : t.thisWeek}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            {/* Rating formula toggle button */}
            <button
              type="button"
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                showFormulaInfo
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border-neutral-800'
              }`}
              title={lang === 'ru' ? 'Как формируется рейтинг' : lang === 'de' ? 'Wertungsformel-Details' : 'Rating formula details'}
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ru' ? 'Формула' : lang === 'de' ? 'Formel' : lang === 'es' ? 'Fórmula' : 'Formula'}</span>
            </button>

            {/* Admin view toggle */}
            {currentUser.isAdmin && (
              <button
                type="button"
                onClick={() => setAdminViewAll(!adminViewAll)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  adminViewAll
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
                }`}
                title={lang === 'ru' ? 'Переключить режим просмотра (Админ)' : lang === 'de' ? 'Ansichtsmodus umschalten (Admin)' : 'Toggle view mode (Admin)'}
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {adminViewAll 
                    ? (lang === 'ru' ? 'Все' : lang === 'de' ? 'Alle' : lang === 'es' ? 'Todos' : 'All') 
                    : (lang === 'ru' ? 'Окно ±10' : lang === 'de' ? 'Fenster ±10' : lang === 'es' ? 'Ventana ±10' : 'Window ±10')}
                </span>
              </button>
            )}

            {/* Search box */}
            <div className="relative flex-1 sm:w-44">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'ru' ? 'Поиск...' : lang === 'de' ? 'Suchen...' : lang === 'es' ? 'Buscar...' : 'Search...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* User Rank Indicator / Notification Bar */}
        <div className="px-4 py-2.5 bg-neutral-950/70 border-b border-neutral-800 flex items-center justify-between text-xs">
          {userGlobalIndex !== -1 ? (
            <div className="flex items-center gap-2 text-neutral-300">
              <Target className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                {lang === 'ru' ? 'Ваша позиция:' : lang === 'de' ? 'Deine Position:' : 'Your position:'}{' '}
                <strong className="text-cyan-400 font-mono font-black">#{userGlobalIndex + 1}</strong>
                <span className="text-neutral-500 ml-2 hidden sm:inline">
                  {lang === 'ru' 
                    ? '(видны 10 позиций выше и 10 ниже)' 
                    : lang === 'de' 
                      ? '(10 Spieler darüber und 10 darunter sichtbar)' 
                      : '(viewing 10 above and 10 below)'}
                </span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-300 text-[11px]">
              <Gamepad2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {lang === 'ru'
                  ? 'Вы пока не сыграли ни одной игры с реальным игроком. Завершите дуэль, чтобы войти в рейтинг!'
                  : lang === 'de'
                    ? 'Du hast noch kein Duell mit einem echten Spieler bestritten. Beende ein Duell, um in die Rangliste einzutreten!'
                    : lang === 'es'
                      ? '¡Juega al menos 1 duelo contra un jugador real para entrar en la clasificación!'
                      : 'Play at least 1 duel against a real player to enter the global ranking!'}
              </span>
            </div>
          )}

          <div className="text-[11px] font-mono text-neutral-500 shrink-0">
            {lang === 'ru' ? 'Всего в рейтинге:' : lang === 'de' ? 'Gesamt gewertet:' : 'Total ranked:'} <span className="text-neutral-300 font-bold">{entries.length}</span>
          </div>
        </div>

        {/* Rating Formula Explainer Block */}
        {showFormulaInfo && (
          <div className="p-4 mx-4 mt-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-neutral-300 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between font-bold text-cyan-300 mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>
                  {lang === 'ru' 
                    ? 'Как рассчитывается число общего рейтинга:' 
                    : lang === 'de' 
                      ? 'Berechnung der Gesamt-Ranglistenwertung:' 
                      : 'How total player rating is calculated:'}
                </span>
              </div>
              <button 
                onClick={() => setShowFormulaInfo(false)}
                className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              <div className="bg-neutral-900/90 p-2.5 rounded-xl border border-neutral-800">
                <span className="font-bold text-cyan-400">
                  {lang === 'ru' ? '1. Базовый порог' : lang === 'de' ? '1. Basispunkte' : '1. Base Points'}
                </span>
                <p className="text-neutral-300 mt-1">
                  {lang === 'ru' 
                    ? 'Стартовый несгораемый рейтинг каждого нового игрока — 1 200 очков.' 
                    : lang === 'de'
                      ? 'Startwert für jeden neuen Spieler beträgt 1.200 Punkte.'
                      : 'Initial baseline rating is 1,200 points for all contenders.'}
                </p>
              </div>

              <div className="bg-neutral-900/90 p-2.5 rounded-xl border border-neutral-800">
                <span className="font-bold text-emerald-400">
                  {lang === 'ru' ? '2. Победы и поражения' : lang === 'de' ? '2. Siege & Niederlagen' : '2. Wins & Defeats'}
                </span>
                <p className="text-neutral-300 mt-1">
                  {lang === 'ru' 
                    ? '+25 очков за каждую победу в дуэли. -10 очков за поражение (минимум 800).' 
                    : lang === 'de'
                      ? '+25 Punkte je Duellsieg. -10 Punkte bei Niederlage (Untergrenze: 800).'
                      : '+25 pts per victory. -10 pts per defeat (safe bottom floor of 800).'}
                </p>
              </div>

              <div className="bg-neutral-900/90 p-2.5 rounded-xl border border-neutral-800">
                <span className="font-bold text-amber-400">
                  {lang === 'ru' ? '3. Реакция (тай-брейк)' : lang === 'de' ? '3. Reaktion (Tie-Break)' : '3. Reaction (Tie-Break)'}
                </span>
                <p className="text-neutral-300 mt-1">
                  {lang === 'ru' 
                    ? 'При равенстве очков выше в таблице стоит тот, у кого рекорд реакции быстрее (меньше мс).' 
                    : lang === 'de'
                      ? 'Bei Punktgleichheit entscheidet die Reaktionszeit: geringere ms bringen den höheren Rang.'
                      : 'Ties are broken by reaction speed: lower ms record earns the higher rank.'}
                </p>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-cyan-500/20 text-[10px] text-neutral-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                {lang === 'ru' 
                  ? 'Вкладки периодов: «Всё время» — 100% рейтинга; «За месяц» — 85% очков; «За неделю» — 45% очков.' 
                  : lang === 'de'
                    ? 'Zeiträume: „Gesamte Zeit“ (100%), „Dieser Monat“ (85%), „Diese Woche“ (45%).'
                    : 'Timeframe tabs: "All Time" (100%), "Month" (85%), "Week" (45%).'}
              </span>
            </div>
          </div>
        )}

        {/* Leaderboard Table list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Top indicator if more players exist above the visible window */}
          {playersAboveCount > 0 && !searchQuery.trim() && (
            <div className="py-2.5 px-4 rounded-2xl bg-neutral-950/80 border border-dashed border-neutral-800 text-center text-xs text-neutral-400 flex items-center justify-center gap-2 select-none">
              <ChevronUp className="w-4 h-4 text-cyan-400" />
              <span>
                {lang === 'ru'
                  ? `Ещё ${playersAboveCount} ${playersAboveCount === 1 ? 'игрок' : playersAboveCount < 5 ? 'игрока' : 'игроков'} выше в таблице`
                  : `${playersAboveCount} more players higher in the ranking`}
              </span>
            </div>
          )}

          {visibleEntriesWithRanks.length === 0 ? (
            <div className="text-center py-12 text-sm text-neutral-500">
              {lang === 'ru' ? 'В глобальном рейтинге пока нет игроков' : t.noLeaderboardData}
            </div>
          ) : (
            visibleEntriesWithRanks.map(({ player, globalRank }) => {
              const isCurrentUser = player.id === currentUser.id;
              const isTop3 = globalRank <= 3;
              const score = player.timeframeScores[timeframe];
              const isAdminPlayer = (isCurrentUser && currentUser.isAdmin) || player.username === 'ApexReflex';

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-2xl transition-all border ${
                    isCurrentUser
                      ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/30'
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  {/* Left: Rank, Avatar, Name */}
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-7 text-center font-black font-mono text-sm">
                      {globalRank === 1 ? (
                        <span className="text-yellow-400 text-lg">🥇</span>
                      ) : globalRank === 2 ? (
                        <span className="text-neutral-300 text-lg">🥈</span>
                      ) : globalRank === 3 ? (
                        <span className="text-amber-600 text-lg">🥉</span>
                      ) : (
                        <span className="text-neutral-500">#{globalRank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="relative">
                      <UserAvatar
                        avatarUrl={player.avatarUrl}
                        username={player.username}
                        color={player.color}
                        size="md"
                      />
                      <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 rounded bg-black/80 text-white border border-neutral-800">
                        {player.country}
                      </span>
                    </div>

                    {/* Player Info */}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-extrabold text-sm ${isCurrentUser ? 'text-cyan-300' : 'text-white'}`}>
                          {player.username}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-bold bg-cyan-500/20 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/30">
                            {lang === 'ru' ? 'ВЫ' : lang === 'de' ? 'DU' : lang === 'es' ? 'TÚ' : 'YOU'}
                          </span>
                        )}
                        {isAdminPlayer && (
                          <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono">
                        <span className="text-cyan-400 font-semibold">
                          ⚡ {player.bestReactionMs} {t.ms}
                        </span>
                        <span>&bull;</span>
                        <span className="text-emerald-400 font-medium">
                          {player.matchesWon} {lang === 'ru' ? 'побед' : lang === 'de' ? 'Siege' : 'wins'}
                        </span>
                        <span>&bull;</span>
                        <span>{player.winRate}% {t.winRate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score / Rating */}
                  <div className="text-right">
                    <div className="text-base font-black font-mono text-white">
                      {score}
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase font-semibold">
                      {t.rating}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Bottom indicator if more players exist below the visible window */}
          {playersBelowCount > 0 && !searchQuery.trim() && (
            <div className="py-2.5 px-4 rounded-2xl bg-neutral-950/80 border border-dashed border-neutral-800 text-center text-xs text-neutral-400 flex items-center justify-center gap-2 select-none">
              <ChevronDown className="w-4 h-4 text-cyan-400" />
              <span>
                {lang === 'ru'
                  ? `Ещё ${playersBelowCount} ${playersBelowCount === 1 ? 'игрок' : playersBelowCount < 5 ? 'игрока' : 'игроков'} ниже в таблице`
                  : lang === 'de'
                    ? `Noch ${playersBelowCount} Spieler darunter`
                    : `${playersBelowCount} more players lower in the ranking`}
              </span>
            </div>
          )}
        </div>

        {/* Footer with current user position */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>
              {lang === 'ru' ? 'Ваш лучший рекорд:' : lang === 'de' ? 'Dein Reaktionsrekord:' : 'Your best reflex:'}{' '}
              <strong className="text-white font-mono">{currentUser.stats.bestReactionMs || '---'} {t.ms}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition-colors cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
