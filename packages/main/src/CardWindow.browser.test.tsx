import * as React from 'react';

import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { CardProps, CardWindow, CardWindowProps, JustifyContent, Loading, OnScrollProps, range } from '.';

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
// floor((w - 8) / 108), agree, even with a 17px classic scrollbar. An
// unstyled scrollbar overlays the content on macOS and takes about 15px on
// Linux, so no test here may depend on the gutter of an unstyled root.
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
// of the frame.
const renderInFrame = async (
  frameStyle: React.CSSProperties,
  props: Props,
  card: (props: CardProps) => React.ReactNode = Card,
) => {
  const screen = await render(
    <div data-testid="frame" style={frameStyle}>
      <CardWindow cardRect={cardRect} {...props}>
        {card}
      </CardWindow>
    </div>,
  );
  const frame = screen.container.querySelector('[data-testid="frame"]') as HTMLElement;
  const scroller = frame.firstElementChild as HTMLElement;
  return { frame, scroller };
};

const renderCardWindow = (width: number, height: number, props: Props) => renderInFrame({ width, height }, props);

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

// A card and a loading component that ignore the width CardWindow gives them.
const WideCard = ({ index, style }: CardProps) => <div data-card-index={index} style={{ ...style, width: 200 }} />;
const WideLoadingComponent = ({ style }: { style: React.CSSProperties }) => (
  <div data-loading="" style={{ ...style, width: 600, flexShrink: 0 }} />
);

const nextFrames = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

const loadingInView = (scroller: HTMLElement) => {
  const el = scroller.querySelector<HTMLElement>('[data-loading]');
  if (!el) return false;
  const view = scroller.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return rect.bottom > view.top && rect.top < view.bottom;
};

// Collects window errors while run is in progress.
const withWindowErrors = async (run: (errors: string[]) => Promise<void>) => {
  const errors: string[] = [];
  const onError = (e: ErrorEvent) => errors.push(e.message);
  window.addEventListener('error', onError);
  try {
    await run(errors);
  } finally {
    window.removeEventListener('error', onError);
  }
};

// Gives a root with the classic-scrollbar class a 15px scrollbar on both axes
// on every platform, and collects window errors while run is in progress.
const withClassicScrollbar = async (run: (errors: string[]) => Promise<void>) => {
  const style = document.createElement('style');
  style.textContent = '.classic-scrollbar::-webkit-scrollbar { width: 15px; height: 15px; }';
  document.head.appendChild(style);
  try {
    await withWindowErrors(run);
  } finally {
    style.remove();
  }
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

describe('onScroll', () => {
  // The default thresholdOfVisible is 0.5, and row r spans [8 + 108r, 108 + 108r].
  // At 1108 the view is [1108, 1438]: row 10 is 80% in, rows 11 and 12 are fully
  // in, and row 13 is 26% in (out), so cards 30 to 38. At 500 the view is
  // [500, 830]: row 4 is 40% in (out), rows 5 and 6 are fully in, and row 7 is
  // 66% in, so cards 15 to 23. Only the last call is checked, so the rewrite may
  // batch calls per animation frame. The second scroll goes backward, which
  // covers both directions without asserting on direction.
  test('reports the cards at least half in view as indexesOfVisible', async () => {
    const onScroll = vi.fn<(props: OnScrollProps) => void>();
    const { scroller } = await renderCardWindow(400, 330, { data: range(300), onScroll });
    await expect.poll(() => columnCount(scroller)).toBe(3);
    scroller.scrollTop = 1108;
    await expect.poll(() => onScroll.mock.lastCall?.[0].indexesOfVisible).toEqual(range(30, 39));
    scroller.scrollTop = 500;
    await expect.poll(() => onScroll.mock.lastCall?.[0].indexesOfVisible).toEqual(range(15, 24));
  });
});

describe('rendering', () => {
  // At 1108 the render range with the default 200px overscan is rows 8 to 15,
  // and at 1118 it is still rows 8 to 15, so that scroll must not render any
  // card. At 2000 the range moves, so new cards render.
  test('re-renders cards only when the row range changes', async () => {
    const renders = vi.fn();
    const CountingCard = ({ index, style }: CardProps) => {
      renders();
      return <div data-card-index={index} style={style} />;
    };
    const screen = await render(
      <div data-testid="frame" style={{ width: 400, height: 330 }}>
        <CardWindow cardRect={cardRect} data={range(300)}>
          {CountingCard}
        </CardWindow>
      </div>,
    );
    const frame = screen.container.querySelector('[data-testid="frame"]') as HTMLElement;
    const scroller = frame.firstElementChild as HTMLElement;
    await expect.poll(() => columnCount(scroller)).toBe(3);
    scroller.scrollTop = 1108;
    await expect.poll(() => indexesInView(scroller)).toEqual(range(30, 42));
    await nextFrames();
    const before = renders.mock.calls.length;
    scroller.scrollTop = 1118;
    await nextFrames();
    await nextFrames();
    expect(renders.mock.calls.length).toBe(before);
    scroller.scrollTop = 2000;
    await expect.poll(() => renders.mock.calls.length).toBeGreaterThan(before);
  });

  // At the end of 300 cards in 3 columns, cards 291 to 299 are in view. At
  // 530px the grid has 4 columns and the content gets shorter, so the browser
  // clamps scrollTop. The offset must follow the cards, not the clamp.
  test('keeps the last card in view when a wider frame adds a column', async () => {
    const { frame, scroller } = await renderCardWindow(400, 330, { data: range(300) });
    await expect.poll(() => columnCount(scroller)).toBe(3);
    scroller.scrollTop = scroller.scrollHeight;
    await expect.poll(() => indexesInView(scroller)).toContain(299);
    frame.style.width = '530px';
    await expect.poll(() => columnCount(scroller)).toBe(4);
    await nextFrames();
    expect(indexesInView(scroller)).toContain(299);
  });
});

describe('classic scrollbar', () => {
  // The root reserves a stable scrollbar gutter, and the style below gives it
  // a visible 15px classic scrollbar on every platform. The widths above still
  // fit the same column counts with 15px less content width. A reserved gutter
  // also means the scrollbar showing up does not resize the observed content
  // box, which with a visible classic scrollbar used to fire a window error,
  // "ResizeObserver loop completed with undelivered notifications".
  test.each([
    [180, 1],
    [280, 2],
    [400, 3],
    [600, 5],
    [820, 7],
  ])('%ipx wide with a 15px gutter fits %i columns', (width, expected) =>
    withClassicScrollbar(async (errors) => {
      const { frame, scroller } = await renderCardWindow(width, 300, {
        data: range(100),
        root: { className: 'classic-scrollbar' },
      });
      await expect.poll(() => columnCount(scroller)).toBe(expected);
      expect(scroller.offsetWidth - scroller.clientWidth).toBe(15);
      frame.style.width = `${width + 108}px`;
      await expect.poll(() => columnCount(scroller)).toBe(expected + 1);
      await nextFrames();
      expect(errors).toEqual([]);
    }),
  );
});

describe('justifyContent start and end', () => {
  // The same 8 cards in 3 columns as the last row tests above.
  test.each(['start', 'end'] as const)(
    'lines up the last row with the columns above when justifyContent is %s',
    async (justifyContent) => {
      const { scroller } = await renderCardWindow(400, 400, { data: range(8), justifyContent });
      await expect.poll(() => cards(scroller).length).toBe(8);
      expect(columnCount(scroller)).toBe(3);
      const all = cards(scroller);
      for (const i of [6, 7]) {
        expect(all[i].rect.left).toBeCloseTo(all[i - 3].rect.left, 0);
        expect(all[i].rect.width).toBeCloseTo(all[i - 3].rect.width, 0);
        expect(all[i].rect.top).toBeGreaterThan(all[i - 3].rect.top);
      }
    },
  );

  // The content box starts 8px inside the scroller and ends 8px before its
  // client width. Card 2 is the last column of the top row.
  test.each([
    ['left', 'left'],
    ['start', 'left'],
    ['right', 'right'],
    ['end', 'right'],
  ] as const)("%s puts the columns against the content's %s edge", async (justifyContent, edge) => {
    const { scroller } = await renderCardWindow(400, 400, { data: range(8), justifyContent });
    await expect.poll(() => cards(scroller).length).toBe(8);
    const view = scroller.getBoundingClientRect();
    const all = cards(scroller);
    if (edge === 'left') {
      expect(Math.abs(all[0].rect.left - (view.left + 8))).toBeLessThan(1);
    } else {
      expect(Math.abs(all[2].rect.right - (view.left + scroller.clientWidth - 8))).toBeLessThan(1);
    }
  });
});

describe('space-evenly column count', () => {
  // 1.11.0 fit 2 columns and auto-fill fits 3 only where the client width is
  // 332px to 347px. That band is too narrow to leave the scrollbar to the
  // platform. Headless Chromium on macOS overlays it, and on Linux in CI it
  // reserves a classic scrollbar's width. So the gutter is pinned at 15px. The
  // client width is 340px and the content 324px, where auto-fill fits
  // floor((324 + 8) / 108) = 3 columns. 1.11.0 kept a gap on both outer sides
  // and fit only 2.
  test('340px of client width fits 3 columns, as grid auto-fill does', () =>
    withClassicScrollbar(async () => {
      const { scroller } = await renderCardWindow(355, 300, {
        data: range(100),
        root: { className: 'classic-scrollbar' },
      });
      await expect.poll(() => columnCount(scroller)).toBe(3);
      expect(scroller.clientWidth).toBe(340);
    }));
});

describe('container style', () => {
  // A 300px sizer leaves 284px of content, 2 columns. A 520px one leaves 504px, 4 columns.
  test('follows a container.style that narrows the sizer', async () => {
    const { scroller } = await renderCardWindow(600, 300, {
      data: range(100),
      container: { style: { maxWidth: 300 } },
    });
    await expect.poll(() => columnCount(scroller)).toBe(2);
  });

  test('follows a container.style change after mount', async () => {
    const app = (maxWidth: number) => (
      <div data-testid="frame" style={{ width: 600, height: 300 }}>
        <CardWindow cardRect={cardRect} data={range(100)} container={{ style: { maxWidth } }}>
          {Card}
        </CardWindow>
      </div>
    );
    const screen = await render(app(300));
    const frame = screen.container.querySelector('[data-testid="frame"]') as HTMLElement;
    const scroller = frame.firstElementChild as HTMLElement;
    await expect.poll(() => columnCount(scroller)).toBe(2);
    await screen.rerender(app(520));
    await expect.poll(() => columnCount(scroller)).toBe(4);
  });
});

describe('resize without loop errors', () => {
  // A visible 15px classic scrollbar, as in the classic scrollbar tests. At
  // 600px the content is 600 - 15 - 16 = 569px, which fits 5 columns.
  test('changing the width 20 times fires no window error', async () => {
    const style = document.createElement('style');
    style.textContent = '.classic-scrollbar::-webkit-scrollbar { width: 15px; }';
    document.head.appendChild(style);
    const errors: string[] = [];
    const onError = (e: ErrorEvent) => errors.push(e.message);
    window.addEventListener('error', onError);
    try {
      const { frame, scroller } = await renderCardWindow(400, 330, {
        data: range(300),
        root: { className: 'classic-scrollbar' },
      });
      await expect.poll(() => columnCount(scroller)).toBe(3);
      scroller.scrollTop = 1108;
      await nextFrames();
      for (let width = 410; width <= 600; width += 10) {
        frame.style.width = `${width}px`;
        await nextFrames();
      }
      await expect.poll(() => columnCount(scroller)).toBe(5);
      await nextFrames();
      expect(errors).toEqual([]);
    } finally {
      window.removeEventListener('error', onError);
      style.remove();
    }
  });
});

describe('loadMore reach', () => {
  // 3 columns and a 330px view, so the reach is 330 + 200 = 530px. With one
  // loading card, 5 cards take 2 rows (sizer 224px), 10 take 4 (440px), and
  // 15 take 6 (656px), where the sentinel at 655px is out of reach. So
  // loadMore runs at 5 and at 10 cards, and not at 15.
  test('is called again after data grows while the end is still in reach, and stops when it is not', async () => {
    const loadMore = vi.fn();
    const App = () => {
      const [data, setData] = React.useState(() => range(5));
      loadMore.mockImplementation(() => setData((d) => range(d.length + 5)));
      return (
        <div data-testid="frame" style={{ width: 400, height: 330 }}>
          <CardWindow cardRect={cardRect} data={data} loading={{ type: 'card', count: 1, LoadingComponent, loadMore }}>
            {Card}
          </CardWindow>
        </div>
      );
    };
    await render(<App />);
    await expect.poll(() => loadMore.mock.calls.length).toBe(2);
    await nextFrames();
    await nextFrames();
    expect(loadMore).toHaveBeenCalledTimes(2);
  });

  test('is not called again while the end stays in reach', async () => {
    const loadMore = vi.fn();
    const { scroller } = await renderCardWindow(400, 330, {
      data: range(300),
      loading: { type: 'card', count: 1, LoadingComponent, loadMore },
    });
    await expect.poll(() => columnCount(scroller)).toBe(3);
    scroller.scrollTop = scroller.scrollHeight;
    await expect.poll(() => loadMore.mock.calls.length).toBeGreaterThan(0);
    const count = loadMore.mock.calls.length;
    scroller.scrollTop -= 150;
    await nextFrames();
    await nextFrames();
    expect(loadMore).toHaveBeenCalledTimes(count);
  });

  test('renders the loading row only when the last row is in range', async () => {
    const { scroller } = await renderCardWindow(400, 330, {
      data: range(300),
      loading: { type: 'row', height: 50, LoadingComponent },
    });
    await expect.poll(() => columnCount(scroller)).toBe(3);
    expect(scroller.querySelector('[data-loading]')).toBeNull();
    scroller.scrollTop = scroller.scrollHeight;
    await expect.poll(() => loadingInView(scroller)).toBe(true);
  });
});

describe('loading row past the end', () => {
  // A 150px view with no overscan and a 300px loading row. Scrolled to the
  // bottom, the view is past the last card row, so the row range is empty. The
  // loading row must still follow the last card row and stay inside the sizer:
  // 9 cards are 3 rows, so the sizer is 8 + 3 * 108 + 300 + 8 = 640px, and the
  // loading row's top is 8 + 3 * 108 = 332px.
  test.each([
    [9, 640, 332],
    [0, 316, 16],
  ])('with %i cards keeps the scroll height and the row in place', async (count, height, top) => {
    const { scroller } = await renderCardWindow(400, 150, {
      data: range(count),
      overScanPx: 0,
      loading: { type: 'row', height: 300, LoadingComponent },
    });
    await expect.poll(() => scroller.scrollHeight).toBe(height);
    for (let i = 0; i < 4; i += 1) {
      scroller.scrollTop = scroller.scrollHeight;
      await nextFrames();
    }
    expect(scroller.scrollHeight).toBe(height);
    const el = scroller.querySelector<HTMLElement>('[data-loading]');
    if (!el) throw new Error('the loading row is not rendered');
    const offsetTop = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    expect(offsetTop).toBeCloseTo(top, 0);
  });
});

describe('scroll commits', () => {
  // The rows are 108px apart. Keyed on both ends, the render range would move
  // twice per row, as a row enters at the bottom and as a row leaves at the top.
  test('commits at most once per row while scrolling', async () => {
    const { scroller } = await renderCardWindow(400, 330, { data: range(300) });
    await expect.poll(() => columnCount(scroller)).toBe(3);
    let commits = 0;
    const observer = new MutationObserver(() => {
      commits += 1;
    });
    observer.observe(scroller, { childList: true, subtree: true, attributes: true });
    try {
      // 36 steps of 30px are 1,080px, 10 rows.
      for (let i = 0; i < 36; i += 1) {
        scroller.scrollTop += 30;
        await nextFrames();
      }
    } finally {
      observer.disconnect();
    }
    expect(commits).toBeLessThanOrEqual(11);
  });
});

describe('horizontal overflow', () => {
  // A 200px card in a 100px column, a 600px loading card or loading row in a
  // 400px frame, and an 80px frame, narrower than one card. None of them may
  // make the root scroll sideways. With a classic scrollbar a horizontal one
  // would take 15px of height and resize the observed box, which fires
  // "ResizeObserver loop completed with undelivered notifications".
  test.each([
    ['a card wider than its column', 400, { data: range(100), justifyContent: 'left' }, WideCard],
    [
      'a loading card wider than its column',
      400,
      { data: range(2), loading: { type: 'card', count: 1, LoadingComponent: WideLoadingComponent } },
      Card,
    ],
    [
      'a loading row wider than the root',
      400,
      { data: range(2), loading: { type: 'row', height: 50, LoadingComponent: WideLoadingComponent } },
      Card,
    ],
    ['a frame narrower than one card', 80, { data: range(100) }, Card],
  ] satisfies [string, number, Props, (props: CardProps) => React.ReactNode][])(
    '%s does not scroll the root sideways or fire a window error',
    (_, width, props, card) =>
      withClassicScrollbar(async (errors) => {
        const { scroller } = await renderInFrame(
          { width, height: 330 },
          { ...props, root: { className: 'classic-scrollbar' } },
          card,
        );
        await expect.poll(() => cards(scroller).length).toBeGreaterThan(0);
        await nextFrames();
        await nextFrames();
        expect(errors).toEqual([]);
        expect(scroller.scrollWidth).toBe(scroller.clientWidth);
        expect(scroller.offsetHeight - scroller.clientHeight).toBe(0);
      }),
  );

  test('a frame narrower than one card keeps the root inside the frame', async () => {
    const { scroller } = await renderCardWindow(80, 330, { data: range(100) });
    await expect.poll(() => columnCount(scroller)).toBe(1);
    expect(scroller.offsetWidth).toBe(80);
  });
});

describe('frame without a height', () => {
  // The root grows with its content, so all 100 cards render. When the root's
  // height equals the sizer's, CardWindow renders outside the resize callback,
  // so the observed box does not change during the callback.
  test('mounts without a window error', () =>
    withWindowErrors(async (errors) => {
      const { scroller } = await renderInFrame({ width: 400 }, { data: range(100) });
      await expect.poll(() => cards(scroller).length).toBe(100);
      await nextFrames();
      expect(errors).toEqual([]);
    }));

  test('changes width without a window error', () =>
    withWindowErrors(async (errors) => {
      const { frame, scroller } = await renderInFrame({ width: 400 }, { data: range(100) });
      await expect.poll(() => cards(scroller).length).toBe(100);
      await nextFrames();
      errors.length = 0;
      for (let width = 410; width <= 600; width += 10) {
        frame.style.width = `${width}px`;
        await nextFrames();
      }
      await expect.poll(() => columnCount(scroller)).toBe(5);
      await nextFrames();
      expect(errors).toEqual([]);
    }));

  test('mounts without a window error when root.style.maxHeight bounds the root', () =>
    withWindowErrors(async (errors) => {
      const { scroller } = await renderInFrame(
        { width: 400 },
        { data: range(100), root: { style: { maxHeight: 330 } } },
      );
      await expect.poll(() => columnCount(scroller)).toBe(3);
      await nextFrames();
      expect(errors).toEqual([]);
    }));

  // A ResizeObserver registered after mount runs after CardWindow's in the
  // same frame, just before the paint, so it sees what that paint shows.
  test('shows every card at the paint after data grows', async () => {
    const app = (length: number) => (
      <div data-testid="frame" style={{ width: 400 }}>
        <CardWindow cardRect={cardRect} data={range(length)}>
          {Card}
        </CardWindow>
      </div>
    );
    const screen = await render(app(3));
    const frame = screen.container.querySelector('[data-testid="frame"]') as HTMLElement;
    const scroller = frame.firstElementChild as HTMLElement;
    await expect.poll(() => cards(scroller).length).toBe(3);
    await nextFrames();
    const seen: number[] = [];
    const observer = new ResizeObserver(() => seen.push(cards(scroller).length));
    observer.observe(scroller);
    try {
      await nextFrames();
      seen.length = 0;
      await screen.rerender(app(60));
      await expect.poll(() => seen.length).toBeGreaterThan(0);
      await nextFrames();
      expect(seen.filter((count) => count !== 60)).toEqual([]);
    } finally {
      observer.disconnect();
    }
  });
});
