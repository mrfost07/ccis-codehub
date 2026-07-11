import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { Printer, ChevronLeft, Plus, Trash2, Edit3, Check, X } from 'lucide-react'
import ResumePreview from '../components/resume/ResumePreview'

export interface ResumeData {
  // Personal
  fullName: string
  email: string
  phone: string
  location: string
  website: string
  github: string
  linkedin: string
  summary: string
  profilePicture: string | null
  showPhoto: boolean
  // Auto-populated
  skills: string[]
  certificates: { name: string; issuer: string; year: string }[]
  education: { school: string; degree: string; field: string; year: string }[]
  experience: { company: string; role: string; period: string; bullets: string[] }[]
  projects: { name: string; description: string; tech: string; link: string }[]
}

export const TEMPLATES = [
  { id: 'classic',  label: 'Classic',  color: '#1e3a5f', accent: '#2563eb', desc: 'Clean & professional' },
  { id: 'modern',   label: 'Modern',   color: '#0f172a', accent: '#7c3aed', desc: 'Dark sidebar style' },
  { id: 'minimal',  label: 'Minimal',  color: '#ffffff', accent: '#059669', desc: 'Ultra-clean layout' },
  { id: 'bold',     label: 'Bold',     color: '#7c3aed', accent: '#f59e0b', desc: 'Vibrant & striking' },
]

const BLANK: ResumeData = {
  fullName: '', email: '', phone: '', location: '', website: '', github: '', linkedin: '', summary: '',
  profilePicture: null, showPhoto: true,
  skills: [], certificates: [], education: [], experience: [], projects: [],
}

export default function ResumePage() {
  const [step, setStep] = useState<'pick' | 'edit'>('pick')
  const [template, setTemplate] = useState('classic')
  const [data, setData] = useState<ResumeData>(BLANK)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [profileRes, skillsRes, certsRes] = await Promise.all([
        api.get('/users/profile/'),
        api.get('/learning/skills/me/').catch(() => ({ data: { by_category: {} } })),
        api.get('/learning/certificates/').catch(() => ({ data: [] })),
      ])
      const p = profileRes.data
      const prof = p.profile || {}

      // Profile picture URL
      let picUrl: string | null = null
      try {
        const raw = p.profile_picture || prof.profile_picture
        if (raw && typeof raw === 'string') picUrl = raw
      } catch {}

      // Flatten skills by category
      const allSkills: string[] = []
      const byCategory = skillsRes.data.by_category || {}
      Object.values(byCategory).forEach((arr: any) => arr.forEach((s: any) => allSkills.push(s.skill_name)))

      // Certificates
      const certs = (certsRes.data.results || certsRes.data || []).map((c: any) => ({
        name: `${c.career_path?.name || 'Course'} Completion`,
        issuer: 'CCIS-CodeHub',
        year: new Date(c.issued_at).getFullYear().toString(),
      }))

      setData({
        fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.username || '',
        email: p.email || '',
        phone: '',
        location: prof.location || '',
        website: prof.website_url || '',
        github: prof.github_username ? `github.com/${prof.github_username}` : '',
        linkedin: prof.linkedin_url || '',
        summary: p.bio || '',
        profilePicture: picUrl,
        showPhoto: true,
        skills: allSkills.length ? allSkills : (p.skills || []),
        certificates: certs,
        education: [{
          school: 'University of the Philippines – CCIS',
          degree: p.program || 'BS Information Technology',
          field: '',
          year: `${new Date().getFullYear() + (4 - parseInt(p.year_level || '1'))}`,
        }],
        experience: [],
        projects: [],
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (step === 'pick') return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <a href="/profile" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm mb-8 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Profile
        </a>
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Resume Builder</h1>
          <p className="text-slate-400">Pick a template — your profile data fills in automatically</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTemplate(t.id); setStep('edit') }}
              className={`group relative rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 ${template === t.id ? 'border-purple-500' : 'border-slate-700 hover:border-slate-500'}`}
            >
              {/* Mini template preview */}
              <div className="h-52 flex flex-col" style={{ background: t.id === 'minimal' ? '#f8fafc' : t.color }}>
                {/* Header bar */}
                <div className="px-3 py-3 flex-shrink-0" style={{ background: t.color, borderBottom: `3px solid ${t.accent}` }}>
                  <div className="h-2 w-16 rounded" style={{ background: t.id === 'minimal' ? '#1e293b' : 'rgba(255,255,255,0.8)' }} />
                  <div className="h-1.5 w-10 rounded mt-1.5 opacity-60" style={{ background: t.id === 'minimal' ? '#64748b' : 'rgba(255,255,255,0.5)' }} />
                </div>
                {/* Content lines */}
                <div className={`flex-1 p-3 ${t.id === 'modern' ? 'flex gap-2' : ''}`}>
                  {t.id === 'modern' && <div className="w-1/3 rounded" style={{ background: 'rgba(255,255,255,0.08)' }} />}
                  <div className="flex-1 space-y-1.5">
                    {[80,60,70,50,65].map((w,i) => (
                      <div key={i} className="h-1.5 rounded opacity-30" style={{ width: `${w}%`, background: t.id === 'minimal' ? '#334155' : 'white' }} />
                    ))}
                    <div className="mt-2 h-1 rounded opacity-20" style={{ width: '40%', background: t.accent }} />
                    {[55,45,60].map((w,i) => (
                      <div key={i} className="h-1.5 rounded opacity-25" style={{ width: `${w}%`, background: t.id === 'minimal' ? '#334155' : 'white' }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 px-3 py-2 text-left">
                <p className="font-semibold text-white text-sm">{t.label}</p>
                <p className="text-slate-500 text-xs">{t.desc}</p>
              </div>
              <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition" />
            </button>
          ))}
        </div>
        <p className="text-center text-slate-500 text-sm">Click any template to start building</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 print:bg-white">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden">
        <Navbar />
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-4 flex-wrap">
          <a href="/profile" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm">
            <ChevronLeft className="w-4 h-4" /> Back to Profile
          </a>
          <button onClick={() => setStep('pick')} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm">
            <ChevronLeft className="w-4 h-4" /> Templates
          </button>
          <div className="flex gap-2">
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setTemplate(t.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${template === t.id ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={handlePrint}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition">
            <Printer className="w-4 h-4" /> Download / Print PDF
          </button>
        </div>
      </div>

      {/* Two-column: Editor left, Preview right */}
      <div className="print:hidden flex gap-0 h-[calc(100vh-113px)] overflow-hidden">
        {/* Left: Editor */}
        <div className="w-80 flex-shrink-0 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4 space-y-4">
          <ResumeEditor data={data} setData={setData} />
        </div>
        {/* Right: Live Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-950 flex justify-center py-8 px-4">
          <div ref={printRef} className="w-[794px] min-h-[1123px] shadow-2xl">
            <ResumePreview data={data} templateId={template} />
          </div>
        </div>
      </div>

      {/* Print-only view */}
      <div className="hidden print:block">
        <ResumePreview data={data} templateId={template} />
      </div>

      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}

// ── Inline editor panels ───────────────────────────────────────────────────
function Field({ label, value, onChange, multiline = false, placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
            className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none" />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
      }
    </div>
  )
}

function Section({ title, children }: any) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-3 space-y-2">
      <p className="text-xs font-bold text-purple-400 uppercase tracking-wider">{title}</p>
      {children}
    </div>
  )
}

function ResumeEditor({ data, setData }: { data: ResumeData; setData: any }) {
  const set = (k: keyof ResumeData) => (v: any) => setData((d: ResumeData) => ({ ...d, [k]: v }))

  const addExp = () => setData((d: ResumeData) => ({
    ...d, experience: [...d.experience, { company: '', role: '', period: '', bullets: [''] }]
  }))
  const removeExp = (i: number) => setData((d: ResumeData) => ({ ...d, experience: d.experience.filter((_: any, j: number) => j !== i) }))

  const addProj = () => setData((d: ResumeData) => ({
    ...d, projects: [...d.projects, { name: '', description: '', tech: '', link: '' }]
  }))
  const removeProj = (i: number) => setData((d: ResumeData) => ({ ...d, projects: d.projects.filter((_: any, j: number) => j !== i) }))

  return (
    <>
      <Section title="Personal Info">
        {/* Photo toggle */}
        <div className="flex items-center justify-between py-1">
          <span className="text-xs text-slate-400">Show profile photo</span>
          <button
            onClick={() => setData((d: ResumeData) => ({ ...d, showPhoto: !d.showPhoto }))}
            className={`relative w-10 h-5 rounded-full transition-colors ${data.showPhoto ? 'bg-purple-600' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${data.showPhoto ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <Field label="Full Name" value={data.fullName} onChange={set('fullName')} placeholder="Your Name" />
        <Field label="Email" value={data.email} onChange={set('email')} placeholder="email@example.com" />
        <Field label="Phone" value={data.phone} onChange={set('phone')} placeholder="+63 912 345 6789" />
        <Field label="Location" value={data.location} onChange={set('location')} placeholder="City, Province" />
        <Field label="GitHub" value={data.github} onChange={set('github')} placeholder="github.com/username" />
        <Field label="LinkedIn" value={data.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/name" />
        <Field label="Website" value={data.website} onChange={set('website')} />
      </Section>

      <Section title="Summary">
        <Field label="" value={data.summary} onChange={set('summary')} multiline placeholder="A brief professional summary..." />
      </Section>

      <Section title="Skills">
        <div className="flex flex-wrap gap-1 mb-2">
          {data.skills.map((s, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-xs">
              {s}
              <button onClick={() => set('skills')(data.skills.filter((_: string, j: number) => j !== i))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <SkillAdder onAdd={(s: string) => set('skills')([...data.skills, s])} />
      </Section>

      <Section title="Education">
        {data.education.map((ed, i) => (
          <div key={i} className="space-y-1.5 pb-2 border-b border-slate-700 last:border-0">
            <Field label="School" value={ed.school} onChange={(v: string) => {
              const e = [...data.education]; e[i] = { ...e[i], school: v }; set('education')(e)
            }} />
            <Field label="Degree" value={ed.degree} onChange={(v: string) => {
              const e = [...data.education]; e[i] = { ...e[i], degree: v }; set('education')(e)
            }} />
            <Field label="Graduation Year" value={ed.year} onChange={(v: string) => {
              const e = [...data.education]; e[i] = { ...e[i], year: v }; set('education')(e)
            }} />
          </div>
        ))}
        <button onClick={() => set('education')([...data.education, { school: '', degree: '', field: '', year: '' }])}
          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-1">
          <Plus className="w-3 h-3" /> Add Education
        </button>
      </Section>

      <Section title="Experience">
        {data.experience.map((ex, i) => (
          <div key={i} className="space-y-1.5 pb-2 border-b border-slate-700 last:border-0">
            <div className="flex justify-between items-start">
              <p className="text-xs text-slate-400">{ex.company || 'New Entry'}</p>
              <button onClick={() => removeExp(i)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
            <Field label="Company" value={ex.company} onChange={(v: string) => {
              const e = [...data.experience]; e[i] = { ...e[i], company: v }; set('experience')(e)
            }} />
            <Field label="Role/Title" value={ex.role} onChange={(v: string) => {
              const e = [...data.experience]; e[i] = { ...e[i], role: v }; set('experience')(e)
            }} />
            <Field label="Period (e.g. 2024–Present)" value={ex.period} onChange={(v: string) => {
              const e = [...data.experience]; e[i] = { ...e[i], period: v }; set('experience')(e)
            }} />
            <Field label="Description" value={ex.bullets[0] || ''} multiline onChange={(v: string) => {
              const e = [...data.experience]; e[i] = { ...e[i], bullets: [v] }; set('experience')(e)
            }} />
          </div>
        ))}
        <button onClick={addExp} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-1">
          <Plus className="w-3 h-3" /> Add Experience
        </button>
      </Section>

      <Section title="Projects">
        {data.projects.map((pr, i) => (
          <div key={i} className="space-y-1.5 pb-2 border-b border-slate-700 last:border-0">
            <div className="flex justify-between">
              <p className="text-xs text-slate-400">{pr.name || 'New Project'}</p>
              <button onClick={() => removeProj(i)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
            <Field label="Project Name" value={pr.name} onChange={(v: string) => {
              const e = [...data.projects]; e[i] = { ...e[i], name: v }; set('projects')(e)
            }} />
            <Field label="Description" value={pr.description} multiline onChange={(v: string) => {
              const e = [...data.projects]; e[i] = { ...e[i], description: v }; set('projects')(e)
            }} />
            <Field label="Tech Stack" value={pr.tech} onChange={(v: string) => {
              const e = [...data.projects]; e[i] = { ...e[i], tech: v }; set('projects')(e)
            }} placeholder="React, Django, PostgreSQL" />
            <Field label="Link (optional)" value={pr.link} onChange={(v: string) => {
              const e = [...data.projects]; e[i] = { ...e[i], link: v }; set('projects')(e)
            }} />
          </div>
        ))}
        <button onClick={addProj} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-1">
          <Plus className="w-3 h-3" /> Add Project
        </button>
      </Section>
    </>
  )
}

function SkillAdder({ onAdd }: { onAdd: (s: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex gap-1">
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Add skill..."
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal('') } }}
        className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500" />
      <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal('') } }}
        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white">
        <Plus className="w-3 h-3" />
      </button>
    </div>
  )
}
