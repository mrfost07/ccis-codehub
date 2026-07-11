import { useState, useEffect, useRef } from 'react'
import {
  User, Mail, Award, Calendar, Edit2, Save, X, Camera,
  Github, Linkedin, Globe, MapPin, BookOpen, Code, Trophy,
  Star, TrendingUp, Clock, CheckCircle, Settings, Shield,
  Users, UserPlus, UserMinus, Palette, Sparkles, Zap, Target
} from 'lucide-react'
import Navbar from '../components/Navbar'
import api, { authAPI, communityAPI } from '../services/api'
import toast from 'react-hot-toast'
import Hyperspeed from '../components/backgrounds/Hyperspeed'
import { getMediaUrl } from '../utils/mediaUrl'

type BackgroundType = 'hyperspeed' | 'akira' | 'golden' | 'split' | 'highway' | 'gradient' | 'aurora' | 'cyber'

// Akira preset - red car lights with mountain distortion
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

// Golden preset - orange/gold car lights with turbulent distortion
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

// Split preset - pink/teal car lights with long race distortion and wide island
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

// Highway preset - wide road with deep distortion and red/cream colors
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

interface AchievedSkill {
  id: string
  source_type: 'module' | 'path' | 'challenge' | 'video' | 'quiz'
  source_id: string
  source_name: string
  skill_name: string
  skill_category: string
  proficiency_level: 'beginner' | 'intermediate' | 'advanced'
  earned_at: string
  is_verified: boolean
}

interface FollowUser {
  id: string
  username: string
  first_name: string
  last_name: string
  profile_picture: string | null
}

interface FollowData {
  id: string
  follower: FollowUser
  following: FollowUser
  created_at: string
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
  career_interests: string[]
  followers_count: number
  following_count: number
  created_at: string
  profile?: {
    github_username: string
    linkedin_url: string
    website_url: string
    location: string
    total_courses_completed: number
    total_modules_completed: number
    total_projects: number
    total_posts: number
    contribution_points: number
    current_streak: number
    certificates_earned: number
  }
}

export default function ProfileEnhanced() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [newSkill, setNewSkill] = useState('')
  const [selectedBackground, setSelectedBackground] = useState<BackgroundType>('gradient')
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Followers/Following state
  const [followers, setFollowers] = useState<FollowData[]>([])
  const [following, setFollowing] = useState<FollowData[]>([])
  const [showFollowersModal, setShowFollowersModal] = useState(false)
  const [showFollowingModal, setShowFollowingModal] = useState(false)
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())

  // Achieved Skills state
  const [achievedSkills, setAchievedSkills] = useState<{
    total: number
    by_category: Record<string, AchievedSkill[]>
  } | null>(null)
  const [skillsLoading, setSkillsLoading] = useState(false)

  // Badge catalog state
  const [badgeCatalog, setBadgeCatalog] = useState<any[] | null>(null)
  const [badgesLoading, setBadgesLoading] = useState(false)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    bio: '',
    program: '',
    year_level: '',
    skills: [] as string[],
    career_interests: [] as string[],
    github_username: '',
    linkedin_url: '',
    website_url: '',
    location: ''
  })

  useEffect(() => {
    fetchProfile()
    fetchFollowData()
  }, [])

  const fetchAchievedSkills = async () => {
    if (achievedSkills) return // already loaded
    try {
      setSkillsLoading(true)
      const res = await api.get('/learning/skills/me/')
      setAchievedSkills(res.data)
    } catch {
      // silently ignore — skills may not exist yet
    } finally {
      setSkillsLoading(false)
    }
  }

  const fetchBadgeCatalog = async () => {
    if (badgeCatalog) return // already loaded
    try {
      setBadgesLoading(true)
      const res = await api.get('/learning/badges/catalog/')
      setBadgeCatalog(res.data.badges || [])
    } catch {
      setBadgeCatalog([])
    } finally {
      setBadgesLoading(false)
    }
  }

  const fetchFollowData = async () => {
    try {
      const [followersRes, followingRes] = await Promise.all([
        communityAPI.getFollowers(),
        communityAPI.getFollowing()
      ])
      setFollowers(followersRes.data)
      setFollowing(followingRes.data)
      // Build set of user IDs that current user is following
      const followingSet = new Set<string>(followingRes.data.map((f: FollowData) => String(f.following.id)))
      setFollowingUsers(followingSet)
    } catch (error) {
      console.error('Failed to fetch follow data:', error)
    }
  }

  const handleFollow = async (userId: string) => {
    try {
      const response = await communityAPI.followUser(userId)
      if (response.data.status === 'pending') {
        toast.success('Follow request sent!')
      } else {
        setFollowingUsers(prev => new Set([...prev, userId]))
        toast.success('Now following!')
      }
      fetchFollowData()
      fetchProfile()
    } catch (error) {
      toast.error('Failed to send follow request')
    }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      await communityAPI.unfollowUser(userId)
      setFollowingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
      toast.success('Unfollowed!')
      fetchFollowData()
      fetchProfile()
    } catch (error) {
      toast.error('Failed to unfollow')
    }
  }

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await authAPI.getProfile()
      const userData = response.data
      setProfile(userData)
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        username: userData.username || '',
        bio: userData.bio || '',
        program: userData.program || '',
        year_level: userData.year_level || '',
        skills: userData.skills || [],
        career_interests: userData.career_interests || [],
        github_username: userData.profile?.github_username || '',
        linkedin_url: userData.profile?.linkedin_url || '',
        website_url: userData.profile?.website_url || '',
        location: userData.profile?.location || ''
      })
      // Load saved background preference
      if (userData.profile?.profile_background) {
        setSelectedBackground(userData.profile.profile_background as BackgroundType)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  // Save background preference to profile
  const saveBackgroundPreference = async (background: BackgroundType) => {
    try {
      await authAPI.updateProfile({ profile_background: background })
    } catch (error) {
      console.error('Failed to save background preference:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      console.log('Sending profile update:', formData)
      await authAPI.updateProfile(formData)
      toast.success('Profile updated successfully!')
      setEditing(false)
      fetchProfile()
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      console.error('Error response:', error.response?.data)
      // Show more detailed error message
      const errorData = error.response?.data
      let errorMsg = 'Failed to update profile'
      if (errorData) {
        if (typeof errorData === 'string') {
          errorMsg = errorData
        } else if (errorData.detail) {
          errorMsg = errorData.detail
        } else {
          // Handle field-specific errors
          const fieldErrors = Object.entries(errorData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join('; ')
          if (fieldErrors) errorMsg = fieldErrors
        }
      }
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    try {
      const formData = new FormData()
      formData.append('profile_picture', file)

      await api.put('/auth/profile/', formData)
      toast.success('Profile picture updated!')
      fetchProfile()
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('Failed to upload image')
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) })
  }

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    }
    return profile?.username?.[0]?.toUpperCase() || 'U'
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
      '1': '1st Year',
      '2': '2nd Year',
      '3': '3rd Year',
      '4': '4th Year'
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

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header */}
        <div className="relative mb-8">
          {/* Cover Image - Dynamic Background */}
          <div className="h-56 sm:h-72 rounded-2xl relative overflow-hidden">
            {/* Background Options */}
            {selectedBackground === 'hyperspeed' && <Hyperspeed className="rounded-2xl" />}
            {selectedBackground === 'akira' && <Hyperspeed className="rounded-2xl" effectOptions={akiraPreset} />}
            {selectedBackground === 'golden' && <Hyperspeed className="rounded-2xl" effectOptions={goldenPreset} />}
            {selectedBackground === 'split' && <Hyperspeed className="rounded-2xl" effectOptions={splitPreset} />}
            {selectedBackground === 'highway' && <Hyperspeed className="rounded-2xl" effectOptions={highwayPreset} />}
            {selectedBackground === 'gradient' && (
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl" />
            )}
            {selectedBackground === 'aurora' && (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 rounded-2xl animate-pulse" />
            )}
            {selectedBackground === 'cyber' && (
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 rounded-2xl"
                style={{ backgroundSize: '200% 200%', animation: 'gradient-shift 3s ease infinite' }} />
            )}

            {/* Background Picker Button */}
            <button
              onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
              className="absolute top-3 right-3 p-2 bg-black/30 backdrop-blur-sm rounded-lg hover:bg-black/50 transition-colors z-10 group"
              title="Change background"
            >
              <Palette className="w-5 h-5 text-white/80 group-hover:text-white" />
            </button>

            {/* Background Picker Dropdown */}
            {showBackgroundPicker && (
              <div className="absolute top-12 right-3 sm:right-3 left-3 sm:left-auto bg-slate-800/95 backdrop-blur-lg rounded-lg border border-slate-700 p-2 z-20 shadow-xl max-h-64 overflow-y-auto">
                <div className="text-xs text-slate-400 mb-2 px-2">Select Background</div>
                {[
                  { id: 'hyperspeed' as BackgroundType, name: 'Hyperspeed', icon: <Sparkles className="w-4 h-4" />, color: 'from-purple-500 to-blue-500' },
                  { id: 'akira' as BackgroundType, name: 'Akira', icon: '🏍️', color: 'from-red-600 to-red-400' },
                  { id: 'golden' as BackgroundType, name: 'Golden', icon: '✨', color: 'from-amber-500 to-orange-500' },
                  { id: 'split' as BackgroundType, name: 'Split', icon: '🛤️', color: 'from-pink-500 to-teal-400' },
                  { id: 'highway' as BackgroundType, name: 'Highway', icon: '🛣️', color: 'from-red-500 to-yellow-200' },
                  { id: 'gradient' as BackgroundType, name: 'Classic', icon: '🎨', color: 'from-purple-600 to-pink-600' },
                  { id: 'aurora' as BackgroundType, name: 'Aurora', icon: '🌌', color: 'from-emerald-500 to-cyan-500' },
                  { id: 'cyber' as BackgroundType, name: 'Cyber', icon: '⚡', color: 'from-pink-500 to-cyan-500' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => {
                      setSelectedBackground(bg.id)
                      saveBackgroundPreference(bg.id)
                      setShowBackgroundPicker(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${selectedBackground === bg.id
                      ? 'bg-purple-600/30 text-white'
                      : 'hover:bg-slate-700/50 text-slate-300'
                      }`}
                  >
                    <div className={`w-6 h-6 rounded bg-gradient-to-r ${bg.color} flex items-center justify-center text-xs`}>
                      {typeof bg.icon === 'string' ? bg.icon : bg.icon}
                    </div>
                    <span className="text-sm">{bg.name}</span>
                    {selectedBackground === bg.id && (
                      <span className="ml-auto text-purple-400">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Info Card */}
          <div className="relative -mt-12 sm:-mt-16 mx-4 sm:mx-8">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                {/* Avatar */}
                <div className="relative -mt-16 sm:-mt-20">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-slate-900 overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    {getProfilePictureUrl() ? (
                      <img
                        src={getProfilePictureUrl()!}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-bold text-white">{getInitials()}</span>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-purple-600 rounded-full hover:bg-purple-700 transition shadow-lg"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Name and Info */}
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {profile?.first_name} {profile?.last_name}
                  </h1>
                  <p className="text-purple-400">@{profile?.username}</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-2 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      {profile?.role}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {getProgramDisplay(profile?.program || '')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {getYearDisplay(profile?.year_level || '')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-6 pt-6 border-t border-slate-800">
                <button
                  onClick={() => setShowFollowersModal(true)}
                  className="text-center hover:bg-slate-800/50 rounded-lg py-2 transition"
                >
                  <p className="text-2xl font-bold text-white">{followers.length}</p>
                  <p className="text-sm text-slate-400">Followers</p>
                </button>
                <button
                  onClick={() => setShowFollowingModal(true)}
                  className="text-center hover:bg-slate-800/50 rounded-lg py-2 transition"
                >
                  <p className="text-2xl font-bold text-white">{following.length}</p>
                  <p className="text-sm text-slate-400">Following</p>
                </button>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{profile?.profile?.total_courses_completed || 0}</p>
                  <p className="text-sm text-slate-400">Courses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{profile?.profile?.total_projects || 0}</p>
                  <p className="text-sm text-slate-400">Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{profile?.profile?.contribution_points || 0}</p>
                  <p className="text-sm text-slate-400">Points</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{profile?.profile?.certificates_earned || 0}</p>
                  <p className="text-sm text-slate-400">Certificates</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 px-4 sm:px-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'achievements', label: '🏆 Achievements' },
            { id: 'skills', label: 'Skills' },
            { id: 'activity', label: 'Activity' },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'achievements') {
                  fetchAchievedSkills()
                  fetchBadgeCatalog()
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 sm:px-0">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* About */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-400" />
                    About
                  </h2>
                  {editing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  ) : (
                    <p className="text-slate-300">
                      {profile?.bio || 'No bio yet. Click Edit Profile to add one!'}
                    </p>
                  )}
                </div>

                {/* Personal Info */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" />
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">First Name</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      ) : (
                        <p className="text-white font-medium">{profile?.first_name || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Last Name</label>
                      {editing ? (
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      ) : (
                        <p className="text-white font-medium">{profile?.last_name || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Email</label>
                      <p className="text-white font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {profile?.email}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Program</label>
                      {editing ? (
                        <select
                          value={formData.program}
                          onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select Program</option>
                          <option value="BSCS">BS Computer Science</option>
                          <option value="BSIT">BS Information Technology</option>
                          <option value="BSIS">BS Information Systems</option>
                        </select>
                      ) : (
                        <p className="text-white font-medium">{getProgramDisplay(profile?.program || '')}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Year Level</label>
                      {editing ? (
                        <select
                          value={formData.year_level}
                          onChange={(e) => setFormData({ ...formData, year_level: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select Year</option>
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                      ) : (
                        <p className="text-white font-medium">{getYearDisplay(profile?.year_level || '')}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Member Since</label>
                      <p className="text-white font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'skills' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-400" />
                  Skills & Technologies
                </h2>

                {editing && (
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      placeholder="Add a skill..."
                      className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={addSkill}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {(editing ? formData.skills : profile?.skills || []).map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 rounded-full text-sm flex items-center gap-2"
                    >
                      {skill}
                      {editing && (
                        <button
                          onClick={() => removeSkill(skill)}
                          className="hover:text-red-400 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {(editing ? formData.skills : profile?.skills || []).length === 0 && (
                    <p className="text-slate-500">No skills added yet</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-green-600/20 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Completed a module</p>
                      <p className="text-sm text-slate-400">Introduction to Programming</p>
                    </div>
                    <span className="ml-auto text-sm text-slate-500">2 hours ago</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                      <Trophy className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Earned 50 points</p>
                      <p className="text-sm text-slate-400">Quiz completion bonus</p>
                    </div>
                    <span className="ml-auto text-sm text-slate-500">Yesterday</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── ACHIEVEMENTS TAB ─────────────────────── */}
            {activeTab === 'achievements' && (
              <div className="space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{achievedSkills?.total ?? 0}</p>
                    <p className="text-xs text-slate-400">Skills Earned</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <Trophy className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{profile?.profile?.certificates_earned ?? 0}</p>
                    <p className="text-xs text-slate-400">Certificates</p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                    <Target className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{profile?.profile?.total_modules_completed ?? 0}</p>
                    <p className="text-xs text-slate-400">Modules Done</p>
                  </div>
                </div>

                {/* Skills by category */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Verified Skills
                    <span className="ml-auto text-xs text-slate-500 font-normal">Earned through learning</span>
                  </h2>

                  {skillsLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                  ) : achievedSkills && Object.keys(achievedSkills.by_category).length > 0 ? (
                    <div className="space-y-5">
                      {Object.entries(achievedSkills.by_category).map(([category, skills]) => (
                        <div key={category}>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            {category}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(skills as any[]).map((skill: any) => (
                              <div
                                key={skill.id}
                                className="group relative flex items-center gap-2 px-3 py-1.5 bg-purple-600/10 border border-purple-500/20 hover:border-purple-500/50 rounded-full transition"
                                title={`Earned from ${skill.source_name}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                <span className="text-sm text-purple-300">{skill.skill_name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  skill.proficiency_level === 'advanced'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : skill.proficiency_level === 'intermediate'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                  {skill.proficiency_level}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Star className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">No verified skills yet</p>
                      <p className="text-slate-600 text-xs mt-1">Complete modules to earn skills automatically</p>
                      <a href="/learning" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition">
                        <BookOpen className="w-4 h-4" /> Go to Learning
                      </a>
                    </div>
                  )}
                </div>

                {/* Badge Showcase */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Badge Showcase
                    {badgeCatalog && (
                      <span className="ml-auto text-xs text-slate-500 font-normal">
                        {badgeCatalog.filter(b => b.earned).length}/{badgeCatalog.length} earned
                      </span>
                    )}
                  </h2>

                  {badgesLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : badgeCatalog && badgeCatalog.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {badgeCatalog.map((badge: any) => (
                        <div
                          key={badge.id}
                          title={badge.earned ? `Earned: ${badge.name}` : `Locked: ${badge.description}`}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition ${
                            badge.earned
                              ? badge.rarity === 'legendary'
                                ? 'bg-yellow-500/10 border-yellow-500/40 shadow-lg shadow-yellow-500/10'
                                : badge.rarity === 'epic'
                                ? 'bg-purple-500/10 border-purple-500/40'
                                : badge.rarity === 'rare'
                                ? 'bg-blue-500/10 border-blue-500/40'
                                : 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-slate-800/40 border-slate-700/30 opacity-40 grayscale'
                          }`}
                        >
                          <span className="text-2xl">{badge.icon}</span>
                          <p className={`text-[10px] font-semibold leading-tight ${
                            badge.earned ? 'text-white' : 'text-slate-500'
                          }`}>{badge.name}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            badge.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                            badge.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                            badge.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            {badge.rarity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm text-center py-4">No badges available yet</p>
                  )}
                </div>

                {/* Link to full certificates page */}
                <a
                  href="/certificates"
                  className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-xl transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                      <Award className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">View All Certificates</p>
                      <p className="text-xs text-slate-400">{profile?.profile?.certificates_earned ?? 0} certificates earned</p>
                    </div>
                  </div>
                  <Code className="w-5 h-5 text-slate-600 group-hover:text-purple-400 transition" />
                </a>

                {/* Resume Builder shortcut */}
                <a
                  href="/resume"
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 hover:border-purple-500/60 rounded-xl transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/30 rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                      <p className="font-medium text-white">Build My Resume</p>
                      <p className="text-xs text-slate-400">Auto-fill from your profile, skills & certificates</p>
                    </div>
                  </div>
                  <Zap className="w-5 h-5 text-purple-400 group-hover:text-yellow-400 transition" />
                </a>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-400" />
                  Social Links
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                      <Github className="w-4 h-4" /> GitHub Username
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.github_username}
                        onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
                        placeholder="your-github-username"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-white">{profile?.profile?.github_username || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                      <Linkedin className="w-4 h-4" /> LinkedIn URL
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/your-profile"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-white">{profile?.profile?.linkedin_url || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1 flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Website
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.website_url}
                        onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                        placeholder="https://your-website.com"
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <p className="text-white">{profile?.profile?.website_url || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Current Streak
                  </span>
                  <span className="text-white font-bold">{profile?.profile?.current_streak || 0} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Modules Done
                  </span>
                  <span className="text-white font-bold">{profile?.profile?.total_modules_completed || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Star className="w-4 h-4" /> Total Posts
                  </span>
                  <span className="text-white font-bold">{profile?.profile?.total_posts || 0}</span>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Achievements
                {badgeCatalog && (
                  <span className="ml-auto text-xs text-slate-500 font-normal">
                    {badgeCatalog.filter(b => b.earned).length}/{badgeCatalog.length}
                  </span>
                )}
              </h3>
              {!badgeCatalog ? (
                <div className="text-center py-4">
                  <button
                    onClick={fetchBadgeCatalog}
                    disabled={badgesLoading}
                    className="text-sm text-purple-400 hover:text-purple-300 transition"
                  >
                    {badgesLoading ? 'Loading...' : 'View Achievements'}
                  </button>
                </div>
              ) : badgeCatalog.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {badgeCatalog.slice(0, 6).map((badge: any) => (
                    <div
                      key={badge.id}
                      title={badge.earned ? badge.name : `Locked: ${badge.description || badge.name}`}
                      className={`p-3 rounded-lg text-center transition ${
                        badge.earned
                          ? 'bg-slate-800 hover:bg-slate-700'
                          : 'bg-slate-800/50 opacity-50'
                      }`}
                    >
                      <span className="text-2xl">{badge.earned ? badge.icon : '🔒'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">
                  Complete modules and quizzes to earn badges!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Followers ({followers.length})
              </h3>
              <button
                onClick={() => setShowFollowersModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {followers.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No followers yet</p>
              ) : (
                <div className="space-y-3">
                  {followers.map((follow) => (
                    <div key={follow.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {follow.follower.profile_picture ? (
                          <img
                            src={getMediaUrl(follow.follower.profile_picture) || ''}
                            alt={follow.follower.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {follow.follower.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{follow.follower.first_name} {follow.follower.last_name}</p>
                          <p className="text-sm text-slate-400">@{follow.follower.username}</p>
                        </div>
                      </div>
                      {follow.follower.id !== profile?.id && (
                        followingUsers.has(String(follow.follower.id)) ? (
                          <button
                            onClick={() => handleUnfollow(follow.follower.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-red-600 text-white text-sm rounded-lg transition"
                          >
                            <UserMinus className="w-4 h-4" />
                            Unfollow
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFollow(follow.follower.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition"
                          >
                            <UserPlus className="w-4 h-4" />
                            Follow
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Following ({following.length})
              </h3>
              <button
                onClick={() => setShowFollowingModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {following.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Not following anyone yet</p>
              ) : (
                <div className="space-y-3">
                  {following.map((follow) => (
                    <div key={follow.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {follow.following.profile_picture ? (
                          <img
                            src={getMediaUrl(follow.following.profile_picture) || ''}
                            alt={follow.following.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {follow.following.username[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{follow.following.first_name} {follow.following.last_name}</p>
                          <p className="text-sm text-slate-400">@{follow.following.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnfollow(follow.following.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-red-600 text-white text-sm rounded-lg transition"
                      >
                        <UserMinus className="w-4 h-4" />
                        Unfollow
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
