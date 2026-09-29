// Builds bench/ with Vite, drives it in headless Chromium through Playwright,
// and prints a Markdown table of medians per scenario.
//
// Runs on Node's built-in type stripping, so it uses no TS-only runtime syntax.
//
// Every scenario runs as start(), a driver, then finish(). The page drives
// mount, scroll, scroll-onscroll and resize itself. wheel scrolls the same
// distance with a CDP scroll gesture on the compositor thread, so no bench
// code touches scrollTop during it.
//
//   pnpm bench [--runs=N]

import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { build, preview } from 'vite';

import { scrollDistance, scrollStepPx } from './scroll.mts';

type RunResult = { frameIntervals: number[]; domNodes: number; commits: number; scrollTop: number };
type BenchWindow = {
  __bench: {
    ready: Promise<void>;
    cardRenders: number;
    start(): void;
    drive(): Promise<void>;
    finish(): Promise<RunResult>;
  };
};
type Row = Record<(typeof columns)[number]['key'], number>;

const scenarios = ['mount', 'scroll', 'scroll-onscroll', 'resize', 'wheel'];
const scrollScenarios = ['scroll', 'scroll-onscroll', 'wheel'];
const throttle = 4;
const viewport = { width: 1280, height: 800 };

const columns = [
  { key: 'ScriptDuration', label: 'Script ms', ms: true },
  { key: 'LayoutDuration', label: 'Layout ms', ms: true },
  { key: 'RecalcStyleDuration', label: 'Style ms', ms: true },
  { key: 'TaskDuration', label: 'Task ms', ms: true },
  { key: 'LayoutCount', label: 'Layouts', ms: false },
  { key: 'RecalcStyleCount', label: 'Style recalcs', ms: false },
  { key: 'commits', label: 'Commits', ms: false },
  { key: 'cardRenders', label: 'Card renders', ms: false },
  { key: 'domNodes', label: 'DOM nodes', ms: false },
  { key: 'p95Frame', label: 'p95 frame ms', ms: true },
] as const;
const cdpMetrics = ['ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration', 'TaskDuration'];
const cdpCounts = ['LayoutCount', 'RecalcStyleCount'];

const runsArg = process.argv.find((a) => a.startsWith('--runs='));
const runs = runsArg ? Number(runsArg.slice('--runs='.length)) : 5;
if (!Number.isInteger(runs) || runs < 1) throw new Error(`--runs must be a positive integer: ${runsArg}`);

const benchDir = fileURLToPath(new URL('.', import.meta.url));
const srcDir = fileURLToPath(new URL('../src', import.meta.url));

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Under 20 values this is the max, so the idle frames that pass while run.mts
// talks to the page do not move a short run such as mount.
const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};

const commit = () => {
  const git = (...args: string[]) => execFileSync('git', args, { cwd: benchDir, encoding: 'utf8' }).trim();
  const hash = git('rev-parse', '--short', 'HEAD');
  return git('status', '--porcelain', '--', srcDir) === '' ? hash : `${hash} (src modified)`;
};

const outDir = await mkdtemp(join(tmpdir(), 'card-window-bench-'));
await build({
  root: benchDir,
  mode: 'production',
  logLevel: 'warn',
  build: { outDir, emptyOutDir: true },
});
const server = await preview({
  root: benchDir,
  logLevel: 'warn',
  build: { outDir },
  preview: { open: false },
});
const baseUrl = server.resolvedUrls?.local[0];
if (!baseUrl) throw new Error('vite preview did not report a URL');

const browser = await chromium.launch();
try {
  const rows: Array<[string, Row]> = [];
  for (const scenario of scenarios) {
    const samples: Row[] = [];
    for (let i = 0; i < runs; i += 1) {
      const page = await browser.newPage({ viewport });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
      await cdp.send('Performance.enable');
      await page.goto(`${baseUrl}?scenario=${scenario}`);
      await page.evaluate(() => (window as unknown as BenchWindow).__bench.ready);

      const metrics = async () => {
        const { metrics: list } = await cdp.send('Performance.getMetrics');
        return new Map(list.map((m) => [m.name, m.value]));
      };
      const before = await metrics();
      const rendersBefore = await page.evaluate(() => (window as unknown as BenchWindow).__bench.cardRenders);
      await page.evaluate(() => (window as unknown as BenchWindow).__bench.start());
      if (scenario === 'wheel') {
        // (500, 400) is the middle of the 1000x800 frame.
        await cdp.send('Input.synthesizeScrollGesture', {
          x: 500,
          y: 400,
          yDistance: -scrollDistance,
          speed: scrollStepPx * 60,
          gestureSourceType: 'mouse',
          preventFling: true,
        });
      } else {
        await page.evaluate(() => (window as unknown as BenchWindow).__bench.drive());
      }
      const result = await page.evaluate(() => (window as unknown as BenchWindow).__bench.finish());
      const rendersAfter = await page.evaluate(() => (window as unknown as BenchWindow).__bench.cardRenders);
      const after = await metrics();
      if (scrollScenarios.includes(scenario) && result.scrollTop !== scrollDistance) {
        throw new Error(`${scenario} scrolled to ${result.scrollTop}, not ${scrollDistance}`);
      }
      const delta = (name: string) => (after.get(name) ?? 0) - (before.get(name) ?? 0);

      const sample = {} as Row;
      for (const name of cdpMetrics) sample[name as keyof Row] = delta(name) * 1000;
      for (const name of cdpCounts) sample[name as keyof Row] = delta(name);
      sample.cardRenders = rendersAfter - rendersBefore;
      sample.commits = result.commits;
      sample.domNodes = result.domNodes;
      sample.p95Frame = percentile(result.frameIntervals, 95);
      samples.push(sample);
      await page.close();
    }
    const row = {} as Row;
    for (const { key } of columns) row[key] = median(samples.map((s) => s[key]));
    rows.push([scenario, row]);
  }

  const format = (value: number, ms: boolean) => (ms ? value.toFixed(1) : String(Math.round(value)));
  const lines = [
    `Commit ${commit()}, Chromium ${browser.version()}, Node ${process.version}, CPU throttle ${throttle}x, median of ${runs} run${runs === 1 ? '' : 's'}`,
    '',
    `| Scenario | ${columns.map((c) => c.label).join(' | ')} |`,
    `|---|${columns.map(() => '--:').join('|')}|`,
    ...rows.map(([name, row]) => `| ${name} | ${columns.map((c) => format(row[c.key], c.ms)).join(' | ')} |`),
  ];
  console.log(lines.join('\n'));
} finally {
  await browser.close();
  await server.close();
  await rm(outDir, { recursive: true, force: true });
}
