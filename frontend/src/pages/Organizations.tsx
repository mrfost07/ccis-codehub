import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { communityAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  Users, Plus, Search, Filter, Crown, Shield, UserPlus,
  Check, X, Clock, Lock, Globe, Building2
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

interface Invitation {
  id: string
  organization: Organization
  inviter: { id: string; username: string }
  message: string
  created_at: string
}

export default function Organizations() {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [myOrgs, setMyOrgs] = useState<Organization[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'discover' | 'my-orgs' | 'invitations'>('discover')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [allOrgs, userOrgs, invites] = await Promise.all([
        communityAPI.getOrganizations(),
        user ? communityAPI.getOrganizations({ my_orgs: 'true' }) : Promise.resolve({ data: [] }),
        user ? communityAPI.getMyOrgInvitations() : Promise.resolve({ data: [] })
      ])
      setOrganizations(allOrgs.data)
      setMyOrgs(userOrgs.data)
      setInvitations(invites.data)
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (org: Organization) => {
    try {
      const response = await communityAPI.joinOrganization(org.slug)
      toast.success(response.data.message)
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to join')
    }
  }

  const handleLeave = async (org: Organization) => {
    if (!confirm(`Are you sure you want to leave ${org.name}?`)) return
    try {
      await communityAPI.leaveOrganization(org.slug)
      toast.success('Left organization')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to leave')
    }
  }

  const handleAcceptInvitation = async (org: Organization) => {
    try {
      await communityAPI.acceptOrgInvitation(org.slug)
      toast.success('Joined organization!')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to accept invitation')
    }
  }

  const handleDeclineInvitation = async (org: Organization) => {
    try {
      await communityAPI.declineOrgInvitation(org.slug)
      toast.success('Invitation declined')
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to decline invitation')
    }
  }

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === 'all' || org.org_type === filter
    return matchesSearch && matchesFilter
  })

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'program': return 'Program'
      case 'club': return 'Club'
      case 'interest': return 'Interest Group'
      case 'official': return 'Official'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'program': return 'bg-blue-500/20 text-blue-400'
      case 'club': return 'bg-purple-500/20 text-purple-400'
      case 'interest': return 'bg-green-500/20 text-green-400'
      case 'official': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const OrganizationCard = ({ org, showActions = true }: { org: Organization; showActions?: boolean }) => (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden hover:border-purple-500/30 transition">
      {/* Cover */}
      <div className="h-24 bg-gradient-to-r from-purple-600/30 to-blue-600/30 relative">
        {org.cover_image_url && (
          <img src={org.cover_image_url} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute -bottom-6 left-4">
          <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-2xl border-2 border-slate-800">
            {org.icon}
          </div>
        </div>
        {org.is_official && (
          <div className="absolute top-2 right-2 bg-yellow-500/20 px-2 py-1 rounded-full flex items-center gap-1">
            <Crown className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-400">Official</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 pt-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Link to={`/organizations/${org.slug}`} className="text-white font-semibold hover:text-purple-400 flex items-center gap-2">
              {org.name}
              {org.is_private && <Lock className="w-3 h-3 text-slate-400" />}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(org.org_type)}`}>
                {getTypeLabel(org.org_type)}
              </span>
              {org.program && (
                <span className="text-xs text-slate-400">{org.program}</span>
              )}
            </div>
          </div>
        </div>

        <p className="text-slate-400 text-sm mb-4 line-clamp-2">
          {org.description || 'No description'}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {org.member_count}
            </span>
            <span>{org.post_count} posts</span>
          </div>

          {showActions && user && (
            <div>
              {org.is_member ? (
                <div className="flex items-center gap-2">
                  {org.user_role && ['admin', 'owner', 'moderator'].includes(org.user_role) && (
                    <span className="text-xs text-purple-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {org.user_role}
                    </span>
                  )}
                  <button
                    onClick={() => handleLeave(org)}
                    className="px-3 py-1 text-sm bg-slate-700 hover:bg-red-600 text-slate-300 hover:text-white rounded-lg transition"
                  >
                    Leave
                  </button>
                </div>
              ) : org.membership_status === 'pending' ? (
                <span className="px-3 py-1 text-sm bg-yellow-500/20 text-yellow-400 rounded-lg flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Pending
                </span>
              ) : (
                <button
                  onClick={() => handleJoin(org)}
                  className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  {org.is_private ? 'Request' : 'Join'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-7 h-7 text-purple-400" />
              Organizations
            </h1>
            <p className="text-slate-400">Discover and join communities</p>
          </div>
          {(user as any)?.is_staff && (
            <Link
              to="/organizations/create"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Create Organization
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${activeTab === 'discover'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Discover
          </button>
          <button
            onClick={() => setActiveTab('my-orgs')}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${activeTab === 'my-orgs'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            My Organizations ({myOrgs.length})
          </button>
          {invitations.length > 0 && (
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${activeTab === 'invitations'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Invitations ({invitations.length})
            </button>
          )}
        </div>

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <>
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Types</option>
                  <option value="program">Programs</option>
                  <option value="club">Clubs</option>
                  <option value="interest">Interest Groups</option>
                  <option value="official">Official</option>
                </select>
              </div>
            </div>

            {/* Organizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrgs.map(org => (
                <OrganizationCard key={org.id} org={org} />
              ))}
            </div>

            {filteredOrgs.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-white mb-2">No organizations found</h3>
                <p className="text-slate-400">Try adjusting your search or filters</p>
              </div>
            )}
          </>
        )}

        {/* My Organizations Tab */}
        {activeTab === 'my-orgs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myOrgs.length > 0 ? (
              myOrgs.map(org => (
                <OrganizationCard key={org.id} org={org} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-white mb-2">You haven't joined any organizations</h3>
                <p className="text-slate-400 mb-4">Explore and join organizations to connect with others</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  Discover Organizations
                </button>
              </div>
            )}
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="space-y-4">
            {invitations.length > 0 ? (
              invitations.map(inv => (
                <div key={inv.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-2xl">
                        {inv.organization.icon}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{inv.organization.name}</h3>
                        <p className="text-slate-400 text-sm">
                          Invited by <span className="text-purple-400">{inv.inviter.username}</span>
                        </p>
                        {inv.message && (
                          <p className="text-slate-300 text-sm mt-2">"{inv.message}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptInvitation(inv.organization)}
                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeclineInvitation(inv.organization)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <UserPlus className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-white mb-2">No pending invitations</h3>
                <p className="text-slate-400">You'll see invitations here when someone invites you</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
