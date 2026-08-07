import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { Award, Trophy, ChevronLeft, Download, CheckCircle, Clock, Lock, ExternalLink, Star, Shield, FileText, RefreshCw } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { getMediaUrl } from '../utils/mediaUrl'

interface Certificate {
  id: string
  certificate_id: string
  issued_at: string
  /** Media path of the rendered certificate; absent until it has been generated. */
  pdf_url?: string | null
  career_path: { id: string; name: string; description?: string; difficulty?: string }
  user?: { first_name: string; last_name: string; username: string }
}

interface EligibilityItem {
  path_id: string
  path_name: string
  completed_modules: number
  total_modules: number
  progress_percentage: number
  is_eligible: boolean
  has_certificate: boolean
}

// ── Certificate Card ──────────────────────────────────────────────────────
/**
 * The certificate is rendered on the server, with the SNSU and CCIS seals, the
 * instructor's name and the CEO's scanned signature. This page used to draw its
 * own HTML lookalike and print that instead — the same platform issuing two
 * different documents, and the one students actually received carried none of
 * the institutional marks. So: preview the real file, download the real file.
 */
function CertificateCardPro({ cert, onRegenerated }: { cert: Certificate; onRegenerated: () => void }) {
  const date = new Date(cert.issued_at)
  const [busy, setBusy] = useState<'png' | 'pdf' | 'generate' | null>(null)
  const preview = getMediaUrl(cert.pdf_url)

  const save = async (format: 'png' | 'pdf') => {
    setBusy(format)
    try {
      const response = await api.get(`/learning/certificates/${cert.id}/download/`, {
        params: format === 'pdf' ? { as: 'pdf' } : undefined,
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `Certificate_${cert.career_path.name.replace(/\s+/g, '_')}_${cert.certificate_id}.${format}`,
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Certificate downloaded')
    } catch {
      toast.error('Could not download that certificate.')
    } finally {
      setBusy(null)
    }
  }

  const generate = async () => {
    setBusy('generate')
    try {
      await api.post(`/learning/certificates/${cert.id}/claim/`)
      toast.success('Certificate generated')
      onRegenerated()
    } catch {
      toast.error('Could not generate that certificate.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-neutral-700/60 hover:border-purple-500/50 transition-all bg-neutral-900">
      {/* The certificate itself, not an impression of one. */}
      {preview ? (
        <a
          href={preview}
          target="_blank"
          rel="noreferrer"
          className="block border-b border-neutral-800 bg-neutral-950"
          title="Open full size"
        >
          <img
            src={preview}
            alt={`Certificate of completion for ${cert.career_path.name}`}
            loading="lazy"
            className="w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </a>
      ) : (
        <div className="flex h-28 flex-col items-center justify-center border-b border-neutral-800 bg-neutral-950 p-4 text-center">
          <Trophy className="mb-1 h-7 w-7 text-neutral-600" />
          <p className="text-xs text-neutral-500">Not rendered yet</p>
        </div>
      )}

      {/* Certificate body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-white text-sm leading-tight mb-1">{cert.career_path.name}</h3>
            <p className="text-xs text-neutral-500 font-mono">{cert.certificate_id}</p>
          </div>
          <div className="flex items-center gap-1 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5 flex-shrink-0">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-xs font-medium">Verified</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
          <Shield className="w-3.5 h-3.5" />
          <span>Issued {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        </div>

        {preview ? (
          <div className="flex gap-2">
            <button
              onClick={() => save('pdf')}
              disabled={busy !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm
                font-medium text-white transition hover:bg-purple-700 disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              {busy === 'pdf' ? 'Preparing…' : 'PDF'}
            </button>
            <button
              onClick={() => save('png')}
              disabled={busy !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-700
                px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800
                disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {busy === 'png' ? 'Preparing…' : 'Image'}
            </button>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={busy !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5
              text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${busy === 'generate' ? 'animate-spin' : ''}`} />
            {busy === 'generate' ? 'Generating…' : 'Generate certificate'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Claimable Card ────────────────────────────────────────────────────────
function ClaimableCard({ item, onClaim, awarding }: { item: EligibilityItem; onClaim: (id: string) => void; awarding: string | null }) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-neutral-900/80">
      <div className="h-2 bg-gradient-to-r from-amber-400 to-amber-500" />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-white text-sm mb-1">{item.path_name}</h3>
            <p className="text-xs text-amber-400">Path completed — claim your certificate!</p>
          </div>
          <Star className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        </div>
        <button
          onClick={() => onClaim(item.path_id)}
          disabled={awarding === item.path_id}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-900 text-sm font-bold rounded-xl transition disabled:opacity-60"
        >
          {awarding === item.path_id ? (
            <span className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Award className="w-4 h-4" />
          )}
          {awarding === item.path_id ? 'Claiming...' : 'Claim Certificate'}
        </button>
      </div>
    </div>
  )
}

// ── Progress Card ─────────────────────────────────────────────────────────
function ProgressCard({ item }: { item: EligibilityItem }) {
  const pct = item.progress_percentage ?? Math.round((item.completed_modules / Math.max(item.total_modules, 1)) * 100)
  return (
    <div className="rounded-2xl border border-neutral-700/50 bg-neutral-900/60 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white text-sm mb-1">{item.path_name}</h3>
          <p className="text-xs text-neutral-500">{item.completed_modules} / {item.total_modules} modules</p>
        </div>
        <Lock className="w-4 h-4 text-neutral-600 flex-shrink-0 mt-0.5" />
      </div>
      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-500/60 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-xs text-neutral-500">
        <span>{pct}% complete</span>
        <a href="/learning" className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
          Continue <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [eligibility, setEligibility] = useState<EligibilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [awarding, setAwarding] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      // The name on the certificate comes from the render, so this page no
      // longer needs the profile.
      const [certRes, eligRes] = await Promise.all([
        api.get('/learning/certificates/'),
        api.get('/learning/certificates/eligibility/'),
      ])
      setCertificates(certRes.data.results || certRes.data || [])
      setEligibility(eligRes.data || [])
    } catch {
      toast.error('Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (pathId: string) => {
    try {
      setAwarding(pathId)
      const res = await api.post('/learning/certificates/check_and_award/', { career_path_id: pathId })
      toast.success(res.data.message || 'Certificate awarded!')
      fetchAll()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to claim')
    } finally {
      setAwarding(null)
    }
  }

  const claimable = eligibility.filter(e => e.is_eligible && !e.has_certificate)
  const inProgress = eligibility.filter(e => !e.is_eligible && !e.has_certificate && e.completed_modules > 0)

  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <a href="/profile" className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition text-sm mb-8 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Profile
        </a>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-purple-600/20 rounded-2xl border border-purple-500/30">
              <Award className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">My Certificates</h1>
              <p className="text-neutral-400 text-sm">Complete learning paths to earn verified certificates</p>
            </div>
          </div>

          {/* Stats row */}
          {!loading && (
            <div className="flex flex-wrap gap-4 mt-5">
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 border border-purple-500/20 rounded-xl">
                <Trophy className="w-4 h-4 text-purple-400" />
                <span className="text-white font-bold">{certificates.length}</span>
                <span className="text-neutral-400 text-sm">Earned</span>
              </div>
              {claimable.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-bold">{claimable.length}</span>
                  <span className="text-neutral-400 text-sm">Ready to Claim</span>
                </div>
              )}
              {inProgress.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-bold">{inProgress.length}</span>
                  <span className="text-neutral-400 text-sm">In Progress</span>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Ready to Claim */}
            {claimable.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5" /> Ready to Claim ({claimable.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {claimable.map(item => (
                    <ClaimableCard key={item.path_id} item={item} onClaim={handleClaim} awarding={awarding} />
                  ))}
                </div>
              </section>
            )}

            {/* Earned Certificates Gallery */}
            {certificates.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-purple-400" /> Earned Certificates ({certificates.length})
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {certificates.map(cert => (
                    <CertificateCardPro key={cert.id} cert={cert} onRegenerated={fetchAll} />
                  ))}
                </div>
              </section>
            )}

            {/* In Progress */}
            {inProgress.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-neutral-400 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" /> In Progress ({inProgress.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inProgress.map(item => (
                    <ProgressCard key={item.path_id} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {certificates.length === 0 && claimable.length === 0 && inProgress.length === 0 && (
              <div className="text-center py-20">
                <div className="w-24 h-24 rounded-full bg-purple-600/10 flex items-center justify-center mx-auto mb-6">
                  <Award className="w-12 h-12 text-neutral-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No certificates yet</h3>
                <p className="text-neutral-400 mb-6">Enroll in a learning path and complete all its modules to earn a certificate.</p>
                <a href="/learning" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition">
                  Browse Learning Paths
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
