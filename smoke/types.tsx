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

const props: CardWindowProps<Item[]> = {
  data: range(10).map((i) => ({ id: String(i), title: `Item ${i}` })),
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
