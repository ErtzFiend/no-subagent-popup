/** Requires the companion desktop patch shipped in core/. No private SDK hooks. */
export default {
  id: 'no-subagent-popup',
  name: 'No Subagent Popup',
  description: 'Nested live subagents and same-window spectator navigation (requires companion desktop patch).',
  defaultEnabled: true,
  register(ctx) {
    ctx.register({ id: 'navigation-policy', area: 'session.noSubagentPopup', data: { enabled: true } })
  }
}
