import { CardWindow, range } from '@annetaan/card-window';

import { SampleCard } from './shared';

const RootStyle = () => {
  const data = range(100);
  const cardRect = { width: 200, height: 120 };
  const root = { style: { height: 300, border: '10px dashed var(--sl-color-accent)' } };
  return (
    <CardWindow data={data} cardRect={cardRect} root={root}>
      {SampleCard}
    </CardWindow>
  );
};

export default RootStyle;
