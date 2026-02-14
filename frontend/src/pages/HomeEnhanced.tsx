import { Link } from 'react-router-dom'
import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Code2, Bot, Users, Search, Rocket, Pencil } from 'lucide-react'
import Hyperspeed from '../components/backgrounds/Hyperspeed'
import { usePublicStats } from '../hooks/useApiCache'

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

  // Use cached public stats
  const { data: statsData } = usePublicStats()
  const stats: PlatformStats = statsData || { total_users: 0, total_courses: 0, total_projects: 0 }

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

      {/* Navigation - Minimal */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo/ccis-logo.png" alt="CCIS" className="w-8 h-8" />
              <span className="text-xl font-semibold text-white">CCIS CodeHub</span>
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Minimal Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-slate-300">SNSU CCIS Learning Platform</span>
          </motion.div>

          {/* Main Heading - Clean & Minimal */}
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="block text-white">Learn. Build.</span>
            <span className="block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Grow.
            </span>
          </motion.h1>

          {/* Subtitle - Simple & Clean */}
          <motion.p
            className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Master programming with structured courses, hands-on projects,
            and AI-powered mentoring designed for CCIS students.
          </motion.p>

          {/* CTA Buttons - Minimal Style */}
          <motion.div
            className="flex flex-col sm:flex-row justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link
              to="/register"
              className="px-8 py-3.5 text-base font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
            >
              Get Started — It's Free
            </Link>

            <Link
              to="/learning"
              className="px-8 py-3.5 text-base font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
            >
              Browse Courses
            </Link>
          </motion.div>

          {/* Stats - Clean Minimal Design */}
          <motion.div
            className="flex flex-wrap justify-center gap-12 sm:gap-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white">{stats.total_users}+</div>
              <div className="text-sm text-slate-500 mt-1">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white">{stats.total_courses}+</div>
              <div className="text-sm text-slate-500 mt-1">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white">{stats.total_projects}+</div>
              <div className="text-sm text-slate-500 mt-1">Projects</div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-slate-700 flex justify-center pt-2"
          >
            <div className="w-1 h-2 bg-slate-500 rounded-full" />
          </motion.div>
        </div>
      </section >

      {/* Features Section */}
      < section id="features" className="relative z-10 py-24 px-4" >
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Everything you need
            </h2>
            <p className="text-lg text-slate-400">
              Tools and features designed for CCIS students
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            <MilestoneCard
              icon={<BookOpen className="w-8 h-8 text-indigo-400" />}
              title="Learning Paths"
              description="Structured courses for BSIT, BSCS, and BSIS with real-world projects"
              features={["40+ Courses", "Certificates", "Progress Tracking"]}
              gradient="from-blue-500 to-indigo-500"
              position="left"
              index={0}
            />

            <MilestoneCard
              icon={<Code2 className="w-8 h-8 text-cyan-400" />}
              title="Live Projects"
              description="Collaborate on real projects and build your portfolio"
              features={["GitHub Integration", "Team Work", "Peer Review"]}
              gradient="from-indigo-500 to-purple-500"
              position="right"
              index={1}
            />

            <MilestoneCard
              icon={<Bot className="w-8 h-8 text-purple-400" />}
              title="AI Mentor"
              description="Get instant help with code and learn concepts faster"
              features={["24/7 Available", "Code Analysis", "Smart Suggestions"]}
              gradient="from-purple-500 to-pink-500"
              position="left"
              index={2}
            />

            <MilestoneCard
              icon={<Users className="w-8 h-8 text-pink-400" />}
              title="Community"
              description="Connect with fellow developers and grow together"
              features={["Forums", "Code Sharing", "Mentorship"]}
              gradient="from-pink-500 to-red-500"
              position="right"
              index={3}
            />
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
                    icon={<Search className="w-7 h-7 text-indigo-400" />}
                    title="Smart Search"
                    description="'Find React courses' → AI finds, displays, and enrolls you instantly"
                  />
                  <AIFeature
                    icon={<Rocket className="w-7 h-7 text-purple-400" />}
                    title="Auto Projects"
                    description="'Create a todo app' → AI generates and creates your project"
                  />
                  <AIFeature
                    icon={<Pencil className="w-7 h-7 text-pink-400" />}
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
                  Join {stats.total_users > 0 ? `${stats.total_users}+` : ''} SNSU CCIS students already learning smarter with AI
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-lg font-bold hover:from-indigo-500 hover:to-purple-500 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/50"
                  >
                    <span>Start Learning Now</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <a
                    href="/app/ccis-codehub.apk"
                    download
                    className="inline-flex items-center justify-center space-x-2 px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-lg font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>Get the App</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
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
                <img src="/logo/ccis-logo.png" alt="CCIS" className="w-6 h-6" />
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

function MilestoneCard({ icon, title, description, features, index }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  gradient?: string;
  position?: 'left' | 'right';
  index: number;
}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), index * 100)
        }
      },
      { threshold: 0.2 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [index])

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
    >
      <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6 hover:border-slate-700/50 transition-colors">
        {/* Icon & Title Row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 bg-slate-800/50 rounded-lg">{icon}</div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>

        {/* Description */}
        <p className="text-slate-400 mb-5 leading-relaxed">{description}</p>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          {features.map((feature, idx) => (
            <span
              key={idx}
              className="px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800/50 rounded-full"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function AIFeature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start space-x-4 p-4 bg-slate-900/50 backdrop-blur-md rounded-xl border border-slate-700/50 hover:border-slate-500/50 transition-colors">
      <div className="p-2 bg-slate-800/50 rounded-lg shrink-0">{icon}</div>
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
