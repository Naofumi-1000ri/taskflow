import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const reportPath = path.join(cwd, 'dependency-health-report.md');
const summaryPath = path.join(cwd, 'dependency-health-summary.json');
const deferredOutdatedRules = {
  eslint: {
    reason:
      'Deferred until eslint-config-next and its bundled React lint stack support ESLint 10 without runtime rule loader failures.',
    isDeferred: ({ current, latest }) =>
      typeof current === 'string' &&
      typeof latest === 'string' &&
      current.startsWith('9.') &&
      latest.startsWith('10.'),
  },
};

const runJsonCommand = (command, args) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });

  const raw = result.stdout?.trim() || '{}';
  let parsed = {};

  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }

  return {
    status: result.status ?? 1,
    parsed,
    stderr: result.stderr?.trim() || '',
  };
};

const audit = runJsonCommand('npm', ['audit', '--omit=optional', '--json']);
const outdated = runJsonCommand('npm', ['outdated', '--json']);

const auditSummary = audit.parsed.metadata?.vulnerabilities ?? {
  info: 0,
  low: 0,
  moderate: 0,
  high: 0,
  critical: 0,
  total: 0,
};

const outdatedEntries = Object.entries(outdated.parsed)
  .map(([name, value]) => ({
    name,
    current: value.current ?? null,
    wanted: value.wanted ?? null,
    latest: value.latest ?? null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const deferredOutdated = [];
const activeOutdated = [];

for (const entry of outdatedEntries) {
  const rule = deferredOutdatedRules[entry.name];
  if (rule?.isDeferred(entry)) {
    deferredOutdated.push({
      ...entry,
      reason: rule.reason,
    });
    continue;
  }

  activeOutdated.push(entry);
}

const outdatedTable =
  activeOutdated.length === 0
    ? 'No outdated packages.\n'
    : [
        '| Package | Current | Wanted | Latest |',
        '| --- | --- | --- | --- |',
        ...activeOutdated.map((pkg) => {
          return `| ${pkg.name} | ${pkg.current ?? '-'} | ${pkg.wanted ?? '-'} | ${pkg.latest ?? '-'} |`;
        }),
      ].join('\n');

const deferredTable =
  deferredOutdated.length === 0
    ? 'No deferred updates.\n'
    : [
        '| Package | Current | Latest | Reason |',
        '| --- | --- | --- | --- |',
        ...deferredOutdated.map((pkg) => {
          return `| ${pkg.name} | ${pkg.current ?? '-'} | ${pkg.latest ?? '-'} | ${pkg.reason} |`;
        }),
      ].join('\n');

const report = [
  '# Dependency Health Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Audit',
  '',
  `- Total vulnerabilities: ${auditSummary.total}`,
  `- Critical: ${auditSummary.critical}`,
  `- High: ${auditSummary.high}`,
  `- Moderate: ${auditSummary.moderate}`,
  `- Low: ${auditSummary.low}`,
  '',
  '## Outdated Packages',
  '',
  outdatedTable,
  '',
  '## Deferred Updates',
  '',
  deferredTable,
  '',
].join('\n');

const summary = {
  generatedAt: new Date().toISOString(),
  audit: auditSummary,
  outdated: {
    total: activeOutdated.length,
    deferredTotal: deferredOutdated.length,
    packages: activeOutdated,
    deferred: deferredOutdated,
  },
};

fs.writeFileSync(reportPath, report);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

process.stdout.write(`${report}\n`);
