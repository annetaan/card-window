import { CardWindow, range } from '@annetaan/card-window';

import { SampleCard } from './shared';

const ContainerStyle = () => {
  const data = range(100);
  const cardRect = { width: 200, height: 120 };
  const container = { style: { background: 'linear-gradient(65deg, #f13f79, #2196f3)' } };
  return (
    <div style={{ height: 300 }}>
      <CardWindow data={data} cardRect={cardRect} container={container}>
        {SampleCard}
      </CardWindow>
    </div>
  );
};

export default ContainerStyle;
