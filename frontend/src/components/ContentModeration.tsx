import { useState, useEffect, useMemo } from 'react'
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area
} from 'recharts'
import {
    MessageSquare, Heart, Bookmark, Eye, Users, TrendingUp,
    FileText, AlertTriangle, RefreshCw, Building2,
    ThumbsUp, MessageCircle, Hash, ArrowUpDown, Search, Filter, ChevronDown, ChevronUp
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface ContentStats {
    total_posts: number
    total_comments: number
    total_likes: number
    total_views: number
    total_organizations: number
    total_reports: number
    posts_by_type: Array<{ post_type: string; count: number }>
    post_trend: Array<{ date: string; posts: number; comments: number }>
    top_authors: Array<{ username: string; post_count: number; like_count: number }>
    engagement: {
        total_views: number
        avg_likes_per_post: number | string
        avg_comments_per_post: number | string
    }
}

interface Organization {
    id: string
    name: string
    slug: string
    org_type: string
    member_count: number
    post_count: number
    is_official: boolean
    created_at: string
}

// Chart colors
const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6']
const TYPE_COLORS: Record<string, string> = {
    text: '#8b5cf6',
    idea: '#8b5cf6',
    question: '#06b6d4',
    showcase: '#10b981',
    discussion: '#f59e0b',
    tutorial: '#ec4899',
    resource: '#6366f1'
}

type SortField = 'title' | 'author' | 'post_type' | 'like_count' | 'comment_count' | 'created_at'
type SortDirection = 'asc' | 'desc'

export default function ContentModeration() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<ContentStats | null>(null)
    const [posts, setPosts] = useState<any[]>([])
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [hashtags, setHashtags] = useState<any[]>([])
    const [activeView, setActiveView] = useState<'posts' | 'organizations' | 'hashtags'>('posts')

    // Post table filters and sorting
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [sortField, setSortField] = useState<SortField>('created_at')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    useEffect(() => {
        fetchContentData()
    }, [])

    const fetchContentData = async () => {
        setLoading(true)
        try {
            // Fetch all community data in parallel
            const [postsRes, orgsRes, hashtagsRes, commentsRes] = await Promise.all([
                api.get('/community/posts/').catch(() => ({ data: [] })),
                api.get('/community/organizations/').catch(() => ({ data: [] })),
                api.get('/community/hashtags/').catch(() => ({ data: [] })),
                api.get('/community/comments/').catch(() => ({ data: [] }))
            ])

            const postsData = Array.isArray(postsRes.data) ? postsRes.data : postsRes.data?.results || []
            const orgsData = Array.isArray(orgsRes.data) ? orgsRes.data : orgsRes.data?.results || []
            const hashtagsData = Array.isArray(hashtagsRes.data) ? hashtagsRes.data : hashtagsRes.data?.results || []
            const commentsData = Array.isArray(commentsRes.data) ? commentsRes.data : commentsRes.data?.results || []

            // Calculate stats
            const totalLikes = postsData.reduce((sum: number, post: any) => sum + (post.like_count || 0), 0)
            const totalComments = commentsData.length || postsData.reduce((sum: number, post: any) => sum + (post.comment_count || 0), 0)
            const totalViews = postsData.reduce((sum: number, post: any) => sum + (post.view_count || 0), 0)

            // Posts by type
            const postsByType = postsData.reduce((acc: Record<string, number>, post: any) => {
                const type = post.post_type || 'discussion'
                acc[type] = (acc[type] || 0) + 1
                return acc
            }, {})

            const postsByTypeArray = Object.entries(postsByType).map(([post_type, count]) => ({
                post_type,
                count: count as number
            }))

            // Top authors
            const authorStats = postsData.reduce((acc: Record<string, { post_count: number; like_count: number }>, post: any) => {
                const author = post.author?.username || 'Unknown'
                if (!acc[author]) {
                    acc[author] = { post_count: 0, like_count: 0 }
                }
                acc[author].post_count++
                acc[author].like_count += post.like_count || 0
                return acc
            }, {})

            const topAuthors = (Object.entries(authorStats) as [string, { post_count: number; like_count: number }][])
                .map(([username, data]) => ({
                    username,
                    post_count: data.post_count,
                    like_count: data.like_count
                }))
                .sort((a, b) => b.post_count - a.post_count)
                .slice(0, 5)

            // Generate trend data
            const now = new Date()
            const trendData = []
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now)
                date.setDate(date.getDate() - i)
                const dateStr = date.toISOString().split('T')[0]
                const postsOnDate = postsData.filter((p: any) =>
                    p.created_at?.startsWith(dateStr)
                ).length
                const commentsOnDate = commentsData.filter((c: any) =>
                    c.created_at?.startsWith(dateStr)
                ).length
                trendData.push({
                    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    posts: postsOnDate,
                    comments: commentsOnDate
                })
            }

            setStats({
                total_posts: postsData.length,
                total_comments: totalComments,
                total_likes: totalLikes,
                total_views: totalViews,
                total_organizations: orgsData.length,
                total_reports: 0,
                posts_by_type: postsByTypeArray,
                post_trend: trendData,
                top_authors: topAuthors,
                engagement: {
                    total_views: totalViews,
                    avg_likes_per_post: postsData.length > 0 ? (totalLikes / postsData.length).toFixed(1) : 0,
                    avg_comments_per_post: postsData.length > 0 ? (totalComments / postsData.length).toFixed(1) : 0
                }
            })

            setPosts(postsData)
            setOrganizations(orgsData)
            setHashtags(hashtagsData)
        } catch (error) {
            console.error('Failed to fetch content data:', error)
            toast.error('Failed to load content moderation data')
        } finally {
            setLoading(false)
        }
    }

    // Filtered and sorted posts
    const filteredPosts = useMemo(() => {
        let result = [...posts]

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            result = result.filter(post =>
                post.title?.toLowerCase().includes(term) ||
                post.author?.username?.toLowerCase().includes(term) ||
                post.content?.toLowerCase().includes(term)
            )
        }

        // Type filter
        if (typeFilter !== 'all') {
            result = result.filter(post => post.post_type === typeFilter)
        }

        // Sort
        result.sort((a, b) => {
            let aVal: any, bVal: any
            switch (sortField) {
                case 'title':
                    aVal = a.title || ''
                    bVal = b.title || ''
                    break
                case 'author':
                    aVal = a.author?.username || ''
                    bVal = b.author?.username || ''
                    break
                case 'post_type':
                    aVal = a.post_type || ''
                    bVal = b.post_type || ''
                    break
                case 'like_count':
                    aVal = a.like_count || 0
                    bVal = b.like_count || 0
                    break
                case 'comment_count':
                    aVal = a.comment_count || 0
                    bVal = b.comment_count || 0
                    break
                case 'created_at':
                    aVal = new Date(a.created_at || 0).getTime()
                    bVal = new Date(b.created_at || 0).getTime()
                    break
                default:
                    aVal = a[sortField]
                    bVal = b[sortField]
            }

            if (typeof aVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal)
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        })

        return result
    }, [posts, searchTerm, typeFilter, sortField, sortDirection])

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-slate-500" />
        return sortDirection === 'asc'
            ? <ChevronUp className="w-4 h-4 text-indigo-400" />
            : <ChevronDown className="w-4 h-4 text-indigo-400" />
    }

    const formatLabel = (label: string) => {
        return label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
                    <p className="text-white font-semibold">{payload[0].name || payload[0].dataKey}</p>
                    <p className="text-indigo-400">{payload[0].value}</p>
                </div>
            )
        }
        return null
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Loading content analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Content Moderation</h2>
                    <p className="text-slate-400">Manage and analyze community content</p>
                </div>
                <button
                    onClick={fetchContentData}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon={<FileText className="w-5 h-5" />} label="Posts" value={stats?.total_posts || 0} color="from-indigo-500 to-purple-500" />
                <StatCard icon={<MessageCircle className="w-5 h-5" />} label="Comments" value={stats?.total_comments || 0} color="from-cyan-500 to-blue-500" />
                <StatCard icon={<Heart className="w-5 h-5" />} label="Likes" value={stats?.total_likes || 0} color="from-pink-500 to-rose-500" />
                <StatCard icon={<Eye className="w-5 h-5" />} label="Views" value={stats?.total_views || 0} color="from-amber-500 to-orange-500" />
                <StatCard icon={<Building2 className="w-5 h-5" />} label="Groups" value={stats?.total_organizations || 0} color="from-green-500 to-emerald-500" />
                <StatCard icon={<Hash className="w-5 h-5" />} label="Hashtags" value={hashtags.length} color="from-violet-500 to-purple-500" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Posts by Type Pie Chart */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-400" />
                        Posts by Type
                    </h3>
                    {stats?.posts_by_type && stats.posts_by_type.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={stats.posts_by_type}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="count"
                                    nameKey="post_type"
                                    label={({ name, percent }: { name?: string; percent?: number }) =>
                                        `${formatLabel(name || '')} ${((percent || 0) * 100).toFixed(0)}%`
                                    }
                                    labelLine={false}
                                >
                                    {stats.posts_by_type.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.post_type] || COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[220px] flex items-center justify-center text-slate-400">No post data</div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2 justify-center">
                        {stats?.posts_by_type?.map((entry, index) => (
                            <div key={entry.post_type} className="flex items-center gap-1 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[entry.post_type] || COLORS[index % COLORS.length] }} />
                                <span className="text-slate-300">{formatLabel(entry.post_type)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Trend */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                        Activity Trend (7 Days)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={stats?.post_trend || []}>
                            <defs>
                                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                            <YAxis stroke="#94a3b8" fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area type="monotone" dataKey="posts" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPosts)" />
                            <Area type="monotone" dataKey="comments" stroke="#06b6d4" fillOpacity={1} fill="url(#colorComments)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Contributors */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-400" />
                    Top Contributors
                </h3>
                {stats?.top_authors && stats.top_authors.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={stats.top_authors} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                            <YAxis dataKey="username" type="category" stroke="#94a3b8" width={80} fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="post_count" name="Posts" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="like_count" name="Likes" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[180px] flex items-center justify-center text-slate-400">No author data</div>
                )}
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 border-b border-slate-700 pb-2">
                {(['posts', 'organizations', 'hashtags'] as const).map(view => (
                    <button
                        key={view}
                        onClick={() => setActiveView(view)}
                        className={`px-4 py-2 rounded-t-lg transition ${activeView === view
                                ? 'bg-slate-700 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        {view === 'posts' && <><FileText className="w-4 h-4 inline mr-2" />Posts ({posts.length})</>}
                        {view === 'organizations' && <><Building2 className="w-4 h-4 inline mr-2" />Groups ({organizations.length})</>}
                        {view === 'hashtags' && <><Hash className="w-4 h-4 inline mr-2" />Hashtags ({hashtags.length})</>}
                    </button>
                ))}
            </div>

            {/* Posts Table */}
            {activeView === 'posts' && (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search posts..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">All Types</option>
                            <option value="text">Text</option>
                            <option value="question">Question</option>
                            <option value="showcase">Showcase</option>
                            <option value="discussion">Discussion</option>
                            <option value="tutorial">Tutorial</option>
                        </select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs uppercase bg-slate-700/50">
                                <tr>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('title')}>
                                        <div className="flex items-center gap-1">Title <SortIcon field="title" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('author')}>
                                        <div className="flex items-center gap-1">Author <SortIcon field="author" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('post_type')}>
                                        <div className="flex items-center gap-1">Type <SortIcon field="post_type" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('like_count')}>
                                        <div className="flex items-center gap-1">Likes <SortIcon field="like_count" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('comment_count')}>
                                        <div className="flex items-center gap-1">Comments <SortIcon field="comment_count" /></div>
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('created_at')}>
                                        <div className="flex items-center gap-1">Date <SortIcon field="created_at" /></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPosts.slice(0, 20).map(post => (
                                    <tr key={post.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                                        <td className="px-4 py-3 font-medium text-white max-w-[200px] truncate">{post.title || 'Untitled'}</td>
                                        <td className="px-4 py-3">{post.author?.username || 'Unknown'}</td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded-full text-xs" style={{
                                                backgroundColor: `${TYPE_COLORS[post.post_type] || '#6366f1'}20`,
                                                color: TYPE_COLORS[post.post_type] || '#6366f1'
                                            }}>
                                                {formatLabel(post.post_type || 'text')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3"><Heart className="w-4 h-4 inline text-pink-400 mr-1" />{post.like_count || 0}</td>
                                        <td className="px-4 py-3"><MessageCircle className="w-4 h-4 inline text-cyan-400 mr-1" />{post.comment_count || 0}</td>
                                        <td className="px-4 py-3 text-slate-400">{post.created_at ? new Date(post.created_at).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                                {filteredPosts.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No posts found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredPosts.length > 20 && (
                        <p className="text-sm text-slate-400 mt-4 text-center">Showing 20 of {filteredPosts.length} posts</p>
                    )}
                </div>
            )}

            {/* Organizations Table */}
            {activeView === 'organizations' && (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs uppercase bg-slate-700/50">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Members</th>
                                    <th className="px-4 py-3">Posts</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {organizations.map(org => (
                                    <tr key={org.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                                        <td className="px-4 py-3 font-medium text-white">{org.name}</td>
                                        <td className="px-4 py-3">{formatLabel(org.org_type || 'club')}</td>
                                        <td className="px-4 py-3"><Users className="w-4 h-4 inline text-green-400 mr-1" />{org.member_count || 0}</td>
                                        <td className="px-4 py-3"><FileText className="w-4 h-4 inline text-indigo-400 mr-1" />{org.post_count || 0}</td>
                                        <td className="px-4 py-3">
                                            {org.is_official ? (
                                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Official</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded-full text-xs">Community</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">{org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                                {organizations.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No organizations found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Hashtags Table */}
            {activeView === 'hashtags' && (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {hashtags.slice(0, 30).map((tag: any) => (
                            <div key={tag.id} className="bg-slate-700/50 rounded-lg p-3 text-center hover:bg-slate-600/50 transition">
                                <p className="text-indigo-400 font-semibold">#{tag.tag}</p>
                                <p className="text-xs text-slate-400 mt-1">{tag.usage_count || 0} uses</p>
                            </div>
                        ))}
                        {hashtags.length === 0 && (
                            <div className="col-span-full text-center py-8 text-slate-400">No hashtags found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${color} text-white mb-2`}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
        </div>
    )
}
