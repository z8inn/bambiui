#!/usr/bin/env node
// Run after `npm run build`; uses installed Chrome and a disposable browser profile.
// --screenshots writes review captures to .next/color-review; AX checks are not a screen-reader session.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, stat, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = fileURLToPath(new URL('../out/', import.meta.url));
const captureDir = fileURLToPath(new URL('../.next/color-review/', import.meta.url));
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json' };
const pending = new Map(), failures = [], errors = [];
let server, chrome, profile, socket, sequence = 0;
const watchdog = setTimeout(() => { console.error('Smoke test exceeded 90 seconds'); process.exit(1); }, 90000);

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 7000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
  return result.value;
}
async function wait(expression) {
  const until = Date.now() + 4500;
  do { if (await evaluate(expression)) return; await delay(60); } while (Date.now() < until);
  throw new Error(`Timed out: ${expression}`);
}
const q = selector => `document.querySelector(${JSON.stringify(selector)})`;
const named = (selector, name) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.trim() === ${JSON.stringify(name)} && !e.closest('[hidden]'))`;
async function click(expression) {
  assert.ok(await evaluate(`!!(${expression})`), `Missing control: ${expression}`);
  await evaluate(`(${expression}).scrollIntoView({block:'center',behavior:'instant'})`);
  await evaluate('new Promise(resolve => requestAnimationFrame(resolve))');
  const point = await evaluate(`(() => {const e=${expression},r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;if(!e.contains(document.elementFromPoint(x,y)))throw Error('Occluded: '+e.outerHTML);return {x,y};})()`);
  await send('Input.dispatchMouseEvent', { type:'mousePressed', ...point, button:'left', clickCount:1 });
  await send('Input.dispatchMouseEvent', { type:'mouseReleased', ...point, button:'left', clickCount:1 });
  await evaluate('new Promise(resolve => requestAnimationFrame(resolve))');
}
async function fill(selector, value) {
  await click(q(selector));
  await send('Input.dispatchKeyEvent', {type:'keyDown',key:'a',code:'KeyA',modifiers:4,commands:['selectAll']});
  await send('Input.dispatchKeyEvent', {type:'keyUp',key:'a',code:'KeyA',modifiers:4});
  if(value) await send('Input.insertText',{text:value});
  await wait(`${q(selector)}.value === ${JSON.stringify(value)}`);
}
async function check(label, run) {
  try { await run(); console.log(`PASS ${label}`); }
  catch (error) { failures.push(label); console.error(`FAIL ${label}: ${error.stack || error}`); }
}
const stored = () => evaluate(`JSON.parse(localStorage.getItem('bambiui.design-system.v1'))`);
async function capture(label) {
  if (!process.argv.includes('--screenshots')) return;
  await mkdir(captureDir,{recursive:true});
  const {data} = await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(resolve(captureDir,`${label}.png`),Buffer.from(data,'base64'));
}
async function reload() {
  const origin = await evaluate('performance.timeOrigin');
  await send('Page.reload');
  await wait(`performance.timeOrigin !== ${origin} && ${q('.editor-fields')} && !${q('.editor-fields')}.disabled`);
}
async function cleanup() {
  socket?.close();
  if(chrome && chrome.exitCode === null && chrome.signalCode === null) {
    const done = new Promise(resolve => chrome.once('exit',resolve));chrome.kill('SIGTERM');
    await Promise.race([done,delay(2000)]);
    if(chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGKILL');
  }
  if(server) {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  if(profile) await rm(profile,{recursive:true,force:true,maxRetries:4,retryDelay:200});
}
try {
  assert.equal(typeof WebSocket,'function','Node 22+ is required');
  await stat(resolve(root,'index.html'));
  server = createServer(async (req,res) => {
    try {
      const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      let path = resolve(root, `.${name}`);
      if(path !== resolve(root) && !path.startsWith(resolve(root)+sep)) {res.writeHead(403).end();return;}
      try {if((await stat(path)).isDirectory())path=resolve(path,'index.html');}
      catch {if(!extname(path))path+='.html';}
      res.writeHead(200,{'Content-Type':mime[extname(path)] || 'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(path));
    } catch {res.writeHead(404).end('Not found');}
  });
  await new Promise((resolve,reject) => {server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  profile = await mkdtemp(resolve(tmpdir(),'bambiui-smoke-'));
  chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
    '--headless=new',`--user-data-dir=${profile}`,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--no-first-run','--no-default-browser-check','--disable-background-networking','about:blank',
  ],{stdio:['ignore','ignore','pipe']});
  let stderr='', spawnError;
  chrome.on('error',error => {spawnError=error;});
  chrome.stderr.on('data',chunk => {stderr=(stderr+chunk).slice(-4000);});
  let port;
  for(let i=0;i<120 && !port;i++) {
    if(spawnError)throw spawnError;
    if(chrome.exitCode !== null)throw new Error(`Chrome exited: ${stderr}`);
    try {port=Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);}catch {await delay(100);}
  }
  assert.ok(port,`Chrome debugging port unavailable: ${stderr}`);
  const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(5000)})).json();
  socket=new WebSocket(targets.find(target => target.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',({data})=>{
    const message=JSON.parse(data);
    if(message.id) {
      const task=pending.get(message.id);if(!task)return;
      pending.delete(message.id);clearTimeout(task.timer);
      if(message.error)task.reject(new Error(JSON.stringify(message.error)));else task.resolve(message.result);
    } else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    else if(message.method==='Runtime.consoleAPICalled' && message.params.type==='error')errors.push(message.params.args.map(arg=>arg.value ?? arg.description).join(' '));
    else if(message.method==='Log.entryAdded' && message.params.entry.level==='error')errors.push(message.params.entry.text);
  });
  await send('Runtime.enable');await send('Log.enable');await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
  await wait(`${q('.editor-fields')} && !${q('.editor-fields')}.disabled`);

  await check('English-only studio chrome and one visible design preview',async()=>{
    assert.equal(await evaluate('document.documentElement.lang'),'en');
    assert.equal(await evaluate(`document.querySelector('.language-control,.editor-theme-control,.theme-toolbar') === null`),true);
    assert.equal(await evaluate(`[...document.querySelectorAll('.theme-pane')].filter(e=>e.getClientRects().length && !e.closest('[hidden]')).length`),1);
    assert.equal(await evaluate(`document.querySelector('[aria-label="Design preview context"]')`),null);
    assert.equal(await evaluate(`document.querySelectorAll('[data-ds-theme="light"]').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('[data-ds-theme="dark"]').length`),1);
    assert.equal(await evaluate(`getComputedStyle(document.documentElement).colorScheme`),'light');
    assert.equal(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--studio-color-accent').trim()`),'#e8673c');
    assert.equal(await evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--studio-color-border').trim()`),'#eee5e0');
    assert.equal(await evaluate(`getComputedStyle(${q('.brand-mark')}).color`),'rgb(232, 103, 60)');
    assert.equal(await evaluate(`getComputedStyle(${q('.header-actions .studio-button[data-variant="primary"]')}).backgroundColor`),'rgb(232, 103, 60)');
    assert.equal(await evaluate(`${q('input[id$="-source"]')}.value`),'#e8673c');
    assert.equal(await evaluate(`${q('[data-ds-theme="light"]')}.style.getPropertyValue('--ds-primary').trim()`),'#e8673c');
    assert.equal(await evaluate(`${q('[data-ds-theme="light"]')}.style.getPropertyValue('--ds-on-primary').trim()`),'#291b15');
    assert.equal(await evaluate(`document.querySelectorAll('[data-palette-builder] button').length`),5);
    assert.equal(await evaluate(`${q('[data-palette-builder]')}.open`),false);
    await capture('studio-desktop-light');
  });
  await check('toolbar theme controls preview, inspector and Develop without changing the other theme',async()=>{
    await click(named('[aria-label="Design theme"] button','Dark'));
    assert.ok(await evaluate(`${q('.editor-title')}.textContent.includes('Dark')`));
    assert.equal(await evaluate(`${q('.theme-pane:not([hidden])')}.getAttribute('aria-label')`),'Dark preview');
    await capture('studio-desktop-dark');
    await click(named('nav[aria-label="Components"] button','Button'));
    await fill('#token-background','#234567');
    const before = await stored();
    await fill('#token-background','#123456');
    const after = await stored();
    assert.deepEqual(after.themes.light,before.themes.light);
    assert.equal(after.themes.dark.components.button.background,'#123456');
    await click(named('[aria-label="Workspace view"] [role="tab"]','Develop'));
    assert.ok(await evaluate(`${q('.workspace-panel:not([hidden])')}.textContent.includes('#123456')`));
    assert.equal(await evaluate(`${q('.viewport-controls')}.getClientRects().length`),0);
    assert.ok(await evaluate(`${q('[aria-label="Design theme"]')}.getClientRects().length > 0`));
    await click(named('[aria-label="Design theme"] button','Light'));
    assert.ok(await evaluate(`${q('.workspace-panel:not([hidden])')}.textContent.includes('light theme')`));
    await click(named('[aria-label="Design theme"] button','Dark'));
    await click(named('[aria-label="Workspace view"] [role="tab"]','Design'));
  });
  await check('one preset applies both themes atomically and preserves geometry and overrides',async()=>{
    await click(named('.editor-scope button','Global tokens'));
    await click(q('[data-palette-builder] > summary'));
    const before=await stored();
    await click(q('[aria-label="Apply Iris to both themes"]'));
    const after=await stored();
    for(const mode of ['light','dark']) {
      assert.equal(after.themes[mode].source,'#7660d5');
      assert.equal(after.themes[mode].global.radius,before.themes[mode].global.radius);
      assert.deepEqual(after.themes[mode].components,before.themes[mode].components);
      assert.notEqual(after.themes[mode].global.primary,before.themes[mode].global.primary);
      assert.equal(await evaluate(`${q(`[data-ds-theme="${mode}"]`)}.style.getPropertyValue('--ds-primary').trim()`),after.themes[mode].global.primary);
    }
    assert.notEqual(after.themes.light.global.background,after.themes.dark.global.background);
  });
  await check('valid hex applies immediately; invalid input leaves persisted palettes unchanged',async()=>{
    await fill('input[id$="-source"]','#abc');
    assert.equal(await evaluate(`${q('input[id$="-source"]')}.getAttribute('aria-invalid')`),'true');
    const before=await stored();
    await fill('input[id$="-source"]','#287c60');
    const after=await stored();
    assert.equal(after.themes.light.source,'#287c60');assert.equal(after.themes.dark.source,'#287c60');
    assert.notDeepEqual(after,before);
    await fill('input[id$="-source"]','#gggggg');
    assert.deepEqual(await stored(),after);
    await fill('input[id$="-source"]','#287c60');
  });
  await check('contrast warnings follow manual edits and exported CSS/JSON keep both themes',async()=>{
    await click(named('.editor-scope button','Component'));
    const fillColor = await evaluate(`${q('#token-background')}.value`);
    await fill('#token-foreground',fillColor);
    assert.equal(await evaluate(`${q('[aria-label="Current contrast checks"]')}.hasAttribute('data-failing')`),true);
    assert.ok(await evaluate(`${q('[aria-label="Current contrast checks"] summary')}.textContent.includes('warnings')`));
    await click(q('[aria-label="Current contrast checks"] summary'));
    assert.ok(await evaluate(`${q('[data-contrast-check="button.foreground"]')}?.textContent.includes('Below target')`));
    const data=await stored();
    await click(q('[aria-label="Export tokens"]'));
    await click(named('[aria-label="Export format"] button','JSON'));
    assert.deepEqual(JSON.parse(await evaluate(`${q('[aria-label="Exported tokens"]')}.textContent`)),data);
    await click(named('[aria-label="Export format"] button','CSS'));
    const css=await evaluate(`${q('[aria-label="Exported tokens"]')}.textContent`);
    assert.ok(css.includes('[data-ds-theme="light"]') && css.includes('[data-ds-theme="dark"]'));
    assert.ok(css.includes(`--button-foreground: ${fillColor};`));
    await click(q('[aria-label="Close export dialog"]'));
    await wait(`!${q('.export-dialog')}`);
  });
  await check('mounted previews retain independent demo state across themes and working views',async()=>{
    await click(named('[aria-label="Design theme"] button','Light'));
    await click(named('.theme-pane:not([hidden]) [aria-label="Button preview"] button','Get started'));
    await wait(`${q('.theme-pane:not([hidden]) [aria-label="Button preview"]')}.textContent.includes('successfully (1)')`);
    await click(named('[aria-label="Design theme"] button','Dark'));
    assert.ok(await evaluate(`${q('.theme-pane:not([hidden]) [aria-label="Button preview"]')}.textContent.includes('Get started')`));
    await click(named('[aria-label="Workspace view"] [role="tab"]','Develop'));
    await click(named('[aria-label="Workspace view"] [role="tab"]','Design'));
    await click(named('[aria-label="Design theme"] button','Light'));
    assert.ok(await evaluate(`${q('.theme-pane:not([hidden]) [aria-label="Button preview"]')}.textContent.includes('successfully (1)')`));
  });
  await check('responsive layout, English accessible names and selectable preview themes',async()=>{
    await send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:false});
    for(const view of ['Design','Develop']) {
      await click(named('[aria-label="Workspace view"] [role="tab"]',view));
      assert.ok(await evaluate('document.documentElement.scrollWidth <= 375'));
      await capture(`studio-375-${view.toLowerCase()}`);
    }
    await click(named('[aria-label="Workspace view"] [role="tab"]','Design'));
    assert.equal(await evaluate(`${q('[aria-label="Current contrast checks"] details')}.open`),false);
    assert.ok(await evaluate(`${q('.mobile-editor-link')}.getClientRects().length > 0`));
    await click(q('.mobile-editor-link'));
    assert.equal(await evaluate('location.hash'),'#token-editor');
    assert.equal(await evaluate('document.activeElement.id'),'token-editor');
    await capture('studio-375-inspector');
    await click(q('.mobile-preview-link'));
    assert.equal(await evaluate('document.activeElement.id'),'workspace-content');
    for(const mode of ['light','dark']) {
      await click(named('[aria-label="Design theme"] button',mode === 'light' ? 'Light' : 'Dark'));
      assert.ok(await evaluate(`!!${q(`.theme-pane:not([hidden]) [data-ds-theme="${mode}"]`)}`));
      assert.equal(await evaluate(`[...document.querySelectorAll('.theme-pane')].filter(e=>e.getClientRects().length).length`),1);
    }
    await click(named('.editor-scope button','Global tokens'));
    if(!await evaluate(`${q('[data-palette-builder]')}.open`))await click(q('[data-palette-builder] > summary'));
    const {nodes}=await send('Accessibility.getFullAXTree');
    for(const name of ['Design theme','Light','Dark','Source brand color'])assert.ok(nodes.some(node=>!node.ignored && node.name?.value===name),`AX name: ${name}`);
  });
  await check('JSON re-import restores both sources without adding language or editor theme',async()=>{
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    const backup=await stored();
    await click(named('[aria-label="Design theme"] button','Light'));
    await click(named('.editor-scope button','Global tokens'));
    await fill('#token-radius','19');
    assert.notDeepEqual(await stored(),backup);
    await evaluate('window.__confirm=window.confirm;window.confirm=()=>true');
    try {
      await evaluate(`(() => {const e=${q('.header-actions input[type="file"]')},d=new DataTransfer();d.items.add(new File([${JSON.stringify(JSON.stringify(backup))}],'backup.json',{type:'application/json'}));e.files=d.files;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await wait(`${q('#token-radius')}.value === ${JSON.stringify(String(backup.themes.light.global.radius))}`);
      assert.deepEqual(await stored(),backup);
      assert.deepEqual(Object.keys(backup).sort(),['name','themes','version']);
      await reload();
      assert.deepEqual(await stored(),backup);
    } finally {await evaluate('window.confirm=window.__confirm;delete window.__confirm');}
  });
  await check('no runtime, browser console or resource errors',async()=>{await delay(200);assert.deepEqual(errors,[]);});
} catch(error) {failures.push('harness');console.error(`FAIL harness: ${error.stack || error}`);}
finally {
  try {await cleanup();}catch(error){failures.push('cleanup');console.error(`FAIL cleanup: ${error}`);}
  clearTimeout(watchdog);
  console.log(`RESULT: ${failures.length ? 'FAILED: '+failures.join(', ') : 'all smoke checks passed'}`);
  console.log('SCOPE: automated Chromium/CDP checks, not a real screen-reader or native browser-zoom session.');
  if(failures.length)process.exitCode=1;
}
