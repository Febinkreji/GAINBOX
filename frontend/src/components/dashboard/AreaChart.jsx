import { useEffect, useId, useRef, useState } from 'react'

const VIEWBOX_WIDTH = 600
const VIEWBOX_HEIGHT = 220
const PADDING_Y = 14

function buildSmoothPath(points) {
  if (points.length < 2) return ''

  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? i : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return path
}

/**
 * Generic responsive area/line chart primitive. Renders `data` (an array of
 * `{ label, value }`) as a smoothed line with a gradient fill, an animated
 * draw-in on mount/update, and a hover crosshair + tooltip. Not chart-library
 * backed on purpose — this is a small, dependency-free primitive for
 * illustrative trend visuals.
 */
export default function AreaChart({ data }) {
  const gradientId = useId()
  const svgRef = useRef(null)
  const pathRef = useRef(null)
  const [pathLength, setPathLength] = useState(0)
  const [drawn, setDrawn] = useState(false)
  const [hoverIndex, setHoverIndex] = useState(null)

  const values = data.map((point) => point.value)
  const max = Math.max(...values)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const plotHeight = VIEWBOX_HEIGHT - PADDING_Y * 2
  const stepX = VIEWBOX_WIDTH / (data.length - 1)

  const points = data.map((point, index) => ({
    x: index * stepX,
    y: PADDING_Y + plotHeight * (1 - (point.value - min) / range),
  }))

  const linePath = buildSmoothPath(points)
  const baseline = VIEWBOX_HEIGHT - PADDING_Y
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
  const gridLines = [0.25, 0.5, 0.75].map((fraction) => PADDING_Y + plotHeight * fraction)
  const lastPoint = points[points.length - 1]

  useEffect(() => {
    let revealFrame
    const resetFrame = requestAnimationFrame(() => {
      setDrawn(false)
      if (pathRef.current) {
        setPathLength(pathRef.current.getTotalLength())
      }
      revealFrame = requestAnimationFrame(() => setDrawn(true))
    })
    return () => {
      cancelAnimationFrame(resetFrame)
      if (revealFrame) cancelAnimationFrame(revealFrame)
    }
  }, [linePath])

  const handleMouseMove = (event) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const relativeX = ((event.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH
    const index = Math.round(relativeX / stepX)
    setHoverIndex(Math.min(Math.max(index, 0), points.length - 1))
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-[220px] w-full cursor-crosshair"
        role="presentation"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((y) => (
          <line
            key={y}
            x1={0}
            x2={VIEWBOX_WIDTH}
            y1={y}
            y2={y}
            className="stroke-neutral-200/80 dark:stroke-neutral-800/80"
            strokeWidth={1}
          />
        ))}

        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          stroke="none"
          style={{ opacity: drawn ? 1 : 0, transition: 'opacity 0.8s ease-out 0.3s' }}
        />

        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          className="stroke-brand-400"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={pathLength}
          strokeDashoffset={drawn ? 0 : pathLength}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />

        <circle cx={lastPoint.x} cy={lastPoint.y} r={5} className="fill-brand-500 stroke-white dark:fill-brand-400 dark:stroke-neutral-950" strokeWidth={2.5} />

        {hovered && (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={PADDING_Y}
              y2={baseline}
              className="stroke-neutral-300 dark:stroke-neutral-600"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={hovered.x}
              cy={hovered.y}
              r={5}
              className="fill-white stroke-brand-500 dark:fill-neutral-950 dark:stroke-brand-400"
              strokeWidth={2.5}
            />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs shadow-premium dark:border-neutral-700 dark:bg-neutral-900"
          style={{ left: `${(hovered.x / VIEWBOX_WIDTH) * 100}%`, top: hovered.y }}
        >
          <p className="font-semibold text-neutral-950 dark:text-neutral-50">₹{data[hoverIndex].value}L</p>
          <p className="text-neutral-500">{data[hoverIndex].label}</p>
        </div>
      )}

      <div className="mt-2 flex justify-between text-xs text-neutral-500">
        {data.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  )
}
