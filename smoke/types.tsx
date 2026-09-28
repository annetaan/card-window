// Type-checked only. It uses the public types the way an app would.
import * as React from 'react';
import DefaultCardWindow, {
  CardProps,
  CardWindow,
  CardWindowProps,
  JustifyContent,
  Loading,
  OnScrollProps,
  Spacing,
  range,
} from '@annetaan/card-window';

type Item = { id: string; title: string };

const Card = ({ data, index, style }: CardProps<Item[]>) => <div style={style}>{data[index].title}</div>;

const spacing: Spacing = { x: 16 };
const justifyContent: JustifyContent = 'space-between';
const loading: Loading = { type: 'row', height: 40, LoadingComponent: ({ style }) => <div style={style} /> };
const onScroll = ({ direction, indexesOfVisible }: OnScrollProps) => [direction, indexesOfVisible.length];

const items: Item[] = range(10).map((i) => ({ id: String(i), title: `Item ${i}` }));

const props: CardWindowProps<Item[]> = {
  data: items,
  cardRect: { width: 200, height: 120 },
  children: Card,
  getKey: (index, data) => data[index].id,
  spacing,
  justifyContent,
  loading,
  onScroll,
};

export const App = () => <CardWindow {...props} />;
export const DefaultApp = () => <DefaultCardWindow {...props} />;

// CardWindow takes the type of data from the props and hands it to children and getKey.
// These lines check that the packed type files keep that, so a missing property is an error.
export const InferredApp = () => (
  <>
    <CardWindow data={items} cardRect={{ width: 200, height: 120 }} getKey={(index, data) => data[index].id}>
      {({ data, index, style }) => <div style={style}>{data[index].title}</div>}
    </CardWindow>
    <CardWindow data={items} cardRect={{ width: 200, height: 120 }}>
      {({ data, index, style }) => (
        // @ts-expect-error Item has no missing property
        <div style={style}>{data[index].missing}</div>
      )}
    </CardWindow>
    <CardWindow
      data={items}
      cardRect={{ width: 200, height: 120 }}
      // @ts-expect-error Item has no missing property
      getKey={(index, data) => data[index].missing}
    >
      {({ data, index, style }) => <div style={style}>{data[index].title}</div>}
    </CardWindow>
    <DefaultCardWindow data={items} cardRect={{ width: 200, height: 120 }}>
      {({ data, index, style }) => (
        // @ts-expect-error Item has no missing property
        <div style={style}>{data[index].missing}</div>
      )}
    </DefaultCardWindow>
  </>
);
