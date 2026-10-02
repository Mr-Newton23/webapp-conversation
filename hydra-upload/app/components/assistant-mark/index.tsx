'use client'
import type { CSSProperties, FC, ReactNode } from 'react'
import React, { useId } from 'react'
import cn from 'classnames'
import s from './style.module.css'
import { APP_INFO } from '@/config'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface IAssistantMarkProps {
  state?: OrbState
  /** diameter in px */
  size?: number
  className?: string
}

// The assistant's mark: a stack of cut layers seen from above, like a laser-cut mandala.
// Back to front: base plate with a blue well, lattice ring, knot of four hook bands, core medallion, bezel.
// The layers turn very slowly against each other and a soft light travels along the knot bands.
// The viewBox is centred on (0,0), so every rotation is simply about the origin.

type Point = [number, number]

const fmt = (n: number) => String(Math.round(n * 100) / 100)
// screen angles: 0 degrees points right, positive turns clockwise
const polar = (radius: number, degrees: number): Point => {
  const radians = degrees * Math.PI / 180
  return [radius * Math.cos(radians), radius * Math.sin(radians)]
}
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]]
const mul = (a: Point, k: number): Point => [a[0] * k, a[1] * k]
const pt = (p: Point) => `${fmt(p[0])} ${fmt(p[1])}`
const range = (n: number) => Array.from({ length: n }, (_, i) => i)

const octagon = (radius: number) => `M${range(8).map(i => pt(polar(radius, 22.5 + i * 45))).join('L')}Z`
const ring = (c: Point, r: number) => `M${pt([c[0] - r, c[1]])}a${r} ${r} 0 1 0 ${fmt(2 * r)} 0a${r} ${r} 0 1 0 ${fmt(-2 * r)} 0Z`
const dot = (p: Point) => `M${pt(p)}h0`

interface IKnotShape {
  /** distance of the four nodes from the centre */
  d: number
  /** radius of a band's own hook round its node */
  r1: number
  /** radius of the neighbouring band's hook round the same node */
  r2: number
  /** sweep of the two hooks in degrees */
  s1: number
  s2: number
  /** corner rounding */
  rc: number
}

// Four identical hook bands in a pinwheel. Band k curls round node k (radius r1), runs along one side of
// the rotated square, turns the corner, and ends by curling round node k+1 outside that node's own hook (r2).
// Each band is split into a head (hook, side, corner) and a tail (side, outer hook); tails are drawn first,
// so wherever two bands cross, the head passes over the tail all the way round.
const buildKnot = ({ d, r1, r2, s1, s2, rc }: IKnotShape) => {
  const heads: string[] = []
  const tails: string[] = []
  const nodes: Point[] = []
  range(4).forEach((k) => {
    const au = -45 + 90 * k
    const u = polar(1, au)
    const t = polar(1, au + 90)
    const c = mul(u, d)
    const start = add(c, polar(r1, au + 180 + s1))
    const inner = mul(u, d - r1)
    const q = add(mul(u, d - r1), mul(t, d - r2))
    const q1 = add(q, mul(t, -rc))
    const q2 = add(q, mul(u, -rc))
    heads.push(`M${pt(start)}A${r1} ${r1} 0 ${s1 > 180 ? 1 : 0} 0 ${pt(inner)}L${pt(q1)}Q${pt(q)} ${pt(q2)}`)
    let tail = `M${pt(q2)}L${pt(mul(t, d - r2))}`
    if (s2 > 0) {
      const end = add(mul(t, d), polar(r2, au + 270 - s2))
      tail += `A${r2} ${r2} 0 ${s2 > 180 ? 1 : 0} 0 ${pt(end)}`
    }
    tails.push(tail)
    nodes.push(c)
  })
  const headLength = r1 * s1 * Math.PI / 180 + (d - r2 - rc) + 1.6 * rc
  const tailLength = (d - r1 - rc) + r2 * s2 * Math.PI / 180
  return { heads, tails, nodes, headShare: headLength / (headLength + tailLength) }
}

/** stretches of light per band */
const SEGMENTS = 10
/** radius the eight lattice discs sit on, and their own radius */
const RING = 73
const DISC = 10

const buildMark = (small: boolean) => {
  // below 64px the knot is redrawn bolder and simpler: no outer hooks, so the bands close into a looped square
  const knot = buildKnot(small
    ? { d: 50, r1: 12.5, r2: 12.5, s1: 270, s2: 0, rc: 6 }
    : { d: 43, r1: 9, r2: 16.5, s1: 268, s2: 205, rc: 5 })
  const bezelInner = small ? 86 : 90.5
  const headSegments = Math.round(SEGMENTS * knot.headShare)
  return {
    plate: octagon(bezelInner + 1),
    bezel: octagon(98) + octagon(bezelInner),
    bezelShadow: octagon(bezelInner - 0.6),
    bezelEdge: octagon(94.3),
    rivets: range(8).map(i => dot(polar(94.3, 22.5 + i * 45))).join(''),
    rays: range(48).map(i => `M${pt(polar(23, i * 7.5))}L${pt(polar(i % 2 ? 50 : 63, i * 7.5))}`).join(''),
    latticeShadow: range(8).map(i => ring(polar(RING, 22.5 + i * 45), DISC)).join(''),
    studs: range(8).map((i) => {
      const a = i * 45
      return `M${[polar(RING + 2.6, a), polar(RING, a + 1.5), polar(RING - 2.6, a), polar(RING, a - 1.5)].map(pt).join('L')}Z`
    }).join(''),
    heads: knot.heads,
    tails: knot.tails,
    nodes: knot.nodes,
    headSegments,
    tailSegments: SEGMENTS - headSegments,
    knotAll: knot.tails.concat(knot.heads).join(''),
    eyeFan: knot.nodes.map(c => range(8).map(i => `M${pt(add(c, polar(2.1, i * 45)))}L${pt(add(c, polar(5.1, i * 45)))}`).join('')).join(''),
    eyeHub: knot.nodes.map(dot).join(''),
  }
}

type Mark = ReturnType<typeof buildMark>

const HERO = buildMark(false)
const SMALL = buildMark(true)

// drawn once pointing up, then placed with rotation transforms
const LATTICE_LINES = 'M0 -7L4.8 0L0 7L-4.8 0ZM0 -4.4L3 0L0 4.4L-3 0ZM-7.2 -2.7L-5.1 0L-7.2 2.7M7.2 -2.7L5.1 0L7.2 2.7'
const LATTICE_GEM = 'M0 -2.3L1.55 0L0 2.3L-1.55 0Z'
const PETAL = 'M0 -2.7C5 -6.5 4.6 -11.8 0 -16C-4.6 -11.8 -5 -6.5 0 -2.7Z'
const PETAL_MINOR = 'M0 -3.1C2.8 -5.7 2.6 -8.7 0 -11.4C-2.6 -8.7 -2.8 -5.7 0 -3.1Z'

// where in the light's cycle an element is lit; the cycle covers two bands, so two lights sit opposite each other
const flowDelay = (phase: number): CSSProperties => ({
  animationDelay: `calc(var(--jv-flow) * ${fmt(-(1 - phase % 1))})`,
})

// a layer that turns slowly all the time (base) and can be given extra, visible speed (boost)
const Turn: FC<{ base: string; boost: string; children: ReactNode }> = ({ base, boost, children }) => (
  <g className={base}><g className={boost}>{children}</g></g>
)

// the travelling light: every band is cut into short stretches that brighten one after another
const Glints: FC<{ mark: Mark; part: 'head' | 'tail' }> = ({ mark, part }) => {
  const paths = part === 'head' ? mark.heads : mark.tails
  const count = part === 'head' ? mark.headSegments : mark.tailSegments
  const first = part === 'head' ? 0 : mark.headSegments
  return (
    <g className={cn(s.glints, s.fine)}>
      {paths.map((d, k) => range(count).map(i => (
        <path
          key={`${k}-${i}`}
          className={s.glint}
          d={d}
          pathLength={count}
          strokeDasharray={`1.5 ${count + 2}`}
          strokeDashoffset={-i}
          style={flowDelay((k * SEGMENTS + first + i) / (2 * SEGMENTS))}
        />
      )))}
    </g>
  )
}

const AssistantMark: FC<IAssistantMarkProps> = ({ state = 'idle', size = 160, className }) => {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const isSmall = size < 64
  const mark = isSmall ? SMALL : HERO
  const fine = !isSmall
  const paint = (name: string) => `url(#${id}-${name})`
  const tails = mark.tails.join('')
  const heads = mark.heads.join('')

  return (
    <div
      className={cn(s.orb, s[state], isSmall && s.small, className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${APP_INFO.title} is ${state}`}
    >
      <span className={s.aura} />
      <svg className={s.mark} viewBox="-100 -100 200 200" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-plate`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="92">
            <stop offset="0" stopColor="#1E2C4D" />
            <stop offset="0.42" stopColor="#121E3A" />
            <stop offset="0.78" stopColor="#0A1224" />
            <stop offset="1" stopColor="#060B18" />
          </radialGradient>
          <radialGradient id={`${id}-well`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="66">
            <stop offset="0" stopColor="#4FA3D9" stopOpacity="0.95" />
            <stop offset="0.34" stopColor="#3F7FBF" stopOpacity="0.74" />
            <stop offset="0.68" stopColor="#2B4A8C" stopOpacity="0.42" />
            <stop offset="1" stopColor="#2B4A8C" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-core`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="17">
            <stop offset="0" stopColor="#FFEBC8" />
            <stop offset="0.2" stopColor="#4FA3D9" />
            <stop offset="0.56" stopColor="#3F7FBF" />
            <stop offset="0.88" stopColor="#2B4A8C" />
            <stop offset="1" stopColor="#1E2C4D" />
          </radialGradient>
          {fine && (
            <radialGradient id={`${id}-eye`}>
              <stop offset="0" stopColor="#4FA3D9" />
              <stop offset="0.6" stopColor="#2E8FA3" />
              <stop offset="1" stopColor="#1E2C4D" />
            </radialGradient>
          )}
          <linearGradient id={`${id}-bezel`} gradientUnits="userSpaceOnUse" x1="-72" y1="-72" x2="72" y2="72">
            <stop offset="0" stopColor="#FFEBC8" />
            <stop offset="0.16" stopColor="#E9C48F" />
            <stop offset="0.44" stopColor="#C08B4E" />
            <stop offset="0.76" stopColor="#9A6D38" />
            <stop offset="1" stopColor="#6E4D27" />
          </linearGradient>
        </defs>

        {/* layer 0: base plate, the blue well that glows up through every gap, and rays at depth */}
        <g>
          <path d={mark.plate} fill={paint('plate')} />
          <g className={s.wellGlow}>
            <circle className={s.well} r="66" fill={paint('well')} />
          </g>
          {fine && <path className={cn(s.rays, s.fine)} d={mark.rays} />}
        </g>

        {/* layer 1: lattice ring, turning anticlockwise. Each layer's shadow is a dark copy in a fixed, offset
            group, so it turns with the layer but always falls down and to the right; higher layers fall further. */}
        {fine && (
          <g className={s.fine}>
            <g transform="translate(0.9 1.4)">
              <Turn base={s.turnCcw} boost={s.gearCcw}>
                <path className={s.depth} strokeWidth="2.6" d={mark.latticeShadow} />
              </Turn>
            </g>
            <Turn base={s.turnCcw} boost={s.gearCcw}>
              <circle className={s.latticeRing} r={RING - 2.6} />
              <circle className={s.latticeRing} r={RING + 2.6} />
              <path className={s.latticeStud} d={mark.studs} />
              {range(8).map(i => (
                <g key={i} transform={`rotate(${22.5 + i * 45}) translate(0 ${-RING})`}>
                  <circle className={s.latticeDisc} r={DISC} />
                  <circle className={s.latticeInner} r={DISC - 1.9} />
                  <path className={s.latticeLines} d={LATTICE_LINES} />
                  <path
                    className={s.latticeGem}
                    d={LATTICE_GEM}
                    style={{ animationDelay: `calc(var(--jv-breath) * ${fmt(-i / 4)})` }}
                  />
                </g>
              ))}
            </Turn>
          </g>
        )}

        {/* layer 2: the knot, turning clockwise */}
        <g>
          {fine && (
            <g className={s.fine} transform="translate(1.5 2.3)">
              <Turn base={s.turnCw} boost={s.gearCw}>
                <path className={s.depth} strokeWidth="6.6" d={mark.knotAll} />
              </Turn>
            </g>
          )}
          <Turn base={s.turnCw} boost={s.gearCw}>
            {fine && (
              <>
                <g className={cn(s.eyeGlow, s.fine)}>
                  {mark.nodes.map((c, k) => (
                    <circle
                      key={k}
                      className={s.eye}
                      cx={fmt(c[0])}
                      cy={fmt(c[1])}
                      r="6.6"
                      fill={paint('eye')}
                      style={flowDelay(k / 2)}
                    />
                  ))}
                </g>
                <path className={cn(s.eyeFan, s.fine)} d={mark.eyeFan} />
                <path className={cn(s.eyeHub, s.fine)} d={mark.eyeHub} />
                <path className={cn(s.casing, s.fine)} d={tails} />
              </>
            )}
            <path className={s.band} d={tails} />
            {fine && (
              <>
                <Glints mark={mark} part="tail" />
                <path className={cn(s.channel, s.fine)} d={tails} />
                <path className={cn(s.channelLit, s.fine)} d={tails} />
                <path className={cn(s.casing, s.fine)} d={heads} />
              </>
            )}
            <path className={s.band} d={heads} />
            {fine && (
              <>
                <Glints mark={mark} part="head" />
                <path className={cn(s.channel, s.fine)} d={heads} />
                <path className={cn(s.channelLit, s.fine)} d={heads} />
              </>
            )}
          </Turn>
        </g>

        {/* layer 3: core medallion; the blue core breathes under a four-petal rosette */}
        <g>
          {fine && <circle className={cn(s.depth, s.fine)} r="20.6" strokeWidth="2.8" transform="translate(1.8 2.7)" />}
          <circle className={s.medallionDisc} r="20.4" />
          <g className={s.coreGlow}>
            <circle className={s.core} r="17" fill={paint('core')} />
          </g>
          {fine && (
            <>
              <g className={cn(s.turnSlow, s.fine)}>
                <g className={s.dial}>
                  <g className={s.bloom}>
                    {range(4).map(i => <path key={`m${i}`} className={s.petalMinor} d={PETAL_MINOR} transform={`rotate(${45 + i * 90})`} />)}
                    {range(4).map(i => <path key={`p${i}`} className={s.petal} d={PETAL} transform={`rotate(${i * 90})`} />)}
                  </g>
                </g>
              </g>
              <circle className={cn(s.medallionRingInner, s.fine)} r="17.6" />
            </>
          )}
          <circle className={s.medallionRing} r="20.4" />
          {fine && <circle className={cn(s.boss, s.fine)} r="1.9" />}
        </g>

        {/* layer 4: bezel, the fixed housing everything turns inside */}
        <g>
          {fine && <path className={cn(s.depth, s.fine)} strokeWidth="2.8" d={mark.bezelShadow} transform="translate(2.1 3.1)" />}
          <path d={mark.bezel} fill={paint('bezel')} fillRule="evenodd" />
          {fine && (
            <>
              <path className={cn(s.bezelEdge, s.fine)} d={mark.bezelEdge} />
              <path className={cn(s.bezelRivets, s.fine)} d={mark.rivets} />
            </>
          )}
        </g>
      </svg>
    </div>
  )
}

export default React.memo(AssistantMark)
