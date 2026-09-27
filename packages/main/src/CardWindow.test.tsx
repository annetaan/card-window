/* eslint-disable class-methods-use-this */
import * as React from 'react';

import {
  render,
  // screen
} from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import CardWindow, {
  CardProps,
  JustifyContent,
  LastRowAlign,
  Loading,
  Rect,
  Spacing,
  functions,
  range,
} from './CardWindow';

const {
  getColumns,
  getScrollContainerHeight,
  getRenderFirstRow,
  getLastRowFromLength,
  getRows,
  getRenderContainerStyle,
  getBaseItemProps,
  getItemProps,
  getNextOffset,
} = functions;

describe('range', () => {
  describe('range(stop)', () => {
    test.each([
      [0, []],
      [1, [0]],
      [2, [0, 1]],
      [3, [0, 1, 2]],
    ])('range(%p) => %p', (x, expected) => expect(range(x)).toEqual(expected));
  });
  describe('range(start, stop)', () => {
    test.each([
      [5, 5, []],
      [5, 6, [5]],
      [5, 7, [5, 6]],
      [5, 8, [5, 6, 7]],
    ])('range(%p, %p) => %p', (x, y, expected) => expect(range(x, y)).toEqual(expected));
  });
});

describe('getColumns(container, card, spacing, justifyContent, maxCols)', () => {
  test('container.width < card.width => 0', () => {
    const spacing: Spacing = { x: 0, y: 0, top: 0, bottom: 0, left: 10, right: 10 };
    expect(getColumns(120, 120, spacing, 'center', undefined)).toBe(0);
  });
  describe('container.width: 200', () => {
    const name = 'card.width: %p, spacing.x: %p => %p';
    const byCase = (justifyContent: JustifyContent, maxCols: number | undefined) => (width, x, expected) => {
      const spacing = { x, y: 0, top: 0, bottom: 0, left: 0, right: 0 };
      expect(getColumns(200, width, spacing, justifyContent, maxCols)).toBe(expected);
    };
    describe(`justifyContent: not space-evenly('center')`, () => {
      describe('maxCols: undefined', () =>
        test.each([
          [100, 1, 1],
          [100, 0, 2],
          [80, 41, 1],
          [80, 40, 2],
          [80, 0, 2],
          [60, 81, 1],
          [60, 80, 2],
          [60, 11, 2],
          [60, 10, 3],
          [60, 0, 3],
        ])(name, byCase('center', undefined)));

      describe('maxCols: 2', () =>
        test.each([
          [80, 0, 2],
          [60, 0, 2],
        ])(name, byCase('center', 2)));
    });

    describe(`justifyContent: 'space-evenly'`, () => {
      describe('maxCols: undefined', () =>
        test.each([
          [100, 1, 1],
          [100, 0, 2],
          [80, 14, 1],
          [80, 13, 2],
          [80, 0, 2],
          [60, 27, 1],
          [60, 26, 2],
          [60, 6, 2],
          [60, 5, 3],
          [60, 0, 3],
        ])(name, byCase('space-evenly', undefined)));
    });
    describe('maxCols: 2', () =>
      test.each([
        [80, 0, 2],
        [60, 0, 2],
      ])(name, byCase('space-evenly', 2)));
  });
});

describe('getScrollContainerHeight(cols, length, card, spacing, loading)', () => {
  const name = 'length: %p, card.height: %p, spacing: { x: 0, y: %p, top: %p, bottom: %p } => %p';
  const byCase =
    (cols: number, loading?: Loading) => (length, cardHeight, spacingY, spacingTop, spacingBottom, expected) => {
      const card: Rect = { width: 0, height: cardHeight };
      const spacing: Spacing = { x: 0, y: spacingY, top: spacingTop, bottom: spacingBottom, left: 0, right: 0 };
      expect(getScrollContainerHeight(cols, length, card, spacing, loading)).toBe(expected);
    };
  describe('cols: 3', () => {
    const cols = 3;
    describe('loading: undefined', () => {
      describe('rows: 0', () =>
        test.each([
          [0, 100, 0, 0, 0, 0],
          [0, 100, 10, 0, 0, 0],
          [0, 100, 0, 10, 0, 10],
          [0, 100, 0, 0, 10, 10],
          [0, 100, 10, 10, 10, 20],
        ])(name, byCase(cols, undefined)));

      describe('rows: 1', () =>
        test.each([
          [1, 100, 0, 0, 0, 100],
          [1, 100, 10, 0, 0, 100],
          [1, 100, 0, 10, 0, 110],
          [1, 100, 0, 0, 10, 110],
          [1, 100, 10, 10, 10, 120],
          [3, 100, 0, 0, 0, 100],
        ])(name, byCase(cols, undefined)));

      describe('rows: 2', () =>
        test.each([
          [4, 100, 0, 0, 0, 200],
          [4, 100, 10, 0, 0, 210],
          [4, 100, 0, 10, 0, 210],
          [4, 100, 0, 0, 10, 210],
          [4, 100, 10, 10, 10, 230],
          [6, 100, 0, 0, 0, 200],
        ])(name, byCase(cols, undefined)));

      describe('rows: 3', () =>
        test.each([
          [7, 100, 0, 0, 0, 300],
          [7, 100, 10, 0, 0, 320],
          [7, 100, 0, 10, 0, 310],
          [7, 100, 0, 0, 10, 310],
          [7, 100, 10, 10, 10, 340],
        ])(name, byCase(cols, undefined)));
    });

    describe(`loading.type: 'card'`, () =>
      test.each([
        [1, 100, 0, 0, 0, 100],
        [3, 100, 0, 0, 0, 100],
        [4, 100, 0, 0, 0, 200],
        [6, 100, 0, 0, 0, 200],
        [7, 100, 0, 0, 0, 300],
      ])(name, byCase(cols, { type: 'card', LoadingComponent: () => null })));

    describe(`loading.type: 'row'`, () =>
      test.each([
        [0, 100, 0, 0, 0, 50],
        [1, 100, 0, 0, 0, 150],
        [3, 100, 0, 0, 0, 150],
        [4, 100, 0, 0, 0, 250],
        [6, 100, 0, 0, 0, 250],
        [7, 100, 0, 0, 0, 350],
      ])(name, byCase(cols, { type: 'row', height: 50, LoadingComponent: () => null })));
  });
  describe('cols: 2, loading: undefined', () =>
    test.each([
      [0, 100, 0, 0, 0, 0],
      [1, 100, 0, 0, 0, 100],
      [2, 100, 0, 0, 0, 100],
      [3, 100, 0, 0, 0, 200],
      [4, 100, 0, 0, 0, 200],
      [5, 100, 0, 0, 0, 300],
    ])(name, byCase(2, undefined)));
});

describe('getRenderFirstRow', () =>
  test.each`
    offset | overScanPx | expected
    ${0}   | ${0}       | ${0}
    ${109} | ${0}       | ${0}
    ${110} | ${0}       | ${1}
    ${219} | ${0}       | ${1}
    ${220} | ${0}       | ${2}
    ${0}   | ${200}     | ${0}
    ${309} | ${200}     | ${0}
    ${310} | ${200}     | ${1}
    ${419} | ${200}     | ${1}
    ${420} | ${200}     | ${2}
  `('offset: $offset, overScanPx: $overScanPx, expected: $expected', ({ offset, overScanPx, expected }) => {
    const card: Rect = { width: 0, height: 100 };
    const spacing: Spacing = { x: 0, y: 10, top: 10, bottom: 10, left: 0, right: 0 };
    expect(getRenderFirstRow(offset, overScanPx, card, spacing)).toEqual(expected);
  }));

describe('getLastRowFromLength', () => {
  const name = 'length: $length, loadingCards: $loadingCards, expected: $expected';
  const byCase =
    (cols: number) =>
    ({ length, loadingCards, expected }) =>
      expect(getLastRowFromLength(length, loadingCards, cols)).toEqual(expected);

  describe('cols: 3', () =>
    test.each`
      length | loadingCards | expected
      ${0}   | ${0}         | ${0}
      ${3}   | ${0}         | ${0}
      ${4}   | ${0}         | ${1}
      ${6}   | ${0}         | ${1}
      ${7}   | ${0}         | ${2}
    `(name, byCase(3)));

  describe('cols: 3', () =>
    test.each`
      length | loadingCards | expected
      ${0}   | ${1}         | ${0}
      ${2}   | ${1}         | ${0}
      ${3}   | ${1}         | ${1}
      ${5}   | ${1}         | ${1}
      ${6}   | ${1}         | ${2}
    `(name, byCase(3)));

  describe('cols: 2', () =>
    test.each`
      length | loadingCards | expected
      ${0}   | ${0}         | ${0}
      ${2}   | ${0}         | ${0}
      ${3}   | ${0}         | ${1}
      ${4}   | ${0}         | ${1}
      ${5}   | ${0}         | ${2}
    `(name, byCase(2)));
});

describe('getRows', () => {
  const name = 'offset: %p, length: %p, loadingCard: %p, cols: %p => %p';
  const byCase = (overScanPx: number) => (offset, length, loadingCards, cols, expected) => {
    const containerHeight = 200;
    const card: Rect = { width: 0, height: 100 };
    const spacing: Spacing = { x: 0, y: 0, top: 0, bottom: 0, left: 0, right: 0 };
    const result = getRows(length, loadingCards, cols, offset, overScanPx, containerHeight, card, spacing);
    expect(result).toEqual(expected);
  };

  describe('overScanPx: 0', () =>
    test.each([
      [0, 3, 0, 3, [0, 0]],
      [0, 4, 0, 3, [0, 1]],
      [99, 100, 0, 3, [0, 2]],
      [100, 100, 0, 3, [1, 3]],
      [3299, 100, 0, 3, [32, 33]],
      [3300, 100, 0, 3, [33, 33]],
    ])(name, byCase(0)));

  describe('overScanPx: 200', () =>
    test.each([
      [0, 3, 0, 3, [0, 0]],
      [0, 4, 0, 3, [0, 1]],
      [299, 100, 0, 3, [0, 6]],
      [300, 100, 0, 3, [1, 7]],
      [3299, 100, 0, 3, [30, 33]],
      [3300, 100, 0, 3, [31, 33]],
    ])(name, byCase(200)));
});

describe('getRenderContainerStyle', () => {
  const name = 'row: %p, card.height: %p, spacing: { x: 0, y: %p, top: %p, bottom: 0 } => translate(0, %ppx)';
  const byCase = (row, height, y, top, expected) => {
    const card: Rect = { width: 0, height };
    const spacing: Spacing = { x: 0, y, top, bottom: 0, left: 0, right: 0 };
    expect(getRenderContainerStyle(row, card, spacing, 'space-evenly').transform).toBe(`translate(0, ${expected}px)`);
  };
  test.each([
    [0, 100, 0, 0, 0],
    [0, 100, 10, 0, 0],
    [0, 100, 0, 10, 10],
    [1, 100, 0, 0, 100],
    [1, 100, 10, 0, 110],
    [1, 100, 10, 10, 120],
  ])(name, byCase);
});

describe('getBaseItemProps', () => {
  const name = 'index: %p, cols: %p, x: %p => marginLeft: %p, flexGrow: %p, row: %p, col: %p';
  const byCase = (justifyContent: JustifyContent) => (index, cols, x, marginLeft, flexGrow, row, col) => {
    const card: Rect = { width: 0, height: 0 };
    const spacing: Spacing = { x, y: 0, top: 0, bottom: 0, left: 0, right: 0 };
    const result = getBaseItemProps(index, cols, justifyContent, card, spacing);
    expect(result.row).toBe(row);
    expect(result.col).toBe(col);
    expect(result.style.marginLeft).toBe(marginLeft);
    expect(result.style.flexGrow).toBe(flexGrow);
  };

  describe('justifyContent: stretch', () =>
    test.each([
      [0, 3, 0, undefined, 1, 0, 0],
      [1, 3, 0, 0, 1, 0, 1],
      [2, 3, 0, 0, 1, 0, 2],
      [3, 3, 0, undefined, 1, 1, 0],
    ])(name, byCase('stretch')));

  describe('justifyContent: center', () =>
    test.each([
      [0, 3, 0, undefined, undefined, 0, 0],
      [1, 3, 0, 0, undefined, 0, 1],
      [2, 3, 0, 0, undefined, 0, 2],
      [3, 3, 0, undefined, undefined, 1, 0],
    ])(name, byCase('center')));

  describe('justifyContent: space-evenly', () =>
    test.each([
      [0, 3, 0, undefined, undefined, 0, 0],
      [1, 3, 0, undefined, undefined, 0, 1],
      [2, 3, 0, undefined, undefined, 0, 2],
      [3, 3, 0, undefined, undefined, 1, 0],
    ])(name, byCase('space-evenly')));
});

describe('getItemProps', () => {
  const name = 'rows: %p, cols: %p, length: %p => %p';
  const byCase = (lastRowAlign: LastRowAlign, loadingCards: number) => (length, rows, expected) => {
    const card: Rect = { width: 0, height: 0 };
    const spacing: Spacing = { x: 0, y: 0, top: 0, bottom: 0, left: 0, right: 0 };
    const items = getItemProps(length, loadingCards, 3, rows, card, spacing, 'space-evenly', lastRowAlign);
    expect(items.length).toBe(expected.length);
    expect(items.map((item) => item.type)).toEqual(expected);
  };
  describe('lastRowAlign: left', () => {
    describe('loadingCards: 0', () =>
      test.each([
        [99, [0, 1], ['card', 'card', 'card', 'card', 'card', 'card']],
        [100, [31, 32], ['card', 'card', 'card', 'card', 'card', 'card']],
        [100, [32, 33], ['card', 'card', 'card', 'card', 'placeholder', 'placeholder']],
        [101, [32, 33], ['card', 'card', 'card', 'card', 'card', 'placeholder']],
        [102, [32, 33], ['card', 'card', 'card', 'card', 'card', 'card']],
      ])(name, byCase('left', 0)));
    describe('loadingCards: 1', () =>
      test.each([
        [99, [0, 1], ['card', 'card', 'card', 'card', 'card', 'card']],
        [99, [31, 32], ['card', 'card', 'card', 'card', 'card', 'card']],
        [99, [32, 33], ['card', 'card', 'card', 'loading', 'placeholder', 'placeholder']],
        [100, [32, 33], ['card', 'card', 'card', 'card', 'loading', 'placeholder']],
        [101, [32, 33], ['card', 'card', 'card', 'card', 'card', 'loading']],
      ])(name, byCase('left', 1)));
  });
  describe('lastRowAlign: right', () => {
    describe('loadingCards: 0', () =>
      test.each([
        [99, [0, 1], ['card', 'card', 'card', 'card', 'card', 'card']],
        [100, [31, 32], ['card', 'card', 'card', 'card', 'card', 'card']],
        [100, [32, 33], ['card', 'card', 'card', 'placeholder', 'placeholder', 'card']],
        [101, [32, 33], ['card', 'card', 'card', 'placeholder', 'card', 'card']],
        [102, [32, 33], ['card', 'card', 'card', 'card', 'card', 'card']],
      ])(name, byCase('right', 0)));
    describe('loadingCards: 1', () =>
      test.each([
        [99, [0, 1], ['card', 'card', 'card', 'card', 'card', 'card']],
        [99, [31, 32], ['card', 'card', 'card', 'card', 'card', 'card']],
        [99, [32, 33], ['card', 'card', 'card', 'placeholder', 'placeholder', 'loading']],
        [100, [32, 33], ['card', 'card', 'card', 'placeholder', 'card', 'loading']],
        [101, [32, 33], ['card', 'card', 'card', 'card', 'card', 'loading']],
      ])(name, byCase('right', 1)));
  });
  describe('lastRowAlign: inherit', () => {
    describe('loadingCards: 0', () =>
      test.each([
        [99, [0, 1], ['card', 'card', 'card', 'card', 'card', 'card']],
        [100, [31, 32], ['card', 'card', 'card', 'card', 'card', 'card']],
        [100, [32, 33], ['card', 'card', 'card', 'card']],
        [101, [32, 33], ['card', 'card', 'card', 'card', 'card']],
        [102, [32, 33], ['card', 'card', 'card', 'card', 'card', 'card']],
      ])(name, byCase('inherit', 0)));
    describe('loadingCards: 1', () =>
      test.each([
        [99, [0, 1], ['card', 'card', 'card', 'card', 'card', 'card']],
        [99, [31, 32], ['card', 'card', 'card', 'card', 'card', 'card']],
        [99, [32, 33], ['card', 'card', 'card', 'loading']],
        [100, [32, 33], ['card', 'card', 'card', 'card', 'loading']],
        [101, [32, 33], ['card', 'card', 'card', 'card', 'card', 'loading']],
      ])(name, byCase('inherit', 1)));
  });
});

describe('getNextOffset', () =>
  test.each([
    [3, 4],
    [4, 5],
    [3, 5],
  ])('before: %p, after: %p', (before, after) => {
    const card: Rect = { width: 100, height: 80 };
    const spacing: Spacing = { x: 0, y: 20, top: 0, bottom: 0, left: 0, right: 0 };
    range(10000).forEach((offset) => {
      const up1 = getNextOffset(offset, before, after, card, spacing);
      const down1 = getNextOffset(up1, after, before, card, spacing);
      const up2 = getNextOffset(down1, before, after, card, spacing);
      expect(getNextOffset(up2, after, before, card, spacing)).toBe(down1);
    });
  }));

let instanceResize: ResizeObserver | null = null;
let callbackResize: ResizeObserverCallback | null = null;
globalThis.ResizeObserver = class MockResizeObjerver {
  constructor(callback: ResizeObserverCallback) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    instanceResize = this;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callbackResize = callback;
  }

  disconnect() {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  observe(target: Element, options?: ResizeObserverOptions) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  unobserve(target: Element) {}
};

describe('CardWindow', () => {
  const Card: React.FC<CardProps> = ({ data, index, style }) => (
    <div style={{ ...style, backgroundColor: '#fff' }}>
      <div style={{ padding: 16 }}>
        <h2>{data[index]}</h2>
      </div>
    </div>
  );
  test('renders App component', () => {
    const data = range(10000);
    const cardRect = { width: 300, height: 200 };
    render(
      <CardWindow data={data} cardRect={cardRect}>
        {Card}
      </CardWindow>
    );

    // screen.debug();
  });
});
