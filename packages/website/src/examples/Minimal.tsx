import { CardWindow, range } from '@annetaan/card-window';

import { SampleCard } from './shared';

const Minimal = () => {
  const data = range(10000);
  const cardRect = { width: 200, height: 120 };
  return (
    <div style={{ height: 300 }}>
      <CardWindow data={data} cardRect={cardRect}>
        {SampleCard}
      </CardWindow>
    </div>
  );
};

export default Minimal;
