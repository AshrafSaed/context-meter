import { test, expect } from 'claude-code/testing'
test('fallback band draws on terminal and desktop', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'context-meter',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 5 },
    } as any)
    const found = await ui.find({ type: 'Text', text: /context-meter 0\.3\.1/ })
    expect(found).toBeDefined()
    await ui.unmount()
  }
})
