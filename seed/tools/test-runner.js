export async function runTests(test_type, pattern, watch) {
  return {
    content: [
      { type: 'text', text: `tests:${test_type || ''}:${pattern || ''}:${watch ? 'watch' : ''}` },
    ],
  };
}
