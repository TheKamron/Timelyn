import { spawn } from 'child_process';
import { copyFileSync, linkSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronDir = join(__dirname, 'node_modules', 'electron', 'dist');
const hiddenDir = join(__dirname, '.bin');
const runtimeExeName = 'TimelynRuntime.exe';
const runtimeExe = join(hiddenDir, runtimeExeName);

if (!existsSync(electronDir)) {
  console.error('Electron not found. Run: npm install');
  process.exit(1);
}

function hardlinkTree(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });
  mkdirSync(dest, { recursive: true });
  for (const entry of entries) {
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      hardlinkTree(s, d);
    } else {
      try { linkSync(s, d); } catch { copyFileSync(s, d); }
    }
  }
}

if (!existsSync(runtimeExe)) {
  rmSync(hiddenDir, { recursive: true, force: true });
  hardlinkTree(electronDir, hiddenDir);
  const oldPath = join(hiddenDir, 'electron.exe');
  const newPath = join(hiddenDir, runtimeExeName);
  if (existsSync(oldPath)) {
    rmSync(newPath, { force: true });
    copyFileSync(oldPath, newPath);
  }
}

const proc = spawn(runtimeExe, ['.'], {
  cwd: __dirname,
  stdio: 'inherit',
});

proc.on('exit', (code) => process.exit(code));
