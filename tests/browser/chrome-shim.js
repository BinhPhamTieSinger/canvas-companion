// Fixture-only transport. This file is excluded from the packaged extension.
const listeners = [];
const changed = [];
const channel = new BroadcastChannel('canvas-companion-fixture');
channel.onmessage = event => changed.forEach(listener => listener(event.data, 'local'));
const ready = import('../../src/worker.js');
globalThis.chrome = {
  runtime: {
    id: 'synthetic-fixture',
    getURL: path => `${location.origin}/${path}`,
    onMessage: { addListener: listener => listeners.push(listener) },
    async sendMessage(message) {
      await ready;
      return new Promise((resolve, reject) => {
        const listener = listeners[0];
        if (!listener) { reject(new Error('Fixture worker did not start.')); return; }
        listener(message, { id: 'synthetic-fixture', url: `${location.origin}/options.html` }, resolve);
      });
    },
  },
  storage: {
    local: { async set(value) {
      const event = Object.fromEntries(Object.entries(value).map(([key, newValue]) => [key, { newValue }]));
      changed.forEach(listener => listener(event, 'local')); channel.postMessage(event);
    } },
    onChanged: {
      addListener: listener => changed.push(listener),
      removeListener: listener => { const index = changed.indexOf(listener); if (index >= 0) changed.splice(index, 1); },
    },
  },
};
