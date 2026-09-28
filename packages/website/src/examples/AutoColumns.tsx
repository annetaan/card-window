import { CardWindow, range } from '@annetaan/card-window';

import { SampleCard, Toolbar, useSelect } from './shared';

const AutoColumns = () => {
  const [width, widthSelect] = useSelect('width', ['100%', '75%', '50%'] as const);
  const data = range(10000);
  const cardRect = { width: 200, height: 120 };
  return (
    <div>
      <Toolbar>{widthSelect}</Toolbar>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width, height: 300 }}>
          <CardWindow data={data} cardRect={cardRect}>
            {SampleCard}
          </CardWindow>
        </div>
      </div>
    </div>
  );
};

export default AutoColumns;
