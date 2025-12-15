import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import CertificateCard from '../components/CertificateCard'
import { Award, Trophy, Star } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface Certificate {
  id: string
  career_path: {
    name: string
    program_type: string
    color?: string
  }
  issued_at: string
  certificate_id: string
  pdf_url?: string
}

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCertificates()
  }, [])

  const fetchCertificates = async () => {
    try {
      setLoading(true)
      const response = await api.get('/learning/certificates/')
      setCertificates(response.data.results || response.data || [])
    } catch (error) {
      console.error('Failed to fetch certificates:', error)
      toast.error('Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 bg-blue-600/20 backdrop-blur-sm border border-blue-500/30 rounded-full px-6 py-3 mb-6">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <span className="text-blue-100 font-semibold">Your Achievements</span>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            My Certificates
          </h1>
          
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Celebrate your learning journey with these verified certificates
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 text-center">
            <Award className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">{certificates.length}</div>
            <div className="text-slate-300">Certificates Earned</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 text-center">
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              {new Set(certificates.map(c => c.career_path.program_type)).size}
            </div>
            <div className="text-slate-300">Programs Completed</div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 text-center">
            <Star className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              {certificates.length > 0 ? '100%' : '0%'}
            </div>
            <div className="text-slate-300">Completion Rate</div>
          </div>
        </div>

        {/* Certificates Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-slate-300">Loading your certificates...</p>
          </div>
        ) : certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {certificates.map((certificate) => (
              <CertificateCard key={certificate.id} certificate={certificate} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Award className="w-24 h-24 text-slate-600 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-white mb-4">
              No Certificates Yet
            </h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Complete learning paths to earn your first certificate and showcase your achievements!
            </p>
            <a
              href="/learning"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg"
            >
              Start Learning
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
