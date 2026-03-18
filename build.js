#!/usr/bin/env node
/**
 * WorkTrack Build Helper
 * Run: node build.js
 * 
 * Checks prerequisites, installs all dependencies,
 * builds all sub-projects, and runs electron-builder.
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const ROOT = __dirname;
const log  = (msg, color = '\x1b[36m') => console.log(`${color}[build] \x1b[0m${msg}`);
const ok   = (msg) => log(`✓ ${msg}`, '\x1b[32m');
const err  = (msg) => { console.error(`\x1b[31m[error]\x1b[0m ${msg}`); process.exit(1); };

function run(cmd, cwd = ROOT) {
  log(`${cmd}  (in ${path.relative(ROOT, cwd) || '.'})`, '\x1b[33m');
  const result = spawnSync(cmd, { shell: true, cwd, stdio: 'inherit' });
  if (result.status !== 0) err(`Command failed: ${cmd}`);
}

function checkTool(name, cmd) {
  const r = spawnSync(cmd, { shell: true });
  if (r.status !== 0) err(`${name} not found. Install it first. (${cmd})`);
  ok(`${name} found`);
}

// ── 1. Check prerequisites ─────────────────────────────────
log('Checking prerequisites...');
checkTool('Node.js', 'node --version');
checkTool('npm',     'npm --version');

const nodeVersion = parseInt(execSync('node --version').toString().slice(1));
if (nodeVersion < 18) err(`Node.js 18+ required, found ${nodeVersion}`);
ok(`Node.js v${nodeVersion}`);

// ── 2. Install root deps ───────────────────────────────────
log('\nInstalling root dependencies...');
run('npm install');
ok('Root deps installed (including electron-rebuild for better-sqlite3)');

// ── 3. Install renderer deps ───────────────────────────────
log('\nInstalling renderer dependencies...');
run('npm install', path.join(ROOT, 'renderer'));
ok('Renderer deps installed');

// ── 4. Install admin dashboard deps ───────────────────────
log('\nInstalling admin dashboard dependencies...');
run('npm install', path.join(ROOT, 'admin-dashboard'));
ok('Admin dashboard deps installed');

// ── 5. Install admin server deps ──────────────────────────
log('\nInstalling admin server dependencies...');
run('npm install', path.join(ROOT, 'admin-server'));
ok('Admin server deps installed');

// ── 6. Build renderer ─────────────────────────────────────
log('\nBuilding renderer (React)...');
run('npm run build', path.join(ROOT, 'renderer'));
ok('Renderer built → renderer/dist/');

// ── 7. Build admin dashboard ──────────────────────────────
log('\nBuilding admin dashboard (React)...');
run('npm run build', path.join(ROOT, 'admin-dashboard'));
ok('Admin dashboard built → admin-dashboard/dist/');

// ── 8. Create placeholder assets if missing ───────────────
const assetsDir = path.join(ROOT, 'build', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// Create minimal placeholder icon files if they don't exist
// (replace with real 256x256 icon.ico before distributing)
['icon.ico', 'installer.ico', 'tray.png', 'license.txt'].forEach(f => {
  const p = path.join(assetsDir, f);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, f.endsWith('.txt') ? 'MIT License\nCopyright 2025 WorkTrack\n' : '');
    log(`Created placeholder: build/assets/${f}  ← replace with real asset`);
  }
});

// ── 9. Build .exe installer ────────────────────────────────
log('\nBuilding Windows installer...');
log('This may take 2-5 minutes...');
run('npx electron-builder --win');

// ── Done ───────────────────────────────────────────────────
const distFiles = fs.readdirSync(path.join(ROOT, 'dist')).filter(f => f.endsWith('.exe') || f.endsWith('.zip'));
console.log('\n\x1b[32m╔════════════════════════════════════════╗');
console.log('║   WorkTrack build complete! 🎉         ║');
console.log('╚════════════════════════════════════════╝\x1b[0m');
console.log('\nOutput files in dist/:');
distFiles.forEach(f => console.log(`  → dist/${f}`));
console.log('\nNext steps:');
console.log('  1. Replace build/assets/icon.ico with your real app icon');
console.log('  2. Start admin server: cd admin-server && node server.js');
console.log('  3. Create admin account: see README.md for curl command');
console.log('  4. Distribute dist/WorkTrack Setup 1.0.0.exe to employees\n');
