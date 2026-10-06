/**
 * Rendimiento: fotogramas por segundo y fotogramas lentos en las escenas más pesadas, con la CPU
 * ralentizada como un móvil de gama media. Supabase simulado (no registra nada).
 *
 *   node scripts/perf.mjs                 # CPU x4 (por defecto)
 *   node scripts/perf.mjs --cpu=1         # sin ralentizar
 *   node scripts/perf.mjs --load          # peso y tiempo de carga con red 4G (compilación de producción)
 *
 * Aviso: el Chromium sin pantalla dibuja por software (SwiftShader), mucho más lento que la GPU de
 * un móvil, así que las cifras son una cota pesimista y sirven sobre todo para comparar antes y después.
 * La prueba definitiva sigue siendo un Android físico de gama media (`docs/ESTADO.md`).
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const arg = (n, d) => process.argv.find(a => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const cpu = Number(arg('cpu', 4));
const loadMode = process.argv.includes('--load');
const port = Number(arg('port', 5189));
const secs = Number(arg('secs', 5));
const exe = process.env.CHROMIUM_PATH || ['/opt/pw-browsers/chromium', '/usr/bin/chromium'].find(existsSync);
const supabase = async route => {
  const action = route.request().postDataJSON?.()?.action;
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(action === 'time' ? { now: Date.UTC(2026, 9, 26, 12) } : action === 'config' ? { config: {} } : { error: 'offline_perf' }) });
};

async function loadTest() {
  // Sirve dist/ bajo /jugar/ como en GitHub Pages
  const http = await import('node:http'), fs = await import('node:fs/promises'), path = await import('node:path');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
  const srv = http.createServer(async (req, res) => {
    const p = path.join(root, 'dist', decodeURIComponent(req.url.split('?')[0]).replace(/^\/jugar\/?/, '') || 'index.html');
    try { const f = (await fs.stat(p)).isDirectory() ? path.join(p, 'index.html') : p; res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream' }); res.end(await fs.readFile(f)); } catch { res.writeHead(404); res.end(); }
  }).listen(port);
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route('https://**.supabase.co/**', supabase);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6e6 / 8), uploadThroughput: (750e3 / 8) }); // «4G lento» de Lighthouse
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  let bytes = 0; const kinds = {};
  cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; });
  cdp.on('Network.responseReceived', e => { const k = e.response.url.match(/\.(\w+)$/)?.[1] ?? 'otros'; kinds[k] = (kinds[k] ?? 0) + 1; });
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/jugar/`, { waitUntil: 'commit' });
  await page.waitForFunction(() => !document.body.classList.contains('loading'), null, { timeout: 300000 });
  const t = (Date.now() - t0) / 1000;
  console.log(`\nCarga en 4G lento (1,6 Mbps, 150 ms) con CPU x${cpu}: pantalla jugable a los ${t.toFixed(1)} s, ${(bytes / 1e6).toFixed(1)} MB transferidos`);
  console.log('Archivos por tipo:', JSON.stringify(kinds));
  await browser.close(); srv.close();
}

async function fpsTest() {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: root, stdio: 'pipe' });
  let log = ''; server.stdout.on('data', d => (log += d)); server.stderr.on('data', d => (log += d));
  for (let i = 0; i < 100 && !log.includes('Local:'); i++) await new Promise(r => setTimeout(r, 200));
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Europe/Madrid' });
    await ctx.route('https://**.supabase.co/**', supabase);
    const page = await ctx.newPage();
    page.setDefaultTimeout(120000);
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__game?.state && !document.body.classList.contains('loading'));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    const seed = (city) => page.evaluate(async city => {
      const { freshState, freshFloor } = await import('/src/game/state.ts');
      const { now } = await import('/src/game/clock.ts');
      const { FEATURES } = await import('/src/game/unlocks.ts');
      const { LUXURY } = await import('/src/game/luxury.ts');
      const s = __game.state, n = now();
      Object.assign(s, freshState(n, city));
      s.cash = 1e24; s.totalEarned = 1e30; s.lifeSeen = 9; s.meta.tutorial = 99; s.meta.unlocked = FEATURES.map(f => f.id);
      s.nextViral = n + 1e12; s.meta.offers.truckAt = n + 1e12; s.meta.offers.vipAt = n + 1e12; s.meta.founder.asked = true;
      s.meta.luxury.owned = LUXURY.map(i => i.id);
      for (const b of Object.values(s.biz)) {
        b.owned = true; b.floors = Array.from({ length: 6 }, () => ({ ...freshFloor(), level: 250, managed: true }));
        b.transport.level = 250; b.transport.managed = true; b.sale.level = 250; b.sale.managed = true;
      }
    }, city);
    const show = (view) => page.evaluate(async view => {
      const g = __game.game;
      g.scene.stop('business'); g.scene.stop('city');
      __game.state.view = view;
      const { renderBar } = await import('/src/ui/hud.ts'); renderBar(__game.state);
      g.scene.start(view.scene, view.scene === 'business' ? { id: view.id } : undefined);
    }, view);
    await cdp.send('Performance.enable');
    const metric = async n => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === n)?.value ?? 0;
    const measure = async (label) => {
      const js0 = await metric('ScriptDuration'), task0 = await metric('TaskDuration');
      const r = await measure0(label);
      const js = (await metric('ScriptDuration')) - js0, task = (await metric('TaskDuration')) - task0;
      return { ...r, jsMsFrame: +(js * 1000 / r.frames).toFixed(1), taskMsFrame: +(task * 1000 / r.frames).toFixed(1) };
    };
    const measure0 = (label) => page.evaluate(async ({ label, secs }) => {
      const frames = []; let last = performance.now(); const end = last + secs * 1000;
      await new Promise(res => { const f = t => { frames.push(t - last); last = t; t < end ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
      frames.shift();
      const sum = frames.reduce((a, b) => a + b, 0), sorted = [...frames].sort((a, b) => a - b);
      return { label, fps: +(1000 * frames.length / sum).toFixed(1), p95ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(0), slow: frames.filter(x => x > 50).length, frames: frames.length, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(0) : null, gl: __game.game.renderer.type === 2 ? 'WebGL' : 'Canvas', draws: __game.game.renderer.drawCount ?? null, objects: Object.values(__game.game.scene.scenes).reduce((a, sc) => a + (sc.sys.isActive() ? sc.children.list.length : 0), 0) };
    }, { label, secs });
    const rows = [];
    const biz = { madrid: ['bike', 'restaurant', 'ai'], miami: ['beachclub', 'yachts'], dubai: ['safari', 'tower'] };
    for (const city of ['madrid', 'miami', 'dubai']) {
      await seed(city);
      await show({ scene: 'city' }); await page.waitForTimeout(1500); rows.push(await measure(`${city}: ciudad`));
      for (const id of biz[city]) { await show({ scene: 'business', id }); await page.waitForTimeout(1500); rows.push(await measure(`${city}: ${id}`)); }
    }
    console.log(`\njsMsFrame = tiempo de JavaScript por fotograma (con la CPU ya ralentizada: es lo que costaría en el móvil, sin contar la GPU).`);
    console.log(`\nFotogramas con CPU x${cpu}, ${secs} s por escena, 390×844 @2x (software, ver aviso en la cabecera del script)\n`);
    console.table(rows);
  } finally { await browser.close(); server.kill(); }
}

await (loadMode ? loadTest() : fpsTest());
process.exit(0);
