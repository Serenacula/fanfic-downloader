// Minimal browser WebExtension API stubs needed by settings module
(globalThis as Record<string, unknown>).browser = {
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
};
