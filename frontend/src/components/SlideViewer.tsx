import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import api from '../services/api'

interface SlideViewerProps {
  content: string
  moduleId: string
  onAllSlidesViewed?: () => void
}

interface Slide {
  number: number
  title: string
  content: string
}

export default function SlideViewer({ content, moduleId, onAllSlidesViewed }: SlideViewerProps) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [hasViewedLastSlide, setHasViewedLastSlide] = useState(false)
  const [maxViewedSlide, setMaxViewedSlide] = useState(0) // Track highest slide reached
  const slideRef = useRef<HTMLDivElement>(null)

  // Track when user reaches the last slide and update max viewed
  useEffect(() => {
    // Update max viewed slide
    if (currentSlideIndex > maxViewedSlide) {
      setMaxViewedSlide(currentSlideIndex)
    }

    if (slides.length > 0 && currentSlideIndex === slides.length - 1 && !hasViewedLastSlide) {
      setHasViewedLastSlide(true)
      onAllSlidesViewed?.()
      console.log('✅ All slides viewed!')
    }
  }, [currentSlideIndex, slides.length, hasViewedLastSlide, onAllSlidesViewed, maxViewedSlide])

  useEffect(() => {
    parseSlides()
  }, [content])

  // Load saved progress when component mounts
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const response = await api.get(`/learning/modules/${moduleId}/get_progress/`)
        if (response.data.current_slide && response.data.current_slide > 0) {
          setCurrentSlideIndex(response.data.current_slide)
        }
        setProgressLoaded(true)
      } catch (error) {
        console.log('No saved progress found, starting from beginning')
        setProgressLoaded(true)
      }
    }

    if (moduleId && slides.length > 0 && !progressLoaded) {
      loadProgress()
    }
  }, [moduleId, slides.length, progressLoaded])

  // Save progress when slide changes
  useEffect(() => {
    const saveProgress = async () => {
      if (!progressLoaded) return // Don't save until we've loaded initial progress

      try {
        await api.post(`/learning/modules/${moduleId}/save_progress/`, {
          current_slide: currentSlideIndex,
          total_slides: slides.length
        })
        console.log(`Progress saved: Slide ${currentSlideIndex + 1}/${slides.length}`)
      } catch (error) {
        console.error('Failed to save progress:', error)
      }
    }

    if (moduleId && slides.length > 0 && progressLoaded) {
      // Debounce save to avoid too many requests
      const timeoutId = setTimeout(saveProgress, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [currentSlideIndex, slides.length, moduleId, progressLoaded])

  const parseSlides = () => {
    // Parse slide-based content
    const slideRegex = /<div class="module-slide" data-slide="(\d+)">(.*?)<\/div>\s*(?:<hr class="slide-separator" \/>)?/gs
    const matches = [...content.matchAll(slideRegex)]

    if (matches.length > 0) {
      const parsedSlides = matches.map((match) => {
        const slideNumber = parseInt(match[1])
        const slideHtml = match[2]

        // Extract title
        const titleMatch = slideHtml.match(/<h2 class="slide-title">(.*?)<\/h2>/)
        const title = titleMatch ? titleMatch[1] : `Slide ${slideNumber}`

        // Extract content (everything after title)
        const contentMatch = slideHtml.match(/<div class="slide-content">(.*?)<\/div>/s)
        const slideContent = contentMatch ? contentMatch[1] : slideHtml

        return {
          number: slideNumber,
          title: title,
          content: slideContent
        }
      })

      setSlides(parsedSlides)
    } else {
      // If no slides found, treat entire content as one slide
      setSlides([{
        number: 1,
        title: 'Content',
        content: content
      }])
    }
  }

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0 && !isAnimating) {
      setIsAnimating(true)
      setSlideDirection('left')
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex - 1)
        setTimeout(() => setIsAnimating(false), 50)
      }, 300)
    }
  }

  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1 && !isAnimating) {
      setIsAnimating(true)
      setSlideDirection('right')
      setTimeout(() => {
        setCurrentSlideIndex(currentSlideIndex + 1)
        setTimeout(() => setIsAnimating(false), 50)
      }, 300)
    }
  }

  const goToSlide = (index: number) => {
    // Only allow going to slides that have been viewed (prevents skipping forward)
    if (index > maxViewedSlide) {
      console.log(`Cannot skip to slide ${index + 1}, max viewed is ${maxViewedSlide + 1}`)
      return
    }

    if (index !== currentSlideIndex && !isAnimating) {
      setIsAnimating(true)
      setSlideDirection(index > currentSlideIndex ? 'right' : 'left')
      setTimeout(() => {
        setCurrentSlideIndex(index)
        setTimeout(() => setIsAnimating(false), 50)
      }, 300)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      slideRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Touch handlers for swipe
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNextSlide()
    } else if (isRightSwipe) {
      goToPrevSlide()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevSlide()
      if (e.key === 'ArrowRight') goToNextSlide()
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentSlideIndex, slides.length])

  if (slides.length === 0) {
    return <div className="text-slate-400">Loading slides...</div>
  }

  const currentSlide = slides[currentSlideIndex]

  return (
    <div
      ref={slideRef}
      className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Compact Header with Progress */}
      <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/30 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-xs md:text-sm font-semibold text-blue-400">
              {currentSlideIndex + 1} / {slides.length}
            </span>
            {/* Progress Bar */}
            <div className="hidden sm:block w-32 md:w-48 h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-700/50 rounded-md transition-colors"
            title="Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-slate-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Main Slide Area - Full width on mobile */}
      <div className="flex-1 flex items-center justify-center p-1 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto h-full">
          {/* Slide with Animation */}
          <div
            className={`h-full transform transition-all duration-500 ease-out ${isAnimating
              ? slideDirection === 'right'
                ? 'translate-x-full opacity-0'
                : '-translate-x-full opacity-0'
              : 'translate-x-0 opacity-100'
              }`}
          >
            <div className="h-full bg-slate-800/50 backdrop-blur-sm rounded-none sm:rounded-xl border-0 sm:border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
              {/* Clean Slide Header */}
              <div className="bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 border-b border-slate-700/30 px-4 sm:px-6 md:px-10 py-3 sm:py-4 md:py-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent leading-tight">
                  {currentSlide.title}
                </h2>
              </div>

              {/* Slide Content - Minimal padding on mobile */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 lg:p-12">
                <div
                  className="prose prose-invert prose-sm sm:prose-base md:prose-lg max-w-none module-content-display slide-content-view"
                  dangerouslySetInnerHTML={{ __html: currentSlide.content }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Navigation Footer */}
      <div className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/30 px-2 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto gap-2 sm:gap-4">
          {/* Previous Button - Larger touch target on mobile */}
          <button
            type="button"
            onClick={goToPrevSlide}
            disabled={currentSlideIndex === 0 || isAnimating}
            className="flex items-center justify-center gap-1 sm:gap-2 min-w-[48px] sm:min-w-[80px] md:min-w-[120px] px-3 sm:px-4 md:px-6 py-3 sm:py-2.5 md:py-3 bg-slate-700/80 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 shadow-lg"
          >
            <ChevronLeft className="w-5 h-5 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-sm font-medium">Prev</span>
          </button>

          {/* Center Navigation */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {/* Desktop: Show limited slide numbers */}
            {slides.length <= 10 ? (
              <div className="hidden md:flex items-center gap-1.5">
                {slides.map((_, index) => {
                  const isViewed = index <= maxViewedSlide
                  const isCurrent = index === currentSlideIndex

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goToSlide(index)}
                      disabled={isAnimating || !isViewed}
                      className={`w-8 h-8 rounded-md text-sm font-semibold transition-all duration-200 ${isCurrent
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-110 shadow-lg'
                        : isViewed
                          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 cursor-pointer'
                          : 'bg-slate-700/30 text-slate-600 cursor-not-allowed opacity-50'
                        }`}
                      title={isViewed ? `Go to slide ${index + 1}` : `Complete previous slides first`}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            ) : (
              /* For many slides, show dots */
              <div className="hidden md:flex items-center gap-1.5">
                {slides.map((_, index) => {
                  // Show first 3, current ±2, and last 3
                  const showNumber = index < 3 ||
                    index > slides.length - 4 ||
                    Math.abs(index - currentSlideIndex) <= 2

                  if (!showNumber && (index === 3 || index === slides.length - 4)) {
                    return <span key={index} className="text-slate-600 px-1">...</span>
                  }

                  if (!showNumber) return null

                  const isViewed = index <= maxViewedSlide
                  const isCurrent = index === currentSlideIndex

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goToSlide(index)}
                      disabled={isAnimating || !isViewed}
                      className={`w-8 h-8 rounded-md text-sm font-semibold transition-all duration-200 ${isCurrent
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-110 shadow-lg'
                        : isViewed
                          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 cursor-pointer'
                          : 'bg-slate-700/30 text-slate-600 cursor-not-allowed opacity-50'
                        }`}
                      title={isViewed ? `Go to slide ${index + 1}` : `Complete previous slides first`}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Mobile: Show limited dots (max 7) with current indicator */}
            <div className="flex md:hidden items-center gap-1">
              {slides.length <= 7 ? (
                slides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToSlide(index)}
                    disabled={isAnimating}
                    className={`transition-all duration-200 rounded-full ${index === currentSlideIndex
                      ? 'w-5 h-2 bg-gradient-to-r from-blue-500 to-purple-600'
                      : 'w-2 h-2 bg-slate-600 hover:bg-slate-500'
                      }`}
                  />
                ))
              ) : (
                /* For many slides on mobile, show simplified dots */
                <>
                  {/* First dot */}
                  <button
                    type="button"
                    onClick={() => goToSlide(0)}
                    className={`transition-all duration-200 rounded-full ${currentSlideIndex === 0
                      ? 'w-5 h-2 bg-gradient-to-r from-blue-500 to-purple-600'
                      : 'w-2 h-2 bg-slate-600'
                      }`}
                  />
                  {/* Ellipsis or current area */}
                  {currentSlideIndex > 1 && <span className="text-slate-500 text-xs px-0.5">•</span>}
                  {currentSlideIndex > 0 && currentSlideIndex < slides.length - 1 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-white font-medium bg-blue-600 px-2 py-0.5 rounded-full">
                        {currentSlideIndex + 1}
                      </span>
                    </div>
                  )}
                  {currentSlideIndex < slides.length - 2 && <span className="text-slate-500 text-xs px-0.5">•</span>}
                  {/* Last dot */}
                  <button
                    type="button"
                    onClick={() => goToSlide(slides.length - 1)}
                    disabled={slides.length - 1 > maxViewedSlide}
                    className={`transition-all duration-200 rounded-full ${currentSlideIndex === slides.length - 1
                      ? 'w-5 h-2 bg-gradient-to-r from-blue-500 to-purple-600'
                      : 'w-2 h-2 bg-slate-600'
                      }`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Next Button - Larger touch target on mobile */}
          <button
            type="button"
            onClick={goToNextSlide}
            disabled={currentSlideIndex === slides.length - 1 || isAnimating}
            className="flex items-center justify-center gap-1 sm:gap-2 min-w-[48px] sm:min-w-[80px] md:min-w-[120px] px-3 sm:px-4 md:px-6 py-3 sm:py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 hover:scale-105 disabled:hover:scale-100 shadow-lg"
          >
            <span className="hidden sm:inline text-sm font-medium">Next</span>
            <ChevronRight className="w-5 h-5 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
