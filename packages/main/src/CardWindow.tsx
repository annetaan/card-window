import * as React from 'react';
import { CSSProperties, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/** CardWindow provides the `CardWindow.children` component with this props. */
export type CardProps<T extends any[] = any[]> = {
  /** `data` is an array. CardWindow passes data to the `CardWindow.children` component. */
  data: T;
  /** `index` is the index of the data allocated to the `CardWindow.children` component. */
  index: number;
  /**
   * `style` should be passed to the root of the `CardWindow.children` component.
   * The grid cell sizes the card, so it is empty today, but pass it anyway.
   */
  style: CSSProperties;
  /** `row` is the rendered row. */
  row: number;
  /** `col` is the rendered column. */
  col: number;
};

/** These values are `px`. */
export type Rect = { width: number; height: number };

/** These values are `px`. The defaults are 8px. */
export type Spacing = { x: number; y: number; top: number; bottom: number; left: number; right: number };

/**
 * The value goes straight to CSS Grid `justify-content`.
 * `start` and `end` follow the writing direction, while `left` and `right` do not.
 * `stretch` grows the columns to fill the row.
 */
export type JustifyContent =
  | 'left'
  | 'right'
  | 'start'
  | 'end'
  | 'center'
  | 'space-around'
  | 'space-between'
  | 'space-evenly'
  | 'stretch';

/** There are two rendering types for the infinite loading feature. */
export type Loading = LoadingCard | LoadingRow;

/** CardWindow provides `LoadingCard.LoadingComponent` with this props. */
export type LoadingCardComponentProps = {
  /**
   * `style` should be passed to the root of `LoadingCard.LoadingComponent`.
   * The grid cell sizes the card, so it is empty today, but pass it anyway.
   */
  style: CSSProperties;
  /** `row` is the rendered row. */
  row: number;
  /** `col` is the rendered column. */
  col: number;
};

/** `type: 'card'` renders `LoadingComponent` as `count` cards after the last card. */
export type LoadingCard = {
  type: 'card';
  /** `LoadingCard.count` is the number of loading cards to display. */
  count?: number;
  /** `LoadingCard.LoadingComponent` is rendered after the last card. */
  LoadingComponent: React.ComponentType<LoadingCardComponentProps>;
  /**
   * `loadMore` is called when the end of the list comes within `overScanPx` of the view,
   * and again after `data` grows while the end is still that close. It is not called on every render.
   */
  loadMore?(): void;
};

/** CardWindow provides `LoadingRow.LoadingComponent` with this props. */
export type LoadingRowComponentProps = {
  /** `style` should be passed to the root of `LoadingRow.LoadingComponent`. */
  style: CSSProperties;
};

/** `type: 'row'` renders `LoadingComponent` once, centered below the last row, when the last row is in range. */
export type LoadingRow = {
  type: 'row';
  /** `height` is the height of `LoadingRow.LoadingComponent`. */
  height: number;
  /** `LoadingRow.LoadingComponent` is rendered in the center below the last row. */
  LoadingComponent: React.ComponentType<LoadingRowComponentProps>;
  /**
   * `loadMore` is called when the end of the list comes within `overScanPx` of the view,
   * and again after `data` grows while the end is still that close. It is not called on every render.
   */
  loadMore?(): void;
};
/** Whether the view moved down (`forward`) or up (`backward`) since the previous animation frame. */
export type ScrollDirection = 'forward' | 'backward';
/** What `onScroll` receives, at most once per animation frame. */
export type OnScrollProps = {
  /** `direction` is either "forward" or "backward". */
  direction: ScrollDirection;
  /** `offset` is a number. */
  offset: number;
  /** `updateWasRequested` is true when this scroll changed the rendered row range. */
  updateWasRequested: boolean;
  /**
   * The indexes of the cards in the rows that show more than `thresholdOfVisible` of the card height.
   * Loading cards are not included.
   */
  indexesOfVisible: number[];
};

/** The props of `CardWindow`. `T` is the type of `data`. */
export type CardWindowProps<T extends any[] = any[]> = {
  /** `data` is an array. CardWindow passes data to `CardWindow.children` component. */
  data: T;

  /**
   * `cardRect` is used to calculate the rendering of `CardWindow.children` component.
   * A card or loading card wider than `cardRect.width` is clipped at the sides of the scroll container.
   */
  cardRect: Rect;

  /** `children` is a component that receives `CardProps<T>`. */
  children: React.ComponentType<CardProps<T>>;

  /**
   * If you can use an id instead of array index for [key](https://reactjs.org/docs/lists-and-keys.html#keys),
   * define a `getKey` function.
   */
  getKey?(index: number, data: T): string;

  /** The number of px to render outside of the visible area. By default, `CardWindow` overscans 200px. */
  overScanPx?: number;

  /** These values are `px`. The defaults are 8px. */
  spacing?: Partial<Spacing>;

  root?: {
    /** `root.className` are passed to the root element of `CardWindow`. */
    className?: string;
    /** `root.style` are passed to the root element of `CardWindow`. */
    style?: Omit<CSSProperties, 'overflow'>;
  };

  container?: {
    /** `container.className` are passed to the scrollable large container element. */
    className?: string;
    /**
     * `container.style` are passed to the scrollable large container element.
     * CardWindow sets `overflowX` to `clip`, so a card wider than its column never makes the root scroll sideways.
     */
    style?: Omit<CSSProperties, 'width' | 'height' | 'overflow' | 'overflowX'>;
  };

  /**
   * The value goes straight to CSS Grid `justify-content`. The default is `space-evenly`.
   * `start` and `end` follow the writing direction, while `left` and `right` do not.
   * `stretch` grows the columns to fill the row.
   */
  justifyContent?: JustifyContent;

  /** `loading?` is a property for the infinite loading feature. */
  loading?: Loading;

  /**
   * `thresholdOfVisible` is used for card visibility in onScroll event.
   * Please set a value between 0 and 1. The default is 0.5.
   */
  thresholdOfVisible?: number;

  /** Called when the CardWindow scroll positions changes. */
  onScroll?: (props: OnScrollProps) => void;
};

/**
 * The integers from `_start` up to `_end`, exclusive. With one argument it counts from 0: `range(3)` is `[0, 1, 2]`.
 * @param _start The first integer, or the end when `_end` is omitted.
 * @param _end The end, exclusive.
 */
export const range = (_start: number, _end?: number): number[] => {
  const start = _end === undefined ? 0 : _start;
  const end = _end ?? _start;
  const list: number[] = [];
  for (let i = start; i < end; i += 1) list.push(i);
  return list;
};

const defaultLoadingCardCount = 10;

const getLoadingCardCount = (loading: Loading | undefined) =>
  loading?.type === 'card' ? (loading.count ?? defaultLoadingCardCount) : 0;

const getScrollContainerHeight = (
  cols: number,
  cardCount: number,
  card: Rect,
  spacing: Spacing,
  loading: Loading | undefined,
): number => {
  if (cols === 0) return 0;
  const { y, top, bottom } = spacing;
  if (loading?.type !== 'row') {
    if (cardCount === 0) return top + bottom;
    const rows = Math.ceil(cardCount / cols);
    return top + rows * (card.height + y) - y + bottom;
  }
  // loading: row
  const rows = Math.ceil(cardCount / cols);
  return top + rows * (card.height + y) + loading.height + bottom;
};

const getLastRowFromLength = (length: number, loadingCards: number, cols: number): number => {
  if (length === 0) return 0;
  return Math.ceil((length + loadingCards) / cols) - 1;
};

/**
 * The rows that intersect `[offset - margin, offset + viewHeight + margin]`, clamped to `[0, rowCount - 1]`.
 * Row r spans `[spacing.top + r * pitch, spacing.top + r * pitch + card.height]`. The range is empty when `last < first`.
 */
const getRowRange = (
  offset: number,
  viewHeight: number,
  margin: number,
  rowCount: number,
  card: Rect,
  spacing: Spacing,
): [number, number] => {
  const pitch = card.height + spacing.y;
  const lo = offset - margin;
  const hi = offset + viewHeight + margin;
  // The first row whose bottom is below lo, and the last row whose top is above hi.
  const first = Math.max(0, Math.floor((lo - spacing.top - card.height) / pitch) + 1);
  const last = Math.min(rowCount - 1, Math.ceil((hi - spacing.top) / pitch) - 1);
  return [first, last];
};

/**
 * The rows to render. It starts at the first row of `getRowRange` with `overScanPx` as the margin and always spans
 * enough rows to cover that range's last row, so it moves only when its first row does: one commit per row while
 * scrolling. Keying on both ends would commit twice per row, once as a row enters and once as a row leaves.
 */
const getRenderRange = (
  offset: number,
  viewHeight: number,
  overScanPx: number,
  rowCount: number,
  card: Rect,
  spacing: Spacing,
): [number, number] => {
  const [first] = getRowRange(offset, viewHeight, overScanPx, rowCount, card, spacing);
  // At most this many rows intersect a reach of viewHeight + 2 * overScanPx.
  const span = Math.ceil((viewHeight + 2 * overScanPx + card.height) / (card.height + spacing.y));
  const last = Math.min(rowCount - 1, first + span - 1);
  return [Math.min(first, last + 1), last];
};

/** The card indexes `[start, stop)` of the rows `rows`, with `count` cards and loading cards in all. */
const getIndexRange = (rows: [number, number], cols: number, count: number): [number, number] => {
  if (cols === 0 || rows[1] < rows[0]) return [0, 0];
  return [rows[0] * cols, Math.min((rows[1] + 1) * cols, count)];
};

const getNextOffset = (offset: number, before: number, after: number, card: Rect, spacing: Spacing): number => {
  const height = card.height + spacing.y;
  const items = before * (Math.floor(offset / height) + (before < after ? 1 : 0));
  const rows = Math.floor(items / after);
  return Math.max(0, height * rows + (offset % height));
};

export const functions = {
  getScrollContainerHeight,
  getLastRowFromLength,
  getRowRange,
  getRenderRange,
  getIndexRange,
  getNextOffset,
};

/** The style every card and loading card receives. The grid cell sizes the card. It is only read. */
const cardStyle: CSSProperties = {};

/**
 * The number of column tracks the grid resolved. It is 0 while the tracks are unresolved,
 * as under `display: none` or in jsdom, where the value still reads `repeat(…)`.
 */
const readColumnCount = (grid: HTMLElement | null): number => {
  if (!grid) return 0;
  const value = getComputedStyle(grid).gridTemplateColumns.trim();
  if (value === '' || value === 'none' || value.includes('(')) return 0;
  return value.split(/\s+/).length;
};

// Item is not generic because React.memo drops type parameters. The signature of CardWindow already makes
// `children` and `data` agree, so Item takes any card.
type ItemProps = {
  Children: React.ComponentType<CardProps<any>>;
  data: any[];
  index: number;
  row: number;
  col: number;
};

// Memoized, so a card whose index, row and col stay the same does not render again when the row range moves.
const Item = React.memo(({ Children, data, index, row, col }: ItemProps) => (
  <Children data={data} index={index} style={cardStyle} row={row} col={col} />
));

// Bundlers and Vitest replace `process.env.NODE_ENV` as text. A `typeof process` guard would turn the warning off
// under Vite, where `process` does not exist at runtime. The `try` covers loading the module without a bundler.
// `src` has no Node types, so `process` is declared here by hand.
declare const process: { env: { NODE_ENV?: string } };
const dev = (() => {
  try {
    return process.env.NODE_ENV !== 'production';
  } catch {
    return false;
  }
})();

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const defaultSpacing: Spacing = { x: 8, y: 8, top: 8, bottom: 8, left: 8, right: 8 };

type Latest = {
  rows: [number, number];
  rowCount: number;
  viewHeight: number;
  cols: number;
  length: number;
  card: Rect;
  spacing: Spacing;
  overScanPx: number;
  thresholdOfVisible: number;
  onScroll: ((props: OnScrollProps) => void) | undefined;
  loadMore: (() => void) | undefined;
};

// A max-height or min-height on the root can let its height follow the sizer's between the two limits.
const boundedByOwnHeight = (el: HTMLElement) => {
  const { maxHeight, minHeight } = getComputedStyle(el);
  return maxHeight !== 'none' || (minHeight !== 'auto' && minHeight !== '0px');
};

const sameRange = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

const CardWindowRender = <T extends any[]>(
  props: CardWindowProps<T>,
  parentRef: React.ForwardedRef<HTMLDivElement>,
) => {
  const {
    data,
    cardRect: card,
    children: Children,
    getKey = (index) => index,
    overScanPx = 200,
    spacing: spacingProp,
    root = {},
    container = {},
    justifyContent: justify = 'space-evenly',
    loading,
    thresholdOfVisible = 0.5,
    onScroll,
  } = props;

  const { length } = data;
  const spacing = { ...defaultSpacing, ...spacingProp };
  const scrollerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(parentRef, () => scrollerRef.current as HTMLDivElement, []);
  const gridRef = useRef<HTMLDivElement>(null);
  const sizerRef = useRef<HTMLDivElement>(null);
  const [measure, setMeasure] = useState<{ viewHeight: number; cols: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const cols = measure?.cols ?? 0;
  const viewHeight = measure?.viewHeight ?? 0;
  const loadingCards = getLoadingCardCount(loading);
  const rowCount = cols === 0 || length + loadingCards === 0 ? 0 : getLastRowFromLength(length, loadingCards, cols) + 1;
  const scrollContainerHeight = getScrollContainerHeight(cols, length + loadingCards, card, spacing, loading);
  // A stable gutter keeps the content box the same width whether or not a classic scrollbar shows, so the
  // first render inside the ResizeObserver callback does not resize what that callback observes.
  const rootStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    scrollbarGutter: 'stable',
    ...root.style,
    overflow: 'auto',
  };
  const scrollContainerStyle: CSSProperties = {
    ...container.style,
    width: '100%',
    paddingLeft: spacing.left,
    paddingRight: spacing.right,
    boxSizing: 'border-box',
    // The containing block of the sentinel.
    position: 'relative',
    height: scrollContainerHeight,
    // Content wider than its column would make the root scroll sideways. A classic horizontal scrollbar that
    // appears during the render inside the ResizeObserver callback resizes the observed box. Unlike hidden, clip
    // does not make the sizer a scroll container, so focus cannot shift the grid sideways.
    overflowX: 'clip',
  };
  const rows = getRenderRange(offset, viewHeight, overScanPx, rowCount, card, spacing);
  // A loading row taller than the reach leaves the range empty past the last card row. The loading row follows
  // the window, so start the window at the last card row to keep the loading row inside the sizer.
  // The scroll handler and the after-commit effect keep comparing the raw rows.
  const shownRows: [number, number] =
    loading?.type === 'row' && rows[0] > rowCount - 1 ? [Math.max(rowCount - 1, 0), rows[1]] : rows;
  const [start, stop] = getIndexRange(shownRows, cols, length + loadingCards);
  const lastRowInRange = rowCount === 0 || rows[1] >= rowCount - 1;
  // Before the first measurement the sizer is 0px tall, so a sentinel would sit in view even for a long list.
  const hasSentinel = cols > 0 && loading?.loadMore !== undefined;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const windowStyle: CSSProperties = {
    transform: `translateY(${spacing.top + shownRows[0] * (card.height + spacing.y)}px)`,
  };
  // The browser decides the column count. CardWindow reads it back from the resolved tracks.
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns:
      justify === 'stretch' ? `repeat(auto-fill, minmax(${card.width}px, 1fr))` : `repeat(auto-fill, ${card.width}px)`,
    gridAutoRows: `${card.height}px`,
    columnGap: spacing.x,
    rowGap: spacing.y,
    justifyContent: justify,
  };

  // The column count of the last commit, which sets the sizer's height. The ResizeObserver callback reads it, and
  // the layout effect that keeps the first visible card in view writes it.
  const prevColsRef = useRef(0);

  // The first observation arrives before the first paint, and flushSync renders the cards before that paint too.
  // The exception is a column count change in a root whose height can follow its content. A new column count
  // changes the sizer's height, so rendering inside the callback would resize the box it observes and fire
  // "ResizeObserver loop completed with undelivered notifications". A plain state update renders after the
  // callback instead. Such a root is either as tall as the sizer (no frame height, or a maxHeight not yet reached,
  // or 0px tall) or held by its own max-height or min-height, which the new sizer height may cross. At mount the
  // first kind is 0px tall, so no cards are lost there. The second kind still renders inside the callback at mount,
  // or its first paint would show no cards. A sized frame whose root sets either limit pays one stale frame here.
  useIsomorphicLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    let previous: { viewHeight: number; sizerHeight: number } | null = null;
    let warned = false;
    const observer = new ResizeObserver((entries) => {
      const viewHeight = entries[0].contentRect.height;
      const cols = readColumnCount(gridRef.current);
      // Layout is clean when the callback runs, so reading offsetHeight costs no extra layout.
      const sizerHeight = sizerRef.current?.offsetHeight ?? 0;
      const followsContent = Math.abs(viewHeight - sizerHeight) < 1;
      // CardWindow's own render changed the sizer and the root followed. This excludes the 0 = 0 observation at mount
      // and a sized frame whose content is exactly as tall. A maxHeight is the intended way to bound such a root.
      const resizedByOwnRender =
        previous !== null && viewHeight !== previous.viewHeight && sizerHeight !== previous.sizerHeight;
      previous = { viewHeight, sizerHeight };
      if (dev && !warned && followsContent && resizedByOwnRender && getComputedStyle(el).maxHeight === 'none') {
        warned = true;
        console.warn(
          'card-window: The element around CardWindow has no height, so CardWindow grows with its cards and ' +
            'renders all of them. While data grows, loading.loadMore keeps being called. Give that element a ' +
            'height, or set root.style.height or root.style.maxHeight.',
        );
      }
      const update = () =>
        setMeasure((prev) =>
          prev && prev.viewHeight === viewHeight && prev.cols === cols ? prev : { viewHeight, cols },
        );
      // Only a new column count changes the sizer's height. More rows in a taller view leave it as it is.
      const committedCols = prevColsRef.current;
      if (cols !== committedCols && (followsContent || (committedCols !== 0 && boundedByOwnHeight(el)))) update();
      else flushSync(update);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The last scrollTop the scroll handler saw. Only the scroll handler writes it.
  const lastScrollTop = useRef(0);

  // Keep the first visible card in view when the column count changes. The live scrollTop may already be
  // clamped to the shorter sizer of this commit, so start from the last position the scroll handler saw.
  // Its rAF callback runs before the ResizeObserver callback in a frame, so no scroll is missed.
  useIsomorphicLayoutEffect(() => {
    const prev = prevColsRef.current;
    prevColsRef.current = cols;
    const el = scrollerRef.current;
    if (el && prev !== cols && prev !== 0 && cols !== 0) {
      el.scrollTop = getNextOffset(lastScrollTop.current, prev, cols, card, spacing);
    }
  }, [cols]);

  // The scroll handler reads what it needs from here. It is written after every commit, never during render.
  const latest = useRef<Latest | null>(null);
  useIsomorphicLayoutEffect(() => {
    latest.current = {
      rows,
      rowCount,
      viewHeight,
      cols,
      length,
      card,
      spacing,
      overScanPx,
      thresholdOfVisible,
      onScroll,
      loadMore: loading?.loadMore,
    };
    // Only the scroll container is observed, so a sizer narrowed by CardWindow's own props shows up here,
    // after the commit that narrowed it. Observing the sizer would risk a ResizeObserver loop.
    const nextCols = readColumnCount(gridRef.current);
    if (measure && nextCols !== measure.cols) {
      setMeasure({ ...measure, cols: nextCols });
      return;
    }
    // The offset state only changes with the row range, so it can lag scrollTop by less than a row.
    // After a resize or a data change, derive the range from the real scrollTop again.
    const el = scrollerRef.current;
    if (!el) return;
    const next = getRenderRange(el.scrollTop, viewHeight, overScanPx, rowCount, card, spacing);
    if (!sameRange(next, rows)) setOffset(el.scrollTop);
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const current = latest.current;
      if (!current) return;
      const scrollTop = el.scrollTop;
      const next = getRenderRange(
        scrollTop,
        current.viewHeight,
        current.overScanPx,
        current.rowCount,
        current.card,
        current.spacing,
      );
      const changed = !sameRange(next, current.rows);
      if (changed) setOffset(scrollTop);
      if (current.onScroll) {
        const margin = -current.card.height * current.thresholdOfVisible;
        const vis = getRowRange(scrollTop, current.viewHeight, margin, current.rowCount, current.card, current.spacing);
        const indexesOfVisible =
          vis[1] < vis[0] ? [] : range(vis[0] * current.cols, Math.min((vis[1] + 1) * current.cols, current.length));
        current.onScroll({
          direction: scrollTop < lastScrollTop.current ? 'backward' : 'forward',
          offset: scrollTop,
          updateWasRequested: changed,
          indexesOfVisible,
        });
      }
      lastScrollTop.current = scrollTop;
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    el.addEventListener('scroll', schedule, { passive: true });
    return () => {
      el.removeEventListener('scroll', schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // Recreated when data.length changes: a new observer reports the sentinel's state again, so a list that
  // still ends within reach keeps loading. Otherwise it fires only when the sentinel enters the reach.
  useEffect(() => {
    const el = scrollerRef.current;
    const sentinel = sentinelRef.current;
    if (!hasSentinel || !el || !sentinel) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) latest.current?.loadMore?.();
      },
      { root: el, rootMargin: `${overScanPx}px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasSentinel, overScanPx, length]);

  return (
    <div ref={scrollerRef} className={root.className} style={rootStyle}>
      <div ref={sizerRef} className={container.className} style={scrollContainerStyle}>
        <div style={windowStyle}>
          <div ref={gridRef} style={gridStyle}>
            {range(start, stop).map((i) =>
              i < length ? (
                <Item
                  key={getKey(i, data)}
                  Children={Children}
                  data={data}
                  index={i}
                  row={Math.floor(i / cols)}
                  col={i % cols}
                />
              ) : (
                loading?.type === 'card' && (
                  <loading.LoadingComponent
                    key={`loading:${i - length}`}
                    style={cardStyle}
                    row={Math.floor(i / cols)}
                    col={i % cols}
                  />
                )
              ),
            )}
          </div>
          {loading?.type === 'row' && cols > 0 && lastRowInRange && (
            <div style={{ width: '100%', paddingTop: spacing.y, display: 'flex', justifyContent: 'center' }}>
              <loading.LoadingComponent style={{ height: loading.height }} />
            </div>
          )}
        </div>
        {hasSentinel && (
          <div
            ref={sentinelRef}
            aria-hidden="true"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, pointerEvents: 'none' }}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Renders the cards of `data` that fall in the rows filling its scroll container, plus `overScanPx` above and below.
 * The `ref` receives the scroll container element.
 *
 * The element around CardWindow needs a height, because CardWindow fills it and scrolls inside it. Without one,
 * CardWindow renders every card, and a development build warns once.
 */
const CardWindow = React.forwardRef(CardWindowRender) as <T extends any[] = any[]>(
  props: CardWindowProps<T> & React.RefAttributes<HTMLDivElement>,
) => React.ReactElement | null;

export default CardWindow;
