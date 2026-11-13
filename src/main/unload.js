// "Leave site?" prompts.
swallowEvents(['beforeunload'], 'unload', (e) => e.target === window);
