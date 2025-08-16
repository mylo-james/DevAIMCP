export async function exportData(args) {
  const payload = { ...args, exportedAt: new Date().toISOString() };
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}
