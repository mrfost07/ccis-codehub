import { useState } from 'react'
import { Award, Download, Calendar, CheckCircle, RefreshCw } from 'lucide-react'
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

interface CertificateCardProps {
  certificate: Certificate
  onUpdate?: () => void
}

export default function CertificateCard({ certificate, onUpdate }: CertificateCardProps) {
  const [claiming, setClaiming] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getProgramColor = (programType: string) => {
    switch (programType.toLowerCase()) {
      case 'bsit': return 'from-blue-600 to-blue-800'
      case 'bscs': return 'from-purple-600 to-purple-800'
      case 'bsis': return 'from-green-600 to-green-800'
      default: return 'from-slate-600 to-slate-800'
    }
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const response = await api.get(`/learning/certificates/${certificate.id}/download/`, {
        responseType: 'blob'
      })

      // Create download link from blob
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Certificate_${certificate.career_path.name.replace(/\s+/g, '_')}_${certificate.certificate_id}.png`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Certificate downloaded!')
    } catch (error: any) {
      console.error('Download failed:', error)
      const errorMsg = error.response?.data?.error || 'Failed to download certificate'
      toast.error(errorMsg)
    } finally {
      setDownloading(false)
    }
  }

  const handleClaim = async () => {
    try {
      setClaiming(true)
      await api.post(`/learning/certificates/${certificate.id}/claim/`)
      toast.success('Certificate generated! You can now download it.')
      onUpdate?.()
    } catch (error: any) {
      console.error('Claim failed:', error)
      const errorMsg = error.response?.data?.error || 'Failed to generate certificate'
      toast.error(errorMsg)
    } finally {
      setClaiming(false)
    }
  }

  const hasCertificateFile = !!certificate.pdf_url

  return (
    <div className={`relative bg-gradient-to-br ${getProgramColor(certificate.career_path.program_type)} rounded-xl p-6 sm:p-8 shadow-2xl border-2 border-white/20 overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />

      {/* Verified Badge */}
      <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2">
        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
          <Award className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Certificate of Completion
        </h3>

        {/* Path Name */}
        <p className="text-base sm:text-lg text-white/90 mb-4 font-medium">
          {certificate.career_path.name}
        </p>

        {/* Certificate ID */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 sm:py-2 mb-4 inline-block">
          <p className="text-xs text-white/70">Certificate ID</p>
          <p className="text-xs sm:text-sm font-mono text-white font-semibold break-all">
            {certificate.certificate_id}
          </p>
        </div>

        {/* Issue Date */}
        <div className="flex items-center gap-2 text-white/80 mb-6">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">Issued on {formatDate(certificate.issued_at)}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {hasCertificateFile ? (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-white/90 transition-all shadow-lg disabled:opacity-50"
            >
              {downloading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Downloading...' : 'Download'}
            </button>
          ) : (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-yellow-400 text-yellow-900 rounded-lg font-semibold hover:bg-yellow-300 transition-all shadow-lg disabled:opacity-50"
            >
              {claiming ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Award className="w-4 h-4" />
              )}
              {claiming ? 'Generating...' : 'Generate Certificate'}
            </button>
          )}
        </div>
      </div>

      {/* Shine Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
    </div>
  )
}
