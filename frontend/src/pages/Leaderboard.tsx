import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Trophy, Medal, Star, Zap, Code2, BookOpen, Award, Crown,
  Map, GraduationCap, Shield, BarChart2
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

function PodiumCard({ entry, position }: { entry: LeaderboardEntry; position: 1 | 2 | 3 }) {
  const cfg = PODIUM_CONFIG[position]
  const heights: Record<number, string> = { 1: 'h-32', 2: 'h-24', 3: 'h-20' }
  const order: Record<number, string>   = { 1: 'order-2', 2: 'order-1', 3: 'order-3' }
  const { Icon, iconClass } = cfg

  return (
    <div className={`${order[position]} flex flex-col items-center gap-2`}>
      {/* User card above podium */}
      <div className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border bg-neutral-900 ${cfg.border} shadow-card`}>
        <div className="relative">
          <Avatar user={entry.user} size="lg" />
          {/* Icon badge overlay */}
          <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full bg-neutral-950 border-2 ${cfg.border} flex items-center justify-center`}>
            <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
          </div>
        </div>
        <p className="font-bold text-white text-sm text-center leading-tight">
          {entry.user.first_name || entry.user.username}
        </p>
        <p className="text-xs text-neutral-400">{entry.user.program || 'Student'}</p>
        <p className={`font-bold text-lg tabular-nums ${cfg.text}`}>
          {entry.total_points.toLocaleString()} <span className="text-xs font-normal">pts</span>
        </p>
        <div className="flex gap-3 text-xs text-neutral-500 tabular-nums">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {entry.modules_completed}
          </span>
          <span className="flex items-center gap-1">
            <Code2 className="w-3 h-3" /> {entry.challenges_solved}
          </span>
        </div>
      </div>
      {/* Podium base */}
      <div className={`w-24 ${heights[position]} rounded-t-lg bg-neutral-900 border ${cfg.border} flex items-center justify-center`}>
        <span className={`text-3xl font-bold tabular-nums ${cfg.text}`}>{position}</span>
      </div>
    </div>
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
  { icon: BookOpen, label: 'Module complete', pts: '+10' },
  { icon: Code2,    label: 'Challenge solved', pts: '+50' },
  { icon: Map,      label: 'Path completed', pts: '+100' },
  { icon: GraduationCap, label: 'Certificate', pts: '+200' },
  { icon: Shield,   label: 'Badge (common)', pts: '+20' },
  { icon: Star,     label: 'Badge (legendary)', pts: '+300' },
]

export default function Leaderboard() {
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

  const top3 = data?.entries.slice(0, 3) ?? []
  const rest  = data?.entries.slice(3) ?? []

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Page header (DESIGN_SYSTEM.md §11) */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 mb-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> CCIS-CodeHub Rankings
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Leaderboard</h1>
          <p className="mt-2 text-neutral-400 max-w-3xl leading-relaxed">
            {data ? `${data.total_users} students competing` : 'Top performers across the platform'}
          </p>
        </div>

        {/* My Rank Card */}
        {myRank?.rank && (
          <div className="mb-8 p-4 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-600/15 to-transparent flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Your Rank</p>
                <p className="text-2xl font-bold text-purple-400 tabular-nums">#{myRank.rank}</p>
              </div>
              <div className="pl-3 border-l border-neutral-700">
                <p className="text-neutral-400 text-sm">Top {100 - myRank.percentile}%</p>
                <p className="text-white font-semibold tabular-nums">{myRank.total_points.toLocaleString()} pts</p>
              </div>
            </div>
            <div className="flex-1 min-w-32">
              <div className="flex justify-between text-xs text-neutral-500 mb-1">
                <span>Progress to top</span>
                <span className="tabular-nums">{myRank.percentile}th percentile</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-[width] duration-300"
                  style={{ width: `${myRank.percentile}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs — segmented control, purple = selected */}
        <div className="flex gap-1 mb-8 bg-neutral-900 p-1 rounded-lg border border-neutral-800 w-fit mx-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-md font-medium text-sm transition-colors ${
                tab === t.id ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <>
            {/* Skeletons matching the podium + rankings layout */}
            <div className="flex items-end justify-center gap-4 mb-10">
              <Skeleton className="h-48 w-24 rounded-2xl" />
              <Skeleton className="h-56 w-24 rounded-2xl" />
              <Skeleton className="h-44 w-24 rounded-2xl" />
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 divide-y divide-neutral-800/70">
              {[0, 1, 2, 3, 4].map(i => <SkeletonListRow key={i} />)}
            </div>
          </>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length >= 3 && (
              <div className="flex items-end justify-center gap-4 mb-10">
                <PodiumCard entry={top3[1]} position={2} />
                <PodiumCard entry={top3[0]} position={1} />
                <PodiumCard entry={top3[2]} position={3} />
              </div>
            )}

            {/* Rankings — 4th onwards */}
            {rest.length > 0 && (
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-neutral-800 flex items-center gap-2">
                  <Medal className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-neutral-300">Rankings</span>
                </div>
                <div className="divide-y divide-neutral-800/50">
                  {rest.map((entry) => (
                    <div
                      key={entry.user.id}
                      className={`flex items-center gap-4 px-5 py-3 transition-colors hover:bg-neutral-800/40 ${
                        entry.is_me ? 'bg-purple-600/10 border-l-2 border-purple-500' : ''
                      }`}
                    >
                      <div className="w-8 flex-shrink-0 flex justify-center">
                        <RankBadge rank={entry.rank} />
                      </div>
                      <Avatar user={entry.user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white text-sm truncate">
                            {entry.user.first_name && entry.user.last_name
                              ? `${entry.user.first_name} ${entry.user.last_name}`
                              : entry.user.username}
                            {entry.is_me && <span className="ml-1 text-xs text-purple-400">(You)</span>}
                          </p>
                        </div>
                        <ScoreBreakdown entry={entry} />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-white tabular-nums">{entry.total_points.toLocaleString()}</p>
                        <p className="text-xs text-neutral-500">points</p>
                      </div>
                    </div>
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

            {/* Points guide */}
            <div className="mt-8 p-5 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
              <h3 className="text-sm font-bold text-neutral-300 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" /> How Points Work
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {POINT_GUIDE.map(({ icon: Icon, label, pts }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-neutral-500">
                    <div className="w-6 h-6 rounded-md bg-neutral-800 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <span>{label} <strong className="text-neutral-300 tabular-nums">{pts} pts</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
