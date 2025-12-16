import { CheckCircle, Lock, Play, Clock, Award, ChevronRight, BookOpen } from 'lucide-react'

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
      case 'video': return <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'text': return <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'interactive': return <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'quiz': return <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
      case 'project': return <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
      default: return <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
    }
  }

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'text-green-400 border-green-500/40'
      case 'intermediate': return 'text-yellow-400 border-yellow-500/40'
      case 'advanced': return 'text-red-400 border-red-500/40'
      default: return 'text-blue-400 border-blue-500/40'
    }
  }

  return (
    <div className="relative">
      {/* Progress line - responsive positioning */}
      <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-slate-800" />

      {/* Completed progress overlay */}
      <div
        className="absolute left-4 sm:left-6 top-0 w-0.5 bg-gradient-to-b from-green-500 to-green-600 transition-all duration-700"
        style={{
          height: modules.length > 0
            ? `${(modules.filter(m => m.is_completed).length / modules.length) * 100}%`
            : '0%'
        }}
      />

      {/* Modules */}
      <div className="space-y-4 sm:space-y-6">
        {modules.map((module, index) => (
          <div key={module.id} className="relative pl-10 sm:pl-16">
            {/* Timeline Node - smaller on mobile */}
            <div className={`absolute left-1.5 sm:left-3.5 top-4 sm:top-5 w-6 h-6 sm:w-5 sm:h-5 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${module.is_completed
                ? 'bg-green-500 shadow-md shadow-green-500/30'
                : module.progress_percentage && module.progress_percentage > 0
                  ? 'bg-purple-500 shadow-md shadow-purple-500/30'
                  : module.is_locked
                    ? 'bg-slate-700'
                    : 'bg-blue-500 shadow-md shadow-blue-500/30'
              }`}>
              {module.is_completed ? (
                <CheckCircle className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-white" />
              ) : module.is_locked ? (
                <Lock className="w-2.5 h-2.5 sm:w-2.5 sm:h-2.5 text-slate-500" />
              ) : (
                <span className="text-white font-semibold text-[10px] sm:text-xs">{index + 1}</span>
              )}
            </div>

            {/* Module Card - Minimal Design */}
            <div
              onClick={() => !module.is_locked && onModuleClick(module)}
              className={`group bg-slate-900/60 backdrop-blur-sm border rounded-xl p-4 sm:p-5 transition-all duration-300 ${module.is_locked
                  ? 'border-slate-800/60 opacity-50 cursor-not-allowed'
                  : module.is_completed
                    ? 'border-green-500/30 hover:border-green-500/50 cursor-pointer hover:bg-slate-800/60'
                    : module.progress_percentage && module.progress_percentage > 0
                      ? 'border-purple-500/30 hover:border-purple-500/50 cursor-pointer hover:bg-slate-800/60'
                      : 'border-blue-500/30 hover:border-blue-500/50 cursor-pointer hover:bg-slate-800/60'
                }`}
            >
              {/* Header Row */}
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Icon - visible only on larger screens */}
                <div className={`hidden sm:flex w-10 h-10 rounded-lg items-center justify-center flex-shrink-0 ${module.is_completed ? 'bg-green-500/15' : module.is_locked ? 'bg-slate-700/50' : 'bg-blue-500/15'
                  }`}>
                  {getModuleIcon(module.module_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h3 className="text-sm sm:text-base font-semibold text-white mb-1 flex items-center gap-2">
                    <span className="truncate">
                      {module.title}
                    </span>
                    {module.is_completed && (
                      <Award className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                  </h3>

                  {/* Description - truncate on mobile */}
                  <p className="text-slate-400 text-xs sm:text-sm line-clamp-1 sm:line-clamp-2 mb-3">
                    {module.description}
                  </p>

                  {/* Meta Row */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500">
                    <span className={`px-2 py-0.5 rounded border text-[10px] sm:text-xs ${getDifficultyColor(module.difficulty_level)}`}>
                      {module.difficulty_level}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {module.module_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {module.duration_minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {module.points_reward} pts
                    </span>
                  </div>

                  {/* Progress Bar - Only show if in progress */}
                  {!module.is_completed && module.current_slide !== undefined && module.total_slides && module.total_slides > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{(module.current_slide || 0) + 1} / {module.total_slides}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1">
                        <div
                          className="bg-purple-500 h-1 rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(((module.current_slide || 0) + 1) / module.total_slides * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action - Chevron on mobile, Button on desktop */}
                <div className="flex-shrink-0 flex items-center">
                  {/* Mobile: Simple chevron */}
                  <div className="sm:hidden">
                    {!module.is_locked && (
                      <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-0.5 ${module.is_completed ? 'text-green-400' : 'text-blue-400'
                        }`} />
                    )}
                    {module.is_locked && (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>

                  {/* Desktop: Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!module.is_locked) onModuleClick(module)
                    }}
                    disabled={module.is_locked}
                    className={`hidden sm:flex px-4 py-2 rounded-lg text-sm font-medium transition-all items-center gap-1.5 ${module.is_locked
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : module.is_completed
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : module.progress_percentage && module.progress_percentage > 0
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                  >
                    {module.is_locked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </>
                    ) : module.is_completed ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </>
                    ) : module.progress_percentage && module.progress_percentage > 0 ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Continue</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Start</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
