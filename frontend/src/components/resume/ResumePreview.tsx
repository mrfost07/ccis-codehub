import type { ResumeData } from '../../pages/ResumePage'

interface Props { data: ResumeData; templateId: string }

export default function ResumePreview({ data, templateId }: Props) {
  switch (templateId) {
    case 'modern':  return <ModernTemplate data={data} />
    case 'minimal': return <MinimalTemplate data={data} />
    case 'bold':    return <BoldTemplate data={data} />
    default:        return <ClassicTemplate data={data} />
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────
const SectionTitle = ({ children, color = '#2563eb' }: { children: string; color?: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <h2 style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{children}</h2>
    <div style={{ flex: 1, height: 1, background: color + '44' }} />
  </div>
)

const BulletList = ({ items, color = '#374151' }: { items: string[]; color?: string }) => (
  <ul style={{ margin: 0, paddingLeft: 14 }}>
    {items.filter(Boolean).map((b, i) => (
      <li key={i} style={{ color, fontSize: 10, lineHeight: 1.6 }}>{b}</li>
    ))}
  </ul>
)

// ── 1. CLASSIC ────────────────────────────────────────────────────────────
function ClassicTemplate({ data }: { data: ResumeData }) {
  const accent = '#2563eb'
  return (
    <div style={{ fontFamily: 'Georgia, serif', background: '#fff', minHeight: 1123, padding: '48px 52px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ borderBottom: `3px solid ${accent}`, paddingBottom: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e3a5f', margin: 0 }}>{data.fullName || 'Your Name'}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 16px', marginTop: 6, fontSize: 10, color: '#64748b' }}>
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>{data.phone}</span>}
          {data.location && <span>{data.location}</span>}
          {data.github && <span>{data.github}</span>}
          {data.linkedin && <span>{data.linkedin}</span>}
          {data.website && <span>{data.website}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle color={accent}>Professional Summary</SectionTitle>
          <p style={{ fontSize: 10.5, color: '#374151', lineHeight: 1.7, margin: 0 }}>{data.summary}</p>
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle color={accent}>Skills</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
            {data.skills.map((s, i) => (
              <span key={i} style={{ fontSize: 10, background: '#eff6ff', color: accent, padding: '2px 8px', borderRadius: 4, border: `1px solid ${accent}33` }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle color={accent}>Experience</SectionTitle>
          {data.experience.map((ex, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 11, color: '#1e293b' }}>{ex.role}</strong>
                <span style={{ fontSize: 10, color: '#64748b' }}>{ex.period}</span>
              </div>
              <p style={{ fontSize: 10.5, color: accent, margin: '2px 0 4px' }}>{ex.company}</p>
              <BulletList items={ex.bullets} />
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle color={accent}>Education</SectionTitle>
          {data.education.map((ed, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <strong style={{ fontSize: 11, color: '#1e293b' }}>{ed.degree}</strong>
                <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>{ed.school}</p>
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>{ed.year}</span>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionTitle color={accent}>Projects</SectionTitle>
          {data.projects.map((pr, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: 11, color: '#1e293b' }}>{pr.name}</strong>
                {pr.link && <span style={{ fontSize: 9, color: accent }}>{pr.link}</span>}
              </div>
              {pr.tech && <p style={{ fontSize: 9.5, color: '#7c3aed', margin: '2px 0 3px' }}>{pr.tech}</p>}
              <p style={{ fontSize: 10, color: '#374151', margin: 0 }}>{pr.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Certificates */}
      {data.certificates.length > 0 && (
        <div>
          <SectionTitle color={accent}>Certifications</SectionTitle>
          {data.certificates.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10.5, color: '#1e293b' }}>{c.name}</span>
              <span style={{ fontSize: 10, color: '#64748b' }}>{c.issuer} · {c.year}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 2. MODERN (two-column dark sidebar) ──────────────────────────────────
function ModernTemplate({ data }: { data: ResumeData }) {
  const accent = '#7c3aed'
  const initials = data.fullName
    ? data.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', display: 'flex', minHeight: 1123, background: '#fff' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#0f172a', padding: '36px 20px', flexShrink: 0 }}>
        {/* Profile Photo */}
        {data.showPhoto && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            {data.profilePicture ? (
              <img
                src={data.profilePicture}
                alt={data.fullName}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${accent}` }}
              />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: `linear-gradient(135deg, ${accent}, #2563eb)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: '#fff', border: `3px solid ${accent}55`,
              }}>
                {initials}
              </div>
            )}
          </div>
        )}

        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px', textAlign: data.showPhoto ? 'center' : 'left' }}>{data.fullName || 'Your Name'}</h1>
        <div style={{ width: 40, height: 3, background: accent, marginBottom: 16, marginLeft: data.showPhoto ? 'auto' : 0, marginRight: data.showPhoto ? 'auto' : 0 }} />
        <div style={{ fontSize: 9.5, color: '#94a3b8', lineHeight: 2 }}>
          {data.email && <p style={{ margin: 0 }}>{data.email}</p>}
          {data.phone && <p style={{ margin: 0 }}>{data.phone}</p>}
          {data.location && <p style={{ margin: 0 }}>{data.location}</p>}
          {data.github && <p style={{ margin: 0 }}>{data.github}</p>}
          {data.linkedin && <p style={{ margin: 0 }}>{data.linkedin}</p>}
        </div>
        {data.skills.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Skills</p>
            {data.skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#e2e8f0' }}>{s}</span>
              </div>
            ))}
          </div>
        )}
        {data.certificates.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Certifications</p>
            {data.certificates.map((c, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 9.5, color: '#e2e8f0', margin: 0 }}>{c.name}</p>
                <p style={{ fontSize: 9, color: '#64748b', margin: '1px 0 0' }}>{c.issuer} · {c.year}</p>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Main */}
      <div style={{ flex: 1, padding: '36px 32px' }}>
        {data.summary && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle color={accent}>About Me</SectionTitle>
            <p style={{ fontSize: 10.5, color: '#374151', lineHeight: 1.7, margin: 0 }}>{data.summary}</p>
          </div>
        )}
        {data.experience.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle color={accent}>Experience</SectionTitle>
            {data.experience.map((ex, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 11, color: '#1e293b' }}>{ex.role}</strong>
                  <span style={{ fontSize: 10, color: '#64748b' }}>{ex.period}</span>
                </div>
                <p style={{ fontSize: 10.5, color: accent, margin: '2px 0 4px' }}>{ex.company}</p>
                <BulletList items={ex.bullets} />
              </div>
            ))}
          </div>
        )}
        {data.education.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionTitle color={accent}>Education</SectionTitle>
            {data.education.map((ed, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <strong style={{ fontSize: 11, color: '#1e293b' }}>{ed.degree}</strong>
                  <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>{ed.school}</p>
                </div>
                <span style={{ fontSize: 10, color: '#64748b' }}>{ed.year}</span>
              </div>
            ))}
          </div>
        )}
        {data.projects.length > 0 && (
          <div>
            <SectionTitle color={accent}>Projects</SectionTitle>
            {data.projects.map((pr, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 11, color: '#1e293b' }}>{pr.name}</strong>
                {pr.tech && <p style={{ fontSize: 9.5, color: accent, margin: '2px 0 3px' }}>{pr.tech}</p>}
                <p style={{ fontSize: 10, color: '#374151', margin: 0 }}>{pr.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 3. MINIMAL ────────────────────────────────────────────────────────────
function MinimalTemplate({ data }: { data: ResumeData }) {
  const accent = '#059669'
  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", background: '#fff', minHeight: 1123, padding: '56px 60px', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 32, fontWeight: 300, color: '#1e293b', margin: '0 0 2px', letterSpacing: '-0.5px' }}>{data.fullName || 'Your Name'}</h1>
      <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#94a3b8', marginBottom: 32, flexWrap: 'wrap' }}>
        {[data.email, data.phone, data.location, data.github, data.linkedin].filter(Boolean).map((v, i) => (
          <span key={i}>{v}</span>
        ))}
      </div>
      {data.summary && <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.8, marginBottom: 28, borderLeft: `2px solid ${accent}`, paddingLeft: 12 }}>{data.summary}</p>}
      {data.experience.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Experience</p>
          {data.experience.map((ex, i) => (
            <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
              <div style={{ width: 80, flexShrink: 0, fontSize: 9.5, color: '#94a3b8', paddingTop: 1 }}>{ex.period}</div>
              <div>
                <strong style={{ fontSize: 11.5, color: '#1e293b' }}>{ex.role}</strong>
                <span style={{ fontSize: 10.5, color: '#64748b' }}> · {ex.company}</span>
                {ex.bullets[0] && <p style={{ fontSize: 10, color: '#475569', margin: '4px 0 0' }}>{ex.bullets[0]}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data.education.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Education</p>
          {data.education.map((ed, i) => (
            <div key={i} style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
              <div style={{ width: 80, flexShrink: 0, fontSize: 9.5, color: '#94a3b8', paddingTop: 1 }}>{ed.year}</div>
              <div>
                <strong style={{ fontSize: 11.5, color: '#1e293b' }}>{ed.degree}</strong>
                <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>{ed.school}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.skills.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Skills</p>
          <p style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.8, margin: 0 }}>{data.skills.join(' · ')}</p>
        </div>
      )}
      {data.projects.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Projects</p>
          {data.projects.map((pr, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <strong style={{ fontSize: 11, color: '#1e293b' }}>{pr.name}</strong>
              {pr.tech && <span style={{ fontSize: 9.5, color: accent }}> · {pr.tech}</span>}
              <p style={{ fontSize: 10, color: '#475569', margin: '3px 0 0' }}>{pr.description}</p>
            </div>
          ))}
        </div>
      )}
      {data.certificates.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Certifications</p>
          {data.certificates.map((c, i) => (
            <p key={i} style={{ fontSize: 10.5, color: '#475569', margin: '0 0 4px' }}>{c.name} — {c.issuer} ({c.year})</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 4. BOLD ────────────────────────────────────────────────────────────────
function BoldTemplate({ data }: { data: ResumeData }) {
  const accent = '#f59e0b'
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#fff', minHeight: 1123, boxSizing: 'border-box' }}>
      {/* Bold header */}
      <div style={{ background: '#7c3aed', padding: '40px 48px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, background: 'rgba(245,158,11,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -20, left: 200, width: 100, height: 100, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <h1 style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: '0 0 4px', position: 'relative' }}>{data.fullName || 'Your Name'}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 16px', fontSize: 10, color: 'rgba(255,255,255,0.75)', position: 'relative' }}>
          {[data.email, data.phone, data.location, data.github, data.linkedin].filter(Boolean).map((v, i) => (
            <span key={i}>{v}</span>
          ))}
        </div>
        {data.skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 16, position: 'relative' }}>
            {data.skills.map((s, i) => (
              <span key={i} style={{ fontSize: 9.5, background: 'rgba(245,158,11,0.25)', color: accent, padding: '2px 10px', borderRadius: 20, border: `1px solid ${accent}55` }}>{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '32px 48px' }}>
        {data.summary && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 20, height: 20, background: accent, borderRadius: 4 }} />
              <h2 style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>About</h2>
            </div>
            <p style={{ fontSize: 10.5, color: '#374151', lineHeight: 1.7, margin: 0 }}>{data.summary}</p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            {data.experience.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, background: accent, borderRadius: 4 }} />
                  <h2 style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Experience</h2>
                </div>
                {data.experience.map((ex, i) => (
                  <div key={i} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: '2px solid #e2e8f0' }}>
                    <strong style={{ fontSize: 11, color: '#1e293b' }}>{ex.role}</strong>
                    <p style={{ fontSize: 10, color: '#7c3aed', margin: '1px 0 2px' }}>{ex.company} · {ex.period}</p>
                    {ex.bullets[0] && <p style={{ fontSize: 10, color: '#374151', margin: 0 }}>{ex.bullets[0]}</p>}
                  </div>
                ))}
              </div>
            )}
            {data.projects.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, background: accent, borderRadius: 4 }} />
                  <h2 style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Projects</h2>
                </div>
                {data.projects.map((pr, i) => (
                  <div key={i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: '2px solid #e2e8f0' }}>
                    <strong style={{ fontSize: 11, color: '#1e293b' }}>{pr.name}</strong>
                    {pr.tech && <p style={{ fontSize: 9.5, color: '#7c3aed', margin: '1px 0 2px' }}>{pr.tech}</p>}
                    <p style={{ fontSize: 10, color: '#374151', margin: 0 }}>{pr.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            {data.education.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, background: accent, borderRadius: 4 }} />
                  <h2 style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Education</h2>
                </div>
                {data.education.map((ed, i) => (
                  <div key={i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: '2px solid #e2e8f0' }}>
                    <strong style={{ fontSize: 11, color: '#1e293b' }}>{ed.degree}</strong>
                    <p style={{ fontSize: 10, color: '#64748b', margin: '1px 0 0' }}>{ed.school}</p>
                    <p style={{ fontSize: 9.5, color: '#94a3b8', margin: '1px 0 0' }}>{ed.year}</p>
                  </div>
                ))}
              </div>
            )}
            {data.certificates.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, background: accent, borderRadius: 4 }} />
                  <h2 style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Certifications</h2>
                </div>
                {data.certificates.map((c, i) => (
                  <div key={i} style={{ marginBottom: 8, paddingLeft: 12, borderLeft: '2px solid #e2e8f0' }}>
                    <p style={{ fontSize: 10.5, color: '#1e293b', margin: 0, fontWeight: 600 }}>{c.name}</p>
                    <p style={{ fontSize: 9.5, color: '#64748b', margin: '1px 0 0' }}>{c.issuer} · {c.year}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
