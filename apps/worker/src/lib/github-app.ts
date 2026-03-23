import { env } from "@config/env";

function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n");
}

// @octokit/app is pure ESM — use dynamic import() to load it from a CJS context.
type OctokitApp = import("@octokit/app").App;
let _app: OctokitApp | null = null;

async function getApp(): Promise<OctokitApp> {
  if (!_app) {
    const dynImport = new Function('return import("@octokit/app")') as () => Promise<typeof import("@octokit/app")>;
    const { App } = await dynImport();
    _app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: normalizePrivateKey(env.GITHUB_PRIVATE_KEY)
    });
  }
  return _app!;
}

export async function getInstallationClient(installationId: number) {
  const app = await getApp();
  return app.getInstallationOctokit(installationId);
}
