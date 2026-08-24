import { beforeEach, describe, expect, it, vi } from "vitest";

// corsOptions builds its allow-list from process.env at import time, so each
// test re-imports the module fresh after setting env vars.
const loadCorsOptions = async () => {
  vi.resetModules();
  const mod = await import("../lib/cors");
  return mod.corsOptions;
};

const checkOrigin = (
  corsOptions: Awaited<ReturnType<typeof loadCorsOptions>>,
  origin: string | undefined
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    (corsOptions.origin as (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void)(
      origin,
      (err, allow) => (err ? reject(err) : resolve(Boolean(allow)))
    );
  });

describe("corsOptions", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("allows the configured FRONTEND_URL", async () => {
    process.env.FRONTEND_URL = "https://hackathon.example.com";
    delete process.env.ADDITIONAL_CORS_ORIGINS;
    const corsOptions = await loadCorsOptions();

    await expect(checkOrigin(corsOptions, "https://hackathon.example.com")).resolves.toBe(true);
  });

  it("allows extra origins listed in ADDITIONAL_CORS_ORIGINS", async () => {
    process.env.FRONTEND_URL = "https://hackathon.example.com";
    process.env.ADDITIONAL_CORS_ORIGINS = "https://staging.example.com, https://admin.example.com";
    const corsOptions = await loadCorsOptions();

    await expect(checkOrigin(corsOptions, "https://staging.example.com")).resolves.toBe(true);
    await expect(checkOrigin(corsOptions, "https://admin.example.com")).resolves.toBe(true);
  });

  it("rejects (without throwing) an origin that isn't allow-listed", async () => {
    process.env.FRONTEND_URL = "https://hackathon.example.com";
    delete process.env.ADDITIONAL_CORS_ORIGINS;
    const corsOptions = await loadCorsOptions();

    await expect(checkOrigin(corsOptions, "https://evil.example.com")).resolves.toBe(false);
  });

  it("ignores a trailing slash mismatch between the env var and the real Origin header", async () => {
    process.env.FRONTEND_URL = "https://hackathon.example.com/";
    delete process.env.ADDITIONAL_CORS_ORIGINS;
    const corsOptions = await loadCorsOptions();

    // Browsers never send a trailing slash in the Origin header.
    await expect(checkOrigin(corsOptions, "https://hackathon.example.com")).resolves.toBe(true);
  });

  it("always allows requests with no Origin header (server-to-server, curl, webhooks)", async () => {
    process.env.FRONTEND_URL = "https://hackathon.example.com";
    delete process.env.ADDITIONAL_CORS_ORIGINS;
    const corsOptions = await loadCorsOptions();

    await expect(checkOrigin(corsOptions, undefined)).resolves.toBe(true);
  });
});
