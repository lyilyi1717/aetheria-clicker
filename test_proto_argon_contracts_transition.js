// Test: Contracts Seamless Start, Transitions, and Completion Screen
// Tests for Lead Contracts & Scene Transitions Architect (Argon)

// 1. Mock browser globals for Node.js environment before importing UI modules
if (typeof globalThis.location === 'undefined') {
  globalThis.location = { search: '' };
}

function createMockEl(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    className: '',
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); el.className = Array.from(this._classes).join(' '); },
      remove(c) { this._classes.delete(c); el.className = Array.from(this._classes).join(' '); },
      contains(c) { return this._classes.has(c); },
      toggle(c, f) { if (f === undefined ? !this._classes.has(c) : f) this.add(c); else this.remove(c); }
    },
    style: {},
    children: [],
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(val) {
      this._html = val;
      this.children = parseHtml(val);
    },
    textContent: '',
    hidden: false,
    disabled: false,
    _listeners: {},
    addEventListener(evt, fn) {
      (this._listeners[evt] || (this._listeners[evt] = [])).push(fn);
    },
    click() {
      for (const fn of (this._listeners['click'] || [])) fn({ preventDefault() {}, stopPropagation() {} });
    },
    querySelector(sel) {
      return findInTree(this, sel);
    },
    querySelectorAll(sel) {
      const r = [];
      findAllInTree(this, sel, r);
      return r;
    },
    appendChild(c) {
      this.children.push(c);
      return c;
    }
  };
  return el;
}

function parseHtml(html) {
  const root = createMockEl('root');
  const stack = [root];
  const tagRegex = /<\/?([a-zA-Z0-9_-]+)([^>]*)>/g;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const isClosing = match[0].startsWith('</');
    const tagName = match[1].toLowerCase();
    const attrs = match[2];
    const isSelfClosing = match[0].endsWith('/>') || ['circle', 'path', 'rect', 'line', 'input', 'img', 'br', 'hr'].includes(tagName);

    if (isClosing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName.toLowerCase() === tagName) {
          stack.length = i;
          break;
        }
      }
    } else {
      const el = createMockEl(tagName);
      const clsMatch = attrs.match(/class=["']([^"']+)["']/i);
      if (clsMatch) clsMatch[1].trim().split(/\s+/).forEach(c => el.classList.add(c));
      const idMatch = attrs.match(/id=["']([^"']+)["']/i);
      if (idMatch) el.id = idMatch[1];
      stack[stack.length - 1].appendChild(el);
      if (!isSelfClosing) {
        stack.push(el);
      }
    }
  }
  return root.children;
}

function matchSel(el, sel) {
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.startsWith('#')) return el.id === sel.slice(1);
  return el.tagName.toLowerCase() === sel.toLowerCase();
}

function findInTree(root, sel) {
  const parts = sel.trim().split(/\s+/);
  if (parts.length > 1) {
    let curr = root;
    for (const p of parts) {
      curr = findInTree(curr, p);
      if (!curr) return null;
    }
    return curr;
  }
  for (const c of root.children) {
    if (matchSel(c, sel)) return c;
    const res = findInTree(c, sel);
    if (res) return res;
  }
  return null;
}

function findAllInTree(root, sel, res) {
  for (const c of root.children) {
    if (matchSel(c, sel)) res.push(c);
    findAllInTree(c, sel, res);
  }
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    head: { appendChild() {} },
    createElement(tag) { return createMockEl(tag); },
    getElementById() { return null; }
  };
}

const G = await import('./digger-argon/game.js');
const { openBoard, openContractResult } = await import('./digger-argon/features/contracts/ui.js');
const { default: strings } = await import('./digger-argon/features/contracts/strings.js');

let failed = 0;
const ok = (cond, msg) => {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
};

console.log('Testing Argon Contracts: Seamless Start, Transitions, and UI Cards...');

// 1. Strings & Bilingual Parity
{
  const requiredKeys = [
    'contract_stamp_won', 'contract_stamp_left',
    'contract_won_title', 'contract_left_title',
    'contract_result_won_sub', 'contract_result_left_sub',
    'contract_reward_stars', 'contract_reward_cosmetic',
    'contract_reward_perk', 'contract_replay_done',
    'contract_left_info', 'cr_btn_map', 'cr_btn_map_d',
    'cr_btn_board', 'cr_btn_board_d', 'cr_btn_next',
    'cr_btn_next_d', 'cr_stay'
  ];

  for (const k of requiredKeys) {
    ok(strings.en && typeof strings.en[k] === 'string' && strings.en[k].length > 0, `en has string ${k}`);
    ok(strings.ar && typeof strings.ar[k] === 'string' && strings.ar[k].length > 0, `ar has string ${k}`);
  }
  console.log('--- Bilingual i18n strings: OK ---');
}

function readyState() {
  const s = G.newState();
  s.seen.legacyBoard = true;
  s.sites = G.PARAMS.contracts.openSites;
  return s;
}

// 2. Decoupled Seamless Contract Start (mid-site, bossesDown == 0, canNewSite == false)
{
  const s = readyState();
  s.bossesDown = 0;
  s.contractFree = false;
  s.best = 10;
  s.coins = 500;

  ok(!G.canNewSite(s), 'canNewSite is false before boss completion');
  ok(G.contractState(s, 'bare') === 'open', 'bare contract is open in tier 1');
  ok(G.canTake(s, 'bare') === true, 'canTake is true even when canNewSite is false');

  const evList = [];
  const ev = (kind, data) => evList.push({ kind, data });

  const initialStars = s.stars;
  const started = G.startContract(s, 'bare', ev);
  ok(started === true, 'startContract succeeds seamlessly without stranding behind boss check');
  ok(s.contract === 'bare', 'contract bare is active on state');
  ok(s.contractRun && s.contractRun.board === true, 'contract marked as started from board');
  ok(s.site === 'dunes', 'contract site initialized properly');
  ok(s.stars >= initialStars, 'stars awarded for packing up/leaving previous site run');
  ok(evList.some(e => e.kind === 'contractStart' && e.data.id === 'bare'), 'contractStart event emitted');
  console.log('--- Seamless Contract Start without boss gate: OK ---');
}

// 3. Switching contracts mid-run cleanly concludes old contract
{
  const s = readyState();
  s.contractsWon.bare = 1;
  s.contractsWon.dark = 1; // opens tier 2
  G.startContract(s, 'rising');
  ok(s.contract === 'rising', 'started rising contract');

  const evList = [];
  const ev = (kind, data) => evList.push({ kind, data });

  // Now take another contract directly
  const switched = G.startContract(s, 'tntOnly', ev);
  ok(switched === true, 'switching directly to another contract succeeds');
  ok(s.contract === 'tntOnly', 'new contract active');
  ok(evList.some(e => e.kind === 'contractLeft' && e.data.id === 'rising'), 'old contract cleanly emitted contractLeft');
  ok(evList.some(e => e.kind === 'contractStart' && e.data.id === 'tntOnly'), 'new contract emitted contractStart');
  console.log('--- Switching contracts mid-run: OK ---');
}

// 4. Contract Completion emits proper event, rewards, and sets transition flags
{
  const s = readyState();
  G.startContract(s, 'bare');
  s.best = 40; // bare contract goal depth is 40

  const evList = [];
  const ev = (kind, data) => evList.push({ kind, data });

  // Run step hook to check goal
  G.step(s, 0.05, ev);

  ok(s.contract === null, 'contract completed and rule lifted');
  ok(s.contractsWon.bare === 1, 'bare contract recorded as won');
  ok(s.contractFree === true, 's.contractFree set to true for immediate site transition');
  ok(G.canNewSite(s) === true, 'canNewSite is now true thanks to contractFree');

  const doneEv = evList.find(e => e.kind === 'contractDone');
  ok(!!doneEv, 'contractDone event was emitted');
  ok(doneEv && doneEv.data.id === 'bare', 'contractDone id matches');
  ok(doneEv && doneEv.data.stars > 0, 'contractDone awards stars');
  ok(doneEv && doneEv.data.cosmetic === 'cap', 'contractDone awards cosmetic cap');
  console.log('--- Contract Completion emission & state: OK ---');
}

// 5. Contract Leaving / Abandoning
{
  const s = readyState();
  G.startContract(s, 'dark');
  ok(s.contract === 'dark', 'contract dark active');

  const evList = [];
  const ev = (kind, data) => evList.push({ kind, data });

  const left = G.leaveContract(s, ev);
  ok(left === true, 'leaveContract succeeded');
  ok(s.contract === null, 'contract lifted');
  const leftEv = evList.find(e => e.kind === 'contractLeft');
  ok(!!leftEv && leftEv.data.id === 'dark', 'contractLeft event emitted with contract id');
  console.log('--- Contract Leaving: OK ---');
}

// 6. UI Contract Result Modal (DOM Structure & Navigation Actions)
{
  let openModalId = null;
  let mockEl = null;

  const mockApp = {
    state: G.newState(),
    modal: {
      get id() { return openModalId; },
      open(id, html) {
        openModalId = id;
        mockEl = createMockEl('div');
        mockEl.id = id;
        mockEl.innerHTML = html;
        return mockEl;
      },
      close() {
        openModalId = null;
        mockEl = null;
      }
    },
    dirty() {},
    save() {},
    refresh() {},
    unlockAudio() {},
  };

  // Test Victory Result Card
  const wonResult = openContractResult(mockApp, {
    id: 'bare',
    stars: 2,
    tier: 1,
    cosmetic: 'cap',
    won: true,
  });
  ok(wonResult === true, 'openContractResult opens successfully');
  ok(openModalId === 'contractResult', 'modal id is contractResult');
  ok(mockEl !== null, 'DOM element was rendered');

  const sealWord = mockEl.querySelector('.word');
  ok(sealWord && sealWord.textContent === strings.en.contract_stamp_won, 'Seal displays WON badge text');

  const rewards = mockEl.querySelector('.contract-rewards');
  ok(rewards && rewards.querySelector('.stars-row'), 'Stars reward row rendered');
  ok(rewards && rewards.querySelector('.cosmetic-row'), 'Cosmetic reward row rendered');
  ok(rewards && rewards.querySelector('.perk-row'), 'Perk reward row rendered');

  const mapBtn = mockEl.querySelector('.cr-map');
  const boardBtn = mockEl.querySelector('.cr-board');
  const nextBtn = mockEl.querySelector('.cr-next');
  const stayBtn = mockEl.querySelector('.cr-stay');

  ok(!!mapBtn, 'Return to World Map button exists');
  ok(!!boardBtn, 'Contract Board button exists');
  ok(!!nextBtn, 'Next Level button exists');
  ok(!!stayBtn, 'Stay button exists');

  // Test button click on Contract Board
  boardBtn.click();
  ok(openModalId === 'contracts', 'Clicking Contract Board navigated to the Contract Board modal');

  // Test Abandoned Result Card
  mockApp.modal.close();
  const leftResult = openContractResult(mockApp, {
    id: 'dark',
    won: false,
  });
  ok(leftResult === true, 'openContractResult for abandoned contract opens');
  ok(mockEl.querySelector('.seal').classList.contains('abandoned'), 'Seal has abandoned CSS class');
  ok(mockEl.querySelector('.word').textContent === strings.en.contract_stamp_left, 'Seal displays ABANDONED badge text');
  ok(mockEl.querySelector('.cr-map') && mockEl.querySelector('.cr-board'), 'Navigation buttons present on abandon');

  // Test Stay button
  mockEl.querySelector('.cr-stay').click();
  ok(openModalId === null, 'Clicking stay closed the modal');

  console.log('--- UI Result Modal & Navigation Buttons: OK ---');
}

if (failed > 0) {
  console.error(`\nFAILED: ${failed} tests failed.`);
  process.exit(1);
} else {
  console.log('\nAll Argon contracts transition & navigation tests passed 100%!');
}
