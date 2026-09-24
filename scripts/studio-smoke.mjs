#!/usr/bin/env node
// Run: npm run build && node scripts/studio-smoke.mjs (Node 22+).
// Optional: CHROME_PATH points to a different installed Chrome executable.
// --screenshots saves light/dark desktop/mobile review captures in .next/color-review.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../out/', import.meta.url));
const screenshots = process.argv.includes('--screenshots');
const captureDir = fileURLToPath(new URL('../.next/color-review/', import.meta.url));
const captures = [];
const results = [];
const browserErrors = [];
let server, chrome, profile, socket, stopping = false;
const pending = new Map();
let sequence = 0;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

async function cleanup() {
  if (stopping) return;
  stopping = true;
  socket?.close();
  for (const { reject, timer } of pending.values()) {
    clearTimeout(timer);
    reject(new Error('Smoke test stopped'));
  }
  pending.clear();
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    const exited = new Promise(r => chrome.once('exit', r));
    chrome.kill('SIGTERM');
    await Promise.race([exited, delay(2000)]);
    if (chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill('SIGKILL');
      await Promise.race([exited, delay(2000)]);
    }
  }
  if (server) {
    server.closeAllConnections();
    await new Promise(r => server.close(r));
  }
  if (profile) await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 });
}
const watchdog = setTimeout(() => {
  console.error('FAIL harness: exceeded 90 seconds');
  process.exitCode = 1;
  void cleanup().finally(() => process.exit(1));
}, 90000);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  void cleanup().finally(() => process.exit(1));
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 6000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function wait(expression, message = expression) {
  const deadline = Date.now() + 3500;
  let value;
  do {
    value = await evaluate(expression);
    if (value) return value;
    await delay(60);
  } while (Date.now() < deadline);
  throw new Error(`Timed out: ${message}; last value=${JSON.stringify(value)}`);
}
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const tab = (list, name) => `[...document.querySelectorAll('[role="tablist"][aria-label="${list}"] [role="tab"]')].find(e => e.textContent.trim() === '${name}')`;
const outer = name => tab('Workspace view', name);
const inner = name => tab('Design preview context', name);
const named = (selector, text) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.trim() === ${JSON.stringify(text)})`;
async function click(expression) {
  const point = await evaluate(`(() => { const e = ${expression}; if (!e) throw Error('Missing click target'); e.scrollIntoView({block:'center', behavior:'instant'}); const r=e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('[hidden]')) throw Error('Hidden click target'); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
}
async function choose(expression) {
  await click(expression);
  await wait(`(${expression})?.getAttribute('aria-selected') === 'true'`);
}
async function type(selector, value) {
  await click(q(selector));
  await evaluate(`${q(selector)}.select()`);
  await send('Input.insertText', { text: value });
  await wait(`${q(selector)}.value === ${JSON.stringify(value)}`);
  await evaluate(`${q(selector)}.blur()`);
}
async function key(key, code = key) {
  const virtual = { ArrowRight: 39, ArrowLeft: 37, Enter: 13, Tab: 9 }[key];
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtual, ...(key === 'Enter' ? { text: '\r' } : {}) });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtual });
}
async function check(name, run) {
  try { await run(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false }); console.error(`FAIL ${name}: ${error.message}`); }
}
async function panels(active, inactive) {
  await wait(`(() => { const a=${active}, b=${inactive}; const p=document.getElementById(a?.getAttribute('aria-controls')); const h=document.getElementById(b?.getAttribute('aria-controls')); return a?.getAttribute('aria-selected')==='true' && b?.getAttribute('aria-selected')==='false' && p && h && !p.hidden && p.getBoundingClientRect().height>0 && h.hidden && getComputedStyle(h).display==='none'; })()`, 'selected tab visible; inactive panel mounted, hidden and display:none');
}
// Stage2 uses real CDP input; evaluation only reads state/styles or positions controls.
const sourceInput = '.editor-fields input[type="text"][id$="-source"]';
const stored = () => evaluate(`JSON.parse(localStorage.getItem('bambiui.design-system.v1'))`);
const recipe = mode => `[aria-label="${mode} palette"]`;
const candidate = () => evaluate(`JSON.stringify([...document.querySelectorAll('[aria-label$=" palette"] [style]')].map(e => e.getAttribute('style')))`);
const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
function contrast(ink, fill) {
  const luminance = value => value.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
  const a = luminance(ink), b = luminance(fill);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
async function openDetails(summary) {
  const target = named('summary', summary);
  if (!await evaluate(`(${target}).parentElement.open`)) await click(target);
}
async function capture(name) {
  if (!screenshots) return;
  await mkdir(captureDir, { recursive: true });
  // Viewport capture preserves the inspector's independent scroll position.
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const path = resolve(captureDir, `${name}.png`);
  await writeFile(path, Buffer.from(data, 'base64'));
  captures.push(path);
  console.log(`SCREENSHOT ${path}`);
}
async function stage2Type(selector, value) {
  await click(q(selector));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 4, commands: ['selectAll'] });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 4 });
  await send('Input.insertText', { text: value });
  await key('Tab');
  await wait(`${q(selector)}.value === ${JSON.stringify(value)}`);
}
const specimen = '[aria-label="Button preview"]';
const workspace = 'input[name="workspace"]';
const chromeStyle = `JSON.stringify([...document.querySelectorAll('.studio-sidebar,.preview-toolbar,.token-editor,.workspace-heading')].map(e => { const s=getComputedStyle(e); return [s.backgroundColor,s.color]; }))`;
const computed = selector => `(() => {const s=getComputedStyle(document.querySelector(${JSON.stringify(selector)})); return {background:s.backgroundColor,foreground:s.color};})()`;
const row = `([...document.querySelectorAll('[aria-label="Button token inheritance"] tbody tr')].find(e => e.querySelector('th')?.textContent === '--button-background')?.textContent || '')`;

try {
  assert.equal(typeof WebSocket, 'function', 'Use Node 22+ with built-in WebSocket');
  await stat(resolve(root, 'index.html'));
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let path = resolve(root, `.${pathname}`);
      if (path !== resolve(root) && !path.startsWith(resolve(root) + sep)) { res.writeHead(403).end(); return; }
      try { if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html'); }
      catch { if (!extname(path)) path += '.html'; }
      const data = await readFile(path);
      res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise((r, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', r); });
  profile = await mkdtemp(resolve(tmpdir(), 'bambiui-smoke-'));
  chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '', spawnError;
  chrome.on('error', error => { spawnError = error; });
  chrome.stderr.on('data', data => { stderr = (stderr + data).slice(-12000); });
  let port;
  const launchDeadline = Date.now() + 12000;
  while (!port && Date.now() < launchDeadline) {
    if (spawnError) throw spawnError;
    if (chrome.exitCode !== null) throw new Error(`Chrome exited: ${stderr}`);
    try { port = Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); } catch { await delay(100); }
  }
  assert.ok(port, `Chrome debugging port unavailable: ${stderr}`);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(5000) })).json();
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, reject) => { socket.addEventListener('open', r, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id); clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(JSON.stringify(message.error))); else entry.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      browserErrors.push(`runtime: ${message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text}`);
    } else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      browserErrors.push(`console: ${message.params.args.map(a => a.value ?? a.description).join(' ')}`);
    } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      browserErrors.push(`browser: ${message.params.entry.text}`);
    }
  });
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  await wait(`document.querySelector('.editor-fields') && !document.querySelector('.editor-fields').disabled`, 'hydrated studio');

  await check('outer Design/Develop tabs hide the correct mounted panels', async () => {
    await panels(outer('Design'), outer('Develop'));
    await choose(outer('Develop')); await panels(outer('Develop'), outer('Design'));
    await choose(outer('Design')); await panels(outer('Design'), outer('Develop'));
  });
  await check('sidebar Button selection persists across view switches', async () => {
    await click(named('nav[aria-label="Components"] button', 'Button'));
    for (const view of ['Develop', 'Design']) {
      await choose(outer(view));
      await wait(`document.querySelector('nav[aria-label="Components"] [aria-current="true"]')?.textContent.trim() === 'Button' && document.querySelector('h1')?.textContent === 'Button, your way.'`);
    }
    await wait(`${q(specimen)} !== null`);
  });
  await check('specimen interaction survives context and view switches', async () => {
    await choose(outer('Design')); await choose(inner('Components'));
    await click(named(`${specimen} button`, 'Get started'));
    await wait(`${q(specimen)}.textContent.includes('successfully (1)')`);
    await choose(inner('Scenario')); await panels(inner('Scenario'), inner('Components'));
    await choose(outer('Develop')); await choose(outer('Design')); await choose(inner('Components'));
    await wait(`${q(specimen)}.textContent.includes('successfully (1)')`);
    await click(named(`${specimen} button`, 'All set'));
    await wait(`${q(specimen)}.textContent.includes('successfully (2)')`);
  });
  await check('Scenario typed value and submit state survive context/view switches', async () => {
    await choose(outer('Design')); await choose(inner('Scenario'));
    await type(workspace, 'stage1 smoke workspace');
    await click(named('form button', 'Save changes'));
    await wait(`document.querySelector('form [role="status"]')?.textContent.includes('preview · 1')`);
    await choose(inner('Components')); await choose(outer('Develop')); await choose(outer('Design')); await choose(inner('Scenario'));
    assert.equal(await evaluate(`${q(workspace)}.value`), 'stage1 smoke workspace');
    await wait(`document.querySelector('form [role="status"]')?.textContent.includes('preview · 1')`);
  });
  await check('global background/foreground reach computed specimen and scenario, not studio chrome', async () => {
    await choose(outer('Design'));
    const before = await evaluate(chromeStyle);
    await click(named('.editor-scope button', 'Global tokens'));
    await type('#token-background', '#e1edf7'); await type('#token-foreground', '#263748');
    await choose(inner('Components'));
    // Input's painted wrapper inherits base surfaces; Button aliases primary/onPrimary.
    await click(named('nav[aria-label="Components"] button', 'Input'));
    await wait(`JSON.stringify(${computed('[aria-label="Input preview"] div:has(> input[type="email"])')}) === JSON.stringify({background:'rgb(225, 237, 247)',foreground:'rgb(38, 55, 72)'})`, 'specimen input computed colors');
    await choose(inner('Scenario'));
    await wait(`JSON.stringify(${computed('form div:has(> input[name="workspace"])')}) === JSON.stringify({background:'rgb(225, 237, 247)',foreground:'rgb(38, 55, 72)'})`, 'scenario input computed colors');
    assert.equal(await evaluate(chromeStyle), before, 'studio chrome colors changed');
    await click(named('nav[aria-label="Components"] button', 'Button'));
  });
  await check('component token override appears in Develop; reset restores live inheritance', async () => {
    await click(named('nav[aria-label="Components"] button', 'Button'));
    await click(named('.editor-scope button', 'Global tokens'));
    const primary = await evaluate(`${q('#token-primary')}.value`);
    await click(named('.editor-scope button', 'Component'));
    await type('#token-background', '#abc123');
    await choose(outer('Develop'));
    await wait(`${row}.includes('Component override') && ${row}.includes('#abc123')`, 'Develop override row');
    await click(q('[aria-label="Reset background override"]'));
    await wait(`${row}.includes('Inherited: --ds-primary') && ${row}.includes(${JSON.stringify(primary)})`, 'Develop inherited row after reset');
    await click(named('.editor-scope button', 'Global tokens'));
    await type('#token-primary', '#dceafa');
    await wait(`${row}.includes('#dceafa')`, 'reset alias follows subsequent global edits');
    await choose(outer('Design')); await choose(inner('Components'));
    await wait(`${computed(`${specimen} button[data-variant="primary"]`)}.background === 'rgb(220, 234, 250)'`, 'computed reset inheritance');
  });
  for (const [name, from, to] of [['outer', outer('Design'), outer('Develop')], ['inner', inner('Components'), inner('Scenario')]]) {
    await check(`${name} tabs: arrow moves focus without activation; Enter activates`, async () => {
      await choose(outer('Design')); await choose(from);
      await evaluate(`(${from}).focus()`); await key('ArrowRight');
      await wait(`document.activeElement === (${to}) && (${from}).getAttribute('aria-selected') === 'true'`, 'manual arrow focus');
      await key('Enter'); await panels(to, from);
    });
  }
  await check('375px viewport: no document overflow; inspector reachable in both views', async () => {
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: false });
    for (const view of ['Design', 'Develop']) {
      await choose(outer(view));
      for (const context of view === 'Design' ? ['Components', 'Scenario'] : [null]) {
        if (context) await choose(inner(context));
        await wait(`document.documentElement.scrollWidth <= 375 && document.body.scrollWidth <= 375`, `${view}/${context || 'reference'} document overflow`);
        await click(q('#token-background'));
        assert.equal(await evaluate(`(() => { const e=document.querySelector('#token-background'), r=e.getBoundingClientRect(); return document.activeElement===e && r.left>=0 && r.right<=375 && r.top>=0 && r.bottom<=812 && e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); })()`), true, `${view}/${context}: inspector not focusable, visible or hit-testable`);
      }
    }
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await choose(outer('Design')); await choose(inner('Components'));
  await click(named('.editor-scope button', 'Global tokens'));

  await check('stage2: default source, Generate isolation, stale warning and invalid seeds retain recipes', async () => {
    assert.equal(await evaluate(`${q(sourceInput)}.value`), '#e8673c');
    const before = await stored(), initial = await candidate();
    await stage2Type(sourceInput, '#4361ee');
    await wait(`document.querySelector('.editor-fields').textContent.includes('Source changed. Generate again')`);
    assert.equal(await candidate(), initial);
    await click(named('button', 'Generate palettes'));
    assert.notEqual(await candidate(), initial);
    assert.deepEqual(await stored(), before);
    const generated = await candidate();
    for (const invalid of ['', '#abc', '#gg0000', 'e8673c']) {
      await stage2Type(sourceInput, invalid);
      assert.equal(await evaluate(`(${named('button', 'Generate palettes')}).disabled && ${q(sourceInput)}.getAttribute('aria-invalid') === 'true'`), true);
      assert.equal(await candidate(), generated);
      assert.deepEqual(await stored(), before);
    }
    await stage2Type(sourceInput, '#4361ee');
  });
  await check('stage2: all presets generate without auto-applying', async () => {
    const before = await stored();
    for (const [name, hex] of [['Iris', '#7660d5'], ['Ocean', '#247db3'], ['Forest', '#287c60'], ['Graphite', '#27272a'], ['Terracotta', '#e8673c']]) {
      const prior = await candidate();
      await click(q(`[aria-label="Generate ${name} palette"]`));
      await wait(`${q(sourceInput)}.value === '${hex}'`);
      assert.notEqual(await candidate(), prior);
      assert.deepEqual(await stored(), before);
      assert.equal(await evaluate(`(${named('summary', 'Generated from ' + hex)}) != null`), true);
    }
  });
  await check('stage2: prepare nondefault numeric globals, name and component overrides', async () => {
    await stage2Type('[aria-label="Design system name"]', 'stage2 color review');
    await stage2Type('#token-radius', '13');
    await stage2Type('#token-controlHeightMd', '42');
    await click(named('.editor-scope button', 'Component'));
    await stage2Type('#token-background', '#123456');
    await stage2Type('#token-foreground', '#fedcba');
    await stage2Type('#token-paddingX', '23');
    await click(named('.editor-scope button', 'Global tokens'));
    const state = await stored();
    assert.equal(state.global.radius, 13);
    assert.equal(state.global.controlHeightMd, 42);
    assert.deepEqual(state.components.button, { background: '#123456', foreground: '#fedcba', paddingX: 23 });
  });
  for (const mode of ['Light', 'Dark']) {
    await check(`stage2: ${mode} Apply preserves metadata/numerics/overrides; computed recipes and CSS/JSON`, async () => {
      const before = await stored(), generated = await candidate();
      await openDetails(`${mode} role recipes & contrast`);
      const roles = await evaluate(`(() => { const section=${q(recipe(mode))}; return [...section.querySelectorAll('h5')].map(h => { const e=h.parentElement; return {name:h.textContent.toLowerCase(), values:Object.fromEntries([...e.querySelectorAll('dl > div')].map(d => [d.querySelector('dt').textContent,d.querySelector('code').textContent])), pairs:[...e.querySelectorAll('span[style]')].map(s => ({label:s.textContent, ink:getComputedStyle(s).color, fill:getComputedStyle(s).backgroundColor}))}; }); })()`);
      assert.equal(roles.length, 6);
      for (const role of roles) {
        for (const [i, state] of ['solid', 'hover', 'active', 'subtle'].entries()) {
          const pair = role.pairs[i], ink = state === 'subtle' ? 'onSubtle' : 'onSolid';
          assert.equal(pair.fill, rgb(role.values[state]));
          assert.equal(pair.ink, rgb(role.values[ink]));
          const ratio = contrast(pair.ink, pair.fill);
          assert.ok(ratio >= 4.5, `${mode}/${role.name}/${state}: ${ratio}`);
          assert.ok(pair.label.includes(`${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`));
        }
      }
      await click(named('button', `Apply ${mode.toLowerCase()} colors`));
      const after = await stored();
      assert.notDeepEqual(after.global, before.global);
      assert.equal(after.name, before.name); assert.equal(after.version, before.version);
      assert.deepEqual(after.components, before.components);
      for (const [key, value] of Object.entries(before.global).filter(([, value]) => typeof value === 'number')) assert.equal(after.global[key], value, key);
      assert.equal(Object.values(after.global).filter(value => typeof value === 'string').length, 17);
      assert.equal(await candidate(), generated);
      assert.equal(await evaluate(`${q(sourceInput)}.value`), '#e8673c');
      await wait(`${q(recipe(mode))}.textContent.includes('Matches global colors')`);
      const mini = await evaluate(`(() => { const e=${q(recipe(mode))}.querySelector('strong').parentElement; return {ink:getComputedStyle(e).color,fill:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor,muted:getComputedStyle(e.querySelector('p')).color,roles:[...e.querySelectorAll('span')].map(s=>({name:s.textContent.toLowerCase(),ink:getComputedStyle(s).color,fill:getComputedStyle(s).backgroundColor}))}; })()`);
      assert.equal(mini.ink, rgb(after.global.foreground)); assert.equal(mini.fill, rgb(after.global.background));
      assert.equal(mini.border, rgb(after.global.border)); assert.equal(mini.muted, rgb(after.global.mutedForeground));
      for (const role of mini.roles) {
        assert.equal(role.fill, rgb(after.global[role.name]));
        assert.equal(role.ink, rgb(after.global['on' + role.name[0].toUpperCase() + role.name.slice(1)]));
      }
      await click(q('[aria-label="Export tokens"]'));
      try {
        await click(named('[aria-label="Export format"] button', 'JSON'));
        assert.deepEqual(JSON.parse(await evaluate(`${q('[aria-label="Exported tokens"]')}.textContent`)), after);
        await click(named('[aria-label="Export format"] button', 'CSS'));
        const css = await evaluate(`${q('[aria-label="Exported tokens"]')}.textContent`);
        for (const [key, value] of Object.entries(after.global)) {
          const kebab = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
          assert.ok(css.includes(`--ds-${kebab}: ${value}${typeof value === 'number' ? 'px' : ''};`), `CSS ${key}`);
        }
        assert.ok(css.includes('--button-background: #123456;'));
        assert.ok(!css.includes('palette.source'));
      } finally {
        await click(q('[aria-label="Close export dialog"]'));
        await wait(`!document.querySelector('.export-dialog') && !document.querySelector('.studio-backdrop')`, 'export dialog exit animation complete');
      }
      for (const view of ['Develop', 'Design']) {
        await choose(outer(view));
        await click(named('.editor-scope button', 'Component'));
        await click(named('.editor-scope button', 'Global tokens'));
        assert.equal(await evaluate(`${q(sourceInput)}.value`), '#e8673c');
        assert.equal(await candidate(), generated);
        assert.deepEqual(await stored(), after);
      }
      await click(q(`${recipe(mode)} h4`));
      await capture(`${mode.toLowerCase()}-desktop`);
    });
  }
  await check('stage2: manual global and component equal-color warnings match computed final pairs', async () => {
    const primary = (await stored()).global.primary;
    await stage2Type('#token-onPrimary', primary);
    await wait(`${q('[data-contrast-check="global.onPrimary.primary"]')}?.textContent.includes('Below target: 1.00:1')`);
    await click(named('.editor-scope button', 'Component'));
    await stage2Type('#token-foreground', '#123456');
    await wait(`${q('[data-contrast-check="button.foreground"]')}?.textContent.includes('Below target: 1.00:1')`);
    const pair = await evaluate(computed(`${specimen} button[data-variant="primary"]`));
    assert.equal(pair.background, rgb('#123456')); assert.equal(pair.foreground, pair.background);
    assert.equal(await evaluate(`${q('[data-contrast-check="button.foreground"]')}.querySelector('code').textContent`), '#123456 on #123456');
    await click(named('.editor-scope button', 'Global tokens'));
  });
  await check('stage2: current primary explicitly resyncs source and generates without applying', async () => {
    const before = await stored();
    await click(named('button', 'Use current primary'));
    await wait(`${q(sourceInput)}.value === ${JSON.stringify(before.global.primary)}`);
    assert.equal(await evaluate(`(${named('summary', 'Generated from ' + before.global.primary)}) != null`), true);
    assert.deepEqual(await stored(), before);
    await stage2Type(sourceInput, '#abcdef');
    await wait(`document.querySelector('.editor-fields').textContent.includes('Source changed. Generate again')`);
  });
  await check('stage2: 375px expanded recipes and diagnostics have no page overflow', async () => {
    await click(q('[aria-label="Generate Terracotta palette"]'));
    await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: false });
    for (const mode of ['Light', 'Dark']) {
      await click(named('button', `Apply ${mode.toLowerCase()} colors`));
      await openDetails(`${mode} role recipes & contrast`);
      const report = q('[aria-label="Current contrast checks"] details');
      if (!await evaluate(`${report}.open`)) await click(`${report}.querySelector('summary')`);
      for (const view of ['Develop', 'Design']) {
        await choose(outer(view));
        await wait('document.documentElement.scrollWidth <= 375 && document.body.scrollWidth <= 375', `${mode}/${view}: expanded builder and diagnostics overflow`);
      }
      await click(q(`${recipe(mode)} h4`));
      await capture(`${mode.toLowerCase()}-mobile`);
      await click(q('#token-primary'));
      assert.equal(await evaluate(`document.activeElement === ${q('#token-primary')}`), true);
    }
  });
  await check('no browser console/runtime/resource errors', async () => {
    await delay(250);
    assert.deepEqual(browserErrors, []);
  });
} catch (error) {
  results.push({ name: 'harness setup/execution', passed: false });
  console.error(`FAIL harness setup/execution: ${error.stack}`);
} finally {
  try { await cleanup(); } catch (error) { results.push({ name: 'cleanup', passed: false }); console.error(`FAIL cleanup: ${error.stack}`); }
  clearTimeout(watchdog);
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
