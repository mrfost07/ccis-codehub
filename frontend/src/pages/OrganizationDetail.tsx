import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { communityAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  Users, ArrowLeft, Crown, Shield, UserPlus, Settings,
  Lock, Clock, Check, X, MoreVertical, MessageSquare, Heart
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  description: string
  cover_image_url: string | null
  icon: string
  org_type: string
  program: string | null
  is_official: boolean
  is_private: boolean
  requires_approval: boolean
  member_count: number
  post_count: number
  is_member: boolean
  membership_status: string | null
  user_role: string | null
  created_at: string
}

interface Member {
  id: string
  user: { id: string; username: string; profile_picture: string | null }
  role: string
  status: string
  joined_at: string
}

interface Post {
  id: string
  author: { id: string; username: string; profile_picture: string | null }
  content: string
  image_url: string | null
  like_count: number
  comment_count: number
  created_at: string
}

export default function OrganizationDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [pendingRequests, setPendingRequests] = useState<Member[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'members' | 'pending'>('posts')

  const isAdmin = org?.user_role && ['admin', 'owner', 'moderator'].includes(org.user_role)

  useEffect(() => {
    if (slug) fetchData()
  }, [slug])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [orgRes, membersRes] = await Promise.all([
        communityAPI.getOrganization(slug!),
        communityAPI.getOrgMembers(slug!)
      ])
      setOrg(orgRes.data)
      setMembers(membersRes.data)

      if (orgRes.data.is_member) {
        const postsRes = await communityAPI.getOrgFeed(orgRes.data.id)
        setPosts(postsRes.data.results || postsRes.data)
      }

      // Fetch pending requests if admin
      if (orgRes.data.user_role && ['admin', 'owner', 'moderator'].includes(orgRes.data.user_role)) {
        const pendingRes = await communityAPI.getOrgPendingRequests(slug!)
        setPendingRequests(pendingRes.data)
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error)
      toast.error('Failed to load organization')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!org) return
    try {
      const response = await communityAPI.joinOrganization(org.slug)
      toast.success(response.data.message)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to join')
    }
  }

  const handleLeave = async () => {
    if (!org || !confirm(`Are you sure you want to leave ${org.name}?`)) return
    try {
      await communityAPI.leaveOrganization(org.slug)
      toast.success('Left organization')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to leave')
    }
  }

  const handleApproveMember = async (userId: string) => {
    if (!org) return
    try {
      await communityAPI.approveMember(org.slug, userId)
      toast.success('Member approved')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve')
    }
  }

  const handleRejectMember = async (userId: string) => {
    if (!org) return
    try {
      await communityAPI.rejectMember(org.slug, userId)
      toast.success('Request rejected')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject')
    }
  }

  const handleSetRole = async (userId: string, role: string) => {
    if (!org) return
    try {
      await communityAPI.setMemberRole(org.slug, userId, role)
      toast.success(`Role updated to ${role}`)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-400" />
      case 'admin': return <Shield className="w-4 h-4 text-purple-400" />
      case 'moderator': return <Shield className="w-4 h-4 text-blue-400" />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-white mb-4">Organization not found</h2>
          <Link to="/organizations" className="text-purple-400 hover:text-purple-300">
            Back to Organizations
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Cover & Header */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-purple-600/40 to-blue-600/40">
          {org.cover_image_url && (
            <img src={org.cover_image_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="max-w-5xl mx-auto px-4">
          <div className="relative -mt-16 flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-24 h-24 bg-slate-700 rounded-2xl flex items-center justify-center text-5xl border-4 border-slate-900">
              {org.icon}
            </div>

            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{org.name}</h1>
                {org.is_official && (
                  <span className="bg-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400">Official</span>
                  </span>
                )}
                {org.is_private && (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <p className="text-slate-400 mt-1">{org.member_count} members · {org.post_count} posts</p>
            </div>

            <div className="flex items-center gap-2 pb-4">
              {org.is_member ? (
                <>
                  {isAdmin && (
                    <Link
                      to={`/organizations/${org.slug}/settings`}
                      className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                    >
                      <Settings className="w-5 h-5" />
                    </Link>
                  )}
                  <button
                    onClick={handleLeave}
                    className="px-4 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-lg transition"
                  >
                    Leave
                  </button>
                </>
              ) : org.membership_status === 'pending' ? (
                <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Request Pending
                </span>
              ) : (
                <button
                  onClick={handleJoin}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {org.is_private ? 'Request to Join' : 'Join'}
                </button>
              )}
            </div>
          </div>

          {org.description && (
            <p className="text-slate-300 mt-4 max-w-2xl">{org.description}</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-slate-700 mt-6">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-3 border-b-2 transition whitespace-nowrap ${activeTab === 'posts'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-3 border-b-2 transition whitespace-nowrap ${activeTab === 'members'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
                }`}
            >
              Members ({members.length})
            </button>
            {isAdmin && pendingRequests.length > 0 && (
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-3 border-b-2 transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'pending'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
                  }`}
              >
                Pending
                <span className="bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {!org.is_member && org.is_private ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <Lock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-white mb-2">Private Organization</h3>
                <p className="text-slate-400">Join this organization to see posts</p>
              </div>
            ) : posts.length > 0 ? (
              posts.map(post => (
                <div key={post.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      {post.author.profile_picture ? (
                        <img src={post.author.profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold">{post.author.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <Link to={`/user/${post.author.id}`} className="text-white font-semibold hover:text-purple-400">
                        {post.author.username}
                      </Link>
                      <p className="text-slate-400 text-xs">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-300 mb-3">{post.content}</p>
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="rounded-lg max-h-96 w-full object-cover mb-3" />
                  )}
                  <div className="flex items-center gap-4 text-slate-400">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" /> {post.like_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" /> {post.comment_count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-white mb-2">No posts yet</h3>
                <p className="text-slate-400">Be the first to post in this organization</p>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => (
              <div key={member.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    {member.user.profile_picture ? (
                      <img src={member.user.profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold">{member.user.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <Link to={`/user/${member.user.id}`} className="text-white font-semibold hover:text-purple-400 flex items-center gap-2">
                      {member.user.username}
                      {getRoleIcon(member.role)}
                    </Link>
                    <p className="text-slate-400 text-xs capitalize">{member.role}</p>
                  </div>
                </div>

                {isAdmin && String(member.user.id) !== String(user?.id) && member.role !== 'owner' && (
                  <div className="relative group">
                    <button className="p-2 hover:bg-slate-700 rounded-lg transition">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-10 min-w-[150px]">
                      {org.user_role === 'owner' && (
                        <>
                          <button
                            onClick={() => handleSetRole(String(member.user.id), 'admin')}
                            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
                          >
                            Make Admin
                          </button>
                          <button
                            onClick={() => handleSetRole(String(member.user.id), 'moderator')}
                            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
                          >
                            Make Moderator
                          </button>
                          <button
                            onClick={() => handleSetRole(String(member.user.id), 'member')}
                            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
                          >
                            Set as Member
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && isAdmin && (
          <div className="space-y-4">
            {pendingRequests.length > 0 ? (
              pendingRequests.map(member => (
                <div key={member.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      {member.user.profile_picture ? (
                        <img src={member.user.profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold">{member.user.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <Link to={`/user/${member.user.id}`} className="text-white font-semibold hover:text-purple-400">
                        {member.user.username}
                      </Link>
                      <p className="text-slate-400 text-xs">
                        Requested {new Date(member.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveMember(String(member.user.id))}
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRejectMember(String(member.user.id))}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-white mb-2">No pending requests</h3>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="fixed bottom-6 left-6">
        <Link
          to="/organizations"
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shadow-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
    </div>
  )
}
