import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { Award, Trophy, ChevronLeft, Download, CheckCircle, Clock, Lock, ExternalLink, Star, Shield } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface Certificate {
  id: string
  certificate_id: string
  issued_at: string
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

// ── Certificate PDF Renderer ──────────────────────────────────────────────
function printCertificate(cert: Certificate, userName: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Certificate — ${cert.career_path.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 0; }
    body { width: 297mm; height: 210mm; font-family: 'Georgia', serif; background: #fff; display: flex; align-items: center; justify-content: center; }
    .cert {
      width: 272mm; height: 185mm;
      border: 12px double #7c3aed;
      outline: 2px solid #a78bfa;
      outline-offset: -18px;
      padding: 32px 48px;
      display: flex; flex-direction: column; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #faf5ff 0%, #ffffff 50%, #eff6ff 100%);
      position: relative;
      text-align: center;
    }
    .corner {
      position: absolute; width: 60px; height: 60px;
      border-color: #7c3aed; border-style: solid;
    }
    .tl { top: 12px; left: 12px; border-width: 3px 0 0 3px; }
    .tr { top: 12px; right: 12px; border-width: 3px 3px 0 0; }
    .bl { bottom: 12px; left: 12px; border-width: 0 0 3px 3px; }
    .br { bottom: 12px; right: 12px; border-width: 0 3px 3px 0; }
    .logo { font-size: 13px; color: #7c3aed; font-weight: bold; letter-spacing: 0.15em; text-transform: uppercase; }
    .title { font-size: 36px; color: #1e293b; font-weight: bold; letter-spacing: -0.5px; }
    .subtitle { font-size: 14px; color: #64748b; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px; }
    .presented { font-size: 14px; color: #64748b; margin: 6px 0; }
    .name { font-size: 38px; color: #7c3aed; font-style: italic; margin: 4px 0; }
    .desc { font-size: 13px; color: #475569; max-width: 480px; line-height: 1.6; }
    .path-name { font-size: 20px; font-weight: bold; color: #1e293b; }
    .footer { display: flex; width: 100%; justify-content: space-between; align-items: flex-end; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1px solid #334155; width: 140px; margin: 4px auto; padding-top: 4px; font-size: 11px; color: #64748b; }
    .cert-id { font-size: 10px; color: #94a3b8; font-family: monospace; }
    .seal { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #7c3aed, #2563eb); display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="corner tl"></div><div class="corner tr"></div>
    <div class="corner bl"></div><div class="corner br"></div>

    <div>
      <div class="logo">✦ CCIS-CodeHub ✦</div>
      <div style="margin-top:8px">
        <div class="title">Certificate of Completion</div>
        <div class="subtitle">CCIS College of Computing and Information Sciences</div>
      </div>
    </div>

    <div>
      <div class="presented">This certifies that</div>
      <div class="name">${userName}</div>
      <div class="presented">has successfully completed</div>
      <div class="path-name">${cert.career_path.name}</div>
      <div class="desc" style="margin-top:8px">
        Demonstrating proficiency and commitment to excellence in the CCIS-CodeHub learning platform.
      </div>
    </div>

    <div class="footer">
      <div class="sig-block">
        <div class="sig-line">Platform Director</div>
        <div class="cert-id">CCIS-CodeHub</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
        <div class="seal">🏆</div>
        <div class="cert-id">Verified</div>
      </div>
      <div class="sig-block">
        <div class="sig-line">${new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div class="cert-id">${cert.certificate_id}</div>
      </div>
    </div>
  </div>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1000,height=720')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Certificate Card ──────────────────────────────────────────────────────
function CertificateCardPro({ cert, userName }: { cert: Certificate; userName: string }) {
  const date = new Date(cert.issued_at)
  const COLORS = ['border-purple-500/30 bg-purple-500/5', 'border-purple-500/30 bg-purple-500/5', 'border-green-500/30 bg-green-500/5', 'border-amber-500/30 bg-amber-500/5']
  const ICON_COLORS = ['text-purple-400', 'text-purple-400', 'text-green-400', 'text-amber-400']
  const colorIdx = cert.career_path.name.charCodeAt(0) % COLORS.length

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-neutral-700/60 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10 bg-neutral-900">
      {/* Certificate preview header */}
      <div className={`relative h-28 border-b ${COLORS[colorIdx]} flex flex-col items-center justify-center p-4 overflow-hidden`}>
        {/* Subtle corner accents */}
        <div className="absolute top-2 left-2 w-4 h-4 border-l border-t border-white/10 rounded-tl" />
        <div className="absolute top-2 right-2 w-4 h-4 border-r border-t border-white/10 rounded-tr" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-l border-b border-white/10 rounded-bl" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-r border-b border-white/10 rounded-br" />
        <Trophy className={`w-7 h-7 mb-1 relative z-10 ${ICON_COLORS[colorIdx]}`} />
        <p className="text-white/80 font-semibold text-center text-xs leading-tight relative z-10">Certificate of Completion</p>
        <p className="text-neutral-500 text-[10px] mt-1 relative z-10">CCIS-CodeHub</p>
      </div>

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

        <button
          onClick={() => printCertificate(cert, userName)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition group-hover:shadow-lg group-hover:shadow-purple-500/20"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
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
  const [userName, setUserName] = useState('')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [certRes, eligRes, profileRes] = await Promise.all([
        api.get('/learning/certificates/'),
        api.get('/learning/certificates/eligibility/'),
        api.get('/users/profile/').catch(() => ({ data: {} })),
      ])
      setCertificates(certRes.data.results || certRes.data || [])
      setEligibility(eligRes.data || [])
      const p = profileRes.data
      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.username || 'Student'
      setUserName(name)
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
              <h1 className="text-3xl font-black text-white">My Certificates</h1>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {certificates.map(cert => (
                    <CertificateCardPro key={cert.id} cert={cert} userName={userName} />
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
