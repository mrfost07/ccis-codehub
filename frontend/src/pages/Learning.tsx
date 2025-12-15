import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'
import api from '../services/api'

// Student Learning Dashboard - Simplified for student access
export default function Learning() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [careerPaths, setCareerPaths] = useState<any[]>([])
  const [enrolledPaths, setEnrolledPaths] = useState<string[]>([])

  useEffect(() => {
    fetchCareerPaths()
  }, [])

  const fetchCareerPaths = async () => {
    try {
      setLoading(true)
      const response = await api.get('/learning/career-paths/')
      const paths = response.data.results || response.data || []
      
      // Also fetch user enrollments
      try {
        const enrollmentResponse = await api.get('/learning/enrollments/')
        const enrollments = enrollmentResponse.data.results || enrollmentResponse.data || []
        setEnrolledPaths(enrollments.map((e: any) => e.career_path))
      } catch (enrollError) {
        console.log('Could not fetch enrollments:', enrollError)
      }
      
      setCareerPaths(paths)
    } catch (error) {
      console.error('Failed to fetch career paths:', error)
      // Use fallback data if API fails
      setCareerPaths([
        {
          id: '1',
          slug: 'web-development',
          title: 'Web Development',
          description: 'Master frontend and backend technologies',
          duration: '6 months',
          difficulty_level: 'Beginner to Advanced',
          modules_count: 12,
          enrolled_count: 245,
          icon: '🌐'
        },
        {
          id: '2',
          slug: 'data-science',
          title: 'Data Science',
          description: 'Learn data analysis and machine learning',
          duration: '8 months',
          difficulty_level: 'Intermediate',
          modules_count: 10,
          enrolled_count: 189,
          icon: '📊'
        },
        {
          id: '3',
          slug: 'mobile-development',
          title: 'Mobile Development',
          description: 'Build iOS and Android applications',
          duration: '5 months',
          difficulty_level: 'Intermediate',
          modules_count: 8,
          enrolled_count: 156,
          icon: '📱'
        },
        {
          id: '4',
          slug: 'cybersecurity',
          title: 'Cybersecurity',
          description: 'Protect systems and networks from threats',
          duration: '7 months',
          difficulty_level: 'Advanced',
          modules_count: 15,
          enrolled_count: 203,
          icon: '🔒'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (pathId: string) => {
    // This function is not used anymore since we switched to LearningEnhanced
    // But keeping it clean just in case
    console.log('BYPASSING: Basic Learning.tsx handleEnroll called for:', pathId)
    toast.success('Opening learning path...')
    viewPathDetails(pathId)
  }

  const viewPathDetails = (pathId: string) => {
    console.log('Navigating to path details for ID:', pathId)
    console.log('Navigation URL:', `/learning/paths/${pathId}`)
    
    // Try navigation
    try {
      navigate(`/learning/paths/${pathId}`)
      console.log('Navigation attempted successfully')
    } catch (error) {
      console.error('Navigation failed:', error)
      toast.error('Navigation failed - check console for details')
    }
  }

  // Use inline styles to guarantee visibility
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: 'white'
  }

  const contentStyle = {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: 'clamp(1rem, 3vw, 2rem)'
  }

  const cardStyle = {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '0.75rem',
    padding: 'clamp(1rem, 2.5vw, 1.5rem)',
    transition: 'all 0.3s',
    cursor: 'pointer'
  }

  return (
    <div style={containerStyle}>
      <Navbar />
      
      <div style={contentStyle}>
        <div style={{ marginBottom: 'clamp(1rem, 3vw, 2rem)' }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            🎓 Learning Center
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
            AI-guided learning paths for IT, CS, and IS students
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '3rem' }}>⏳</div>
            <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Loading...</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'clamp(1rem, 2vw, 1.5rem)'
          }}>
            {careerPaths.map((path) => (
              <div
                key={path.id}
                style={cardStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#8b5cf6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#334155'
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{path.icon || '📚'}</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {path.title}
                </h3>
                <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  {path.description}
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  color: '#64748b',
                  marginBottom: '1rem'
                }}>
                  <span>⏱️ {path.duration}</span>
                  <span>🏆 {path.difficulty_level || path.level}</span>
                </div>
                
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                  📖 {path.modules_count} modules {path.enrolled_count ? `• ${path.enrolled_count} enrolled` : ''}
                </div>
                
                <button
                  onClick={() => {
                    // ALWAYS navigate directly to path details - fuck the enrollment check
                    console.log('DIRECT NAVIGATION: Going straight to path details for path:', path.id)
                    toast.success('Opening learning path...')
                    viewPathDetails(path.id)
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: enrolledPaths.includes(path.id) 
                      ? 'linear-gradient(to right, #059669, #10b981)' 
                      : 'linear-gradient(to right, #7c3aed, #4f46e5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  {enrolledPaths.includes(path.id) ? 'Continue Learning' : 'Start Learning'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
