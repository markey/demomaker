// Unified dev launcher: starts Vite and then launches Electron with the dev URL
import { createServer } from 'vite';
import { spawn } from 'node:child_process';

async function main() {
  const server = await createServer({});
  await server.listen();
  const urls = server.resolvedUrls?.local ?? [`http://localhost:${server.config.server.port || 5173}`];
  const devUrl = urls[0];
  console.log(`[dev] Vite listening at ${devUrl}`);

  const { default: electronPath } = await import('electron');
  const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_START_URL: devUrl }
  });

  child.on('close', (code) => {
    console.log(`[dev] Electron exited with code ${code}`);
    server.close();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('[dev] Failed to start:', err);
  process.exit(1);
});

