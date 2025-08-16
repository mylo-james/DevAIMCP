export async function validatePolicy(action, context, agent) {
    const ok = Boolean(action);
    return {
        content: [{ type: 'text', text: ok ? 'allowed' : 'denied' }],
    };
}
