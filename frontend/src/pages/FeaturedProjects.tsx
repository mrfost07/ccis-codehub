import Navbar from '../components/Navbar'
import FeaturedCarousel from '../components/FeaturedCarousel'
import { Star, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function FeaturedProjects() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition text-sm mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Projects Hub
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white">Explore Projects</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Public projects from the CCIS-CodeHub community
              </p>
            </div>
          </div>
        </div>

        {/* Grid */}
        <FeaturedCarousel />
      </div>
    </div>
  )
}
