export async function switchAgent(args) {
  return { content: [{ type: 'text', text: `switched:${args.agent}` }] };
}
export async function listAvailableAgents() {
  return { content: [{ type: 'text', text: JSON.stringify(['sm', 'dev', 'qa']) }] };
}
