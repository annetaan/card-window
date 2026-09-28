import * as React from 'react';

import {
  render,
  // screen
} from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import CardWindow, { CardProps, Loading, Rect, Spacing, functions, range } from './CardWindow';

const { getScrollContainerHeight, getLastRowFromLength, getRowRange, getIndexRange, getNextOffset } = functions;

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

describe('getRowRange(offset, viewHeight, margin, rowCount, card, spacing)', () => {
  // Row r spans [top + 108r, top + 108r + 100].
  const card: Rect = { width: 100, height: 100 };
  const spacing = (top: number): Spacing => ({ x: 8, y: 8, top, bottom: 8, left: 8, right: 8 });
  const name = 'offset: $offset, viewHeight: $viewHeight, margin: $margin, rowCount: $rowCount, top: $top => $expected';
  const byCase = ({ offset, viewHeight, margin, rowCount, top, expected }) =>
    expect(getRowRange(offset, viewHeight, margin, rowCount, card, spacing(top))).toEqual(expected);

  describe('render range with overscan', () =>
    test.each`
      offset  | viewHeight | margin | rowCount | top  | expected
      ${1108} | ${330}     | ${200} | ${100}   | ${8} | ${[8, 15]}
      ${1118} | ${330}     | ${200} | ${100}   | ${8} | ${[8, 15]}
      ${1171} | ${330}     | ${200} | ${100}   | ${8} | ${[8, 15]}
      ${1172} | ${330}     | ${200} | ${100}   | ${8} | ${[9, 15]}
      ${1108} | ${330}     | ${0}   | ${100}   | ${8} | ${[10, 13]}
    `(name, byCase));

  describe('spacing.top shifts the rows', () =>
    test.each`
      offset | viewHeight | margin | rowCount | top   | expected
      ${210} | ${100}     | ${0}   | ${100}   | ${0}  | ${[2, 2]}
      ${210} | ${100}     | ${0}   | ${100}   | ${50} | ${[1, 2]}
      ${120} | ${100}     | ${0}   | ${100}   | ${0}  | ${[1, 2]}
      ${120} | ${100}     | ${0}   | ${100}   | ${50} | ${[0, 1]}
    `(name, byCase));

  describe('visible range with a negative margin', () =>
    test.each`
      offset  | viewHeight | margin | rowCount | top  | expected
      ${1108} | ${330}     | ${-50} | ${100}   | ${8} | ${[10, 12]}
      ${500}  | ${330}     | ${-50} | ${100}   | ${8} | ${[5, 7]}
    `(name, byCase));

  describe('clamping', () =>
    test.each`
      offset   | viewHeight | margin | rowCount | top  | expected
      ${0}     | ${330}     | ${200} | ${100}   | ${8} | ${[0, 4]}
      ${10500} | ${330}     | ${200} | ${100}   | ${8} | ${[95, 99]}
      ${0}     | ${330}     | ${200} | ${2}     | ${8} | ${[0, 1]}
    `(name, byCase));

  describe('empty ranges', () => {
    test('rowCount 0 gives last < first', () => {
      const [first, last] = getRowRange(0, 330, 200, 0, card, spacing(8));
      expect(last).toBeLessThan(first);
    });
    test('a negative margin larger than the view gives last < first', () => {
      const [first, last] = getRowRange(1108, 100, -100, 100, card, spacing(8));
      expect(last).toBeLessThan(first);
    });
  });
});

describe('getIndexRange(rows, cols, count)', () =>
  test.each`
    case                        | rows        | cols | count  | expected
    ${'full range'}             | ${[2, 4]}   | ${3} | ${100} | ${[6, 15]}
    ${'partial last row'}       | ${[32, 33]} | ${3} | ${100} | ${[96, 100]}
    ${'loading cards included'} | ${[32, 33]} | ${3} | ${102} | ${[96, 102]}
    ${'empty range'}            | ${[5, 4]}   | ${3} | ${100} | ${[0, 0]}
    ${'no columns'}             | ${[0, 3]}   | ${0} | ${100} | ${[0, 0]}
  `('$case: rows $rows, cols $cols, count $count => $expected', ({ rows, cols, count, expected }) =>
    expect(getIndexRange(rows, cols, count)).toEqual(expected),
  ));

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

// oxlint-disable-next-line no-unused-vars
let instanceResize: ResizeObserver | null = null;
// oxlint-disable-next-line no-unused-vars
let callbackResize: ResizeObserverCallback | null = null;
globalThis.ResizeObserver = class MockResizeObjerver {
  constructor(callback: ResizeObserverCallback) {
    // oxlint-disable-next-line typescript/no-this-alias
    instanceResize = this;
    callbackResize = callback;
  }

  disconnect() {}

  // oxlint-disable-next-line no-unused-vars
  observe(target: Element, options?: ResizeObserverOptions) {}

  // oxlint-disable-next-line no-unused-vars
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
      </CardWindow>,
    );

    // screen.debug();
  });
});
