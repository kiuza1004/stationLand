const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 브라우저 윈도우 환경 구성
const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Math: Math,
  Date: Date,
  JSON: JSON,
  btoa: (s) => Buffer.from(s).toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString(),
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  addEventListener: function(event, cb) {
    domListeners[`window_${event}`] = cb;
  }
};

// DOM 모의
const domListeners = {};
const elements = {};

function createMockElement(id = 'elem_' + Math.random()) {
  const el = {
    id,
    className: '',
    style: {},
    classList: {
      add: function(c) { this._c = this._c || []; this._c.push(c); },
      remove: function(c) { this._c = (this._c || []).filter(x => x !== c); },
      contains: function(c) { return (this._c || []).includes(c); }
    },
    innerHTML: '',
    textContent: '',
    value: '',
    disabled: false,
    children: [],
    dataset: {},
    addEventListener: function(event, cb) {
      domListeners[`${id}_${event}`] = cb;
    },
    appendChild: function(child) {
      this.children.push(child);
    },
    querySelectorAll: function() { return []; },
    querySelector: function() { return null; },
    remove: function() {}
  };
  return el;
}

sandbox.window = sandbox;
sandbox.window.location = {
  hostname: 'kiuza1004.github.io',
  href: 'https://kiuza1004.github.io/stationLand/'
};
sandbox.localStorage = {
  data: {},
  getItem: function(k) { return this.data[k] || null; },
  setItem: function(k, v) { this.data[k] = v; }
};
sandbox.window.localStorage = sandbox.localStorage;
sandbox.document = {
  getElementById: function(id) {
    if (!elements[id]) elements[id] = createMockElement(id);
    return elements[id];
  },
  createElement: function(tag) {
    return createMockElement();
  },
  querySelectorAll: function() { return []; },
  addEventListener: function(event, cb) {
    domListeners[`document_${event}`] = cb;
  }
};
sandbox.navigator = { serviceWorker: null };
sandbox.fetch = async (url) => {
  throw new Error('fetch disabled in test');
};

const ctx = vm.createContext(sandbox);

function runFile(relPath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf-8');
  console.log(`Executing ${relPath}...`);
  vm.runInContext(code, ctx);
}

try {
  runFile('public/js/subwayData.js');
  runFile('public/js/clientEngine.js');
  runFile('public/js/state.js');
  runFile('public/js/minigame.js');
  runFile('public/js/simulator.js');
  runFile('public/js/app.js');

  console.log('Dispatching DOMContentLoaded...');
  if (domListeners['document_DOMContentLoaded']) {
    domListeners['document_DOMContentLoaded']();
  }

  setTimeout(() => {
    const stationCards = elements['stationCards'];
    console.log('stationCards children count:', stationCards.children.length);
    console.log('stationCards innerHTML preview:\n', stationCards.innerHTML.slice(0, 300));
    console.log('\nSUCCESS! DOM updated properly in sandbox.');
    process.exit(0);
  }, 100);

} catch (e) {
  console.error('EXCEPTION:', e);
  process.exit(1);
}
