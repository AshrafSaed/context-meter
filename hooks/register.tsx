import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Fill, Limit } from '../types'

const fill = atom({ plugin: 'context-meter', key: 'fill' } as const, null)
const diag = atom({ plugin: 'context-meter', key: 'diag' } as const, null)

const WIDTH = 16
// At or above HARD every ordinary prompt is held; at or above SOFT only a long
// (probably expensive) prompt is held. Start a prompt with "!!" to override.
const HARD = 97
const SOFT = 90
const LONG_PROMPT = 1500

const colorFor = (percent: number) =>
  percent >= 85 ? 'red' : percent >= 60 ? 'yellow' : 'green'

const bar = (percent: number) => {
  const filled = Math.max(0, Math.min(WIDTH, Math.round((percent / 100) * WIDTH)))
  return '█'.repeat(filled) + '░'.repeat(WIDTH - filled)
}

const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

const label = (kind: string) =>
  kind === 'five_hour' ? '5h' : kind === 'seven_day' ? '7d' : kind

const left = (ms: number) => {
  const minutes = Math.max(0, Math.ceil(ms / 60000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m}m` : `${m}m`
}

async function refreshInner($: EngineInterface) {
  const { context, rateLimits } = await $.session.usage()
  const limits: Limit[] = rateLimits.map(r => ({
    kind: r.kind,
    percentUsed: r.percentUsed,
    resetsAtMs: r.resetsAt ? Date.parse(r.resetsAt) : null,
  }))
  const current: Fill = {
    tokens: context.tokens ?? null,
    window: context.window,
    percent: context.percent ?? null,
    limits,
    lastTurn: 0,
    total: 0,
  }
  await update($, fill, prev => ({
    ...current,
    lastTurn: prev?.lastTurn ?? 0,
    total: prev?.total ?? 0,
  }))
  const worst = Math.max(context.percent ?? 0, ...limits.map(l => l.percentUsed))
  $.ui.status(context.percent === null ? undefined : `ctx ${context.percent}% · max ${Math.round(worst)}%`)
}

async function refresh($: EngineInterface) {
  try {
    await refreshInner($)
    await update($, diag, () => null)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await update($, diag, () => msg.slice(0, 80))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)
    // Tokens this turn spent: new input + output + cache writes (cache reads are
    // re-reads of the same context and are left out).
    const u = e.usage
    const spent = u ? u.input_tokens + u.output_tokens + u.cache_creation_input_tokens : 0
    await update($, fill, prev =>
      prev === null ? prev : { ...prev, lastTurn: spent, total: prev.total + spent },
    )
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta || e.origin !== 'user') {
      return next(e)
    }
    if (e.text.startsWith('!!')) {
      return next({ ...e, text: e.text.slice(2).trimStart() })
    }

    await refresh($)
    const f = await read($, fill)
    if (f === null) {
      return next(e)
    }

    const now = await $.clock.now()
    const isLong = e.text.length > LONG_PROMPT || (e.attachments?.length ?? 0) > 0
    const blocked = f.limits.find(
      l => l.percentUsed >= HARD || (isLong && l.percentUsed >= SOFT),
    )
    if (blocked !== undefined) {
      const wait =
        blocked.resetsAtMs === null ? '' : ` האיפוס בעוד ${left(blocked.resetsAtMs - now)}.`
      return {
        drop: `עצור: מגבלת ${label(blocked.kind)} ב-${Math.round(blocked.percentUsed)}%.${wait} אפשר להמשיך אחרי האיפוס (או להתחיל ב-!! כדי לעקוף).`,
      }
    }

    const p = f.percent ?? 0
    if (p >= HARD || (isLong && p >= SOFT)) {
      return {
        drop: `עצור: ה-context מלא ב-${p}%. הרץ /compact או /clear לפני שממשיכים (או התחל ב-!! כדי לעקוף).`,
      }
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const f = await read($, fill)
    if (e.props.hasSurvey) {
      return next(e)
    }
    if (f === null || f.percent === null) {
      const d = await read($, diag)
      const { Box: B, Text: T } = $.ui.resolve(e)
      return (
        <B>
          <T color="yellow">ctx · context-meter 0.3.1 active · </T>
          <T dimColor>{d === null ? 'waiting for usage data' : `error: ${d}`}</T>
        </B>
      )
    }

    const now = await $.clock.now()
    const { Box, Text } = $.ui.resolve(e)
    const used = f.tokens ?? 0
    const color = colorFor(f.percent)

    return (
      <Box>
        <Text dimColor>ctx </Text>
        <Text color={color}>{bar(f.percent)}</Text>
        <Text color={color}> {f.percent}%</Text>
        <Text dimColor>
          {' '}
          used {fmt(used)} · left {fmt(Math.max(0, f.window - used))} / {fmt(f.window)}
          {' '}· turn {fmt(f.lastTurn)} · session {fmt(f.total)}
        </Text>
        {f.limits.map(l => (
          <Text key={l.kind} color={colorFor(l.percentUsed)}>
            {'  '}
            {label(l.kind)} {Math.round(l.percentUsed)}%
            {l.resetsAtMs === null ? '' : ` ↻${left(l.resetsAtMs - now)}`}
          </Text>
        ))}
      </Box>
    )
  })
}
