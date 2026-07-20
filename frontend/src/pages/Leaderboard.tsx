import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Medal, Star, Zap, Code2, BookOpen, Award, Crown,
  Map, GraduationCap, Shield
} from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { EmptyState, Skeleton, SkeletonListRow } from '../components/ui'

interface LeaderboardUser {
  id: string
  username: string
  first_name: string
  last_name: string
  profile_picture: string | null
  program: string
  year_level: string
}

interface LeaderboardEntry {
  rank: number
  user: LeaderboardUser
  total_points: number
  weekly_points: number
  monthly_points: number
  modules_completed: number
  challenges_solved: number
  paths_completed: number
  certificates_earned: number
  badges_earned: number
  is_me: boolean
}

interface LeaderboardResponse {
  period: string
  total_users: number
  entries: LeaderboardEntry[]
}

interface MyRank {
  rank: number | null
  total_users: number
  percentile: number
  total_points: number
  entry: LeaderboardEntry | null
}

type TabId = 'all_time' | 'monthly' | 'weekly'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all_time', label: 'All Time' },
  { id: 'monthly',  label: 'This Month' },
  { id: 'weekly',   label: 'This Week' },
]

// Medal treatments: gold = amber-400, silver = neutral-300, bronze = amber-600.
// Neutral surfaces, tinted borders — no colored glows (DESIGN_SYSTEM.md §15).
const PODIUM_CONFIG: Record<number, {
  border: string; text: string
  Icon: React.FC<{ className?: string }>; iconClass: string
}> = {
  1: { border: 'border-amber-400/50',  text: 'text-amber-400',  Icon: Crown, iconClass: 'text-amber-400' },
  2: { border: 'border-neutral-500/60', text: 'text-neutral-300', Icon: Medal, iconClass: 'text-neutral-300' },
  3: { border: 'border-amber-600/50',  text: 'text-amber-600',  Icon: Award, iconClass: 'text-amber-600' },
}

function Avatar({ user, size = 'md' }: { user: LeaderboardUser; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase()
  if (user.profile_picture) {
    return <img src={user.profile_picture} alt={user.username} className={`${sz} rounded-full object-cover`} />
  }
  return (
    <div className={`${sz} rounded-full bg-neutral-800 flex items-center justify-center font-medium text-neutral-300 flex-shrink-0`}>
      {initials}
    </div>
  )
}

const PLACE_LABELS: Record<number, string> = { 1: '1st place', 2: '2nd place', 3: '3rd place' }

function TopCard({ entry, position, onClick }: { entry: LeaderboardEntry; position: 1 | 2 | 3; onClick: () => void }) {
  const cfg = PODIUM_CONFIG[position]
  const { Icon, iconClass } = cfg

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-neutral-900 p-4 text-left transition-colors hover:bg-neutral-850 cursor-pointer min-w-0 ${cfg.border}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${cfg.text}`}>
          <Icon className={`w-3.5 h-3.5 ${iconClass}`} /> {PLACE_LABELS[position]}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Avatar user={entry.user} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white text-sm truncate">
            {entry.user.first_name && entry.user.last_name
              ? `${entry.user.first_name} ${entry.user.last_name}`
              : entry.user.username}
          </p>
          <p className="text-xs text-neutral-500 truncate">{entry.user.program || 'Student'}</p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
        <div className="flex gap-3 text-xs text-neutral-500 tabular-nums">
          <span className="flex items-center gap-1" title="Modules completed">
            <BookOpen className="w-3 h-3" /> {entry.modules_completed}
          </span>
          <span className="flex items-center gap-1" title="Challenges solved">
            <Code2 className="w-3 h-3" /> {entry.challenges_solved}
          </span>
        </div>
        <p className="text-lg font-bold text-white tabular-nums">
          {entry.total_points.toLocaleString()} <span className="text-xs font-normal text-neutral-500">pts</span>
        </p>
      </div>
    </button>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
      <Crown className="w-3.5 h-3.5 text-amber-400" />
    </div>
  )
  if (rank === 2) return (
    <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center">
      <Medal className="w-3.5 h-3.5 text-neutral-300" />
    </div>
  )
  if (rank === 3) return (
    <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-600/40 flex items-center justify-center">
      <Award className="w-3.5 h-3.5 text-amber-600" />
    </div>
  )
  return <span className="text-sm font-bold text-neutral-500 w-7 text-center tabular-nums">#{rank}</span>
}

function ScoreBreakdown({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="flex items-center gap-3 text-xs text-neutral-500 tabular-nums flex-wrap">
      <span className="flex items-center gap-1" title="Modules completed">
        <BookOpen className="w-3 h-3" /> {entry.modules_completed}
      </span>
      <span className="flex items-center gap-1" title="Challenges solved">
        <Code2 className="w-3 h-3" /> {entry.challenges_solved}
      </span>
      <span className="flex items-center gap-1" title="Paths completed">
        <Map className="w-3 h-3" /> {entry.paths_completed}
      </span>
      <span className="flex items-center gap-1" title="Certificates">
        <GraduationCap className="w-3 h-3" /> {entry.certificates_earned}
      </span>
      <span className="flex items-center gap-1" title="Badges">
        <Shield className="w-3 h-3" /> {entry.badges_earned}
      </span>
    </div>
  )
}

const POINT_GUIDE = [
  { icon: BookOpen, label: 'Complete a module', pts: '+10' },
  { icon: Code2,    label: 'Solve a challenge', pts: '+50' },
  { icon: Map,      label: 'Finish a career path', pts: '+100' },
  { icon: GraduationCap, label: 'Earn a certificate', pts: '+200' },
  { icon: Shield,   label: 'Unlock a badge', pts: '+20' },
  { icon: Star,     label: 'Legendary badge', pts: '+300' },
]

export default function Leaderboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('all_time')

  const { data, isLoading: loading } = useQuery({
    queryKey: ['leaderboard', tab],
    queryFn: async () => {
      const url = tab === 'all_time'
        ? '/learning/leaderboard/'
        : tab === 'monthly'
        ? '/learning/leaderboard/monthly/'
        : '/learning/leaderboard/weekly/'
      const res = await api.get(url)
      return res.data as LeaderboardResponse
    },
    staleTime: 2 * 60 * 1000,  // 2 min cache
  })

  const { data: myRank } = useQuery({
    queryKey: ['leaderboard', 'me'],
    queryFn: async () => {
      const res = await api.get('/learning/leaderboard/me/')
      return res.data as MyRank
    },
    staleTime: 2 * 60 * 1000,
  })

  const entries = data?.entries ?? []
  const top3 = entries.slice(0, 3)

  const goToProfile = (userId: string) => navigate(`/user/${userId}`)

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Page header (DESIGN_SYSTEM.md §11) */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> CCIS-CodeHub Rankings
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Leaderboard</h1>
          <p className="mt-2 text-neutral-400 max-w-3xl leading-relaxed">
            See how you stack up against fellow CCIS students — earn points by completing modules,
            solving challenges, and finishing career paths.
          </p>
        </div>

        {/* Compact standing banner (mobile/tablet — desktop shows it in the rail) */}
        {myRank?.rank && (
          <div className="lg:hidden mb-6 p-4 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-600/15 to-transparent flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
              <span className="text-base font-bold text-purple-300 tabular-nums">#{myRank.rank}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm">Your standing</p>
              <p className="text-xs text-neutral-400 tabular-nums">
                {myRank.total_points.toLocaleString()} pts · Top {100 - myRank.percentile}% of {myRank.total_users} students
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-8">
          {/* Main column */}
          <div className="flex-1 min-w-0">
            {/* Period tabs + competing count */}
            <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
              <div className="flex gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`px-4 sm:px-5 py-2 rounded-md font-medium text-sm transition-colors ${
                      tab === t.id ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
              {data && (
                <span className="text-xs sm:text-sm text-neutral-500 tabular-nums">
                  {data.total_users} student{data.total_users !== 1 ? 's' : ''} competing
                </span>
              )}
            </div>

            {loading ? (
              <>
                {/* Skeletons matching the top-cards + rankings layout */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  {[0, 1, 2].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 divide-y divide-neutral-800/70">
                  {[0, 1, 2, 3, 4].map(i => <SkeletonListRow key={i} />)}
                </div>
              </>
            ) : (
              <>
                {/* Top performers — equal highlight cards, no pedestals */}
                {top3.length === 3 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                    <TopCard entry={top3[0]} position={1} onClick={() => goToProfile(top3[0].user.id)} />
                    <TopCard entry={top3[1]} position={2} onClick={() => goToProfile(top3[1].user.id)} />
                    <TopCard entry={top3[2]} position={3} onClick={() => goToProfile(top3[2].user.id)} />
                  </div>
                )}

                {/* Full rankings table */}
                {entries.length > 0 && (
                  <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                        <Medal className="w-3.5 h-3.5 text-purple-400" /> Rankings
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Points</span>
                    </div>
                    <div className="divide-y divide-neutral-800/50">
                      {entries.map((entry) => (
                        <button
                          key={entry.user.id}
                          type="button"
                          onClick={() => goToProfile(entry.user.id)}
                          className={`w-full flex items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-neutral-800/40 cursor-pointer ${
                            entry.is_me ? 'bg-purple-600/10 border-l-2 border-purple-500' : ''
                          }`}
                        >
                          <div className="w-8 flex-shrink-0 flex justify-center">
                            <RankBadge rank={entry.rank} />
                          </div>
                          <Avatar user={entry.user} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">
                              {entry.user.first_name && entry.user.last_name
                                ? `${entry.user.first_name} ${entry.user.last_name}`
                                : entry.user.username}
                              {entry.is_me && <span className="ml-1.5 text-xs font-medium text-purple-400">You</span>}
                            </p>
                            <ScoreBreakdown entry={entry} />
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-white tabular-nums">{entry.total_points.toLocaleString()}</p>
                            <p className="text-xs text-neutral-500">pts</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {data?.entries.length === 0 && (
                  <EmptyState
                    icon={<Trophy className="w-12 h-12" />}
                    title="No rankings yet for this period"
                    description="Complete modules and challenges to appear here."
                  />
                )}
              </>
            )}
          </div>

          {/* Right rail (≥lg): your standing + scoring guide */}
          <aside className="hidden lg:flex flex-col w-80 shrink-0 sticky top-20 gap-4">
            {myRank?.rank ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">Your standing</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-purple-300 tabular-nums">#{myRank.rank}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-white tabular-nums">{myRank.total_points.toLocaleString()}</p>
                    <p className="text-xs text-neutral-500">total points</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-neutral-400">Top {100 - myRank.percentile}% of {myRank.total_users}</span>
                    <span className="text-neutral-200 font-semibold tabular-nums">{myRank.percentile}th percentile</span>
                  </div>
                  <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-[width] duration-500"
                      style={{ width: `${myRank.percentile}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40 p-5 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-neutral-700" />
                <p className="text-sm text-neutral-400 font-medium">You're not ranked yet</p>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Complete a module or solve a challenge to enter the leaderboard.
                </p>
              </div>
            )}

            {/* Scoring guide — doubles as a legend for the row icons */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> How points work
              </p>
              <div className="space-y-1">
                {POINT_GUIDE.map(({ icon: Icon, label, pts }) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                    <div className="w-7 h-7 rounded-md bg-neutral-800 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <span className="flex-1 text-sm text-neutral-300">{label}</span>
                    <span className="text-sm font-semibold text-amber-400 tabular-nums">{pts}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 pt-3 border-t border-neutral-800 text-xs text-neutral-500 leading-relaxed">
                The same icons appear beside each student's name in the rankings.
              </p>
            </div>
          </aside>
        </div>

        {/* Scoring guide (mobile/tablet) */}
        <div className="lg:hidden mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> How points work
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {POINT_GUIDE.map(({ icon: Icon, label, pts }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                <div className="w-7 h-7 rounded-md bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-neutral-400" />
                </div>
                <span className="flex-1 text-sm text-neutral-300">{label}</span>
                <span className="text-sm font-semibold text-amber-400 tabular-nums">{pts}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
