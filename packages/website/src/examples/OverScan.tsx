import { CardWindow, range } from '@annetaan/card-window';

import { SampleCard, Toolbar, useSelect } from './shared';

const OverScan = () => {
  const [overScanPx, overScanPxSelect] = useSelect('overScanPx', [0, 200, 1000, 2000] as const, 1);
  const data = range(100);
  const cardRect = { width: 200, height: 120 };
  return (
    <div>
      <Toolbar>{overScanPxSelect}</Toolbar>
      <div style={{ height: 200 }}>
        <CardWindow data={data} cardRect={cardRect} overScanPx={overScanPx}>
          {SampleCard}
        </CardWindow>
      </div>
    </div>
  );
};

export default OverScan;
