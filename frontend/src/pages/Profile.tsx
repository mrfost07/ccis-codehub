import { useState, useEffect } from 'react'
import { User, Mail, Award, Calendar, Edit, Save, X, Settings, Sparkles, Palette } from 'lucide-react'
import Navbar from '../components/Navbar'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import Hyperspeed from '../components/backgrounds/Hyperspeed'

type BackgroundType = 'gradient' | 'hyperspeed' | 'aurora' | 'cyber'

export default function Profile() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [selectedBackground, setSelectedBackground] = useState<BackgroundType>('hyperspeed')
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    bio: '',
    github_username: '',
    linkedin_profile: '',
    skills: [] as string[]
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await authAPI.getProfile()
      const userData = response.data
      setProfile(userData)
      setFormData({
        username: userData.username || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        bio: userData.profile?.bio || '',
        github_username: userData.profile?.github_username || '',
        linkedin_profile: userData.profile?.linkedin_profile || '',
        skills: userData.profile?.skills || []
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      // Use stored user data as fallback
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      setProfile(storedUser)
      setFormData({
        username: storedUser.username || '',
        first_name: storedUser.first_name || '',
        last_name: storedUser.last_name || '',
        bio: '',
        github_username: '',
        linkedin_profile: '',
        skills: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      // Update profile via API
      await authAPI.updateProfile(formData)
      toast.success('Profile updated successfully!')
      setEditing(false)
      // Refetch profile to ensure we have latest data
      fetchProfile()
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData({ ...formData, skills: [...formData.skills, skill] })
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill)
    })
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    const formData = new FormData()
    formData.append('profile_picture', file)

    try {
      await authAPI.updateProfile(formData)
      toast.success('Profile picture updated!')
      fetchProfile()
    } catch (error) {
      toast.error('Failed to upload image')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {/* Dynamic Header Background */}
          <div className="h-40 relative overflow-hidden">
            {/* Background Options */}
            {selectedBackground === 'hyperspeed' && <Hyperspeed />}
            {selectedBackground === 'gradient' && (
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600" />
            )}
            {selectedBackground === 'aurora' && (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-600 animate-pulse" />
            )}
            {selectedBackground === 'cyber' && (
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500"
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
              <div className="absolute top-12 right-3 bg-slate-800/95 backdrop-blur-lg rounded-lg border border-slate-700 p-2 z-20 shadow-xl">
                <div className="text-xs text-slate-400 mb-2 px-2">Select Background</div>
                {[
                  { id: 'hyperspeed' as BackgroundType, name: 'Hyperspeed', icon: <Sparkles className="w-4 h-4" />, color: 'from-purple-500 to-blue-500' },
                  { id: 'gradient' as BackgroundType, name: 'Classic', icon: '🎨', color: 'from-purple-600 to-indigo-600' },
                  { id: 'aurora' as BackgroundType, name: 'Aurora', icon: '🌌', color: 'from-emerald-500 to-cyan-500' },
                  { id: 'cyber' as BackgroundType, name: 'Cyber', icon: '⚡', color: 'from-pink-500 to-cyan-500' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => {
                      setSelectedBackground(bg.id)
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

          {/* Profile content */}
          <div className="px-8 pb-8">
            {/* Avatar and basic info */}
            <div className="flex items-end -mt-16 mb-6">
              <div className="relative">
                <div className="w-32 h-32 bg-slate-800 rounded-full border-4 border-slate-900 overflow-hidden">
                  {profile?.profile_picture ? (
                    <img
                      src={`http://localhost:8000${profile.profile_picture}`}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-slate-400" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-purple-600 rounded-full cursor-pointer hover:bg-purple-700 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </label>
              </div>
              <div className="flex-1 ml-6 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {formData.first_name || formData.username || 'User'} {formData.last_name}
                    </h1>
                    <p className="text-slate-400">@{formData.username}</p>
                  </div>
                  <button
                    onClick={() => editing ? handleSave() : setEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                  >
                    {editing ? (
                      <>
                        <Save className="w-4 h-4" />
                        Save
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Profile details */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      disabled={!editing}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      disabled={!editing}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Email</label>
                    <div className="flex items-center px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400">
                      <Mail className="w-4 h-4 mr-2" />
                      {profile?.email || 'user@example.com'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Member Since</label>
                    <div className="flex items-center px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      {profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString() : 'Recently'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={!editing}
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50"
                  rows={4}
                />
              </div>

              {/* Social Links */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Social Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">GitHub Username</label>
                    <input
                      type="text"
                      value={formData.github_username}
                      onChange={(e) => setFormData({ ...formData, github_username: e.target.value })}
                      disabled={!editing}
                      placeholder="github_username"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">LinkedIn Profile</label>
                    <input
                      type="text"
                      value={formData.linkedin_profile}
                      onChange={(e) => setFormData({ ...formData, linkedin_profile: e.target.value })}
                      disabled={!editing}
                      placeholder="linkedin.com/in/username"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full text-sm flex items-center gap-2"
                    >
                      {skill}
                      {editing && (
                        <button
                          onClick={() => removeSkill(skill)}
                          className="hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {editing && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a skill..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addSkill((e.target as HTMLInputElement).value)
                            ; (e.target as HTMLInputElement).value = ''
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                )}
              </div>

              {/* Achievements */}
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Achievements</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: '🏆', name: 'First Project', description: 'Created first project' },
                    { icon: '💬', name: 'Active Contributor', description: '10+ community posts' },
                    { icon: '📚', name: 'Quick Learner', description: 'Completed 5 modules' },
                    { icon: '⭐', name: 'Rising Star', description: 'Top contributor' }
                  ].map((achievement) => (
                    <div key={achievement.name} className="text-center p-4 bg-slate-800 rounded-lg">
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <div className="text-sm font-medium text-white">{achievement.name}</div>
                      <div className="text-xs text-slate-400">{achievement.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
