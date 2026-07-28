import { useId } from 'react'

export default function Sparkline({ data, width = 72, height = 28, className }) {
  const gradientId = useId()

  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const coords = data.map((value, index) => ({
    x: index * stepX,
    y: height - ((value - min) / range) * height,
  }))

  const linePoints = coords.map((point) => `${point.x},${point.y}`).join(' ')
  const areaPoints = `${linePoints} ${width},${height} 0,${height}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />
      <polyline
        points={linePoints}
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
