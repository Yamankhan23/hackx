#!/usr/bin/env node
/**
 * Non-destructive-ish load test for the registration flow (Phase 9 of the
 * launch-day readiness review). Zero new dependencies — uses Node's global
 * fetch and a small concurrency pool.
 *
 * This WRITES REAL ROWS (teams/team_members/colleges) into whatever
 * DATABASE_URL the target server is using. Do NOT point BASE_URL at
 * production. Run it against localhost or a disposable staging DB/branch.
 *
 * Usage:
 *   BASE_URL=http://localhost:5000 node scripts/load-test/registration-spike.js --concurrency 50 --total 200
 *
 * It ramps through a few stages by default (50 -> 100 -> 250 concurrent
 * "virtual users", each submitting one registration) unless you override
 * --concurrency/--total for a single stage. For each stage it prints error
 * rate, avg/p95/p99 latency, and a status-code breakdown.
 *
 * This script only measures the CLIENT's view (latency, error rate). It
 * cannot see server-side CPU/memory/DB-connection usage — watch Render's
 * metrics dashboard and Supabase's dashboard (Database > Reports) in
 * another tab while a stage is running.
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
};

const explicitConcurrency = getArg("concurrency");
const explicitTotal = getArg("total");

const STAGES = explicitConcurrency
  ? [{ concurrency: Number(explicitConcurrency), total: Number(explicitTotal || explicitConcurrency) }]
  : [
      { concurrency: 50, total: 50 },
      { concurrency: 100, total: 100 },
      { concurrency: 250, total: 250 },
    ];

const runId = Date.now().toString(36);

const randomMobile = () => `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0")}`;

const buildMember = (role, tag) => ({
  role,
  fullName: `Load Test ${role} ${tag}`,
  email: `loadtest-${runId}-${tag}@example.com`,
  mobileNumber: randomMobile(),
  college: { collegeName: `Load Test College ${runId}` },
  region: "Test Region",
  branch: "Computer Science",
  yearOfStudy: 2,
});

const buildRegistrationPayload = (domainId, index) => {
  const tag = `${index}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    teamName: `Load Test Team ${runId}-${tag}`,
    domainId,
    declarationAccepted: true,
    members: [
      buildMember("LEADER", `${tag}-l`),
      buildMember("MEMBER", `${tag}-m1`),
      buildMember("MEMBER", `${tag}-m2`),
    ],
  };
};

const fetchDomainId = async () => {
  const res = await fetch(`${BASE_URL}/api/domains`);
  const body = await res.json();
  if (!body?.data?.length) {
    throw new Error(
      "No active domains returned by /api/domains — seed at least one domain before load testing."
    );
  }
  return body.data[0].id;
};

const percentile = (sortedLatencies, p) => {
  if (sortedLatencies.length === 0) return 0;
  const idx = Math.min(
    sortedLatencies.length - 1,
    Math.ceil((p / 100) * sortedLatencies.length) - 1
  );
  return sortedLatencies[idx];
};

const runOneRegistration = async (domainId, index) => {
  const payload = buildRegistrationPayload(domainId, index);
  const startedAt = Date.now();

  try {
    const res = await fetch(`${BASE_URL}/api/teams/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const latencyMs = Date.now() - startedAt;
    return { ok: res.ok, status: res.status, latencyMs };
  } catch (error) {
    return { ok: false, status: 0, latencyMs: Date.now() - startedAt, error: String(error) };
  }
};

// Simple fixed-concurrency pool: keeps `concurrency` requests in flight at
// once until `total` have been issued.
const runStage = async (domainId, { concurrency, total }) => {
  console.log(`\n=== Stage: concurrency=${concurrency} total=${total} ===`);

  const results = [];
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < total) {
      const index = nextIndex++;
      results.push(await runOneRegistration(domainId, index));
    }
  };

  const stageStartedAt = Date.now();
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
  const wallClockMs = Date.now() - stageStartedAt;

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const errorCount = results.filter((r) => !r.ok).length;
  const statusCounts = results.reduce((acc, r) => {
    const key = r.error ? "network_error" : String(r.status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const avg = latencies.reduce((sum, v) => sum + v, 0) / (latencies.length || 1);

  console.log(`Wall clock:   ${wallClockMs}ms`);
  console.log(`Requests:     ${results.length}`);
  console.log(`Error rate:   ${((errorCount / results.length) * 100).toFixed(1)}%`);
  console.log(`Avg latency:  ${avg.toFixed(0)}ms`);
  console.log(`p95 latency:  ${percentile(latencies, 95)}ms`);
  console.log(`p99 latency:  ${percentile(latencies, 99)}ms`);
  console.log(`Status codes: ${JSON.stringify(statusCounts)}`);

  return { errorCount, results };
};

const main = async () => {
  console.log(`Load testing registration flow against ${BASE_URL}`);
  console.log(
    "This writes real rows into that server's database — do not point this at production.\n"
  );

  const domainId = await fetchDomainId();

  for (const stage of STAGES) {
    const { errorCount } = await runStage(domainId, stage);

    // Stop ramping up once a stage already shows meaningful failure —
    // there's no value in throwing more load at a bottleneck you've
    // already found, and it only creates more test data to clean up.
    if (errorCount / stage.total > 0.05) {
      console.log(
        `\nStopping ramp: error rate exceeded 5% at concurrency=${stage.concurrency}. This is likely the first practical bottleneck.`
      );
      break;
    }
  }

  console.log(
    `\nDone. All test data uses the "Load Test" prefix / run id "${runId}" — safe to identify and delete afterwards.`
  );
};

main().catch((error) => {
  console.error("Load test failed:", error);
  process.exit(1);
});
