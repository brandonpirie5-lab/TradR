import { spawn } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

function killPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`Stopped process on port ${port} (pid ${pid})`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* nothing listening */
  }
}

killPort(3000);

if (existsSync('.next')) {
  rmSync('.next', { recursive: true, force: true });
  console.log('Removed .next');
}

console.log('Starting next dev...');
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

child.on('exit', (code) => process.exit(code ?? 0));