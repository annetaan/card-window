import * as React from 'react';
import { CSSProperties, Fragment, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/** CardWindow provides the `CardWindow.children` component with this props. */
export type CardProps<T extends any[] = any[]> = {
  /** `data` is an array. CardWindow passes data to the `CardWindow.children` component. */
  data: T;
  /** `index` is the index of the data allocated to the `CardWindow.children` component. */
  index: number;
  /** `style` should be passed to the root of the `CardWindow.children` component. */
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
 * JustifyContent only supports 7 values.
 * If the value is `stretch`, the `CardProps.style` has `{ flexBasis: 'auto' }`.
 */
export type JustifyContent =
  | 'left'
  | 'right'
  | 'center'
  | 'space-around'
  | 'space-between'
  | 'space-evenly'
  | 'stretch';

/**
 * `LastRowAlign` that defines how to align
 * when the number of cards in the last row is less than the number of columns.
 */
export type LastRowAlign = 'left' | 'right' | 'inherit';

/** There are two rendering types for the infinite loading feature. */
export type Loading = LoadingCard | LoadingRow;

/** CardWindow provides `LoadingCard.Component` with this props. */
export type LoadingCardComponentProps = {
  /** `style` should be passed to the root of `LoadingCard.Component`. */
  style: CSSProperties;
  /** `row` is the rendered row. */
  row: number;
  /** `col` is the rendered column. */
  col: number;
};

/**
 * LoadingCard(`type: 'card'`) displays the loading component after the last card.
 * Missing description of function-type is [bug](https://github.com/tgreyuk/typedoc-plugin-markdown/issues/281).
 *
 * #### Description of `loadMore`
 *
 * `loadMore` is called when `LoadingCard.Component` is rendered.
 */
export type LoadingCard = {
  type: 'card';
  /** `LoadingCard.count` is the number of loading cards to display. */
  count?: number;
  /** `LoadingCard.Component` is rendered after the last card. */
  LoadingComponent: React.ComponentType<LoadingCardComponentProps>;
  /** `loadMore` is called when `LoadingCard.Component` is rendered. */
  loadMore?(): void;
};

/** CardWindow provides `LoadingRow.Component` with this props. */
export type LoadingRowComponentProps = {
  /** `style` should be passed to the root of `LoadingRow.Component`. */
  style: CSSProperties;
};

/**
 * LoadingRow(`type: 'row'`) displays the loading component in the center next to the last row.
 * Missing description of function-type is [bug](https://github.com/tgreyuk/typedoc-plugin-markdown/issues/281).
 *
 * #### Description of `loadMore`
 *
 * `loadMore` is called when `LoadingRow.Component` is rendered.
 */
export type LoadingRow = {
  type: 'row';
  /** `height` is the height of `LoadingRow.Component`. */
  height: number;
  /** `LoadingRow.Component` is rendered in the center next to the last row. */
  LoadingComponent: React.ComponentType<LoadingRowComponentProps>;
  /** `loadMore` is called when `LoadingRow.Component` is rendered. */
  loadMore?(): void;
};
export type ScrollDirection = 'forward' | 'backward';
export type OnScrollProps = {
  /** `direction` is either "forward" or "backward". */
  direction: ScrollDirection;
  /** `offset` is a number. */
  offset: number;
  /** `updateWasRequested` is a boolean. */
  updateWasRequested: boolean;
  /**  */
  indexesOfVisible: number[];
};

/**
 * This props is for CardWindow.
 * Missing description of function-type is [bug](https://github.com/tgreyuk/typedoc-plugin-markdown/issues/281).
 *
 * #### Description of `getKey`
 *
 * If you can use an id instead of array index for [key](https://reactjs.org/docs/lists-and-keys.html#keys),
 * define a `getKey` function.
 */
export type CardWindowProps<T extends any[] = any[]> = {
  /** `data` is an array. CardWindow passes data to `CardWindow.children` component. */
  data: T;

  /** `cardRect` is used to calculate the rendering of `CardWindow.children` component. */
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

  /** Maximum number of columns can be set. */
  maxCols?: number;

  root?: {
    /** `root.className` are passed to the root element of `CardWindow`. */
    className?: string;
    /** `root.style` are passed to the root element of `CardWindow`. */
    style?: Omit<CSSProperties, 'overflow'>;
  };

  container?: {
    /** `container.className` are passed to the scrollable large container element. */
    className?: string;
    /** `container.style` are passed to the scrollable large container element. */
    style?: Omit<CSSProperties, 'width' | 'height'>;
  };

  /**
   * JustifyContent only supports 7 values.
   * If the value is `stretch`, the `CardProps.style` has `{ flexBasis: 'auto' }`.
   */
  justifyContent?: JustifyContent;

  /**
   * `LastRowAlign` that defines how to align
   * when the number of cards in the last row is less than the number of columns.
   */
  lastRowAlign?: LastRowAlign;

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

export const range = (_start: number, _end?: number): number[] => {
  const start = _end === undefined ? 0 : _start;
  const end = _end ?? _start;
  const list: number[] = [];
  for (let i = start; i < end; i += 1) list.push(i);
  return list;
};

const getColumns = (
  containerWidth: number,
  cardWidth: number,
  spacing: Spacing,
  justifyContent: JustifyContent,
  maxCols: number | undefined,
): number => {
  const { x, left, right } = spacing;
  const baseWidth = containerWidth - left - right;
  if (baseWidth < cardWidth) return 0;
  if (justifyContent === 'space-evenly') {
    const cols = Math.max(1, Math.floor((baseWidth - x) / (cardWidth + x)));
    return maxCols !== undefined ? Math.min(maxCols, cols) : cols;
  }
  const cols = Math.floor((baseWidth + x) / (cardWidth + x));
  return maxCols !== undefined ? Math.min(maxCols, cols) : cols;
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

const getRenderContainerStyle = (
  row: number,
  card: Rect,
  spacing: Spacing,
  justifyContent: JustifyContent,
): CSSProperties => {
  const top = row * (card.height + spacing.y) + spacing.top;
  return {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent,
    transform: `translate(0, ${top}px)`,
  };
};

const getBaseItemProps = (
  index: number,
  cols: number,
  justifyContent: JustifyContent,
  { width, height }: Rect,
  { x }: Spacing,
): Omit<CardProps, 'data' | 'index'> => {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const marginLeft = col !== 0 && ['center', 'left', 'right', 'stretch'].includes(justifyContent) ? x : undefined;
  const flexGrow = justifyContent === 'stretch' ? 1 : undefined;
  const style = { width, flexGrow, height, marginLeft };
  return { row, col, style };
};

type CardTypeProps = { type: 'card' } & Omit<CardProps, 'data'>;
type PlaceholderTypeProps = { type: 'placeholder' } & Omit<CardProps, 'data' | 'index'>;
type LoadingTypeProps = { type: 'loading' } & Omit<CardProps, 'data' | 'index'>;
type ItemProps = CardTypeProps | PlaceholderTypeProps | LoadingTypeProps;
export type ItemType = ItemProps['type'];

const getStop = (
  rows: [number, number],
  cols: number,
  lastRowAlign: LastRowAlign,
  length: number,
  loadingCards: number,
): number => {
  if (lastRowAlign !== 'inherit') return (rows[1] + 1) * cols;
  return Math.min(length + loadingCards, (rows[1] + 1) * cols);
};

const getItemTypeAndIndex = (
  index: number,
  col: number,
  length: number,
  loadingCards: number,
  lastRowAlign: LastRowAlign,
  isLastRow: boolean,
  stop: number,
): { type: ItemType; index?: number } => {
  if (lastRowAlign !== 'right') {
    if (index < length) return { type: 'card', index };
    if (index < length + loadingCards) return { type: 'loading' };
    return { type: 'placeholder' };
  }
  // lastRowAlign === 'right'
  if (!isLastRow) return index < length ? { type: 'card', index } : { type: 'loading' };

  const placeholderCount = stop - length - loadingCards;
  if (col < placeholderCount) return { type: 'placeholder' };
  return index - placeholderCount < length ? { type: 'card', index: index - placeholderCount } : { type: 'loading' };
};

const getItemProps = (
  length: number,
  loadingCards: number,
  cols: number,
  rows: [number, number],
  card: Rect,
  spacing: Spacing,
  justifyContent: JustifyContent,
  lastRowAlign: LastRowAlign,
): ItemProps[] => {
  if (cols === 0) return [];
  if (length + loadingCards === 0) return [];
  const start = rows[0] * cols;
  const stop = getStop(rows, cols, lastRowAlign, length, loadingCards);
  return range(start, stop).map((i) => {
    const base = getBaseItemProps(i, cols, justifyContent, card, spacing);
    const isLastRow = getLastRowFromLength(length, loadingCards, cols) === base.row;
    const { type, index } = getItemTypeAndIndex(i, base.col, length, loadingCards, lastRowAlign, isLastRow, stop);
    return { type, index, ...base };
  });
};

const getNextOffset = (offset: number, before: number, after: number, card: Rect, spacing: Spacing): number => {
  const height = card.height + spacing.y;
  const items = before * (Math.floor(offset / height) + (before < after ? 1 : 0));
  const rows = Math.floor(items / after);
  return Math.max(0, height * rows + (offset % height));
};

export const functions = {
  getColumns,
  getScrollContainerHeight,
  getLastRowFromLength,
  getRowRange,
  getRenderContainerStyle,
  getBaseItemProps,
  getItemProps,
  getNextOffset,
};

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
};

const sameRange = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

const CardWindow = React.forwardRef<HTMLDivElement, CardWindowProps>((props, parentRef) => {
  const {
    data,
    cardRect: card,
    children: Children,
    getKey = (index) => index,
    overScanPx = 200,
    spacing: spacingProp,
    maxCols = undefined,
    root = {},
    container = {},
    justifyContent: justify = 'space-evenly',
    lastRowAlign = 'left',
    loading,
    thresholdOfVisible = 0.5,
    onScroll,
  } = props;

  const { length } = data;
  const spacing = { ...defaultSpacing, ...spacingProp };
  const scrollerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(parentRef, () => scrollerRef.current as HTMLDivElement, []);
  const [size, setSize] = useState<Rect | null>(null);
  const [offset, setOffset] = useState(0);
  const width = size?.width ?? 0;
  const viewHeight = size?.height ?? 0;
  const cols = getColumns(width, card.width, spacing, justify, maxCols);
  const loadingCards = getLoadingCardCount(loading);
  const rowCount = cols === 0 || length + loadingCards === 0 ? 0 : getLastRowFromLength(length, loadingCards, cols) + 1;
  const scrollContainerHeight = getScrollContainerHeight(cols, length + loadingCards, card, spacing, loading);
  // A stable gutter keeps the content box the same width whether or not a classic scrollbar shows, so the
  // first render inside the ResizeObserver callback does not resize what that callback observes.
  const rootStyle: CSSProperties = {
    width: '100%',
    minWidth: card.width,
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
    height: scrollContainerHeight,
  };
  const rows = getRowRange(offset, viewHeight, overScanPx, rowCount, card, spacing);
  const items = getItemProps(length, loadingCards, cols, rows, card, spacing, justify, lastRowAlign);
  const renderContainerStyle = getRenderContainerStyle(rows[0], card, spacing, justify);

  // The first observation arrives before the first paint, and flushSync renders the cards before that paint too.
  useIsomorphicLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      flushSync(() =>
        setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height })),
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The last scrollTop the scroll handler saw. Only the scroll handler writes it.
  const lastScrollTop = useRef(0);

  // Keep the first visible card in view when the column count changes. The live scrollTop may already be
  // clamped to the shorter sizer of this commit, so start from the last position the scroll handler saw.
  // Its rAF callback runs before the ResizeObserver callback in a frame, so no scroll is missed.
  const prevColsRef = useRef(0);
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
    };
    // The offset state only changes with the row range, so it can lag scrollTop by less than a row.
    // After a resize or a data change, derive the range from the real scrollTop again.
    const el = scrollerRef.current;
    if (!el) return;
    const next = getRowRange(el.scrollTop, viewHeight, overScanPx, rowCount, card, spacing);
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
      const next = getRowRange(
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

  useEffect(() => {
    if (scrollContainerHeight !== 0 && loading?.loadMore) {
      const lastItem = items.find((item) => item.type === 'card' && item.index === length - 1);
      if (lastItem) loading.loadMore();
    }
  }, [scrollContainerHeight, loading?.loadMore, items]);

  return (
    <div ref={scrollerRef} className={root.className} style={rootStyle}>
      <div className={container.className} style={scrollContainerStyle}>
        <div style={renderContainerStyle}>
          {items.map((item, i) => {
            const key = item.type === 'card' ? getKey(item.index, data) : `row:${item.row},col:${item.col}`;
            return (
              <Fragment key={key}>
                {i !== 0 && item.col === 0 && <div style={{ width: '100%', height: spacing.y }} />}
                {item.type === 'card' && <Children data={data} {...item} />}
                {item.type === 'placeholder' && <div style={item.style} />}
                {item.type === 'loading' && loading?.type === 'card' && <loading.LoadingComponent {...item} />}
              </Fragment>
            );
          })}
          {loading?.type === 'row' && (
            <div style={{ width: '100%', paddingTop: spacing.y, display: 'flex', justifyContent: 'center' }}>
              <loading.LoadingComponent style={{ height: loading.height }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default CardWindow;
