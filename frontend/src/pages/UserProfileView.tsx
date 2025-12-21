import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  User, Mail, Calendar, BookOpen, Code, Trophy, Star,
  TrendingUp, Clock, Shield, Users, UserPlus, UserMinus,
  UserCheck, ArrowLeft, Github, Linkedin, Globe, X
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { communityAPI } from '../services/api'
import toast from 'react-hot-toast'
import Hyperspeed from '../components/backgrounds/Hyperspeed'
import { getMediaUrl } from '../utils/mediaUrl'

type BackgroundType = 'hyperspeed' | 'akira' | 'golden' | 'split' | 'highway' | 'gradient' | 'aurora' | 'cyber'

// Presets for background animations
const akiraPreset = {
  distortion: 'mountainDistortion',
  length: 400,
  roadWidth: 9,
  islandWidth: 2,
  lanesPerRoad: 3,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 50,
  lightPairsPerRoadWay: 50,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5] as [number, number],
  lightStickHeight: [1.3, 1.7] as [number, number],
  movingAwaySpeed: [60, 80] as [number, number],
  movingCloserSpeed: [-120, -160] as [number, number],
  carLightsLength: [400 * 0.05, 400 * 0.15] as [number, number],
  carLightsRadius: [0.05, 0.14] as [number, number],
  carWidthPercentage: [0.3, 0.5] as [number, number],
  carShiftX: [-0.2, 0.2] as [number, number],
  carFloorSeparation: [0.05, 1] as [number, number],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0x131318,
    brokenLines: 0x131318,
    leftCars: [0xff102a, 0xeb383e, 0xff102a],
    rightCars: [0xdadafa, 0xbebae3, 0x8f97e4],
    sticks: 0xdadafa
  }
}

const goldenPreset = {
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 9,
  islandWidth: 2,
  lanesPerRoad: 3,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 50,
  lightPairsPerRoadWay: 50,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5] as [number, number],
  lightStickHeight: [1.3, 1.7] as [number, number],
  movingAwaySpeed: [60, 80] as [number, number],
  movingCloserSpeed: [-120, -160] as [number, number],
  carLightsLength: [400 * 0.05, 400 * 0.15] as [number, number],
  carLightsRadius: [0.05, 0.14] as [number, number],
  carWidthPercentage: [0.3, 0.5] as [number, number],
  carShiftX: [-0.2, 0.2] as [number, number],
  carFloorSeparation: [0.05, 1] as [number, number],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0x131318,
    brokenLines: 0x131318,
    leftCars: [0xdc5b20, 0xdca320, 0xdc2020],
    rightCars: [0x334bf7, 0xe5e6ed, 0xbfc6f3],
    sticks: 0xc5e8eb
  }
}

const splitPreset = {
  distortion: 'LongRaceDistortion',
  length: 400,
  roadWidth: 10,
  islandWidth: 5,
  lanesPerRoad: 2,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 50,
  lightPairsPerRoadWay: 70,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5] as [number, number],
  lightStickHeight: [1.3, 1.7] as [number, number],
  movingAwaySpeed: [60, 80] as [number, number],
  movingCloserSpeed: [-120, -160] as [number, number],
  carLightsLength: [400 * 0.05, 400 * 0.15] as [number, number],
  carLightsRadius: [0.05, 0.14] as [number, number],
  carWidthPercentage: [0.3, 0.5] as [number, number],
  carShiftX: [-0.2, 0.2] as [number, number],
  carFloorSeparation: [0.05, 1] as [number, number],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0x131318,
    brokenLines: 0x131318,
    leftCars: [0xff5f73, 0xe74d60, 0xff102a],
    rightCars: [0xa4e3e6, 0x80d1d4, 0x53c2c6],
    sticks: 0xa4e3e6
  }
}

const highwayPreset = {
  distortion: 'deepDistortion',
  length: 400,
  roadWidth: 18,
  islandWidth: 2,
  lanesPerRoad: 3,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 50,
  lightPairsPerRoadWay: 50,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5] as [number, number],
  lightStickHeight: [1.3, 1.7] as [number, number],
  movingAwaySpeed: [60, 80] as [number, number],
  movingCloserSpeed: [-120, -160] as [number, number],
  carLightsLength: [400 * 0.05, 400 * 0.15] as [number, number],
  carLightsRadius: [0.05, 0.14] as [number, number],
  carWidthPercentage: [0.3, 0.5] as [number, number],
  carShiftX: [-0.2, 0.2] as [number, number],
  carFloorSeparation: [0.05, 1] as [number, number],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0x131318,
    brokenLines: 0x131318,
    leftCars: [0xff322f, 0xa33010, 0xa81508],
    rightCars: [0xfdfdf0, 0xf3dea0, 0xe2bb88],
    sticks: 0xfdfdf0
  }
}

interface UserProfile {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  role: string
  program: string
  year_level: string
  profile_picture: string | null
  bio: string
  skills: string[]
  followers_count: number
  following_count: number
  is_following: boolean
  is_pending: boolean
  is_follower: boolean
  is_own_profile: boolean
  created_at: string
  profile?: {
    github_username: string
    linkedin_url: string
    website_url: string
    total_courses_completed: number
    total_modules_completed: number
    total_projects: number
    total_posts: number
    contribution_points: number
    current_streak: number
    certificates_earned: number
    profile_background?: string
  }
}

interface FollowUser {
  id: string
  follower?: {
    id: string
    username: string
    first_name: string
    last_name: string
    profile_picture: string | null
  }
  following?: {
    id: string
    username: string
    first_name: string
    last_name: string
    profile_picture: string | null
  }
}

export default function UserProfileView() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  // Followers/Following modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followers, setFollowers] = useState<FollowUser[]>([])
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [loadingFollowers, setLoadingFollowers] = useState(false)
  const [loadingFollowing, setLoadingFollowing] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchUserProfile()
    }
  }, [userId])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await communityAPI.getPublicUserProfile(userId!)
      setProfile(response.data)
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      toast.error('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchFollowers = async () => {
    if (!userId) return
    try {
      setLoadingFollowers(true)
      const response = await communityAPI.getUserFollowers(userId)
      setFollowers(response.data || [])
    } catch (error) {
      console.error('Failed to fetch followers:', error)
      toast.error('Failed to load followers')
    } finally {
      setLoadingFollowers(false)
    }
  }

  const fetchFollowing = async () => {
    if (!userId) return
    try {
      setLoadingFollowing(true)
      const response = await communityAPI.getUserFollowing(userId)
      setFollowing(response.data || [])
    } catch (error) {
      console.error('Failed to fetch following:', error)
      toast.error('Failed to load following')
    } finally {
      setLoadingFollowing(false)
    }
  }

  const openFollowersModal = () => {
    setShowFollowersModal(true)
    fetchFollowers()
  }

  const openFollowingModal = () => {
    setShowFollowingModal(true)
    fetchFollowing()
  }

  const visitUser = (id: string) => {
    setShowFollowersModal(false)
    setShowFollowingModal(false)
    navigate(`/user/${id}`)
  }

  const getAvatarUrl = (picture: string | null | undefined) => {
    return getMediaUrl(picture)
  }

  const handleFollow = async () => {
    if (!profile) return
    try {
      setFollowLoading(true)
      const response = await communityAPI.followUser(profile.id)
      if (response.data.status === 'pending') {
        setProfile(prev => prev ? { ...prev, is_following: false, is_pending: true } : null)
        toast.success('Follow request sent!')
      } else {
        setProfile(prev => prev ? { ...prev, is_following: true, is_pending: false } : null)
        toast.success('Now following!')
      }
      fetchUserProfile()
    } catch (error) {
      toast.error('Failed to send follow request')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleUnfollow = async () => {
    if (!profile) return
    try {
      setFollowLoading(true)
      await communityAPI.unfollowUser(profile.id)
      setProfile(prev => prev ? { ...prev, is_following: false, is_pending: false } : null)
      toast.success('Unfollowed!')
      fetchUserProfile()
    } catch (error) {
      toast.error('Failed to unfollow')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!profile) return
    try {
      setFollowLoading(true)
      await communityAPI.unfollowUser(profile.id)
      setProfile(prev => prev ? { ...prev, is_following: false, is_pending: false } : null)
      toast.success('Request cancelled')
      fetchUserProfile()
    } catch (error) {
      toast.error('Failed to cancel request')
    } finally {
      setFollowLoading(false)
    }
  }

  const getProfilePictureUrl = () => {
    return getMediaUrl(profile?.profile_picture)
  }

  const getProgramDisplay = (code: string) => {
    const programs: { [key: string]: string } = {
      'BSCS': 'BS Computer Science',
      'BSIT': 'BS Information Technology',
      'BSIS': 'BS Information Systems'
    }
    return programs[code] || code || '-'
  }

  const getYearDisplay = (code: string) => {
    const years: { [key: string]: string } = {
      '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year'
    }
    return years[code] || code || '-'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">User Not Found</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-purple-400 hover:text-purple-300"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>

        {/* Cover Background - Separate Section */}
        <div className="relative h-56 sm:h-72 rounded-2xl overflow-hidden">
          {(() => {
            const bg = (profile.profile?.profile_background || 'gradient') as BackgroundType
            switch (bg) {
              case 'hyperspeed':
                return <Hyperspeed className="rounded-2xl" />
              case 'akira':
                return <Hyperspeed className="rounded-2xl" effectOptions={akiraPreset} />
              case 'golden':
                return <Hyperspeed className="rounded-2xl" effectOptions={goldenPreset} />
              case 'split':
                return <Hyperspeed className="rounded-2xl" effectOptions={splitPreset} />
              case 'highway':
                return <Hyperspeed className="rounded-2xl" effectOptions={highwayPreset} />
              case 'aurora':
                return <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 rounded-2xl animate-pulse" />
              case 'cyber':
                return <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 rounded-2xl" style={{ backgroundSize: '200% 200%', animation: 'gradient-shift 3s ease infinite' }} />
              case 'gradient':
              default:
                return <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl" />
            }
          })()}
        </div>

        {/* Profile Info Card - Overlapping Glass Card */}
        <div className="relative -mt-8 sm:-mt-12 mx-2 sm:mx-8">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6">
              {/* Avatar */}
              <div className="relative -mt-12 sm:-mt-16">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-slate-900 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  {getProfilePictureUrl() ? (
                    <img src={getProfilePictureUrl()!} alt={profile.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-bold text-white">
                      {profile.first_name?.[0] || profile.username[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Name and Follow Button */}
              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-white">
                  {profile.first_name} {profile.last_name}
                </h1>
                <p className="text-purple-400">@{profile.username}</p>

                {profile.is_follower && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400 mt-1">
                    <UserCheck className="w-3 h-3" /> Follows you
                  </span>
                )}
              </div>

              {/* Follow Button */}
              {!profile.is_own_profile && (
                <div>
                  {profile.is_following ? (
                    <button
                      onClick={handleUnfollow}
                      disabled={followLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
                    >
                      <UserMinus className="w-4 h-4" />
                      {followLoading ? 'Loading...' : 'Following'}
                    </button>
                  ) : profile.is_pending ? (
                    <button
                      onClick={handleCancelRequest}
                      disabled={followLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-600/50 hover:bg-red-600 text-yellow-200 hover:text-white rounded-lg transition disabled:opacity-50"
                    >
                      <Clock className="w-4 h-4" />
                      {followLoading ? 'Loading...' : 'Requested'}
                    </button>
                  ) : (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      {followLoading ? 'Loading...' : 'Follow'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stats - Compact for mobile */}
            <div className="flex justify-center sm:justify-start gap-4 sm:gap-6 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={openFollowersModal}
                className="text-center hover:bg-slate-800/50 px-2 py-1 sm:px-3 sm:py-2 rounded-lg transition"
              >
                <p className="text-lg sm:text-xl font-bold text-white">{profile.followers_count}</p>
                <p className="text-xs sm:text-sm text-slate-400">Followers</p>
              </button>
              <button
                onClick={openFollowingModal}
                className="text-center hover:bg-slate-800/50 px-2 py-1 sm:px-3 sm:py-2 rounded-lg transition"
              >
                <p className="text-lg sm:text-xl font-bold text-white">{profile.following_count}</p>
                <p className="text-xs sm:text-sm text-slate-400">Following</p>
              </button>
              <div className="text-center px-2 py-1 sm:px-3 sm:py-2">
                <p className="text-lg sm:text-xl font-bold text-white">{profile.profile?.total_posts || 0}</p>
                <p className="text-xs sm:text-sm text-slate-400">Posts</p>
              </div>
              <div className="text-center px-2 py-1 sm:px-3 sm:py-2">
                <p className="text-lg sm:text-xl font-bold text-white">{profile.profile?.contribution_points || 0}</p>
                <p className="text-xs sm:text-sm text-slate-400">Points</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Info Cards - More spacing on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-8 sm:mt-6">
          {/* About */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" />
              About
            </h2>
            <p className="text-slate-300">{profile.bio || 'No bio available.'}</p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Shield className="w-4 h-4" />
                <span>{profile.role}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <BookOpen className="w-4 h-4" />
                <span>{getProgramDisplay(profile.program)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>{getYearDisplay(profile.year_level)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-purple-400" />
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills && profile.skills.length > 0 ? (
                profile.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-slate-500">No skills listed</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Activity Stats
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Courses Completed</span>
                <span className="text-white font-bold">{profile.profile?.total_courses_completed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Modules Completed</span>
                <span className="text-white font-bold">{profile.profile?.total_modules_completed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Projects</span>
                <span className="text-white font-bold">{profile.profile?.total_projects || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Certificates</span>
                <span className="text-white font-bold">{profile.profile?.certificates_earned || 0}</span>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" />
              Social Links
            </h2>
            <div className="space-y-3">
              {profile.profile?.github_username && (
                <a
                  href={`https://github.com/${profile.profile.github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition"
                >
                  <Github className="w-4 h-4" />
                  {profile.profile.github_username}
                </a>
              )}
              {profile.profile?.linkedin_url && (
                <a
                  href={profile.profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn Profile
                </a>
              )}
              {profile.profile?.website_url && (
                <a
                  href={profile.profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-400 hover:text-purple-400 transition"
                >
                  <Globe className="w-4 h-4" />
                  {profile.profile.website_url}
                </a>
              )}
              {!profile.profile?.github_username && !profile.profile?.linkedin_url && !profile.profile?.website_url && (
                <p className="text-slate-500">No social links available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Followers ({profile.followers_count})
              </h2>
              <button
                onClick={() => setShowFollowersModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-96 p-4">
              {loadingFollowers ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : followers.length > 0 ? (
                <div className="space-y-3">
                  {followers.map(f => {
                    const user = f.follower
                    if (!user) return null
                    return (
                      <div
                        key={f.id}
                        onClick={() => visitUser(user.id)}
                        className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer transition"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                          {getAvatarUrl(user.profile_picture) ? (
                            <img src={getAvatarUrl(user.profile_picture)!} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold">
                              {user.first_name?.[0] || user.username[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-slate-400 text-sm">@{user.username}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No followers yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Following ({profile.following_count})
              </h2>
              <button
                onClick={() => setShowFollowingModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-96 p-4">
              {loadingFollowing ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : following.length > 0 ? (
                <div className="space-y-3">
                  {following.map(f => {
                    const user = f.following
                    if (!user) return null
                    return (
                      <div
                        key={f.id}
                        onClick={() => visitUser(user.id)}
                        className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl cursor-pointer transition"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                          {getAvatarUrl(user.profile_picture) ? (
                            <img src={getAvatarUrl(user.profile_picture)!} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold">
                              {user.first_name?.[0] || user.username[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-slate-400 text-sm">@{user.username}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Not following anyone</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
