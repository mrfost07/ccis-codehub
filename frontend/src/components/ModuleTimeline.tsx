import { CheckCircle, Lock, Play, Clock, BookOpen, Award } from 'lucide-react'

interface Module {
  id: string
  title: string
  description: string
  module_type: string
  difficulty_level: string
  duration_minutes: number
  points_reward: number
  order: number
  is_locked: boolean
  is_completed: boolean
  progress_percentage?: number
  current_slide?: number
  total_slides?: number
  quiz_available: boolean
  quiz_passed: boolean
}

interface ModuleTimelineProps {
  modules: Module[]
  onModuleClick: (module: Module) => void
}

export default function ModuleTimeline({ modules, onModuleClick }: ModuleTimelineProps) {
  const getModuleIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return '🎥'
      case 'text': return '📖'
      case 'interactive': return '💻'
      case 'quiz': return '📝'
      case 'project': return '🚀'
      default: return '📚'
    }
  }

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-700/50" />

      {/* Completed progress line */}
      <div
        className="absolute left-8 top-0 w-1 bg-gradient-to-b from-green-500 to-blue-500 transition-all duration-500"
        style={{
          height: `${(modules.filter(m => m.is_completed).length / modules.length) * 100}%`
        }}
      />

      {/* Modules */}
      <div className="space-y-8">
        {modules.map((module, index) => (
          <div key={module.id} className="relative pl-20">
            {/* Timeline Node */}
            <div className={`absolute left-4 top-4 w-9 h-9 rounded-full flex items-center justify-center z-10 transition-all ${module.is_completed
              ? 'bg-green-600 ring-4 ring-green-600/30 shadow-lg shadow-green-600/50'
              : module.progress_percentage && module.progress_percentage > 0
                ? 'bg-blue-600 ring-4 ring-blue-600/30 shadow-lg shadow-blue-600/50 animate-pulse'
                : module.is_locked
                  ? 'bg-slate-700 ring-4 ring-slate-700/30'
                  : 'bg-slate-600 ring-4 ring-slate-600/30'
              }`}>
              {module.is_completed ? (
                <CheckCircle className="w-5 h-5 text-white" />
              ) : module.is_locked ? (
                <Lock className="w-4 h-4 text-slate-400" />
              ) : (
                <span className="text-white font-bold text-sm">{index + 1}</span>
              )}
            </div>

            {/* Module Card */}
            <div
              onClick={() => !module.is_locked && onModuleClick(module)}
              className={`bg-slate-800/50 backdrop-blur border rounded-xl p-6 transition-all cursor-pointer ${module.is_locked
                ? 'border-slate-700 opacity-60 cursor-not-allowed'
                : module.is_completed
                  ? 'border-green-600/50 shadow-lg shadow-green-900/20 hover:shadow-xl hover:shadow-green-900/30'
                  : module.progress_percentage && module.progress_percentage > 0
                    ? 'border-purple-600/50 shadow-lg shadow-purple-900/20 hover:shadow-xl hover:shadow-purple-900/30'
                    : 'border-blue-600/50 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30'
                }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="text-4xl flex-shrink-0">{getModuleIcon(module.module_type)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        Module {index + 1} — {module.title}
                        {module.is_completed && (
                          <Award className="w-5 h-5 text-green-400" />
                        )}
                      </h3>
                      <p className="text-slate-300 text-sm line-clamp-2">{module.description}</p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-4">
                    <span className={`px-3 py-1 rounded-full border ${getDifficultyColor(module.difficulty_level)}`}>
                      {module.difficulty_level}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {module.module_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {module.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {module.points_reward} pts
                    </span>
                  </div>

                  {/* Progress Bar - Show slide progress */}
                  {!module.is_completed && (module.current_slide !== undefined && module.current_slide >= 0) && module.total_slides && module.total_slides > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Slide Progress</span>
                        <span>{(module.current_slide || 0) + 1} / {module.total_slides} slides</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(((module.current_slide || 0) + 1) / module.total_slides * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!module.is_locked) onModuleClick(module)
                      }}
                      disabled={module.is_locked}
                      className={`px-6 py-2.5 rounded-lg font-medium transition flex items-center gap-2 ${module.is_locked
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : module.is_completed
                          ? 'bg-slate-700 hover:bg-slate-600 text-white'
                          : module.progress_percentage && module.progress_percentage > 0
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg'
                        }`}
                    >
                      {module.is_locked ? (
                        <>
                          <Lock className="w-4 h-4" />
                          Locked
                        </>
                      ) : module.is_completed ? (
                        <>
                          <Play className="w-4 h-4" />
                          Review
                        </>
                      ) : module.progress_percentage && module.progress_percentage > 0 ? (
                        <>
                          <Play className="w-4 h-4" />
                          Continue Learning
                          {module.current_slide && module.current_slide > 0 && (
                            <span className="text-xs opacity-80">(Slide {module.current_slide + 1})</span>
                          )}
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Start Learning
                        </>
                      )}
                    </button>

                    {module.quiz_available && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        📝 Quiz Available
                        {module.quiz_passed && <CheckCircle className="w-3 h-3 text-green-400" />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
