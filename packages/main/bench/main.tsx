import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { type CardProps, CardWindow, range } from '../src';

// The page that bench/run.mts drives. It uses only props that exist in both
// 1.11.0 and 2.0, so the same page measures both.

type RunResult = { frameIntervals: number[]; domNodes: number; commits: number };

declare global {
  interface Window {
    __bench: {
      ready: Promise<void>;
      cardRenders: number;
      run(): Promise<RunResult>;
    };
  }
}

const scenarios = ['mount', 'scroll', 'scroll-onscroll', 'resize'] as const;
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

// The first interval starts at the call, so a mount that shows cards in the
// first frame still records one.
const waitForCards = async (intervals: number[]) => {
  let last = performance.now();
  do {
    const now = await nextFrame();
    intervals.push(now - last);
    last = now;
  } while (!cardsPresent());
};

// Each step runs in its own frame.
const steps = (s: Scenario): Array<() => void> => {
  const scroller = () => frame.firstElementChild as HTMLElement;
  if (s === 'scroll' || s === 'scroll-onscroll') {
    return range(600).map(() => () => {
      scroller().scrollTop += 40;
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

const run = async (): Promise<RunResult> => {
  const frameIntervals: number[] = [];
  const stopCounting = countCommits();
  if (scenario === 'mount') {
    mount();
    await waitForCards(frameIntervals);
  } else {
    let last = await nextFrame();
    for (const step of steps(scenario)) {
      step();
      const now = await nextFrame();
      frameIntervals.push(now - last);
      last = now;
    }
  }
  // Let renders that are still queued land before the counts and the metrics
  // are read. The frame intervals above stop before this.
  await nextFrame();
  await nextFrame();
  const scroller = frame.firstElementChild;
  const domNodes = scroller ? scroller.querySelectorAll('*').length : 0;
  return { frameIntervals, domNodes, commits: stopCounting() };
};

const ready = async () => {
  if (scenario === 'mount') return;
  mount();
  await waitForCards([]);
  await nextFrame();
  await nextFrame();
};

window.__bench = { ready: Promise.resolve(), cardRenders: 0, run };
window.__bench.ready = ready();
