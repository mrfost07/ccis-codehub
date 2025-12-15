import { Award, Download, Calendar, CheckCircle } from 'lucide-react'

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
}

export default function CertificateCard({ certificate }: CertificateCardProps) {
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

  const handleDownload = () => {
    if (certificate.pdf_url) {
      window.open(certificate.pdf_url, '_blank')
    }
  }

  return (
    <div className={`relative bg-gradient-to-br ${getProgramColor(certificate.career_path.program_type)} rounded-xl p-8 shadow-2xl border-2 border-white/20 overflow-hidden group hover:scale-105 transition-all duration-300`}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
      
      {/* Verified Badge */}
      <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2">
        <CheckCircle className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
          <Award className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-white mb-2">
          Certificate of Completion
        </h3>
        
        {/* Path Name */}
        <p className="text-lg text-white/90 mb-4 font-medium">
          {certificate.career_path.name}
        </p>

        {/* Certificate ID */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 mb-4 inline-block">
          <p className="text-xs text-white/70">Certificate ID</p>
          <p className="text-sm font-mono text-white font-semibold">
            {certificate.certificate_id}
          </p>
        </div>

        {/* Issue Date */}
        <div className="flex items-center gap-2 text-white/80 mb-6">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Issued on {formatDate(certificate.issued_at)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-white/90 transition-all shadow-lg"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-white/30 transition-all">
            View Details
          </button>
        </div>
      </div>

      {/* Shine Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
    </div>
  )
}
