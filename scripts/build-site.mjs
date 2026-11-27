import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const demo = process.argv.includes('--demo');
const originalSite = 'https://uniqkode.github.io/rill/';
function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} before building the hosted workspace.`);
  return value;
}
const siteUrl = new URL(process.env.RILL_SITE_URL?.trim() || (demo ? originalSite : required('RILL_SITE_URL')));
if (siteUrl.username || siteUrl.password || siteUrl.search || siteUrl.hash
  || (siteUrl.protocol !== 'https:' && !(siteUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(siteUrl.hostname)))) {
  throw new Error('RILL_SITE_URL must be an HTTPS site URL, or an HTTP localhost URL for development.');
}
if (!siteUrl.pathname.endsWith('/')) siteUrl.pathname += '/';

const authMarker = '<!-- rill-live-scripts -->';
const pageDirs = ['about', 'ai-policy', 'blog', 'contact', 'dashboard', 'data-policy', 'home', 'legal', 'login',
  'market', 'pricing', 'privacy', 'problem', 'product', 'roadmap', 'security', 'solution', 'team', 'Technology', 'terms'];
const assetTypes = new Set(['.css', '.jpg', '.jpeg', '.png', '.webp', '.svg', '.woff2', '.js', '.json', '.txt']);
const revision = data => createHash('sha256').update(data).digest('hex').slice(0, 10);

let backend;
if (!demo) {
  const url = new URL(required('SUPABASE_URL'));
  const publishableKey = required('SUPABASE_PUBLISHABLE_KEY');
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.username || url.password || url.search || url.hash) {
    throw new Error('SUPABASE_URL must be the project HTTPS origin.');
  }
  if (!/^sb_publishable_[\w-]+$/.test(publishableKey)) throw new Error('Set SUPABASE_PUBLISHABLE_KEY to your project’s publishable key.');
  backend = { url: url.origin, publishableKey };
}

if (existsSync(output) && !existsSync(join(output, '.rill-build'))) {
  throw new Error('Move the existing dist directory before building.');
}
const staging = await mkdtemp(join(root, '.rill-build-'));

async function put(path, data) {
  const destination = join(staging, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, data);
}

async function copyAssets() {
  await mkdir(join(staging, 'assets'), { recursive: true });
  for (const entry of await readdir(join(root, 'assets'), { withFileTypes: true })) {
    if (entry.isFile() && assetTypes.has(extname(entry.name))) {
      await copyFile(join(root, 'assets', entry.name), join(staging, 'assets', entry.name));
    }
  }
}

async function writeAuthAssets() {
  const packageRoot = join(root, 'node_modules', '@supabase', 'supabase-js');
  if (!existsSync(packageRoot)) throw new Error('Install the pinned Supabase browser SDK with npm install before building.');
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const bundle = resolve(packageRoot, manifest.unpkg || 'dist/umd/supabase.js');
  if (!bundle.startsWith(packageRoot + sep)) throw new Error('Invalid Supabase browser bundle path.');
  const sdk = await readFile(bundle);
  const sdkPath = `assets/supabase-${revision(sdk)}.js`;
  await put(sdkPath, sdk);
  for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    if (existsSync(join(packageRoot, name))) { await put('assets/SUPABASE-LICENSE.txt', await readFile(join(packageRoot, name))); break; }
  }
  const runtime = `window.RILL_BACKEND = ${JSON.stringify(backend)};\n`;
  await put('assets/runtime-config.js', runtime);
  const scripts = [sdkPath, `assets/runtime-config.js?v=${revision(runtime)}`];
  for (const name of ['workspace-data.js', 'workspace-entry.js']) {
    scripts.push(`assets/${name}?v=${revision(await readFile(join(root, 'assets', name)))}`);
  }
  return scripts;
}

async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await htmlFiles(path));
    else if (entry.isFile() && extname(entry.name) === '.html') files.push(path);
  }
  return files;
}

try {
  await copyAssets();
  const scripts = demo ? [] : await writeAuthAssets();
  const pages = ['index.html', '404.html'];
  for (const directory of pageDirs) pages.push(...await htmlFiles(directory));
  const revisions = {};
  for (const name of ['app.js', 'rill.css', 'dashboard.css', 'forecast-planner.js']) {
    revisions[name] = revision(await readFile(join(root, 'assets', name)));
  }
  for (const path of pages) {
    let html = (await readFile(join(root, path), 'utf8')).replaceAll(originalSite, siteUrl.href);
    html = html.replace(/(\/assets\/)(app\.js|rill\.css|dashboard\.css|forecast-planner\.js)(?:\?v=[\w.-]+)?(?=")/g,
      (_, prefix, name) => `${prefix}${name}?v=${revisions[name]}`);
    if (!demo) {
      html = html.replaceAll('>Sign in to the demo<', '>Open workspace<');
      const base = '../'.repeat(path.split('/').length - 1) || './';
      const tags = scripts.map(script => `<script src="${base}${script}" defer></script>`).join('\n');
      if (html.includes('data-workspace-mode="demo"')) {
        if (!html.includes(authMarker)) throw new Error(`Missing auth script marker in ${path}.`);
        html = html.replace('data-workspace-mode="demo"', 'data-workspace-mode="live"').replace(authMarker, tags);
      } else if (html.includes('data-account-link')) {
        html = html.replace(/<body\b/, '<body data-workspace-mode="live"').replace('</body>', `\n${tags}\n</body>`);
      }
      if (path === 'login/index.html') html = html.replace(/<!-- rill-demo-login:start -->[\s\S]*?<!-- rill-demo-login:end -->/, '');
      if (path === 'dashboard/index.html') html = html.replace(/^<script src="\.\.\/assets\/ai-workspace\.js[^\n]*\n/m, '');
    }
    await put(path, html);
  }
  for (const path of ['robots.txt', 'sitemap.xml']) {
    await put(path, (await readFile(join(root, path), 'utf8')).replaceAll(originalSite, siteUrl.href));
  }
  // A relative 404 page must resolve assets from the site root, even at a nested URL.
  await put('404.html', (await readFile(join(staging, '404.html'), 'utf8')).replace('<head>', `<head><base href="${siteUrl.pathname}">`));
  if (backend) {
    const policy = `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; connect-src 'self' ${backend.url}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:`;
    const headers = ['/login', '/login/*', '/dashboard', '/dashboard/*'].map(path =>
      `${path}\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  Content-Security-Policy: ${policy}`).join('\n\n');
    await put('_headers', `${headers}\n\n/assets/runtime-config.js\n  Cache-Control: no-store\n`);
    await put('_routes.json', JSON.stringify({ version: 1, include: ['/api/forecast'], exclude: [] }));
  }
  await put('.rill-build', demo ? 'demo\n' : 'live\n');
  await rm(output, { recursive: true, force: true });
  await rename(staging, output);
  console.log(`Built the ${demo ? 'demo' : 'hosted workspace'} site in dist/`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
