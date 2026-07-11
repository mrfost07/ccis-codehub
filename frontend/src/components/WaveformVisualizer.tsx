/**
 * Waveform Visualizer Component
 * Canvas-based smooth wavelength animation for voice mode
 * Renders a flowing sine-wave when AI is speaking, subtle idle animation otherwise
 */
import { useRef, useEffect } from 'react'

interface WaveformVisualizerProps {
  analyserNode: AnalyserNode | null
  isActive: boolean
  color?: string
  secondaryColor?: string
  width?: number
  height?: number
  className?: string
  style?: 'wave' | 'dots'
}

export default function WaveformVisualizer({
  analyserNode,
  isActive,
  color = '#a78bfa',
  secondaryColor = '#7c3aed',
  width = 600,
  height = 120,
  className = '',
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const phaseRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      phaseRef.current += 0.03

      const centerY = height / 2

      if (isActive && analyserNode) {
        // Get frequency data from audio
        const bufferLength = analyserNode.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserNode.getByteFrequencyData(dataArray)

        // Calculate overall volume
        let sum = 0
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i]
        const avgVolume = sum / bufferLength / 255

        // Draw multiple layered sine waves
        const waves = [
          { amplitude: 30 + avgVolume * 40, frequency: 0.015, speed: 1, alpha: 0.9, lineWidth: 3 },
          { amplitude: 20 + avgVolume * 30, frequency: 0.025, speed: 1.5, alpha: 0.5, lineWidth: 2 },
          { amplitude: 15 + avgVolume * 20, frequency: 0.035, speed: 2, alpha: 0.3, lineWidth: 1.5 },
        ]

        waves.forEach((wave, waveIdx) => {
          ctx.beginPath()
          ctx.strokeStyle = waveIdx === 0 ? color : secondaryColor
          ctx.globalAlpha = wave.alpha
          ctx.lineWidth = wave.lineWidth
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'

          for (let x = 0; x < width; x++) {
            // Mix multiple frequencies from the audio data
            const dataIdx = Math.floor((x / width) * bufferLength)
            const audioInfluence = (dataArray[dataIdx] || 0) / 255

            const y = centerY +
              Math.sin(x * wave.frequency + phaseRef.current * wave.speed) * wave.amplitude * (0.3 + audioInfluence * 0.7) +
              Math.sin(x * wave.frequency * 2.5 + phaseRef.current * wave.speed * 0.7) * wave.amplitude * 0.2 * audioInfluence

            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
          ctx.globalAlpha = 1
        })

        // Glow effect
        ctx.shadowBlur = 15
        ctx.shadowColor = color

      } else {
        // Idle: gentle breathing wave
        ctx.shadowBlur = 0
        ctx.shadowColor = 'transparent'

        const waves = [
          { amplitude: 8, frequency: 0.02, speed: 0.5, alpha: 0.4, lineWidth: 2 },
          { amplitude: 5, frequency: 0.03, speed: 0.8, alpha: 0.2, lineWidth: 1.5 },
        ]

        waves.forEach((wave) => {
          ctx.beginPath()
          ctx.strokeStyle = secondaryColor
          ctx.globalAlpha = wave.alpha
          ctx.lineWidth = wave.lineWidth
          ctx.lineCap = 'round'

          for (let x = 0; x < width; x++) {
            const y = centerY +
              Math.sin(x * wave.frequency + phaseRef.current * wave.speed) * wave.amplitude

            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
          ctx.globalAlpha = 1
        })
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [analyserNode, isActive, color, secondaryColor, width, height])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className={className}
    />
  )
}
