export type Limit = { kind: string; percentUsed: number; resetsAtMs: number | null }
export type Fill = {
  tokens: number | null
  window: number
  percent: number | null
  limits: Limit[]
  lastTurn: number
  total: number
}

declare module 'claude-code' {
  interface PluginState {
    'context-meter': { fill: Fill | null }
  }
}
