// Minimal browser WebExtension API stubs needed by parsers and settings module
(globalThis as Record<string, unknown>).browser = {
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
  tabs: {
    query: () => Promise.resolve([]),
    sendMessage: () => Promise.resolve(undefined),
  },
};
