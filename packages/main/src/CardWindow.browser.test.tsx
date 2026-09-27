import * as React from 'react';

import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { CardProps, CardWindow, CardWindowProps, JustifyContent, Loading, range } from '.';

// These tests pin down what a user sees, so that the layout can be rewritten
// underneath them. They import only from the public entry, and they read only
// real layout (getBoundingClientRect), DOM presence and callback arguments,
// never style px values or the row/col props.
//
// Geometry: cards are 100 x 100 with the default spacing of 8, so the row
// pitch is 108 and row r spans [8 + 108r, 108 + 108r] in content coordinates.
//
// The widths 180, 280, 400, 600 and 820 give 1, 2, 3, 5 and 7 columns. At each
// of them the space-evenly rule of 1.11.0, floor((w - 24) / 108), and the rule
// for everything else, which CSS Grid auto-fill also follows,
// floor((w - 8) / 108), agree, even with a 17px classic scrollbar. Headless
// Chromium hides scrollbars (width 0).
//
// Scroll offsets sit far from every threshold. The visible-rows math of 1.11.0
// ignores spacing.top (8px off), so no card's visible fraction may sit near
// 0.5 or an edge.

const cardRect = { width: 100, height: 100 };

// The card puts style on its root, so the layout the window computes is the
// layout the browser draws.
const Card = ({ index, style }: CardProps) => <div data-card-index={index} style={style} />;

type Props = Omit<CardWindowProps, 'cardRect' | 'children'>;

// CardWindow's root element is the scroll container, the first element child
// of the sized frame.
const renderCardWindow = async (width: number, height: number, props: Props) => {
  const screen = await render(
    <div data-testid="frame" style={{ width, height }}>
      <CardWindow cardRect={cardRect} {...props}>
        {Card}
      </CardWindow>
    </div>,
  );
  const frame = screen.container.querySelector('[data-testid="frame"]') as HTMLElement;
  const scroller = frame.firstElementChild as HTMLElement;
  return { frame, scroller };
};

const cards = (scroller: HTMLElement) =>
  Array.from(scroller.querySelectorAll<HTMLElement>('[data-card-index]'))
    .map((el) => ({ index: Number(el.dataset.cardIndex), rect: el.getBoundingClientRect() }))
    .sort((a, b) => a.index - b.index);

const columnCount = (scroller: HTMLElement) => {
  const all = cards(scroller);
  if (all.length === 0) return 0;
  return all.filter((c) => Math.abs(c.rect.top - all[0].rect.top) < 1).length;
};

const indexesInView = (scroller: HTMLElement) => {
  const view = scroller.getBoundingClientRect();
  return cards(scroller)
    .filter((c) => c.rect.bottom > view.top && c.rect.top < view.bottom)
    .map((c) => c.index);
};

// Serves both loading types, since both give the component a style.
const LoadingComponent = ({ style }: { style: React.CSSProperties }) => <div data-loading="" style={style} />;

const nextFrames = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

const loadingInView = (scroller: HTMLElement) => {
  const el = scroller.querySelector<HTMLElement>('[data-loading]');
  if (!el) return false;
  const view = scroller.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return rect.bottom > view.top && rect.top < view.bottom;
};

describe('columns', () => {
  test.each([
    [180, 1],
    [280, 2],
    [400, 3],
    [600, 5],
    [820, 7],
  ])('%ipx wide fits %i columns', async (width, expected) => {
    const { scroller } = await renderCardWindow(width, 300, { data: range(100) });
    await expect.poll(() => columnCount(scroller)).toBe(expected);
  });

  test('stops at maxCols', async () => {
    const { scroller } = await renderCardWindow(820, 300, { data: range(100), maxCols: 4 });
    await expect.poll(() => columnCount(scroller)).toBe(4);
  });

  test('follows a change in width', async () => {
    const { frame, scroller } = await renderCardWindow(400, 300, { data: range(100) });
    await expect.poll(() => columnCount(scroller)).toBe(3);
    frame.style.width = '600px';
    await expect.poll(() => columnCount(scroller)).toBe(5);
  });
});

describe('last row', () => {
  const justifyContents: JustifyContent[] = [
    'left',
    'right',
    'center',
    'space-around',
    'space-between',
    'space-evenly',
    'stretch',
  ];

  // 8 cards in 3 columns leave 2 cards on the last row, and they must sit under
  // columns 0 and 1 of the row above. The width check covers stretch, where the
  // cards grow.
  test.each(justifyContents)('lines up with the columns above when justifyContent is %s', async (justifyContent) => {
    const { scroller } = await renderCardWindow(400, 400, { data: range(8), justifyContent });
    await expect.poll(() => cards(scroller).length).toBe(8);
    expect(columnCount(scroller)).toBe(3);
    const all = cards(scroller);
    for (const i of [6, 7]) {
      expect(all[i].rect.left).toBeCloseTo(all[i - 3].rect.left, 0);
      expect(all[i].rect.width).toBeCloseTo(all[i - 3].rect.width, 0);
      expect(all[i].rect.top).toBeGreaterThan(all[i - 3].rect.top);
    }
  });
});

describe('scroll offset', () => {
  // The view is [1108, 1438] in content coordinates. Row 10 [1088, 1188] and
  // row 13 [1412, 1512] are partly in; row 9 ends at 1080 and row 14 starts at
  // 1520, so every edge has at least 26px of margin. Rows 10 to 13 are visible,
  // cards 30 to 41. Cards 0 and 299 are more than 1000px away, so any overscan
  // the rewrite picks leaves them out.
  test('renders the cards in view, and not the far ones, after a scroll', async () => {
    const { scroller } = await renderCardWindow(400, 330, { data: range(300) });
    await expect.poll(() => columnCount(scroller)).toBe(3);
    scroller.scrollTop = 1108;
    await expect.poll(() => indexesInView(scroller)).toEqual(range(30, 42));
    const rendered = cards(scroller).map((c) => c.index);
    expect(rendered).not.toContain(0);
    expect(rendered).not.toContain(299);
  });
});

describe('loadMore', () => {
  // No exact call count: 1.11.0 calls loadMore from an effect that runs
  // whenever the rendered items change, and the rewrite will use an
  // IntersectionObserver. At the top, 300 cards are 100 rows, about 10,800px,
  // so the end is far outside any overscan. The two frames give an observer a
  // chance to fire before the "not called" check.
  test.each(['card', 'row'] as const)(
    'with a loading %s, is not called at the top and is called at the end',
    async (type) => {
      const loadMore = vi.fn();
      const loading: Loading =
        type === 'card'
          ? { type, count: 2, LoadingComponent, loadMore }
          : { type, height: 50, LoadingComponent, loadMore };
      const { scroller } = await renderCardWindow(400, 330, { data: range(300), loading });
      await expect.poll(() => columnCount(scroller)).toBe(3);
      await nextFrames();
      expect(loadMore).not.toHaveBeenCalled();
      scroller.scrollTop = scroller.scrollHeight;
      await expect.poll(() => loadMore.mock.calls.length).toBeGreaterThan(0);
      expect(loadingInView(scroller)).toBe(true);
    },
  );

  test('is called on mount when the data does not fill the view', async () => {
    const loadMore = vi.fn();
    await renderCardWindow(400, 330, {
      data: range(5),
      loading: { type: 'card', count: 1, LoadingComponent, loadMore },
    });
    await expect.poll(() => loadMore.mock.calls.length).toBeGreaterThan(0);
  });
});
