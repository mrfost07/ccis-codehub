import { Link } from 'react-router-dom'
import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import Hyperspeed from '../components/backgrounds/Hyperspeed'
import api from '../services/api'

// Memoized Hyperspeed to prevent re-renders from typewriter
const MemoizedHyperspeed = memo(Hyperspeed)

// Isolated TypewriterText component to prevent parent re-renders
function TypewriterText() {
  const [typedText, setTypedText] = useState('')
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  const phrases = useMemo(() => [
    'Master Programming',
    'Build Amazing Projects',
    'AI-Powered Learning',
    'Collaborate with Peers'
  ], [])

  useEffect(() => {
    const currentPhrase = phrases[currentPhraseIndex]
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (typedText.length < currentPhrase.length) {
          setTypedText(currentPhrase.slice(0, typedText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), 2000)
        }
      } else {
        if (typedText.length > 0) {
          setTypedText(typedText.slice(0, -1))
        } else {
          setIsDeleting(false)
          setCurrentPhraseIndex((currentPhraseIndex + 1) % phrases.length)
        }
      }
    }, isDeleting ? 50 : 100)

    return () => clearTimeout(timeout)
  }, [typedText, isDeleting, currentPhraseIndex, phrases])

  return (
    <motion.span
      className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {typedText}
      <span className="animate-blink">|</span>
    </motion.span>
  )
}

// Stats interface
interface PlatformStats {
  total_users: number
  total_courses: number
  total_projects: number
}

export default function HomeEnhanced() {
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({})
  const [stats, setStats] = useState<PlatformStats>({ total_users: 0, total_courses: 0, total_projects: 0 })

  // Fetch real stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/auth/public-stats/')
        console.log('Stats from API:', response.data)
        setStats(response.data)
      } catch (error) {
        console.error('Error fetching stats:', error)
        // Don't set fallback values - will show 0 if API fails
      }
    }
    fetchStats()
  }, [])

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }))
          }
        })
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Animated Hyperspeed Background - Optimized */}
      <div className="fixed inset-0 z-0">
        <MemoizedHyperspeed
          effectOptions={{
            onSpeedUp: () => { },
            onSlowDown: () => { },
            distortion: 'turbulentDistortion',
            length: 300,
            roadWidth: 9,
            islandWidth: 2,
            lanesPerRoad: 2,
            fov: 90,
            fovSpeedUp: 120,
            speedUp: 1.5,
            carLightsFade: 0.4,
            totalSideLightSticks: 10,
            lightPairsPerRoadWay: 20,
            shoulderLinesWidthPercentage: 0.05,
            brokenLinesWidthPercentage: 0.1,
            brokenLinesLengthPercentage: 0.5,
            lightStickWidth: [0.12, 0.4],
            lightStickHeight: [1.3, 1.6],
            movingAwaySpeed: [50, 70],
            movingCloserSpeed: [-100, -140],
            carLightsLength: [300 * 0.05, 300 * 0.15],
            carLightsRadius: [0.05, 0.12],
            carWidthPercentage: [0.3, 0.5],
            carShiftX: [-0.6, 0.6],
            colors: {
              roadColor: 0x080808,
              islandColor: 0x0a0a0a,
              background: 0x000000,
              shoulderLines: 0x131818,
              brokenLines: 0x131818,
              leftCars: [0x6366f1, 0x8b5cf6],
              rightCars: [0xec4899, 0xf43f5e],
              sticks: 0x6366f1,
            },
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition" />
                <img src="/logo/ccis-logo.svg" alt="CCIS" className="relative w-8 h-8" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                CCIS CodeHub
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors relative group"
              >
                <span className="relative z-10">Login</span>
                <div className="absolute inset-0 bg-white/10 rounded-lg scale-0 group-hover:scale-100 transition-transform" />
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-16">
        <div className="max-w-7xl mx-auto text-center">
          {/* Main Heading with Typewriter */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight">
            <span className="block text-white mb-2">
              Unleash Your
            </span>
            <TypewriterText />
            <span className="block text-white mt-2 text-4xl sm:text-5xl md:text-6xl">
              Potential
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            The ultimate learning platform for <span className="text-indigo-400 font-semibold">SNSU CCIS</span> students.
            Master programming, build projects, and get <span className="text-purple-400 font-semibold">AI-powered mentoring</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <Link
              to="/register"
              className="group relative px-8 py-4 text-lg font-bold text-white rounded-xl overflow-hidden transition-all transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:from-indigo-500 group-hover:to-purple-500 transition-all" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 blur-xl" />
              </div>
              <span className="relative flex items-center justify-center space-x-2">
                <span>Start Learning Free</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>

            <Link
              to="/learning"
              className="px-8 py-4 text-lg font-bold bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 transition-all transform hover:scale-105"
            >
              Explore Courses
            </Link>
          </div>

          {/* Stats Counter - Real Data */}
          <motion.div
            className="grid grid-cols-3 gap-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <CounterStat end={stats.total_users} suffix="+" label="Students" />
            <CounterStat end={stats.total_courses} suffix="+" label="Courses" />
            <CounterStat end={100} suffix="%" label="AI-Powered" />
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section >

      {/* Features Section - Milestone Design */}
      < section id="features" className="relative z-10 py-32 px-4" >
        <div className="max-w-7xl mx-auto">
          <ScrollAnimateWrapper>
            <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                Everything You Need to
                <span className="block bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Succeed
                </span>
              </h2>
              <p className="text-xl text-slate-400">
                Powerful features designed for CCIS students
              </p>
            </div>
          </ScrollAnimateWrapper>

          {/* Milestone Timeline */}
          <div className="relative">
            {/* Center Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 hidden lg:block"></div>

            {/* Milestones */}
            <div className="space-y-24">
              <MilestoneCard
                icon="📚"
                title="Learning Paths"
                description="Structured courses for BSIT, BSCS, and BSIS with real-world projects and hands-on learning"
                features={["40+ Courses", "Real Projects", "Certificates", "Progress Tracking"]}
                gradient="from-blue-500 to-indigo-500"
                position="left"
                index={0}
              />

              <MilestoneCard
                icon="💻"
                title="Live Projects"
                description="Collaborate on real projects with classmates, build your portfolio, and gain practical experience"
                features={["Team Collaboration", "GitHub Integration", "Project Showcase", "Peer Review"]}
                gradient="from-indigo-500 to-purple-500"
                position="right"
                index={1}
              />

              <MilestoneCard
                icon="🤖"
                title="AI Mentor"
                description="Get instant help with code, debug errors, and learn concepts faster with AI-powered assistance"
                features={["24/7 Available", "Code Analysis", "Auto Enroll", "Smart Suggestions"]}
                gradient="from-purple-500 to-pink-500"
                position="left"
                index={2}
              />

              <MilestoneCard
                icon="👥"
                title="Community"
                description="Connect with fellow SNSU developers, share knowledge, and grow together"
                features={["Discussion Forums", "Code Sharing", "Events & Meetups", "Mentorship"]}
                gradient="from-pink-500 to-red-500"
                position="right"
                index={3}
              />
            </div>
          </div>
        </div>
      </section >

      {/* AI Automation Section */}
      < section id="ai-automation" className="relative z-10 py-32 px-4" >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollAnimateWrapper animateFrom="left">
              <div>
                <div className="inline-block bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-full px-4 py-2 mb-6">
                  <span className="text-sm text-indigo-300">Revolutionary AI Technology</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
                  AI That
                  <span className="block bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Works For You
                  </span>
                </h2>
                <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                  Our AI Mentor doesn't just answer questions—it automates your entire learning workflow.
                  Search courses, enroll, create projects, and post updates with simple natural language commands.
                </p>
                <div className="space-y-4">
                  <AIFeature
                    icon="🔍"
                    title="Smart Search"
                    description="'Find React courses' → AI finds, displays, and enrolls you instantly"
                  />
                  <AIFeature
                    icon="🚀"
                    title="Auto Projects"
                    description="'Create a todo app' → AI generates and creates your project"
                  />
                  <AIFeature
                    icon="✍️"
                    title="Content Generation"
                    description="'Write a post' → AI writes and publishes for you"
                  />
                </div>
              </div>
            </ScrollAnimateWrapper>

            <ScrollAnimateWrapper animateFrom="right">
              <div className="relative">
                <div className="relative bg-slate-950/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8">
                  <div className="space-y-4">
                    <ChatMessage
                      type="user"
                      message="Find React courses"
                      delay="0"
                    />
                    <ChatMessage
                      type="ai"
                      message="🔍 Found 2 React courses! Would you like to enroll?"
                      delay="1000"
                    />
                    <ChatMessage
                      type="user"
                      message="Enroll me"
                      delay="2000"
                    />
                    <ChatMessage
                      type="ai"
                      message="🎉 You're enrolled! Let's start Module 1..."
                      delay="3000"
                    />
                  </div>
                </div>
              </div>
            </ScrollAnimateWrapper>
          </div>
        </div>
      </section >

      {/* Testimonials Section */}
      < section id="testimonials" className="relative z-10 py-32 px-4" >
        <div className="max-w-7xl mx-auto">
          <ScrollAnimateWrapper>
            <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
                Loved by
                <span className="block bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  SNSU Students
                </span>
              </h2>
            </div>
          </ScrollAnimateWrapper>

          <div className="grid md:grid-cols-3 gap-8">
            <ScrollAnimateWrapper delay={0}>
              <TestimonialCard
                name="Senjai Arbois"
                role="BSCS 3rd Year"
                message="The AI mentor helped me understand complex algorithms! The platform's learning paths are perfectly structured for our curriculum."
                avatar="👨‍💻"
              />
            </ScrollAnimateWrapper>
            <ScrollAnimateWrapper delay={200}>
              <TestimonialCard
                name="Loyloy Becera"
                role="BSCS 3rd Year"
                message="Amazing platform! I went from struggling with React to building full-stack applications. The project collaboration features are game-changing!"
                avatar="👨‍🎓"
              />
            </ScrollAnimateWrapper>
            <ScrollAnimateWrapper delay={400}>
              <TestimonialCard
                name="Yombot"
                role="BSCS 3rd Year"
                message="The community is incredibly supportive! Got instant help with my coding problems and made great friends. This platform is perfect for SNSU students!"
                avatar="👨‍💼"
              />
            </ScrollAnimateWrapper>
          </div>
        </div>
      </section >

      {/* CTA Section */}
      < section className="relative z-10 py-32 px-4" >
        <ScrollAnimateWrapper>
          <div className="max-w-4xl mx-auto text-center">
            <div className="relative">
              <div className="relative bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-3xl p-12">
                <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
                  Ready to Start Your
                  <span className="block bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Coding Journey?
                  </span>
                </h2>
                <p className="text-xl text-slate-300 mb-8">
                  Join 1000+ SNSU CCIS students already learning smarter with AI
                </p>
                <Link
                  to="/register"
                  className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-lg font-bold hover:from-indigo-500 hover:to-purple-500 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/50"
                >
                  <span>Start Learning Now</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </ScrollAnimateWrapper>
      </section >

      {/* Footer */}
      < footer className="relative z-10 border-t border-slate-800 py-12 px-4" >
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src="/logo/ccis-logo.svg" alt="CCIS" className="w-6 h-6" />
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  CCIS CodeHub
                </span>
              </div>
              <p className="text-slate-400 text-sm">
                Empowering SNSU CCIS students with AI-powered learning
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-3">Platform</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link to="/learning" className="hover:text-indigo-400 transition">Learning</Link></li>
                <li><Link to="/projects" className="hover:text-indigo-400 transition">Projects</Link></li>
                <li><Link to="/community" className="hover:text-indigo-400 transition">Community</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-3">Resources</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-indigo-400 transition">Documentation</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition">Tutorials</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition">API</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-3">Connect</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </a>
                <a href="#" className="text-slate-400 hover:text-indigo-400 transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2025 CCIS CodeHub. Built with ❤️ for SNSU Students.</p>
          </div>
        </div>
      </footer >
    </div >
  )
}

// Components
function CounterStat({ end, suffix, label }: { end: number; suffix?: string; label: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  // Animate when end value is available and > 0
  useEffect(() => {
    if (end > 0) {
      setCount(0) // Reset before animating
      let start = 0
      const duration = 2000
      const increment = end / (duration / 16)

      const timer = setInterval(() => {
        start += increment
        if (start >= end) {
          setCount(end)
          clearInterval(timer)
        } else {
          setCount(Math.floor(start))
        }
      }, 16)

      return () => clearInterval(timer)
    }
  }, [end])

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
        {count}{suffix}
      </div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  )
}

function MilestoneCard({ icon, title, description, features, gradient, position, index }: {
  icon: string;
  title: string;
  description: string;
  features: string[];
  gradient: string;
  position: 'left' | 'right';
  index: number;
}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 200)
        } else {
          setIsVisible(false)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [index])

  return (
    <div
      ref={ref}
      className={`relative grid lg:grid-cols-2 gap-8 items-center transition-all duration-700 ${isVisible
        ? 'opacity-100 translate-x-0'
        : `opacity-0 ${position === 'left' ? '-translate-x-20' : 'translate-x-20'}`
        }`}
    >
      {/* Content - Left Side */}
      <div className={`${position === 'right' ? 'lg:order-2' : ''}`}>
        <div className="group relative bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 hover:border-slate-500/50 transition-all duration-300">

          <div className="relative">
            <div className="flex items-center space-x-4 mb-6">
              <div className={`text-6xl transform group-hover:scale-110 transition-transform`}>
                {icon}
              </div>
              <div className="h-16 w-1 bg-slate-700/50 rounded-full"></div>
            </div>

            <h3 className="text-3xl font-black text-white mb-4 group-hover:text-slate-200 transition-all">
              {title}
            </h3>

            <p className="text-slate-300 leading-relaxed mb-6 text-lg">
              {description}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 text-sm text-slate-400 group-hover:text-indigo-400 transition-colors"
                >
                  <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Dot - Center */}
      <div className={`hidden lg:block absolute left-1/2 transform -translate-x-1/2 ${isVisible ? 'scale-100' : 'scale-0'
        } transition-transform duration-500`}>
        <div className="relative">
          <div className={`w-8 h-8 bg-gradient-to-br ${gradient} rounded-full border-4 border-slate-950 shadow-lg`}></div>
          <div className={`absolute inset-0 w-8 h-8 bg-gradient-to-br ${gradient} rounded-full animate-ping opacity-75`}></div>
        </div>
      </div>

      {/* Visual Element - Right Side */}
      <div className={`${position === 'left' ? 'lg:order-2' : ''}`}>
        <div className="relative h-64 lg:h-80">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 flex items-center justify-center">
            <div className={`text-9xl transform group-hover:scale-110 transition-transform ${isVisible ? 'scale-100 rotate-0' : 'scale-50 rotate-45'
              } transition-all duration-700`}>
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AIFeature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start space-x-4 p-4 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-700/50 hover:border-slate-500/50 transition-colors">
      <div className="text-3xl">{icon}</div>
      <div>
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  )
}

function ChatMessage({ type, message, delay }: { type: 'user' | 'ai'; message: string; delay: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), parseInt(delay))
    return () => clearTimeout(timer)
  }, [delay])

  if (!visible) return null

  return (
    <div className={`flex ${type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}>
      <div className={`max-w-[80%] p-4 rounded-2xl backdrop-blur-md ${type === 'user'
        ? 'bg-slate-900/50 border border-slate-700/50'
        : 'bg-slate-900/50 border border-slate-700/50'
        }`}>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  )
}

// Replaced with Framer Motion version
function ScrollAnimateWrapper({ children, animateFrom = 'bottom', delay = 0 }: {
  children: React.ReactNode;
  animateFrom?: 'left' | 'right' | 'bottom' | 'top';
  delay?: number;
}) {
  const getInitial = () => {
    switch (animateFrom) {
      case 'left': return { opacity: 0, x: -50 }
      case 'right': return { opacity: 0, x: 50 }
      case 'top': return { opacity: 0, y: -50 }
      case 'bottom': return { opacity: 0, y: 50 }
      default: return { opacity: 0, y: 50 }
    }
  }

  return (
    <motion.div
      initial={getInitial()}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: false, margin: "-100px" }}
      transition={{ duration: 0.8, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  )
}


function TestimonialCard({ name, role, message, avatar }: {
  name: string;
  role: string;
  message: string;
  avatar: string;
}) {
  return (
    <div className="group bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 hover:border-slate-500/50 transition-all transform hover:-translate-y-2">
      <div className="text-5xl mb-4">{avatar}</div>
      <p className="text-slate-300 mb-6 leading-relaxed italic">"{message}"</p>
      <div>
        <div className="font-semibold text-white">{name}</div>
        <div className="text-sm text-indigo-400">{role}</div>
      </div>
    </div>
  )
}
