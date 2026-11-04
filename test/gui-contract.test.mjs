import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const code = await readFile(new URL('../dist/gui-experimental.cjs', import.meta.url), 'utf8');

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.listeners = new Map(); this.attributes = {}; this.value = ''; this.checked = false; this.disabled = false; this.hidden = false; this.className = ''; this.textContent = ''; }
  get firstChild() { return this.children[0]; }
  append(...children) { this.children.push(...children); }
  removeChild(element) { const i=this.children.indexOf(element); if(i>=0)this.children.splice(i,1); }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  setAttribute(k, v) { this.attributes[k] = v; }
  fire(event, extra = {}) {
    const fn = this.listeners.get(event);
    if (!fn) throw new Error(`No ${event} handler`);
    fn({ target:this, preventDefault() {}, clientY:10, ...extra });
  }
  getBoundingClientRect() { return { top:0, height:100 }; }
  find(predicate) { if (predicate(this)) return this; for(const child of this.children) { const hit=child.find?.(predicate); if(hit) return hit; } }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

function harness({ throwAt = Infinity, inbox = [] } = {}) {
  const Panel = Symbol('Panel');
  const Command = Symbol('Command');
  const Style = Symbol('Style');
  const MenuItem = Symbol('MenuItem');
  const added = new Map();
  const effects = [];
  const events = { prompts: [], canceled: [], toasts: [], toggles: [], store: undefined };
  const session = { id:'ses_test', key:'srv\nses_test', server: { id:'srv', client: { session: {
    prompt: async (input) => { if(events.prompts.length >= throwAt) throw new Error('injected error'); events.prompts.push(input); },
    inbox: {
      list: async () => inbox,
      cancel: async (input) => { events.canceled.push(input); inbox=inbox.filter((item)=>item.id!==input.inboxID); },
    },
  } } } };
  let store = { value:{items:[]}, ready:()=>true, set(value) { store.value=value; } };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    setInterval:()=>1,
    clearInterval:()=>{},
    document: { createElement:(tag)=>new Element(tag) },
    require(id) {
      if(id==='@opencode/plugin/gui')return {Plugin:{define:v=>v}, Panel, Command, Style, MenuItem};
      if(id==='effect')return {Schema:{Struct:v=>v, Array:v=>v, String:'string'}};
      if(id==='solid-js')return {
        createSignal:(initial)=> { let v=initial; return [()=>v,(next)=>{v=typeof next==='function'?next(v):next;return v;}]; },
        createMemo:(fn)=>fn, createEffect:(fn)=>{effects.push(fn);fn();}, onCleanup:()=>{},
      };
      throw new Error(`Unexpected runtime dependency: ${id}`);
    },
  });
  const definition = module.exports.default ?? module.exports;
  const ctx = {
    id:'opencode-queue-manager-experimental',
    t:(key)=>key,
    add:(key, value)=>{added.set(key,typeof value==='function'?value():value);},
    sessions: {current:()=>session},
    layout: {open:(...args)=>events.toggles.push(args),state:()=> 'closed'},
    storage: {store:()=>store},
    dialogs: {confirm:async()=>true, prompt:async()=> 'edited'},
    toast: {show:(input)=>{events.toasts.push(input); return {dismiss:()=>{}};}},
  };
  definition.setup(ctx);
  return { session, ctx, definition, added, Panel, Command, Style, events, store, root:()=>added.get(Panel).render({session}), refresh:()=>effects[1](), // re-run the reactive draft-list render, not the session-change reset effect inbox:(next)=>{inbox=next;} };
}

function click(root,text) {
  const btn=root.find((node)=>node.tagName==='button' && node.textContent===text);
  assert.ok(btn,`button ${text} exists`);
  btn.fire('click');
}

test('Desktop GUI default export registers panel, command, and stylesheet using only host-provided modules',()=>{
  const h=harness();
  assert.ok(h.added.has(h.Panel));
  assert.ok(h.added.has(h.Command));
  assert.ok(h.added.has(h.Style));
  assert.equal(h.added.get(h.Panel).region,'side');
  const cmd=h.added.get(h.Command);
  assert.equal(cmd.slash.name,'qm');
  cmd.run();
  assert.equal(h.events.toggles[0][0],'opencode-queue-manager-experimental:main');
});

test('Desktop plugin GUI stages 100 messages then publishes sequentially into native queue',async()=>{
  const h=harness();
  const dom=h.root();
  click(dom,'Taslağa ekle');
  await tick();
  assert.equal(h.store.value.items.length,100);
  assert.ok(h.store.value.items.every(x=>x==='devam et'));
  assert.equal(h.events.prompts.length,0,'draft stage does not contact OpenCode');
  click(dom,'Tümünü kuyruğa aktar');
  await new Promise((resolve)=>setTimeout(resolve,10));
  assert.equal(h.events.prompts.length,100);
  assert.ok(h.events.prompts.every(x=>x.sessionID==='ses_test' && x.delivery==='queue' && x.text==='devam et'));
  assert.equal(h.store.value.items.length,0);
});

test('Desktop UI preserves remaining drafts if native queue submission fails',async()=>{
  const h=harness({throwAt:2});
  const dom=h.root();
  dom.find((node)=>node.tagName==='input' && node.type==='number').value='3';
  click(dom,'Taslağa ekle');
  await tick();
  click(dom,'Tümünü kuyruğa aktar');
  await new Promise((resolve)=>setTimeout(resolve,10));
  assert.equal(h.events.prompts.length,2);
  assert.equal(h.store.value.items.length,1);
  assert.ok(h.events.toasts.some(x=>x.variant==='error'));
});

test('Desktop GUI supports line import and refuses oversized repeat counts',async()=>{
  const h=harness();
  const dom=h.root();
  const count=dom.find((node)=>node.tagName==='input' && node.type==='number');
  count.value='501';
  click(dom,'Taslağa ekle');
  await tick();
  assert.equal(h.store.value.items.length,0);
  const boxes=[];
  function walk(node){ if(node.tagName==='textarea') boxes.push(node); for(const child of node.children) walk(child); }
  walk(dom);
  assert.equal(boxes.length,2);
  boxes[1].value='devam et\n\nrun tests\n';
  click(dom,'Satırları ekle');
  await tick();
  assert.deepEqual(Array.from(h.store.value.items),['devam et','run tests']);
});


function findDraftCheck(root, index) {
  return root.find((node) => node.tagName === 'input'
    && node.attributes?.['aria-label'] === `#${index} seç`);
}
function findDraftHandle(root, index) {
  return root.find((node) => node.tagName === 'button'
    && node.attributes?.['aria-label']?.startsWith(`#${index} taşı:`));
}
function draftRow(root, index) {
  const check = findDraftCheck(root, index);
  assert.ok(check, 'draft checkbox #' + index + ' exists');
  return root.find((node) => node.tagName === 'div'
    && node.attributes?.role === 'listitem' && node.children.includes(check));
}
function pasteMessages(root, messages, h) {
  const areas = [];
  function walk(node) {
    if (node.tagName === 'textarea') areas.push(node);
    for (const child of node.children) walk(child);
  }
  walk(root);
  assert.equal(areas.length, 2);
  areas[1].value = messages.join('\n');
  click(root, 'Satırları ekle');
  h.refresh();
}

test('Desktop supports checkboxes and moving multiple draft messages up, down, start and end', () => {
  const h = harness();
  const root = h.root();
  pasteMessages(root, ['A','B','C','D','E'], h);
  for (const index of [2,4]) {
    const check = findDraftCheck(root, index);
    assert.ok(check);
    check.checked = true;
    check.fire('change');
    h.refresh();
  }
  click(root, '↑ Seçilileri yukarı');
  h.refresh();
  assert.deepEqual(Array.from(h.store.value.items), ['B','A','D','C','E']);
  click(root, '↓ Seçilileri aşağı');
  h.refresh();
  assert.deepEqual(Array.from(h.store.value.items), ['A','B','C','D','E']);
  click(root, '⇣ Sona');
  h.refresh();
  assert.deepEqual(Array.from(h.store.value.items), ['A','C','E','B','D']);
  click(root, '⇡ Başa');
  h.refresh();
  assert.deepEqual(Array.from(h.store.value.items), ['B','D','A','C','E']);
  assert.equal(h.events.prompts.length, 0, 'bulk draft moves never contact the model');
});

test('Desktop drag-and-drop moves selected drafts together, then keyboard moves a single draft', () => {
  const h = harness();
  const root = h.root();
  pasteMessages(root, ['A','B','C','D','E'], h);
  for (const index of [2,4]) {
    const check = findDraftCheck(root, index);
    check.checked = true; check.fire('change'); h.refresh();
  }
  const handle = findDraftHandle(root, 2);
  assert.ok(handle?.draggable, 'drag handle enabled');
  const transfer = { setData() {}, effectAllowed:'', dropEffect:'' };
  handle.fire('dragstart', { dataTransfer:transfer });
  const target = draftRow(root, 5);
  target.fire('dragover', {dataTransfer:transfer, clientY:10});
  target.fire('drop', {dataTransfer:transfer, clientY:10});
  h.refresh();
  assert.deepEqual(Array.from(h.store.value.items), ['A','C','B','D','E']);
  assert.equal(h.events.prompts.length, 0);
  const single = findDraftHandle(root, 1);
  single.fire('keydown', { altKey:true, key:'End' });
  h.refresh();
  assert.deepEqual(Array.from(h.store.value.items), ['C','B','D','E','A']);
  assert.equal(h.events.prompts.length, 0);
});

test('Select current page, select all, and select filtered matches keep draft data intact', () => {
  const h=harness();
  const root=h.root();
  pasteMessages(root, ['alpha','beta','alpha','gamma'], h);
  click(root,'Tümünü seç'); h.refresh();
  assert.ok(root.find((node)=>node.tagName==='span'
    && node.textContent.startsWith('4 seçili')));
  click(root,'Seçimi kaldır'); h.refresh();
  click(root,'Eşleşenleri seç'); h.refresh();
  assert.equal(h.store.value.items.length,4);
  click(root,'↑ Seçilileri yukarı'); h.refresh();
  assert.deepEqual(Array.from(h.store.value.items), ['alpha','beta','alpha','gamma']);
});
