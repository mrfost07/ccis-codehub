import { Link } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import {
  BookOpen, Code2, Bot, Users, Search, Rocket, Pencil,
  ArrowRight, Download, Sparkles, Github, Twitter, Heart, Quote, Check,
  Menu, X, GraduationCap, Trophy, ChevronDown, Layers, Network, LineChart,
} from 'lucide-react'
import { usePublicStats } from '../hooks/useApiCache'

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, ScrambleTextPlugin, DrawSVGPlugin)

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface PlatformStats {
  total_users: number
  total_courses: number
  total_projects: number
}

const MARQUEE_ITEMS = [
  'Python', 'JavaScript', 'React', 'Django', 'Data Structures',
  'Algorithms', 'Machine Learning', 'Git', 'SQL', 'TypeScript',
  'Node.js', 'Cloud', 'Networking', 'Cybersecurity',
]

const GRADIENT_CHAR_CLASSES = ['bg-gradient-to-br', 'from-purple-200', 'via-purple-400', 'to-purple-600', 'bg-clip-text', 'text-transparent']

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#programs', label: 'Programs' },
  { href: '#ai-automation', label: 'AI Mentor' },
  { href: '#faq', label: 'FAQ' },
]

const PROGRAMS = [
  {
    code: 'BSIT',
    name: 'Information Technology',
    blurb: 'Build and ship real systems — web apps, networks, and the infrastructure behind them.',
    topics: ['Web Development', 'Networking', 'Databases', 'Cloud'],
    icon: Network,
  },
  {
    code: 'BSCS',
    name: 'Computer Science',
    blurb: 'Go deep on the theory that makes great engineers — algorithms, AI, and systems thinking.',
    topics: ['Algorithms', 'Data Structures', 'Machine Learning', 'Theory'],
    icon: Layers,
  },
  {
    code: 'BSIS',
    name: 'Information Systems',
    blurb: 'Bridge tech and business — turn data into decisions organizations actually act on.',
    topics: ['Business Analytics', 'Data Modeling', 'ERP', 'Project Mgmt'],
    icon: LineChart,
  },
]

const STEPS = [
  { n: '01', title: 'Pick your path', body: 'Choose the track built for your program and year level.', icon: GraduationCap },
  { n: '02', title: 'Learn by doing', body: 'Work through modules, then prove it in the code editor.', icon: Code2 },
  { n: '03', title: 'Get unstuck fast', body: 'Your AI mentor reviews code and explains the why, 24/7.', icon: Bot },
  { n: '04', title: 'Earn your proof', body: 'Finish with certificates and a portfolio of real projects.', icon: Trophy },
]

const FAQS = [
  {
    q: 'Is CCIS CodeHub really free for students?',
    a: 'Yes. Every course, coding challenge, and AI mentor feature is free for SNSU CCIS students — just sign up with your student account.',
  },
  {
    q: 'Do I need programming experience to start?',
    a: 'No. Paths begin at absolute beginner and build up gradually, so first-years start from the fundamentals while advanced students can jump ahead.',
  },
  {
    q: 'How does the AI mentor actually help?',
    a: 'It reviews your code, explains errors in plain language, and answers questions instantly — so a bug at 2 AM does not cost you a whole night.',
  },
  {
    q: 'Do the certificates mean anything?',
    a: 'Certificates are issued when you finish a path, and every project you build stays in your portfolio — something concrete to show during OJT and job applications.',
  },
  {
    q: 'Can my instructors track my progress?',
    a: 'Instructors can see enrollment and progress for their own paths, run live quizzes, and give feedback on submitted work.',
  },
]

export default function HomeEnhanced() {
  const root = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: statsData } = usePublicStats()
  const stats: PlatformStats = statsData || { total_users: 0, total_courses: 0, total_projects: 0 }

  // Escape closes the mobile menu. Without it the only way out is the same
  // button that opened it, which is off in the corner of the bar.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  // ScrollSmoother turns <body> into a tall scroll element while our dark
  // wrapper is pinned one-screen tall — so the body's default (white) shows
  // through once you scroll. Paint the document root dark for this page and
  // restore it on unmount so no white ever bleeds through.
  useLayoutEffect(() => {
    const prevHtml = document.documentElement.style.backgroundColor
    const prevBody = document.body.style.backgroundColor
    document.documentElement.style.backgroundColor = '#0a0a0a' // neutral-950
    document.body.style.backgroundColor = '#0a0a0a'
    return () => {
      document.documentElement.style.backgroundColor = prevHtml
      document.body.style.backgroundColor = prevBody
    }
  }, [])

  // ── Page-level GSAP choreography ──────────────────────────────────────────
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      const mm = gsap.matchMedia()

      // Reduced motion: reveal the gated hero immediately, nothing else moves.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(q('.gsap-gate'), { opacity: 1 })
      })

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const splits: SplitText[] = []

        // 0. Smooth inertial scrolling + data-speed/data-lag parallax layers.
        //    Fixed chrome (nav, progress, backdrop, grain) lives OUTSIDE the
        //    wrapper so it stays viewport-fixed while content glides.
        const smoother = ScrollSmoother.create({
          wrapper: '#smooth-wrapper',
          content: '#smooth-content',
          smooth: 1.15,
          effects: true,
          smoothTouch: false, // native feel on touch devices
        })

        // Route in-page anchors through the smoother so they glide, not jump.
        const rootEl = root.current as HTMLDivElement
        const onAnchorClick = (e: MouseEvent) => {
          const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null
          if (!a) return
          const target = a.hash && a.hash.length > 1 ? document.querySelector(a.hash) : null
          if (target) {
            e.preventDefault()
            smoother.scrollTo(target, true, 'top 96px')
          }
        }
        rootEl.addEventListener('click', onAnchorClick)

        // 1. Hero intro — per-character 3D flip-up + scramble-decoded badge.
        const heroSplit = new SplitText(q('[data-hero-line]'), {
          type: 'chars',
          charsClass: 'inline-block will-change-transform',
        })
        splits.push(heroSplit)
        heroSplit.chars.forEach((c) => {
          if ((c as HTMLElement).closest('[data-gradient-line]')) {
            (c as HTMLElement).classList.add(...GRADIENT_CHAR_CLASSES)
          }
        })
        gsap.set(heroSplit.chars, {
          yPercent: 130, rotationX: -80, opacity: 0,
          transformOrigin: '50% 100%', transformPerspective: 700,
        })

        const badge = q('[data-scramble]')[0] as HTMLElement | undefined
        const badgeText = badge?.dataset.scramble || ''

        const intro = gsap.timeline({ defaults: { ease: 'power4.out' } })
        intro
          .to(q('.gsap-gate'), { opacity: 1, duration: 0.01 })
          .from(q('[data-nav]'), { yPercent: -100, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0)
          .to(heroSplit.chars, { yPercent: 0, rotationX: 0, opacity: 1, duration: 1.15, stagger: 0.022 }, 0.1)
          .from(q('[data-hero-fade]'), { y: 26, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.55)
        if (badge && badgeText) {
          intro.to(badge, {
            duration: 1.4,
            scrambleText: { text: badgeText, chars: '01<>/{}[]#$_', speed: 0.4 },
          }, 0.3)
        }

        // 2. Nav hide-on-scroll-down, return-on-scroll-up.
        const nav = q('[data-nav]')[0]
        ScrollTrigger.create({
          start: 'top top', end: 'max',
          onUpdate: (self) => {
            const down = self.direction === 1 && self.scroll() > 320
            gsap.to(nav, { yPercent: down ? -100 : 0, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
          },
        })

        // 3. Hero content parallax + fade on scroll-out (indicator fades too).
        gsap.to(q('[data-hero-parallax]'), {
          yPercent: -12, opacity: 0, ease: 'none',
          scrollTrigger: { trigger: q('[data-hero]')[0], start: 'top top', end: 'bottom top', scrub: true },
        })
        gsap.to(q('[data-scroll-hint]'), {
          opacity: 0, ease: 'none',
          scrollTrigger: { trigger: q('[data-hero]')[0], start: 'top top', end: '25% top', scrub: true },
        })

        // 4. Aurora orbs — slow drift loops (parallax comes from data-speed wrappers).
        q('[data-orb]').forEach((orb, i) => {
          gsap.to(orb, {
            xPercent: i % 2 ? 12 : -10,
            yPercent: i % 2 ? -14 : 10,
            scale: 1.15,
            duration: 9 + i * 3,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
          })
        })

        // 5. Scroll-progress bar under the nav.
        gsap.fromTo(q('[data-progress]'),
          { scaleX: 0 },
          {
            scaleX: 1, transformOrigin: 'left center', ease: 'none',
            scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
          })

        // 6. Cursor-following glow inside the hero (desktop pointers only).
        const glow = q('[data-cursor-glow]')[0] as HTMLElement | undefined
        const hero = q('[data-hero]')[0] as HTMLElement | undefined
        let onMove: ((e: MouseEvent) => void) | undefined
        if (glow && hero && window.matchMedia('(pointer: fine)').matches) {
          const gx = gsap.quickTo(glow, 'x', { duration: 0.6, ease: 'power3' })
          const gy = gsap.quickTo(glow, 'y', { duration: 0.6, ease: 'power3' })
          onMove = (e: MouseEvent) => {
            const r = hero.getBoundingClientRect()
            gx(e.clientX - r.left - 300)
            gy(e.clientY - r.top - 300)
          }
          hero.addEventListener('mousemove', onMove)
          gsap.to(glow, { opacity: 1, duration: 1.2, delay: 0.4 })
        }

        // 7. Section headlines — masked word reveals (plain-text headings only).
        q('[data-split-words]').forEach((h) => {
          const sw = new SplitText(h, { type: 'lines,words', linesClass: 'line-mask', wordsClass: 'inline-block will-change-transform' })
          splits.push(sw)
          gsap.set(sw.words, { yPercent: 120 })
          ScrollTrigger.create({
            trigger: h, start: 'top 85%', once: true,
            onEnter: () => gsap.to(sw.words, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.06 }),
          })
        })

        // 8. Hand-drawn SVG underlines, stroked in on arrival.
        q('[data-underline] path').forEach((path) => {
          gsap.set(path, { drawSVG: '0%' })
          ScrollTrigger.create({
            trigger: path, start: 'top 88%', once: true,
            onEnter: () => gsap.to(path, { drawSVG: '100%', duration: 0.9, ease: 'power2.inOut', delay: 0.25 }),
          })
        })

        // 8b. "How it works" connector — draws left-to-right across the steps.
        q('[data-draw-line] path').forEach((path) => {
          gsap.set(path, { drawSVG: '0%' })
          ScrollTrigger.create({
            trigger: path, start: 'top 80%', once: true,
            onEnter: () => gsap.to(path, { drawSVG: '100%', duration: 1.4, ease: 'power2.inOut' }),
          })
        })

        // 9. Generic scroll reveals (batched, staggered per row).
        const reveals = q('[data-reveal]')
        gsap.set(reveals, { y: 30, autoAlpha: 0 })
        ScrollTrigger.batch(reveals, {
          start: 'top 86%',
          onEnter: (batch) =>
            gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12, overwrite: true }),
        })

        // 10. Giant outlined divider type sweeping sideways with scroll.
        q('[data-scrub-text]').forEach((el, i) => {
          gsap.fromTo(el,
            { xPercent: i % 2 ? -18 : 2 },
            {
              xPercent: i % 2 ? 2 : -18, ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
            })
        })

        // 11. Footer mega-type rising from below the fold. End on 'bottom bottom'
        //     so it settles exactly when the page bottom is reached — otherwise
        //     the page runs out of scroll before the tween completes and the
        //     text is left pushed-down and clipped.
        const mega = q('[data-footer-mega]')[0]
        if (mega) {
          gsap.fromTo(mega,
            { yPercent: 28, opacity: 0.45 },
            {
              yPercent: 0, opacity: 1, ease: 'none',
              scrollTrigger: { trigger: mega, start: 'top bottom', end: 'bottom bottom', scrub: true },
            })
        }

        // 12. Velocity skew — cards shear slightly with fast scrolling, then settle.
        const skewEls = q('[data-skew]')
        if (skewEls.length) {
          const proxy = { skew: 0 }
          const setters = skewEls.map((el) => gsap.quickSetter(el, 'skewY', 'deg'))
          const clampSkew = gsap.utils.clamp(-3.5, 3.5)
          ScrollTrigger.create({
            onUpdate: (self) => {
              const skew = clampSkew(self.getVelocity() / -400)
              if (Math.abs(skew) > Math.abs(proxy.skew)) {
                proxy.skew = skew
                gsap.to(proxy, {
                  skew: 0, duration: 0.9, ease: 'power3', overwrite: true,
                  onUpdate: () => setters.forEach((s) => s(proxy.skew)),
                })
              }
            },
          })
        }

        // 13. Testimonials — alternating rotated rise.
        const cards = q('[data-testimonial]')
        gsap.set(cards, { y: 64, rotation: (i) => (i % 2 ? 3 : -3), autoAlpha: 0 })
        ScrollTrigger.batch(cards, {
          start: 'top 85%',
          onEnter: (batch) =>
            gsap.to(batch, { y: 0, rotation: 0, autoAlpha: 1, duration: 1, ease: 'power3.out', stagger: 0.14, overwrite: true }),
        })

        // 14. AI chat demo — plays only when scrolled into view.
        const msgs = q('[data-chat]')
        if (msgs.length) {
          gsap.set(msgs, { y: 16, autoAlpha: 0 })
          ScrollTrigger.create({
            trigger: q('[data-chat-card]')[0], start: 'top 72%', once: true,
            onEnter: () => gsap.to(msgs, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power2.out', stagger: 0.85 }),
          })
        }

        ScrollTrigger.refresh()

        return () => {
          rootEl.removeEventListener('click', onAnchorClick)
          if (hero && onMove) hero.removeEventListener('mousemove', onMove)
          splits.forEach((s) => s.revert())
          smoother.kill()
        }
      })

      // Pinned horizontal features rail — large screens only.
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const q = gsap.utils.selector(root)
        const section = q('[data-features]')[0] as HTMLElement | undefined
        const track = q('[data-feature-track]')[0] as HTMLElement | undefined
        const railProgress = q('[data-rail-progress]')[0] as HTMLElement | undefined
        if (!section || !track) return

        const getDistance = () => Math.max(0, track.scrollWidth - window.innerWidth)
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${getDistance()}`,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
          },
        })
        tl.to(track, { x: () => -getDistance(), ease: 'none' }, 0)
        if (railProgress) {
          tl.fromTo(railProgress, { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left center', ease: 'none' }, 0)
        }
      })
    }, root)

    // Recompute trigger positions once web fonts / lazy content settle.
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)
    document.fonts?.ready?.then(() => ScrollTrigger.refresh()).catch(() => { })

    return () => {
      window.removeEventListener('load', onLoad)
      ctx.revert()
    }
  }, [])

  return (
    <div ref={root} className="min-h-screen overflow-x-hidden bg-neutral-950 text-white">
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent">
        <div data-progress className="h-full w-full origin-left scale-x-0 bg-gradient-to-r from-purple-500 via-purple-400 to-purple-600" />
      </div>

      {/* Static backdrop — restrained purple glow + faint grid on near-black.
          Solid base so the fixed layer is always opaque dark regardless of
          how ScrollSmoother lays out the body. */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-neutral-950">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.16), transparent 70%)' }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            WebkitMaskImage: 'radial-gradient(70% 60% at 50% 0%, #000, transparent 80%)',
            maskImage: 'radial-gradient(70% 60% at 50% 0%, #000, transparent 80%)',
          }}
        />
      </div>

      {/* Film grain overlay */}
      <div aria-hidden className="grain fixed inset-[-100%] z-[55] pointer-events-none opacity-[0.05]" />

      {/*
        Navigation — floating glass pill.

        z-40, not z-50: z-50 is the modal layer (DESIGN_SYSTEM.md §6), and a
        sticky navbar belongs a tier below it. Visually inert here — the grain
        overlay above already paints over this nav either way.
      */}
      <nav data-nav className="fixed top-3 sm:top-4 inset-x-0 z-40 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="relative flex items-center justify-between gap-2 sm:gap-4 h-14 rounded-2xl border border-white/10 bg-neutral-950/70 backdrop-blur-xl px-3 sm:px-4 shadow-lg shadow-black/40">
            {/*
              min-w-0 + truncate rather than shrink-0. Both flex children were
              unshrinkable, so the row could only overflow: measured at 348px of
              content in a 288px pill on a 320px phone.
            */}
            <Link to="/" className="flex min-w-0 items-center gap-2">
              <img src="/logo/ccis-logo.png" alt="CCIS" className="w-8 h-8 shrink-0" />
              <span className="truncate text-base font-semibold tracking-tight text-white">CCIS CodeHub</span>
            </Link>

            {/*
              Center links (desktop). A flex sibling, not `absolute left-1/2`:
              centring an out-of-flow group means nothing stops it running into
              the actions, and at exactly 768px it did — FAQ's right edge landed
              20px inside the Login/Get Started group, so the two read as one
              jammed word and their hit areas overlapped. In flow the three
              groups divide the row and cannot collide at any width.

              lg, not md: in flow the row needs 711px at 768 and has 704, so md
              squeezed the logo to "CCIS Code…" and wrapped "AI Mentor" onto two
              lines. The overlap was the same shortfall, hidden by taking the
              links out of flow. 1024 leaves ~280px of slack; below it the links
              live in the dropdown, which is what the hamburger is for.
            */}
            <div className="hidden lg:flex flex-1 items-center justify-center gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="whitespace-nowrap px-3.5 py-2 text-sm text-neutral-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Link to="/login" className="hidden sm:inline-flex px-3.5 py-2 text-sm text-neutral-300 hover:text-white transition-colors">
                Login
              </Link>
              {/*
                Hidden on phones, where it was the widest thing in the bar and
                pushed the menu button's right edge to x=364 on a 320px screen —
                entirely offscreen, so the nav links could not be opened at all.
                The hero's "Start learning free" is the CTA at that width, and
                the dropdown below carries this one.
              */}
              <Link
                to="/register"
                className="group hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/25"
              >
                Get Started
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {/* Mobile menu toggle — h-11/w-11 for the §4 44px touch target. */}
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="lg:hidden -mr-1 inline-flex h-11 w-11 items-center justify-center text-neutral-300 hover:text-white transition-colors"
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          {menuOpen && (
            <div className="lg:hidden mt-2 rounded-2xl border border-white/10 bg-neutral-950/90 backdrop-blur-xl p-2 shadow-lg shadow-black/40">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-3 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  {l.label}
                </a>
              ))}
              {/*
                sm:hidden, matching the bar: above 640px the bar shows Login and
                Get Started itself, and this dropdown is still open up to md.
                Repeating them here would list each twice.
              */}
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block sm:hidden px-3 py-3 text-sm text-neutral-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex sm:hidden items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"
              >
                Get Started
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div id="smooth-wrapper">
        <div id="smooth-content">

          {/* Hero */}
          <section data-hero className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 pt-28 pb-24">
            {/* Aurora orbs (parallax wrappers carry data-speed) */}
            <div data-speed="0.85" className="pointer-events-none absolute -top-20 -left-24 z-0">
              <div
                data-orb
                className="h-[460px] w-[460px] rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.16), transparent 62%)' }}
              />
            </div>
            <div data-speed="1.15" className="pointer-events-none absolute bottom-0 -right-32 z-0">
              <div
                data-orb
                className="h-[520px] w-[520px] rounded-full blur-3xl"
                style={{ background: 'radial-gradient(circle, rgba(88,28,135,0.22), transparent 60%)' }}
              />
            </div>

            {/* cursor-follow glow */}
            <div
              data-cursor-glow
              className="pointer-events-none absolute top-0 left-0 h-[600px] w-[600px] rounded-full opacity-0 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18), transparent 60%)' }}
            />

            <div className="gsap-gate relative w-full max-w-5xl mx-auto">
              <div data-hero-parallax className="text-center">

                {/* Masthead rule — institution left, programs right */}
                <div data-hero-fade className="flex items-center justify-between gap-4 border-t border-white/10 pt-4 mb-16 sm:mb-20">
                  <span
                    data-scramble="SNSU · College of Computing & Information Sciences"
                    className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-neutral-500"
                  >
                    SNSU · College of Computing &amp; Information Sciences
                  </span>
                  <span className="hidden sm:block font-mono text-[11px] uppercase tracking-[0.22em] text-neutral-600 shrink-0">
                    BSIT / BSCS / BSIS
                  </span>
                </div>

                {/* Display headline — three stacked lines, centered */}
                <h1 className="font-bold tracking-[-0.035em] leading-[0.86] text-[clamp(3.25rem,9.5vw,7rem)]">
                  <span className="line-mask">
                    <span data-hero-line className="block text-white">Learn.</span>
                  </span>
                  <span className="line-mask">
                    <span data-hero-line className="block text-white">Build.</span>
                  </span>
                  <span className="line-mask">
                    <span data-hero-line data-gradient-line className="block pb-2">Grow.</span>
                  </span>
                </h1>

                <p data-hero-fade className="mx-auto mt-8 max-w-lg text-lg text-neutral-400 leading-relaxed">
                  Structured courses, hands-on projects, and an AI mentor that reads your
                  code and explains the why — built around the CCIS curriculum.
                </p>

                {/* One decisive CTA, one quiet link */}
                <div data-hero-fade className="mt-10 flex flex-col items-center gap-5">
                  <Magnetic>
                    <Link
                      to="/register"
                      className="group inline-flex items-center justify-center gap-2 px-9 py-4 text-base font-semibold text-white bg-purple-600 rounded-full hover:bg-purple-500 transition-colors shadow-xl shadow-purple-600/25"
                    >
                      Start learning free
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Magnetic>
                  <Link
                    to="/learning"
                    className="text-sm text-neutral-500 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    or browse the course catalog
                  </Link>
                </div>

                {/* Stats — thin centered row on a hairline */}
                <div data-hero-fade className="mt-16 sm:mt-20 border-t border-white/10 pt-6 flex justify-center gap-x-12 sm:gap-x-20">
                  <HeroStat end={stats.total_users} label="Students" />
                  <HeroStat end={stats.total_courses} label="Courses" />
                  <HeroStat end={stats.total_projects} label="Projects" />
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            <div data-scroll-hint className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2">
              <div className="w-6 h-10 rounded-full border-2 border-neutral-700 flex justify-center pt-2">
                <div className="w-1 h-2 bg-neutral-500 rounded-full animate-bounce" />
              </div>
            </div>
          </section>

          {/* Tech marquee */}
          <section className="relative z-10 py-8 border-y border-neutral-900">
            <Marquee items={MARQUEE_ITEMS} />
          </section>

          {/* Features — pinned horizontal rail on desktop, stacked grid on mobile */}
          <section data-features id="features" className="relative z-10">
            <div className="py-24 lg:py-0 lg:h-screen lg:flex lg:flex-col lg:justify-center lg:overflow-hidden">
              <div className="max-w-5xl mx-auto px-4 text-center mb-14 lg:mb-12">
                <h2 data-split-words className="text-3xl sm:text-4xl font-bold text-white mb-2">Everything you need</h2>
                <svg data-underline viewBox="0 0 220 12" className="mx-auto w-44 text-purple-500" fill="none" aria-hidden>
                  <path d="M4 9 C 58 2, 162 2, 216 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <p data-reveal className="text-lg text-neutral-400 mt-3">Tools and features designed for CCIS students</p>
              </div>

              <div
                data-feature-track
                className="max-w-5xl mx-auto px-4 grid sm:grid-cols-2 gap-6 lg:max-w-none lg:mx-0 lg:w-max lg:grid-cols-none lg:flex lg:gap-8 lg:px-[10vw] will-change-transform"
              >
                <FeatureCard index="01" icon={<BookOpen className="w-7 h-7 text-purple-400" />} title="Learning Paths"
                  description="Structured courses for BSIT, BSCS, and BSIS with real-world projects"
                  features={['40+ Courses', 'Certificates', 'Progress Tracking']} />
                <FeatureCard index="02" icon={<Code2 className="w-7 h-7 text-purple-400" />} title="Live Projects"
                  description="Collaborate on real projects and build your portfolio"
                  features={['GitHub Integration', 'Team Work', 'Peer Review']} />
                <FeatureCard index="03" icon={<Bot className="w-7 h-7 text-purple-400" />} title="AI Mentor"
                  description="Get instant help with code and learn concepts faster"
                  features={['24/7 Available', 'Code Analysis', 'Smart Suggestions']} />
                <FeatureCard index="04" icon={<Users className="w-7 h-7 text-purple-400" />} title="Community"
                  description="Connect with fellow developers and grow together"
                  features={['Forums', 'Code Sharing', 'Mentorship']} />
              </div>

              {/* Rail progress (desktop pin only) */}
              <div className="hidden lg:block max-w-xs mx-auto mt-12 h-px w-40 bg-neutral-800 overflow-hidden rounded-full">
                <div data-rail-progress className="h-full w-full origin-left scale-x-0 bg-purple-500" />
              </div>
            </div>
          </section>

          {/* Outlined scrub-type divider */}
          <section aria-hidden className="relative z-10 py-14 overflow-hidden select-none">
            <div data-scrub-text className="whitespace-nowrap text-[11vw] leading-none font-black tracking-tight outline-text will-change-transform">
              LEARN · BUILD · SHIP · LEARN · BUILD · SHIP ·
            </div>
          </section>

          {/* Programs */}
          <section id="programs" className="relative z-10 py-24 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <span data-reveal className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-5">
                  <GraduationCap className="w-4 h-4" /> For every CCIS program
                </span>
                <h2 data-split-words className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
                  Find the path that fits you
                </h2>
                <p data-reveal className="text-lg text-neutral-400 max-w-2xl mx-auto">
                  Curriculum-aligned tracks for each degree — so what you learn here counts where it matters.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                {PROGRAMS.map((p) => <ProgramCard key={p.code} {...p} />)}
              </div>
            </div>
          </section>

          {/* AI Automation */}
          <section id="ai-automation" className="relative z-10 py-28 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div data-reveal className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 mb-6">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    <span className="text-sm text-purple-300">Revolutionary AI Technology</span>
                  </div>
                  <h2 data-reveal className="text-4xl sm:text-5xl font-bold text-white mb-2">
                    AI That
                    <span className="block bg-gradient-to-br from-purple-200 via-purple-400 to-purple-600 bg-clip-text text-transparent pb-1">
                      Works For You
                    </span>
                  </h2>
                  <svg data-underline viewBox="0 0 220 12" className="w-40 text-purple-500 mb-5" fill="none" aria-hidden>
                    <path d="M4 8 C 46 3, 100 10, 216 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  <p data-reveal className="text-xl text-neutral-300 mb-8 leading-relaxed">
                    Our AI Mentor doesn't just answer questions — it automates your entire learning workflow.
                    Search courses, enroll, create projects, and post updates with simple natural-language commands.
                  </p>
                  <div className="space-y-4">
                    <div data-reveal>
                      <AIFeature icon={<Search className="w-6 h-6 text-purple-400" />} title="Smart Search"
                        description="'Find React courses' → AI finds, displays, and enrolls you instantly" />
                    </div>
                    <div data-reveal>
                      <AIFeature icon={<Rocket className="w-6 h-6 text-purple-400" />} title="Auto Projects"
                        description="'Create a todo app' → AI generates and creates your project" />
                    </div>
                    <div data-reveal>
                      <AIFeature icon={<Pencil className="w-6 h-6 text-purple-400" />} title="Content Generation"
                        description="'Write a post' → AI writes and publishes for you" />
                    </div>
                  </div>
                </div>

                <div data-reveal data-lag="0.25">
                  <div data-chat-card data-skew className="relative bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 sm:p-8">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-neutral-800">
                      <Bot className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-medium text-white">AI Mentor</span>
                      <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Online
                      </span>
                    </div>
                    <div className="space-y-3">
                      <ChatBubble type="user" text="Find React courses" />
                      <ChatBubble type="ai" icon={<Search className="w-3.5 h-3.5" />} text="Found 2 React courses! Would you like to enroll?" />
                      <ChatBubble type="user" text="Enroll me" />
                      <ChatBubble type="ai" icon={<Check className="w-3.5 h-3.5" />} text="You're enrolled! Let's start Module 1..." />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="relative z-10 py-24 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <span data-reveal className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-neutral-300 mb-5">
                  <Rocket className="w-4 h-4 text-purple-400" /> From zero to shipped
                </span>
                <h2 data-split-words className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
                  How it works
                </h2>
                <p data-reveal className="text-lg text-neutral-400">Four steps. No guesswork.</p>
              </div>

              <div className="relative">
                {/* Connecting line (desktop) — drawn in on arrival */}
                <svg
                  data-draw-line aria-hidden
                  className="hidden lg:block absolute left-0 right-0 top-[38px] w-full text-purple-500/30"
                  viewBox="0 0 1000 2" preserveAspectRatio="none" fill="none"
                >
                  <path d="M60 1 H 940" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" strokeLinecap="round" />
                </svg>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
                  {STEPS.map((s) => <StepCard key={s.n} {...s} />)}
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section id="testimonials" className="relative z-10 py-28 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 data-reveal className="text-4xl sm:text-5xl font-bold text-white">
                  Loved by
                  <span className="block bg-gradient-to-br from-purple-200 via-purple-400 to-purple-600 bg-clip-text text-transparent pb-1">
                    SNSU Students
                  </span>
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <TestimonialCard name="Senjai Arbois" role="BSCS 3rd Year"
                  message="The AI mentor helped me understand complex algorithms! The learning paths are perfectly structured for our curriculum." />
                <TestimonialCard name="Loyloy Becera" role="BSCS 3rd Year"
                  message="Amazing platform! I went from struggling with React to building full-stack applications. The collaboration features are game-changing." />
                <TestimonialCard name="Yombot" role="BSCS 3rd Year"
                  message="The community is incredibly supportive! Got instant help with my coding problems and made great friends along the way." />
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="relative z-10 py-24 px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 data-split-words className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3">
                  Questions, answered
                </h2>
                <p data-reveal className="text-lg text-neutral-400">
                  Everything you need to know before you start.
                </p>
              </div>

              <div className="space-y-3">
                {FAQS.map((f, i) => <FaqItem key={f.q} {...f} defaultOpen={i === 0} />)}
              </div>

              <p data-reveal className="text-center text-neutral-500 text-sm mt-10">
                Still curious?{' '}
                <Link to="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
                  Create a free account
                </Link>{' '}
                and look around.
              </p>
            </div>
          </section>

          {/* CTA */}
          <section className="relative z-10 py-28 px-4">
            <div data-reveal className="max-w-4xl mx-auto text-center">
              <div className="relative bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-3xl p-8 sm:p-12 overflow-hidden">
                <div aria-hidden className="border-beam" />
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                  Ready to Start Your
                  <span className="block bg-gradient-to-br from-purple-200 via-purple-400 to-purple-600 bg-clip-text text-transparent pb-1">
                    Coding Journey?
                  </span>
                </h2>
                <p className="text-xl text-neutral-300 mb-8">
                  Join {stats.total_users > 0 ? `${stats.total_users}+ ` : ''}SNSU CCIS students already learning smarter with AI
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Magnetic>
                    <Link
                      to="/register"
                      className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 rounded-xl text-lg font-semibold text-white hover:bg-purple-500 transition-colors"
                    >
                      Start Learning Now
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Magnetic>
                  <Magnetic>
                    <a
                      href="/app/ccis-codehub.apk"
                      download
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-lg font-semibold text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      Get the App
                    </a>
                  </Magnetic>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="relative z-10 border-t border-neutral-800 pt-12 px-4 overflow-hidden">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-4 gap-8 mb-8">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <img src="/logo/ccis-logo.png" alt="CCIS" className="w-6 h-6" />
                    <span className="text-xl font-bold text-white">CCIS CodeHub</span>
                  </div>
                  <p className="text-neutral-400 text-sm">Empowering SNSU CCIS students with AI-powered learning</p>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-3">Platform</h3>
                  <ul className="space-y-2 text-neutral-400 text-sm">
                    <li><Link to="/learning" className="hover:text-purple-400 transition-colors">Learning</Link></li>
                    <li><Link to="/projects" className="hover:text-purple-400 transition-colors">Projects</Link></li>
                    <li><Link to="/community" className="hover:text-purple-400 transition-colors">Community</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-3">Resources</h3>
                  <ul className="space-y-2 text-neutral-400 text-sm">
                    <li><a href="#features" className="hover:text-purple-400 transition-colors">Features</a></li>
                    <li><a href="#programs" className="hover:text-purple-400 transition-colors">Programs</a></li>
                    <li><a href="#ai-automation" className="hover:text-purple-400 transition-colors">AI Mentor</a></li>
                    <li><a href="#how-it-works" className="hover:text-purple-400 transition-colors">How it works</a></li>
                    <li><a href="#faq" className="hover:text-purple-400 transition-colors">FAQ</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-3">Connect</h3>
                  <div className="flex space-x-3">
                    <a href="#" aria-label="Twitter" className="text-neutral-400 hover:text-purple-400 transition-colors"><Twitter className="w-5 h-5" /></a>
                    <a href="#" aria-label="GitHub" className="text-neutral-400 hover:text-purple-400 transition-colors"><Github className="w-5 h-5" /></a>
                  </div>
                </div>
              </div>
              <div className="border-t border-neutral-800 pt-8 text-center text-neutral-500 text-sm flex items-center justify-center gap-1.5">
                <span>&copy; 2025 CCIS CodeHub. Built with</span>
                <Heart className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
                <span>for SNSU Students.</span>
              </div>
            </div>

            {/* Footer mega-type — leading-[0.95] + pb give the caps room so the
                overflow-hidden rise-mask never crops the bottom of the letters. */}
            <div aria-hidden className="mt-8 pb-6 select-none overflow-hidden">
              <div data-footer-mega className="text-center whitespace-nowrap text-[11vw] leading-[0.95] font-black tracking-tight outline-text-purple will-change-transform">
                CCIS CODEHUB
              </div>
            </div>
          </footer>

        </div>
      </div>
    </div>
  )
}

/* ───────────────────────────── Sub-components ───────────────────────────── */

// Magnetic hover — pulls the wrapped element toward the cursor (fine pointers).
function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReduced() || !window.matchMedia('(pointer: fine)').matches) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' })
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * 0.35)
      yTo((e.clientY - (r.top + r.height / 2)) * 0.35)
    }
    const leave = () => { xTo(0); yTo(0) }
    el.addEventListener('mousemove', move)
    el.addEventListener('mouseleave', leave)
    return () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave) }
  }, [])
  return <div ref={ref} className="inline-block">{children}</div>
}

// Count-up number that animates the first time it scrolls into view.
function HeroStat({ end, label }: { end: number; label: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !end) return
    if (prefersReduced()) { el.textContent = String(end); return }
    let done = false
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !done) {
        done = true
        const obj = { v: 0 }
        gsap.to(obj, {
          v: end, duration: 1.8, ease: 'power2.out',
          onUpdate: () => { el.textContent = Math.floor(obj.v).toLocaleString() },
        })
      }
    }, { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [end])
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums leading-none tracking-tight">
        <span ref={ref}>0</span><span className="text-purple-500">+</span>
      </div>
      <div className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500">{label}</div>
    </div>
  )
}

// Velocity-reactive seamless marquee.
function Marquee({ items }: { items: string[] }) {
  const wrap = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (prefersReduced()) return
    const ctx = gsap.context(() => {
      const loop = gsap.timeline({ repeat: -1 })
        .to(track.current, { xPercent: -50, duration: 30, ease: 'none' })
      let target = 1
      const st = ScrollTrigger.create({
        trigger: wrap.current, start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => { target = 1 + Math.min(Math.abs(self.getVelocity()) / 180, 7) },
      })
      const tick = () => {
        loop.timeScale(gsap.utils.interpolate(loop.timeScale(), target, 0.08))
        target = gsap.utils.interpolate(target, 1, 0.03)
      }
      gsap.ticker.add(tick)
      return () => { gsap.ticker.remove(tick); st.kill(); loop.kill() }
    }, wrap)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={wrap} className="marquee-mask overflow-hidden">
      <div ref={track} className="flex w-max items-center gap-8 pr-8">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-8 shrink-0">
            <span className="text-lg font-medium text-neutral-500 whitespace-nowrap">{item}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Feature card with a subtle 3D tilt toward the cursor.
function FeatureCard({ index, icon, title, description, features }: {
  index: string
  icon: React.ReactNode
  title: string
  description: string
  features: string[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el || prefersReduced() || !window.matchMedia('(pointer: fine)').matches) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    gsap.to(el, { rotateY: px * 6, rotateX: -py * 6, duration: 0.4, ease: 'power2.out', transformPerspective: 900 })
  }
  const onLeave = () => {
    if (ref.current) gsap.to(ref.current, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' })
  }
  return (
    <div data-reveal className="tilt-perspective lg:w-[400px] lg:shrink-0">
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="group relative h-full bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-6 hover:border-purple-500/40 transition-colors"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <span className="absolute top-5 right-6 text-xs font-mono text-neutral-700 group-hover:text-purple-500/70 transition-colors">{index}</span>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2.5 bg-neutral-800/60 rounded-lg group-hover:bg-purple-500/10 transition-colors">{icon}</div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
        <p className="text-neutral-400 mb-5 leading-relaxed">{description}</p>
        <div className="flex flex-wrap gap-2">
          {features.map((f) => (
            <span key={f} className="px-3 py-1 text-xs font-medium text-neutral-300 bg-neutral-800/60 rounded-full">{f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// Degree-program card with a hover sheen and topic chips.
function ProgramCard({ code, name, blurb, topics, icon: Icon }: {
  code: string
  name: string
  blurb: string
  topics: string[]
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div data-reveal data-skew className="group relative h-full overflow-hidden rounded-2xl border border-neutral-800/70 bg-neutral-900/40 p-6 transition-colors hover:border-purple-500/40 will-change-transform">
      {/* hover sheen */}
      <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(139,92,246,0.12), transparent 60%)' }} />

      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <span className="rounded-lg border border-purple-500/25 bg-purple-500/10 px-2.5 py-1 font-mono text-xs font-semibold tracking-wider text-purple-300">
            {code}
          </span>
          <Icon className="w-5 h-5 text-neutral-600 transition-colors group-hover:text-purple-400" />
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">{name}</h3>
        <p className="text-sm leading-relaxed text-neutral-400 mb-5">{blurb}</p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {topics.map((t) => (
            <span key={t} className="rounded-full bg-neutral-800/70 px-2.5 py-1 text-xs text-neutral-300">{t}</span>
          ))}
        </div>

        <Link
          to="/learning"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-400 transition-colors hover:text-purple-300"
        >
          Explore path
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}

// Numbered step in the "How it works" rail.
function StepCard({ n, title, body, icon: Icon }: {
  n: string
  title: string
  body: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div data-reveal className="relative text-center lg:text-left">
      {/* Node sits above the dashed connector line */}
      <div className="relative z-10 mx-auto lg:mx-0 mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 shadow-lg shadow-black/40">
        <Icon className="w-7 h-7 text-purple-400" />
        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 font-mono text-[11px] font-bold text-white ring-4 ring-neutral-950">
          {n}
        </span>
      </div>
      <h3 className="mb-1.5 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-neutral-400">{body}</p>
    </div>
  )
}

// Accessible FAQ accordion row.
function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const panel = useRef<HTMLDivElement>(null)

  return (
    <div data-reveal className="overflow-hidden rounded-xl border border-neutral-800/70 bg-neutral-900/40 transition-colors hover:border-neutral-700">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-medium text-white">{q}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-neutral-500 transition-transform duration-300 ${open ? 'rotate-180 text-purple-400' : ''}`} />
      </button>
      <div
        ref={panel}
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm leading-relaxed text-neutral-400">{a}</p>
        </div>
      </div>
    </div>
  )
}

function AIFeature({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-4 p-4 bg-neutral-900/50 rounded-xl border border-neutral-800 hover:border-purple-500/30 transition-colors">
      <div className="p-2 bg-neutral-800/60 rounded-lg shrink-0">{icon}</div>
      <div>
        <h4 className="font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-neutral-400">{description}</p>
      </div>
    </div>
  )
}

function ChatBubble({ type, text, icon }: { type: 'user' | 'ai'; text: string; icon?: React.ReactNode }) {
  return (
    <div data-chat className={`flex ${type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm flex items-center gap-2 ${
        type === 'user'
          ? 'bg-purple-600 text-white rounded-br-md'
          : 'bg-neutral-800 text-neutral-100 border border-neutral-700 rounded-bl-md'
      }`}>
        {icon && <span className="text-purple-300 shrink-0">{icon}</span>}
        <span>{text}</span>
      </div>
    </div>
  )
}

function TestimonialCard({ name, role, message }: { name: string; role: string; message: string }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div data-testimonial data-skew className="group h-full bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 hover:border-purple-500/30 transition-all hover:-translate-y-1 will-change-transform">
      <Quote className="w-8 h-8 text-purple-500/40 mb-4" />
      <p className="text-neutral-300 mb-6 leading-relaxed">{message}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-sm font-semibold text-purple-300">
          {initials}
        </div>
        <div>
          <div className="font-semibold text-white">{name}</div>
          <div className="text-sm text-purple-400">{role}</div>
        </div>
      </div>
    </div>
  )
}
