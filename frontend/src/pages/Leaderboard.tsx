import { Trophy, Medal, Star, Clock, Zap } from 'lucide-react'
import Navbar from '../components/Navbar'

export default function Leaderboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Coming Soon Card */}
        <div className="text-center">
          {/* Trophy Animation */}
          <div className="relative inline-block mb-8">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mx-auto animate-pulse">
              <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
              <Star className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Leaderboard
          </h1>
          
          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-6">
            <Clock className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-white font-semibold text-lg">Coming Soon</span>
          </div>
          
          <p className="text-slate-400 text-lg max-w-xl mx-auto mb-12">
            We're building an exciting leaderboard to showcase top performers. 
            Compete with fellow students and climb the ranks!
          </p>

          {/* Preview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            <div className="bg-slate-800/50 backdrop-blur border border-yellow-500/30 rounded-xl p-6 transform hover:scale-105 transition">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Medal className="w-6 h-6 text-yellow-500" />
              </div>
              <h3 className="text-yellow-400 font-bold text-lg">1st Place</h3>
              <p className="text-slate-500 text-sm mt-1">Top Performer</p>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur border border-slate-400/30 rounded-xl p-6 transform hover:scale-105 transition">
              <div className="w-12 h-12 bg-slate-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Medal className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-slate-300 font-bold text-lg">2nd Place</h3>
              <p className="text-slate-500 text-sm mt-1">Rising Star</p>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur border border-orange-500/30 rounded-xl p-6 transform hover:scale-105 transition">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Medal className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-orange-400 font-bold text-lg">3rd Place</h3>
              <p className="text-slate-500 text-sm mt-1">Achiever</p>
            </div>
          </div>

          {/* Features Preview */}
          <div className="bg-slate-800/30 backdrop-blur border border-slate-700 rounded-2xl p-6 sm:p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              What's Coming
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Star className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Points Ranking</h4>
                  <p className="text-slate-400 text-sm">Earn points by completing modules</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Weekly Champions</h4>
                  <p className="text-slate-400 text-sm">Top performers each week</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Medal className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Badges & Achievements</h4>
                  <p className="text-slate-400 text-sm">Unlock special badges</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium">Streak Rewards</h4>
                  <p className="text-slate-400 text-sm">Daily learning streaks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
