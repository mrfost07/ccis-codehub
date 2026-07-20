import Navbar from '../components/Navbar'
import FeaturedCarousel from '../components/FeaturedCarousel'
import { Star, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function FeaturedProjects() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-white transition text-sm mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Projects Hub
        </Link>

        {/* Page header (DESIGN_SYSTEM.md §11) */}
        <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" /> Community showcase
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Explore Projects</h1>
          <p className="mt-2 text-neutral-400 max-w-3xl leading-relaxed">
            Public projects from the CCIS-CodeHub community
          </p>
        </div>

        {/* Grid */}
        <FeaturedCarousel />
      </div>
    </div>
  )
}
