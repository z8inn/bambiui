#!/usr/bin/env node
// Run: npm run build && node scripts/studio-smoke.mjs (Node 22+).
// Optional: CHROME_PATH points to a different installed Chrome executable.
// --screenshots saves stage3 light/dark/editor/comparison captures in .next/color-review.
// Uses the existing out/ build; no rebuild, app mutation or dependencies required.
// CDP accessibility-tree assertions are not a screen-reader session. CSS zoom is
// explicitly a reflow simulation, not native browser zoom. Contrast samples use
// opaque computed colors, not pixel/antialiasing analysis or an exhaustive audit.
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
// Exclude hidden contexts and the non-editing pane when Compare mounts both.
const visible = `e => !!e.getClientRects().length && !e.closest('[hidden]') && (!e.closest('.theme-pane') || e.closest('.theme-pane').hasAttribute('data-active'))`;
const q = selector => `[...document.querySelectorAll(${JSON.stringify(selector)})].find(e => !e.closest('[hidden]') && (!e.closest('.theme-pane') || e.closest('.theme-pane').hasAttribute('data-active')))`;
const tab = (list, name) => `[...document.querySelectorAll('[role="tablist"][aria-label="${list}"] [role="tab"]')].find(e => e.textContent.trim() === '${name}')`;
const outer = name => tab('Workspace view', name);
const inner = name => tab('Design preview context', name);
const named = (selector, text, visibility = visible) => `[...document.querySelectorAll(${JSON.stringify(selector)})].filter(${visibility}).find(e => e.textContent.trim() === ${JSON.stringify(text)})`;
// Both comparison headers are actionable, not just the currently edited pane.
const editTheme = mode => named('.theme-pane-header button', `Edit ${mode} theme`, `e => !!e.getClientRects().length && !e.closest('[hidden]')`);
async function click(expression) {
  assert.ok(await evaluate(`!!(${expression})`), `Missing click target: ${expression}`);
  await evaluate(`(${expression}).scrollIntoView({block:'center', behavior:'instant'})`);
  await evaluate('new Promise(resolve => requestAnimationFrame(resolve))');
  const point = await evaluate(`(() => { const e = ${expression}; const r=e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('[hidden]')) throw Error('Hidden click target'); const x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y); if (!e.contains(hit)) throw Error('Click target occluded: '+e.outerHTML+'; hit: '+hit?.outerHTML); return {x,y}; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  await evaluate('new Promise(resolve => requestAnimationFrame(resolve))');
}
async function choose(expression) {
  await click(expression);
  await wait(`(${expression})?.getAttribute('aria-selected') === 'true'`);
}
async function type(selector, value) {
  await stage2Type(selector, value);
}
async function key(key, code = key) {
  const virtual = { ArrowRight: 39, ArrowLeft: 37, Enter: 13, Tab: 9, ' ': 32 }[key];
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
const rgb = hex => {
  // The production CSS minifier can shorten authored six-digit custom properties.
  const full = /^#[\da-f]{3}$/i.test(hex) ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex;
  assert.match(full, /^#[\da-f]{6}$/i, 'expected opaque hex color');
  return `rgb(${[1, 3, 5].map(i => parseInt(full.slice(i, i + 2), 16)).join(', ')})`;
};
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
const computed = selector => `(() => {const s=getComputedStyle(${q(selector)}); return {background:s.backgroundColor,foreground:s.color};})()`;
const row = `([...document.querySelectorAll('[aria-label="Button token inheritance"] tbody tr')].find(e => e.querySelector('th')?.textContent === '--button-background')?.textContent || '')`;
const themeControl = name => named('[aria-label="Design theme"] button', name);
const appearance = name => named('[aria-label="Editor appearance"] button', name);
const selectComponent = name => click(`[...document.querySelectorAll('nav[aria-label="Components"] button')].find(e=>e.textContent.trim().replace(', has custom tokens','')===${JSON.stringify(name)})`);
async function pointer(expression, event = 'mouseMoved') {
  const point = await evaluate(`(() => {const e=${expression}; e.scrollIntoView({block:'center',behavior:'instant'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send('Input.dispatchMouseEvent', {type:event,...point,...(event === 'mouseMoved' ? {} : {button:'left',clickCount:1})});
  await delay(180);
}
async function keyboardFocus(expression) {
  // Clicking then tabbing around the same control enables genuine keyboard modality.
  await click(expression);
  await key('Tab');
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
  assert.equal(await evaluate(`document.activeElement === (${expression})`), true, `keyboard focus target: ${JSON.stringify(await evaluate(`({target:(${expression}).outerHTML,active:document.activeElement.outerHTML})`))}`);
}
async function renderedPairs(selector) {
  return evaluate(`(() => {
    const root=${q(selector)};
    const bg=e=>{for(;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;if(c!=='rgba(0, 0, 0, 0)' && c!=='transparent')return c;}return 'rgb(255, 255, 255)';};
    return [...root.querySelectorAll('*')].filter(e=>e.getClientRects().length && !e.closest('[data-disabled]')).flatMap(e=>{
      const s=getComputedStyle(e), pairs=[];
      if([...e.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) pairs.push({label:e.textContent.trim(),ink:s.color,fill:bg(e),minimum:4.5});
      if(e.matches('input:not([type="hidden"])')) {
        pairs.push({label:'input text',ink:s.color,fill:bg(e),minimum:4.5});
        if(e.placeholder) pairs.push({label:'placeholder',ink:getComputedStyle(e,'::placeholder').color,fill:bg(e),minimum:4.5});
      }
      if(e.matches('[role="switch"],[role="checkbox"],div:has(>input:not([type="hidden"]))') && parseFloat(s.borderTopWidth)>0) {
        pairs.push({label:'field boundary outside',ink:s.borderTopColor,fill:bg(e.parentElement),minimum:3});
                if(!e.matches('[role="switch"],[role="checkbox"]') || e.getAttribute('aria-checked')==='false') pairs.push({label:'field boundary inside',ink:s.borderTopColor,fill:bg(e),minimum:3});
      }
      if(e.matches('article[data-variant="outlined"],span[data-variant="outline"],button[data-variant="outline"]') && parseFloat(s.borderTopWidth)>0) pairs.push({label:'outlined boundary',ink:s.borderTopColor,fill:bg(e),minimum:3});
      if(e.matches('[role="switch"]') || (e.matches('[role="checkbox"]') && e.getAttribute('aria-checked')!=='false')) pairs.push({label:'thumb/mark on fill',ink:s.color,fill:bg(e),minimum:3});
      return pairs;
    });
  })()`);
}
function assertPairs(pairs, label) {
  assert.ok(pairs.length, `${label}: no rendered pairs`);
  const failures=pairs.map(p=>({...p,ratio:contrast(p.ink,p.fill)})).filter(p=>p.ratio < p.minimum);
  assert.deepEqual(failures, [], `${label}: actual computed contrast failures`);
}
async function stage3Defaults() {
  for (const mode of ['Light','Dark']) {
    await click(themeControl(mode));
    await check(`stage3: ${mode} default global report has 127 checks and zero failures`, async()=>{
      await click(named('.editor-scope button','Global tokens'));
      assert.ok(await evaluate(`${q('[aria-label="Current contrast checks"]')}.textContent.includes('All 127 checked color pairs meet their targets.')`));
      assert.equal(await evaluate(`${q('[aria-label="Current contrast checks"]')} .querySelectorAll('[data-contrast-check]').length`),127);
      assert.equal(await evaluate(`${q(sourceInput)}.value`),'#e8673c');
      assert.notEqual(await evaluate(`${q('#token-primary')}.value`),'#e8673c','usage primary is normalized separately from source');
    });
    for(const component of ['Button','Input','Card','Badge','Switch','Checkbox']) {
      await check(`stage3: ${mode} ${component} default rendered contrast`,async()=>{
        await selectComponent(component);
        const region=`[aria-label="${component} preview"]`;
        assertPairs(await renderedPairs(region),`${mode}/${component}`);
        if(['Input','Switch','Checkbox'].includes(component)) {
          const control=q(`${region} ${component==='Input'?'input[type="email"]':`[role="${component.toLowerCase()}"][aria-checked="false"]`}`);
          await pointer(control);
          assertPairs(await renderedPairs(region),`${mode}/${component}/hover`);
          await pointer(control,'mousePressed');
          try {assertPairs(await renderedPairs(region),`${mode}/${component}/active`);}
          finally {await pointer(control,'mouseReleased');}
        }
        if(component==='Button') for(const variant of ['primary','secondary','destructive','outline','ghost','link']) {
          const target=q(`${region} button[data-variant="${variant}"]`);
          await pointer(target);
          assert.equal(await evaluate(`(${target}).matches(':hover')`),true);
          assertPairs(await renderedPairs(region),`${mode}/${variant}/hover`);
          await pointer(target,'mousePressed');
          try {
            assert.equal(await evaluate(`(${target}).matches(':active')`),true);
            assertPairs(await renderedPairs(region),`${mode}/${variant}/active`);
          } finally {await pointer(target,'mouseReleased');}
        }
      });
    }
    await selectComponent('Button');
    await capture(`stage3-default-${mode.toLowerCase()}`);
  }
  await click(themeControl('Light'));
  await check('stage3: editor Light/Dark/System and live OS changes are independent of DS',async()=>{
    const data=await stored();
    const dsStyles = `JSON.stringify([...document.querySelectorAll('[data-ds-theme]')].map(e=>[e.getAttribute('style'),...[...e.querySelectorAll('button[data-variant]')].map(b=>[getComputedStyle(b).color,getComputedStyle(b).backgroundColor])]))`;
        const styles=await evaluate(dsStyles);
    const seen={};
    for(const mode of ['Light','Dark','System']) {
      await click(appearance(mode));
      await wait(`document.documentElement.dataset.editorTheme === '${mode.toLowerCase()}'`);
      if(mode!=='System') seen[mode]=await evaluate(chromeStyle);
      assert.deepEqual(await stored(),data);
      assert.ok(await evaluate(dsStyles)===styles, 'DS variables and rendered button styles independent of editor appearance');
    }
    assert.notEqual(seen.Light,seen.Dark);
    for(const mode of ['dark','light','dark']) {
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode}]});
      await wait(`matchMedia('(prefers-color-scheme: ${mode})').matches`);
      assert.equal(await evaluate(chromeStyle),seen[mode==='dark'?'Dark':'Light']);
    }
    await capture('stage3-editor-dark');
    await click(q('[aria-label="Export tokens"]'));
    try {
      const dark=await evaluate(computed('.export-dialog'));
      assert.ok(contrast(dark.foreground,dark.background)>=4.5);
      await capture('stage3-editor-dark-dialog');
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
      await wait(`${computed('.export-dialog')}.background !== ${JSON.stringify(dark.background)}`);
    } finally {await click(q('[aria-label="Close export dialog"]'));await wait(`!document.querySelector('.export-dialog')`);}
    await click(appearance('Light'));
    await capture('stage3-editor-light');
    assert.deepEqual(await stored(),data);
  });
  for(const component of ['Switch','Checkbox']) await check(`stage3: ${component} Space, disabled, focus-visible`,async()=>{
    await selectComponent(component);
    const region=`[aria-label="${component} preview"]`, role=component.toLowerCase();
    const target=q(`${region} [role="${role}"]:not([data-disabled])`);
    await keyboardFocus(target);
    const before=await evaluate(`(${target}).getAttribute('aria-checked')`);
    await key(' ','Space');
    assert.notEqual(await evaluate(`(${target}).getAttribute('aria-checked')`),before);
    assert.ok(await evaluate(`(() => {const e=${target},s=getComputedStyle(e);return e.matches(':focus-visible') && parseFloat(s.outlineWidth)>0 && s.outlineStyle!=='none';})()`));
    const disabled=q(`${region} [role="${role}"][data-disabled]`);
    const state=await evaluate(`(${disabled}).getAttribute('aria-checked')`);
    await click(disabled);await key(' ','Space');
    assert.equal(await evaluate(`(${disabled}).getAttribute('aria-checked')`),state);
    assert.equal(await evaluate(`document.activeElement === (${disabled})`),false);
  });
  await check('stage3: Input readOnly, invalid descriptions and required semantics',async()=>{
    await selectComponent('Input');
    const target=q('[aria-label="Input preview"] input[readonly]');
    await click(target);
    const value=await evaluate(`(${target}).value`);
    assert.equal(await evaluate(`document.activeElement===(${target})`),true);
    await send('Input.insertText',{text:'must not edit'});
    assert.equal(await evaluate(`(${target}).value`),value);
    assert.ok(await evaluate(`(() => {const e=${q('[aria-label="Input preview"] input[aria-invalid="true"]')};return e.getAttribute('aria-describedby').split(' ').some(id=>document.getElementById(id)?.textContent.includes('Enter a full URL'));})()`));
    await keyboardFocus(q('[aria-label="Input preview"] input[type="email"]'));
    assert.ok(await evaluate(`(() => {const e=${q('[aria-label="Input preview"] input[type="email"]')},s=getComputedStyle(e.parentElement);return e.matches(':focus-visible') && parseFloat(s.outlineWidth)>0 && s.outlineStyle!=='none';})()`),'input actual focus ring');
    await choose(inner('Scenario'));
    assert.equal(await evaluate(`${q(workspace)}.required`),true);
    await choose(inner('Components'));
  });
  await check('stage3: loading button focusable/busy, activation and disabled blocking',async()=>{
    await selectComponent('Button');
    const loading=q(`${specimen} button[data-loading]`);
    // Enter loading by Tab from its enabled predecessor, not by clicking a
    // disabled control (Base UI intentionally prevents disabled mouse focus).
    await click(named(`${specimen} button`, 'Download'));
    await key('Tab');
    assert.equal(await evaluate(`document.activeElement === (${loading})`),true, 'loading must be keyboard focusable');
    assert.equal(await evaluate(`(${loading}).getAttribute('aria-busy')`),'true');
    assert.equal(await evaluate(`(${loading}).getAttribute('aria-disabled')`),'true');
    assert.ok(await evaluate(`(() => {const e=${loading},s=getComputedStyle(e);return e.matches(':focus-visible') && parseFloat(s.outlineWidth)>0 && s.outlineStyle!=='none';})()`),'loading actual focus ring');
    const before=await evaluate(`${q(specimen)}.textContent`);
    await key('Enter');await key(' ','Space');
    await click(named(`${specimen} button`,'Disabled'));await key('Enter');
    assert.equal(await evaluate(`${q(specimen)}.textContent`),before);
  });
  await check('stage3: AX tree decorative icons do not duplicate accessible names',async()=>{
    await selectComponent('Button');
    const {nodes}=await send('Accessibility.getFullAXTree');
    for(const name of ['Download','Add item','Saving','Disabled']) assert.equal(nodes.filter(n=>!n.ignored && n.role?.value==='button' && n.name?.value===name).length,1,`exact AX button name: ${name}`);
    assert.ok(!nodes.some(n=>!n.ignored && n.role?.value==='image' && ['Download','Add item','Saving'].includes(n.name?.value)),'icons must not duplicate control names');
  });
  await check('stage3: reduced motion disables actual spinner and transitions',async()=>{
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    assert.equal(await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`),true);
    const motion=await evaluate(`(() => {const e=${q(`${specimen} button[data-loading]`)};return [e,...e.querySelectorAll('*')].map(n=>{const s=getComputedStyle(n);return {animation:s.animationDuration,transition:s.transitionDuration};});})()`);
    assert.ok(motion.length>1);
    for(const item of motion) for(const value of Object.values(item)) assert.ok(value.split(',').every(v=>parseFloat(v)===0),JSON.stringify(item));
    await send('Emulation.setEmulatedMedia',{features:[]});
  });
  // Reload the fresh page, without manipulating storage, to reset demo interaction counts.
  await reloadHydrated();
}

async function reloadHydrated() {
  const origin=await evaluate('performance.timeOrigin');
  await send('Page.reload');
  await wait(`performance.timeOrigin !== ${origin} && document.querySelector('.editor-fields') && !document.querySelector('.editor-fields').disabled`, 'new document loaded and studio hydrated');
}
async function stage3Themes() {
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await choose(outer('Design'));await choose(inner('Components'));await selectComponent('Button');
  await check('stage3: comparison header AX names equal exact visible labels in both contexts',async()=>{
    await click(themeControl('Compare'));
    try {
      for(const context of ['Components','Scenario']) {
        await choose(inner(context));
        for(const mode of ['light','dark']) {
          const target=editTheme(mode);
          await click(target);
          await wait(`${q('.theme-pane[data-active] [data-ds-theme]')}.dataset.dsTheme === '${mode}'`);
          const label=await evaluate(`(${target}).innerText.trim()`);
          assert.equal(label,`Edit ${mode} theme`);
          const {result}=await send('Runtime.evaluate',{expression:target});
          try {
            const {node}=await send('DOM.describeNode',{objectId:result.objectId});
            const {nodes}=await send('Accessibility.getFullAXTree');
            const ax=nodes.find(n=>n.backendDOMNodeId===node.backendNodeId && !n.ignored);
            assert.ok(ax,`${context}/${mode}: header missing from AX tree`);
            assert.equal(ax.role?.value,'button');
            assert.equal(ax.name?.value,label,`${context}/${mode}: accessible name must equal visible label`);
          } finally {await send('Runtime.releaseObject',{objectId:result.objectId});}
        }
      }
    } finally {await choose(inner('Components'));}
  });
  await check('stage3: Light/Dark/Compare preserve independent overrides, numerics and source',async()=>{
    for(const [mode,color,radius,padding] of [['Light','#234567','11','21'],['Dark','#abcdef','17','27']]) {
      await click(themeControl(mode));
      await click(named('.editor-scope button','Global tokens'));await stage2Type('#token-radius',radius);
      await click(named('.editor-scope button','Component'));await stage2Type('#token-background',color);await stage2Type('#token-paddingX',padding);
    }
    const before=await stored();
    assert.equal(before.version,3);
    for(const mode of ['light','dark']) assert.deepEqual(Object.keys(before.themes[mode]).sort(),['components','global','source']);
    await click(themeControl('Compare'));
    for(const [mode,color,radius,padding] of [['light','#234567',11,21],['dark','#abcdef',17,27]]) {
      await click(editTheme(mode));
      assert.equal(await evaluate(`${q('#token-background')}.value`),color);
      assert.equal(await evaluate(`${q('#token-paddingX')}.value`),String(padding));
      await click(named('.editor-scope button','Global tokens'));
      assert.equal(await evaluate(`${q('#token-radius')}.value`),String(radius));
      assert.equal(await evaluate(`${q(sourceInput)}.value`),before.themes[mode].source);
      await click(named('.editor-scope button','Component'));
      assert.equal(await evaluate(`${computed(`${specimen} button[data-variant="primary"]`)}.background`),rgb(color));
    }
    assert.deepEqual(await stored(),before);
    assert.deepEqual(await evaluate(`(() => {const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);})()`),[],'duplicate IDs across all mounted contexts/themes');
    await capture('stage3-comparison-desktop');
  });
  await check('stage3: per-theme scenario input state persists across theme/context/view switches',async()=>{
    await choose(inner('Scenario'));
    for(const mode of ['Light','Dark']) {await click(themeControl(mode));await stage2Type(workspace,`stage3 ${mode} workspace`);}
    await choose(inner('Components'));await choose(outer('Develop'));await choose(outer('Design'));await choose(inner('Scenario'));
    await click(themeControl('Compare'));
    for(const mode of ['light','dark']) {
      await click(editTheme(mode));
      assert.equal(await evaluate(`${q(workspace)}.value`),`stage3 ${mode[0].toUpperCase()+mode.slice(1)} workspace`);
    }
    await capture('stage3-comparison-scenario');
  });
  await check('stage3: developer active aliases/derived values and full CSS match both theme roots',async()=>{
    await choose(inner('Components'));await selectComponent('Button');
    const state=await stored();
    for(const mode of ['light','dark']) {
      await click(themeControl(mode==='light'?'Light':'Dark'));
      const runtime=await evaluate(`(() => {const e=${q('[data-ds-theme]')};return Object.fromEntries([...e.style].filter(k=>k.startsWith('--')).map(k=>[k,e.style.getPropertyValue(k).trim()]));})()`);
      await choose(outer('Develop'));
      const alias=await evaluate(row);
      assert.ok(alias.includes('Component override') && alias.includes(state.themes[mode].components.button.background));
      const rows=await evaluate(`[...${q('[aria-label="Derived theme variables"]')}.querySelectorAll('tbody tr')].map(r=>[r.querySelector('th').textContent,r.querySelector('td').textContent])`);
      assert.ok(rows.some(([name])=>name==='--button-hover'));
      for(const [name,value] of rows) assert.equal(value,runtime[name],`${mode}/${name}`);
      const css=await evaluate(`${q('[aria-label="Full-system CSS variable export"]')}.textContent`);
      assert.ok(css.includes('[data-ds-theme="light"]') && css.includes('[data-ds-theme="dark"]'));
      const block=css.split(`[data-ds-theme="${mode}"] {`)[1]?.split('}')[0];
      assert.ok(block,`${mode} CSS block`);
      for(const [name,value] of Object.entries(runtime)) assert.ok(block.includes(`${name}: ${value};`),`${mode} export ${name}`);
      const aliases=await evaluate(`[...${q('[aria-label="Button token inheritance"]')}.querySelectorAll('tbody tr')].map(r=>[r.querySelector('th').textContent,...[...r.querySelectorAll('td')].map(e=>e.textContent)])`);
      for(const [name,source,value] of aliases) {
        const reference=runtime[name].startsWith('var(--ds-') ? runtime[name].slice(4,-1) : undefined;
        assert.equal(value,reference?runtime[reference]:runtime[name],`${mode}/${name} resolved value`);
        assert.ok(source.includes(reference?`Inherited: ${reference}`:'Component override'),`${mode}/${name} source`);
      }
      for(const theme of Object.values(state.themes)) for(const [name,value] of Object.entries(theme.global)) assert.ok(css.includes(`--ds-${name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}: ${value}${typeof value==='number'?'px':''};`));
      await choose(outer('Design'));
    }
  });
  await check('stage3: applying distinct sources persists v3 target source and leaves other theme untouched',async()=>{
    await choose(outer('Design'));await choose(inner('Components'));
    await click(named('.editor-scope button','Global tokens'));
    for(const [mode,preset,source] of [['light','Iris','#7660d5'],['dark','Ocean','#247db3']]) {
      const before=await stored(),other=mode==='light'?'dark':'light';
      await click(q(`[aria-label="Generate ${preset} palette"]`));
      assert.deepEqual(await stored(),before,'generation must not persist source');
      await click(named('button',`Apply ${mode} colors`));
      const after=await stored();
      assert.equal(after.version,3);assert.equal(after.themes[mode].source,source);
      assert.deepEqual(after.themes[other],before.themes[other]);
      assert.deepEqual(after.themes[mode].components,before.themes[mode].components);
      assert.equal(after.themes[mode].global.radius,before.themes[mode].global.radius);
      assert.equal(await evaluate(`${q('.theme-pane[data-active] [data-ds-theme]')}.dataset.dsTheme`),mode);
    }
    const before=await stored();
    await reloadHydrated();
    assert.deepEqual(await stored(),before,'reload preserves complete schema');
    const mismatches=[];
    for(const mode of ['light','dark']) {
      await click(themeControl(mode==='light'?'Light':'Dark'));
      const actual=await evaluate(`${q(sourceInput)}.value`);
      if(actual!==before.themes[mode].source) mismatches.push({mode,displayed:actual,persisted:before.themes[mode].source});
    }
    if(mismatches.length) await capture('stage3-source-reload-mismatch');
    assert.deepEqual(mismatches,[],'source builder must reflect the persisted selected-theme source after hydration/theme switching');
  });
  await check('stage3: invalid token keyboard draft retains wrapper focus outline and error border',async()=>{
    await choose(outer('Design'));await click(named('.editor-scope button','Global tokens'));
    for(const mode of ['Light','Dark']) {
      await click(themeControl(mode));
      const target=q('#token-background'), original=await evaluate(`${target}.value`), before=await stored();
      await keyboardFocus(target);
      const outline=await evaluate(`(() => {const s=getComputedStyle((${target}).closest('.token-input'));return {width:s.outlineWidth,style:s.outlineStyle,color:s.outlineColor,offset:s.outlineOffset};})()`);
      assert.ok(parseFloat(outline.width)>0 && outline.style!=='none',`${mode}: initial focus outline`);
      try {
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:4,commands:['selectAll']});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:4});
        await send('Input.insertText',{text:'#12'});
        await wait(`${target}.value === '#12' && ${target}.getAttribute('aria-invalid') === 'true'`);
        const actual=await evaluate(`(() => {const e=${target},s=getComputedStyle(e.closest('.token-input'));return {focused:document.activeElement===e && e.matches(':focus-visible'),width:s.outlineWidth,style:s.outlineStyle,color:s.outlineColor,offset:s.outlineOffset,border:s.borderTopColor,borderWidth:s.borderTopWidth,danger:getComputedStyle(document.documentElement).getPropertyValue('--studio-color-danger').trim(),error:document.getElementById(e.getAttribute('aria-describedby'))?.textContent};})()`);
        assert.equal(actual.focused,true,`${mode}: invalid draft keeps keyboard focus`);
        assert.deepEqual({width:actual.width,style:actual.style,color:actual.color,offset:actual.offset},outline,`${mode}: invalid draft preserves independent outline`);
        assert.ok(parseFloat(actual.borderWidth)>0 && actual.error?.trim(),`${mode}: visible error boundary and described error`);
        assert.equal(actual.border,rgb(actual.danger),`${mode}: error border uses danger color`);
        assert.deepEqual(await stored(),before,'invalid draft does not change persisted tokens');
        await capture(`stage3-invalid-token-${mode.toLowerCase()}`);
      } finally {await stage2Type('#token-background',original);}
    }
  });
  await check('stage3: Badge neutral outline honors explicit border override and reset restores derived border',async()=>{
    await choose(outer('Design'));await choose(inner('Components'));await selectComponent('Badge');
    for(const mode of ['Light','Dark']) {
      await click(themeControl(mode));
      await click(named('.editor-scope button','Component'));
      const badge=q('[aria-label="Badge preview"] [data-variant="outline"][data-tone="neutral"]');
      const derived=await evaluate(`getComputedStyle(${badge}).getPropertyValue('--badge-neutral-outline').trim()`);
      const border=()=>evaluate(`getComputedStyle(${badge}).borderTopColor`);
      assert.equal(await border(),rgb(derived),`${mode}: initial derived outline`);
      try {
        await stage2Type('#token-border','#123456');
        assert.equal((await stored()).themes[mode.toLowerCase()].components.badge.border,'#123456');
        assert.equal(await border(),rgb('#123456'),`${mode}: rendered explicit border override`);
      } finally {
        const reset=q('[aria-label="Reset border override"]');
        if(await evaluate(`!!(${reset})`)) await click(reset);
      }
      assert.equal(await border(),rgb(derived),`${mode}: reset restores derived outline, not the base border alias`);
      assert.equal(Object.hasOwn((await stored()).themes[mode.toLowerCase()].components.badge,'border'),false);
    }
  });
  for(const [label,width,height,zoom,dpr=1] of [
      ['375px comparison',375,812,1],
      ['200% CSS document zoom/reflow (not native browser zoom)',1440,1000,2],
      ['200% effective viewport/DPR reflow (not native browser zoom)',720,500,1,2],
    ]) {
    await check(`stage3: ${label}, no document overflow and reachable controls`,async()=>{
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});
      // CSS zoom and effective layout viewport test different parts of reflow; neither is native browser zoom.
      await evaluate(`document.documentElement.style.zoom='${zoom}'`);
      try {
        await choose(outer('Design'));await click(themeControl('Compare'));
        for(const context of ['Components','Scenario']) {
          await choose(inner(context));
          assert.ok(await evaluate(`document.documentElement.scrollWidth<=${width} && document.body.getBoundingClientRect().width<=${width}`),`${context}: page overflow`);
          for(const mode of ['light','dark']) {
            const edit=editTheme(mode);
            await click(edit);
            await wait(`${q('.theme-pane[data-active] [data-ds-theme]')}.dataset.dsTheme === '${mode}'`, `${label}: edit ${mode} header activates inspector`);
          }
        }
        await click(named('.editor-scope button','Global tokens'));
        for(const view of ['Design','Develop']) {
          await choose(outer(view));await click(q('#token-background'));
          assert.ok(await evaluate(`(() => {const e=${q('#token-background')},r=e.getBoundingClientRect();return document.activeElement===e && r.left>=0 && r.right<=${width} && r.top>=0 && r.bottom<=${height} && e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()`),`${view}: inspector unreachable`);
          assert.ok(await evaluate(`document.documentElement.scrollWidth<=${width}`),`${view}: page overflow`);
        }
        await choose(outer('Design'));
                if(dpr===2) {
                  assert.ok(await evaluate(`document.querySelector('.studio-main').getBoundingClientRect().width >= ${width * 0.85}`),'short layout viewport must not squeeze the canvas between fixed sidebars');
                  await click(editTheme('light'));
                }
                await capture(dpr===2?'stage3-effective-zoom-200':zoom===2?'stage3-css-zoom-200':'stage3-comparison-mobile');
      } finally {await evaluate(`document.documentElement.style.zoom=''`);}
    });
  }
}

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

  await stage3Defaults();

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
    await wait(`${q('form [role="status"]')}?.textContent.includes('preview · 1')`);
    await choose(inner('Components')); await choose(outer('Develop')); await choose(outer('Design')); await choose(inner('Scenario'));
    assert.equal(await evaluate(`${q(workspace)}.value`), 'stage1 smoke workspace');
    await wait(`${q('form [role="status"]')}?.textContent.includes('preview · 1')`);
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
      await click(from); await key('ArrowRight');
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
    assert.equal(state.version, 3);
    assert.deepEqual(Object.keys(state).sort(), ['name', 'themes', 'version']);
    assert.equal(state.themes.light.source, '#e8673c');
    assert.equal(state.themes.light.global.radius, 13);
    assert.equal(state.themes.light.global.controlHeightMd, 42);
    assert.deepEqual(state.themes.light.components.button, { background: '#123456', foreground: '#fedcba', paddingX: 23 });
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
      const target = mode.toLowerCase(), other = target === 'light' ? 'dark' : 'light';
      const theme = after.themes[target];
      assert.deepEqual(after.themes[other], before.themes[other], 'apply must not modify the other theme');
      assert.equal(after.name, before.name); assert.equal(after.version, 3);
      assert.deepEqual(theme.components, before.themes[target].components);
      assert.equal(theme.source, '#e8673c');
      assert.equal(await evaluate(`${q('.theme-pane[data-active] [data-ds-theme]')}.dataset.dsTheme`), target);
      for (const [key, value] of Object.entries(before.themes[target].global).filter(([, value]) => typeof value === 'number')) assert.equal(theme.global[key], value, key);
      assert.equal(Object.values(theme.global).filter(value => typeof value === 'string').length, 17);
      assert.equal(await candidate(), generated);
      assert.equal(await evaluate(`${q(sourceInput)}.value`), '#e8673c');
      await wait(`${q(recipe(mode))}.textContent.includes('Matches global colors')`);
      const mini = await evaluate(`(() => { const e=${q(recipe(mode))}.querySelector('strong').parentElement; return {ink:getComputedStyle(e).color,fill:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor,muted:getComputedStyle(e.querySelector('p')).color,roles:[...e.querySelectorAll('span')].map(s=>({name:s.textContent.toLowerCase(),ink:getComputedStyle(s).color,fill:getComputedStyle(s).backgroundColor}))}; })()`);
      assert.equal(mini.ink, rgb(theme.global.foreground)); assert.equal(mini.fill, rgb(theme.global.background));
      assert.equal(mini.border, rgb(theme.global.border)); assert.equal(mini.muted, rgb(theme.global.mutedForeground));
      for (const role of mini.roles) {
        assert.equal(role.fill, rgb(theme.global[role.name]));
        assert.equal(role.ink, rgb(theme.global['on' + role.name[0].toUpperCase() + role.name.slice(1)]));
      }
      await click(q('[aria-label="Export tokens"]'));
      try {
        await click(named('[aria-label="Export format"] button', 'JSON'));
        assert.deepEqual(JSON.parse(await evaluate(`${q('[aria-label="Exported tokens"]')}.textContent`)), after);
        await click(named('[aria-label="Export format"] button', 'CSS'));
        const css = await evaluate(`${q('[aria-label="Exported tokens"]')}.textContent`);
        for (const [key, value] of Object.entries(theme.global)) {
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
      await capture(`stage3-${mode.toLowerCase()}-desktop`);
    });
  }
  await check('stage2: manual global and component equal-color warnings match computed final pairs', async () => {
    await click(named('[aria-label="Design theme"] button', 'Light'));
    const primary = (await stored()).themes.light.global.primary;
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
    await wait(`${q(sourceInput)}.value === ${JSON.stringify(before.themes.light.global.primary)}`);
    assert.equal(await evaluate(`(${named('summary', 'Generated from ' + before.themes.light.global.primary)}) != null`), true);
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
      await capture(`stage3-${mode.toLowerCase()}-mobile`);
      await click(q('#token-primary'));
      assert.equal(await evaluate(`document.activeElement === ${q('#token-primary')}`), true);
    }
  });
  await stage3Themes();
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
  console.log('SCOPE: Chromium CDP mouse/keyboard and AX tree, not an actual screen-reader session; computed opaque-color samples, not exhaustive accessibility conformance. Loading demo has no activation callback: busy/disabled semantics, keyboard focus and unchanged rendered state are checked. 200% is CSS document zoom plus viewport metrics, not native browser zoom.');
  if (failed) process.exitCode = 1;
}
