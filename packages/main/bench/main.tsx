import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { type CardProps, CardWindow, range } from '../src';
import { scrollStepPx, scrollSteps } from './scroll.mts';

// The page that bench/run.mts drives. It uses only props that exist in both
// 1.11.0 and 2.0, so the same page measures both.
//
// run.mts calls start(), then drives the scenario, then calls finish().
// drive() runs the steps of a scenario that the page drives itself. The wheel
// scenario has none, because run.mts scrolls it with CDP input between start()
// and finish().

type RunResult = { frameIntervals: number[]; domNodes: number; commits: number; scrollTop: number };

declare global {
  interface Window {
    __bench: {
      ready: Promise<void>;
      cardRenders: number;
      start(): void;
      drive(): Promise<void>;
      finish(): Promise<RunResult>;
    };
  }
}

const scenarios = ['mount', 'scroll', 'scroll-onscroll', 'resize', 'wheel'] as const;
type Scenario = (typeof scenarios)[number];

const param = new URLSearchParams(window.location.search).get('scenario');
const scenario = scenarios.find((s) => s === param);
if (!scenario) throw new Error(`unknown scenario: ${param}`);

const data = range(10000);
const cardRect = { width: 200, height: 120 };
const noop = () => {};

// Counting renders is the point, so the side effect in render is deliberate.
const countRender = () => {
  window.__bench.cardRenders += 1;
};

const BenchCard = ({ index, style }: CardProps) => {
  countRender();
  return (
    <div data-card-index={index} style={style}>
      {index}
    </div>
  );
};

const App = ({ onScroll }: { onScroll?: () => void }) => (
  <CardWindow data={data} cardRect={cardRect} onScroll={onScroll}>
    {BenchCard}
  </CardWindow>
);

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const container = document.getElementById('root') as HTMLElement;
const frame = document.createElement('div');
frame.style.width = '1000px';
frame.style.height = '800px';
container.appendChild(frame);
const root = createRoot(frame);

const mount = () => root.render(<App onScroll={scenario === 'scroll-onscroll' ? noop : undefined} />);

const cardsPresent = () => frame.querySelector('[data-card-index]') !== null;

const waitForCards = async () => {
  do await nextFrame();
  while (!cardsPresent());
};

const scroller = () => frame.firstElementChild as HTMLElement | null;

// The steps that drive() runs, each in its own frame.
const steps = (s: Scenario): Array<() => void> => {
  if (s === 'scroll' || s === 'scroll-onscroll') {
    return range(scrollSteps).map(() => () => {
      const el = scroller();
      if (el) el.scrollTop += scrollStepPx;
    });
  }
  if (s === 'resize') {
    // 1000 -> 500 -> 1000 in 10px steps.
    const widths = [...range(50).map((i) => 990 - i * 10), ...range(50).map((i) => 510 + i * 10)];
    return widths.map((w) => () => {
      frame.style.width = `${w}px`;
    });
  }
  return [];
};

// Counts the tasks that changed the DOM. React commits synchronously, so a scroll-driven commit gives one
// callback, but commits chained in one task (a layout-effect update after a commit) share one.
const countCommits = () => {
  let commits = 0;
  const observer = new MutationObserver(() => {
    commits += 1;
  });
  observer.observe(frame, { childList: true, subtree: true, attributes: true });
  return () => {
    observer.disconnect();
    return commits;
  };
};

// Between start() and finish(), a frame loop records one interval per frame.
// The first interval starts at start(), so a mount that shows cards in the
// first frame still records one.
let frameIntervals: number[] = [];
let frameLoop = 0;
let stopCounting = () => 0;

const start = () => {
  frameIntervals = [];
  stopCounting = countCommits();
  let last = performance.now();
  const loop = (now: number) => {
    frameIntervals.push(now - last);
    last = now;
    frameLoop = requestAnimationFrame(loop);
  };
  frameLoop = requestAnimationFrame(loop);
};

const drive = async () => {
  if (scenario === 'mount') {
    mount();
    await waitForCards();
    return;
  }
  for (const step of steps(scenario)) {
    step();
    await nextFrame();
  }
};

const finish = async (): Promise<RunResult> => {
  cancelAnimationFrame(frameLoop);
  // Let renders that are still queued land before the counts and the metrics
  // are read. The frame intervals stop before this.
  await nextFrame();
  await nextFrame();
  const el = scroller();
  const domNodes = el ? el.querySelectorAll('*').length : 0;
  return { frameIntervals, domNodes, commits: stopCounting(), scrollTop: el ? el.scrollTop : 0 };
};

const ready = async () => {
  if (scenario === 'mount') return;
  mount();
  await waitForCards();
  await nextFrame();
  await nextFrame();
};

window.__bench = { ready: Promise.resolve(), cardRenders: 0, start, drive, finish };
window.__bench.ready = ready();
