<h1 align="center">card-window</h1>

Card window works by only rendering part of a large data set (just enough to fill the viewport).
It is very much inspired by Brian Vaughn's react-window.

## Installation

`@annetaan/card-window` is available as an npm package.

```bash
// with npm
npm install @annetaan/card-window

// with yarn
yarn add @annetaan/card-window
```

## Requirements

- React and React DOM 18 or 19. CI tests both.
- TypeScript 4.5 or later, if you use the bundled types.
- A browser with ES2019, CSS Grid, `ResizeObserver` and `IntersectionObserver`. The package is built to ES2019, so it does not run in IE11. Server rendering needs none of these.
- The root uses `scrollbar-gutter`, which needs Chrome 94, Firefox 97 or Safari 18.2. An older browser ignores it. If that browser shows classic scrollbars, the first render can report "ResizeObserver loop completed with undelivered notifications".

## Usage

Learn more at [annetaan.github.io/card-window/](https://annetaan.github.io/card-window/).

```tsx
import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { type CardProps, CardWindow, range } from '@annetaan/card-window';

const SampleCard: React.FC<CardProps> = ({ index, style, row, col }) => (
  <div style={style}>
    <h2>{index}</h2>
    <p>
      row: {row}, col: {col}
    </p>
  </div>
);

const App: React.FC = () => {
  const data = range(10000); // [0, 1, 2, ..., 9999]
  const cardRect = { width: 200, height: 120 };
  return (
    <div style={{ height: 400 }}>
      <CardWindow data={data} cardRect={cardRect}>
        {SampleCard}
      </CardWindow>
    </div>
  );
};

createRoot(document.getElementById('app')!).render(<App />);
```

The element around `CardWindow` needs a height, like the `height: 400` in the example.
CardWindow fills that element and scrolls inside it.
Without a height, CardWindow grows with its cards and renders all of them.
A development build then warns once in the console.
To let a short list shrink and still stop a long one, set `root.style.maxHeight`.

### Typed data

CardWindow takes the type of `data` from the props.
An inline card and `getKey` see each item with that type, without annotations.

```tsx
type Item = { id: string; title: string };

const List: React.FC<{ items: Item[] }> = ({ items }) => (
  <div style={{ height: 400 }}>
    <CardWindow data={items} cardRect={{ width: 200, height: 120 }} getKey={(index, data) => data[index].id}>
      {({ data, index, style }) => <div style={style}>{data[index].title}</div>}
    </CardWindow>
  </div>
);
```

A card typed as `CardProps<T>` has to accept `data`.
A card typed as `CardProps<Item[]>` with `data={range(3)}` is a type error.
A card typed with the default `CardProps` accepts any `data`.

## Upgrading from 1.x

2.0.0 lays the cards out with CSS Grid, and the browser works out the number of columns. This list is what you may have to change.

### Requirements

- React and React DOM 18 or 19. 1.x allowed 16.13 and 17. If your app is on one of those, stay on 1.11.0.
- `IntersectionObserver` and CSS Grid are new requirements. 1.x already needed `ResizeObserver`.

### Removed

- `lastRowAlign` and the `LastRowAlign` type. Delete the prop. The last row always lines up under the columns above it, as `'left'`, the 1.x default, did. `'right'` and `'inherit'` have no replacement.
- `maxCols`. To cap the columns, cap the width of the element around `CardWindow`. For N columns that width is `spacing.left + spacing.right + N × cardRect.width + (N − 1) × spacing.x`, plus the scrollbar width where scrollbars are classic (see the scrollbar gutter below).
- The `useResizeObserver` export. Use `ResizeObserver` directly, or a hook from another library.

### Changed

- `ref` now receives the scroll container element. In 1.x it received a function that returned the element, and the type hid that. Change `ref.current()` to `ref.current`. `CardWindow` is typed as a forwardRef component, so `useRef<HTMLDivElement>(null)` type-checks.
- `justifyContent` gains `'start'` and `'end'`. They follow the writing direction. `'left'` and `'right'` do not.
- The column count follows grid `auto-fill` for every `justifyContent` value. For `'space-evenly'`, each column count now starts `2 × spacing.x` narrower (16px with the default spacing). With 100px cards, the default spacing and overlay scrollbars, a 332 to 347px frame shows 3 columns where 1.11.0 showed 2.
- `CardProps.style` and the `style` of a loading card are an empty object. 1.x set `width`, `height`, `marginLeft` and `flexGrow` there. The grid cell sizes the card now, and a block element fills it by default. Keep passing `style` to the root of your card.
- `OnScrollProps.updateWasRequested` is true when this scroll changed the rendered row range.
- `indexesOfVisible` counts `spacing.top`.
- `loadMore` is called when the end of the list comes within `overScanPx`, and again after `data` grows while the end is still that close. It is no longer called on every render.
- The loading row renders only when the last row is in range.
- A container narrower than one card shows one column. 1.11.0 showed nothing.
- The element that gets `container.className` and `container.style` no longer spills `spacing.left + spacing.right` (16px by default) past the scroll container. It now has `box-sizing: border-box` and `position: relative`, and `container.style` cannot override them.
- The root reserves a scrollbar gutter. Where scrollbars are classic, the gutter narrows the content by the scrollbar width, so each column count starts at a frame that much wider. To turn it off, pass `root={{ style: { scrollbarGutter: 'auto' } }}`. With it off, classic scrollbars can make the first render report the ResizeObserver loop error again.
- `onScroll` is called at most once per animation frame, after the scroll. Several scroll events in one frame make one call, and `direction` compares one frame with the previous one.
- The mount no longer renders every card twice.

```bash
npm install @annetaan/card-window@2
```
