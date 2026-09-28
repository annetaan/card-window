import * as React from 'react';

import { describe, expectTypeOf, test } from 'vitest';

import DefaultCardWindow, { CardProps, CardWindow, CardWindowProps, range } from '.';

// `pnpm typecheck` checks this file. Vitest does not run it.

type Item = { id: string; title: string };
const items: Item[] = [];
const cardRect = { width: 100, height: 100 };

describe('CardWindow types', () => {
  test('infers data of an inline children component from data', () => {
    <CardWindow data={items} cardRect={cardRect}>
      {({ data, index }) => {
        expectTypeOf(data).toEqualTypeOf<Item[]>();
        return <div>{data[index].title}</div>;
      }}
    </CardWindow>;
  });

  test('infers data of getKey from data', () => {
    <CardWindow
      data={items}
      cardRect={cardRect}
      getKey={(index, data) => {
        expectTypeOf(data).toEqualTypeOf<Item[]>();
        return data[index].id;
      }}
    >
      {({ index, style }) => <div style={style}>{index}</div>}
    </CardWindow>;
  });

  test('accepts a card typed with CardProps<T> for the same T', () => {
    const Card = ({ data, index }: CardProps<Item[]>) => <div>{data[index].title}</div>;
    <CardWindow data={items} cardRect={cardRect}>
      {Card}
    </CardWindow>;
  });

  test('accepts a card typed with the default CardProps', () => {
    const Card = ({ data, index }: CardProps) => <div>{String(data[index])}</div>;
    const FC: React.FC<CardProps> = ({ index }) => <div>{index}</div>;
    <CardWindow data={range(10)} cardRect={cardRect}>
      {Card}
    </CardWindow>;
    <CardWindow data={items} cardRect={cardRect}>
      {Card}
    </CardWindow>;
    <CardWindow data={range(10)} cardRect={cardRect}>
      {FC}
    </CardWindow>;
    <CardWindow data={items} cardRect={cardRect}>
      {FC}
    </CardWindow>;
  });

  test('rejects a card whose CardProps<T> does not match data', () => {
    const Card = ({ data, index }: CardProps<Item[]>) => <div>{data[index].title}</div>;
    // T comes from data, so TypeScript reports the mismatch on the card.
    <CardWindow data={range(3)} cardRect={cardRect}>
      {/* @ts-expect-error data is number[], and Card takes Item[] */}
      {Card}
    </CardWindow>;
  });

  test('rejects a property the element type does not have', () => {
    <CardWindow data={items} cardRect={cardRect}>
      {({ data, index }) => {
        // @ts-expect-error Item has no missing
        return <div>{data[index].missing}</div>;
      }}
    </CardWindow>;
    <CardWindow
      data={items}
      cardRect={cardRect}
      getKey={(index, data) => {
        // @ts-expect-error Item has no missing
        return data[index].missing;
      }}
    >
      {({ index }) => <div>{index}</div>}
    </CardWindow>;
  });

  test('takes an explicit type argument', () => {
    <CardWindow<Item[]> data={[]} cardRect={cardRect}>
      {({ data, index }) => {
        expectTypeOf(data).toEqualTypeOf<Item[]>();
        return <div>{data[index].title}</div>;
      }}
    </CardWindow>;
  });

  test('infers T through the default export', () => {
    <DefaultCardWindow data={items} cardRect={cardRect}>
      {({ data, index }) => {
        expectTypeOf(data).toEqualTypeOf<Item[]>();
        return <div>{data[index].title}</div>;
      }}
    </DefaultCardWindow>;
  });

  test('infers T from a spread CardWindowProps<T>', () => {
    const props: Omit<CardWindowProps<Item[]>, 'children'> = { data: items, cardRect };
    <CardWindow {...props}>
      {({ data, index }) => {
        expectTypeOf(data).toEqualTypeOf<Item[]>();
        return <div>{data[index].title}</div>;
      }}
    </CardWindow>;
  });

  test('keeps any[] for CardWindowProps without a type argument', () => {
    // The pattern of the browser tests.
    const props: Omit<CardWindowProps, 'cardRect' | 'children'> = { data: range(3) };
    <CardWindow cardRect={cardRect} {...props}>
      {({ data }) => {
        expectTypeOf(data).toEqualTypeOf<any[]>();
        return null;
      }}
    </CardWindow>;
  });

  test('types the ref as HTMLDivElement', () => {
    const ref = React.createRef<HTMLDivElement>();
    <CardWindow ref={ref} data={items} cardRect={cardRect}>
      {() => null}
    </CardWindow>;
    const callbackRef = (el: HTMLDivElement | null) => {
      void el;
    };
    <CardWindow ref={callbackRef} data={items} cardRect={cardRect}>
      {() => null}
    </CardWindow>;
    const spanRef = React.createRef<HTMLSpanElement>();
    <CardWindow
      // @ts-expect-error the ref receives an HTMLDivElement
      ref={spanRef}
      data={items}
      cardRect={cardRect}
    >
      {() => null}
    </CardWindow>;
  });

  test('works where a component type is expected', () => {
    const component: React.ComponentType<CardWindowProps & React.RefAttributes<HTMLDivElement>> = CardWindow;
    void component;
    expectTypeOf<React.ComponentProps<typeof CardWindow>['data']>().toEqualTypeOf<any[]>();
    expectTypeOf<React.ComponentRef<typeof CardWindow>>().toEqualTypeOf<HTMLDivElement>();
  });
});
