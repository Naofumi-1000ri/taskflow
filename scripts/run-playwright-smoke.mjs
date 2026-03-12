import { spawn } from 'node:child_process';

const baseEnv = {
  ...process.env,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'demo-project.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-project',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'demo-project.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '1234567890',
  NEXT_PUBLIC_FIREBASE_APP_ID:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:1234567890:web:abcdef123456',
  NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? '1',
};

delete baseEnv.NO_COLOR;

function runPlaywright(specPath, envOverrides) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['playwright', 'test', specPath],
      {
        cwd: process.cwd(),
        env: {
          ...baseEnv,
          ...envOverrides,
        },
        stdio: 'inherit',
      }
    );

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Playwright exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`Playwright exited with code ${code ?? 1}`));
        return;
      }

      resolve();
    });
  });
}

async function main() {
  await runPlaywright('e2e/auth-smoke.spec.ts', {
    NEXT_PUBLIC_ENABLE_TEST_AUTH: 'false',
    NEXT_PUBLIC_E2E_MOCK_AUTH: 'false',
  });

  await runPlaywright('e2e/authenticated-smoke.spec.ts', {
    NEXT_PUBLIC_ENABLE_TEST_AUTH: 'false',
    NEXT_PUBLIC_E2E_MOCK_AUTH: 'true',
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
