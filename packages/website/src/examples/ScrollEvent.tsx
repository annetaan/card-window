import { useState } from 'react';

import { CardWindow, type OnScrollProps, range } from '@annetaan/card-window';

import { SampleCard, Toolbar } from './shared';

const ScrollEvent = () => {
  const [last, setLast] = useState<OnScrollProps | null>(null);
  const data = range(10000);
  const cardRect = { width: 200, height: 120 };
  const visible = last?.indexesOfVisible ?? [];
  return (
    <div>
      <Toolbar>
        {last === null ? (
          <span>Scroll the cards</span>
        ) : (
          <>
            <span>direction: {last.direction}</span>
            <span>offset: {Math.round(last.offset)}</span>
            <span>updateWasRequested: {String(last.updateWasRequested)}</span>
            <span>
              indexesOfVisible: {visible.length === 0 ? 'none' : `${visible[0]}–${visible[visible.length - 1]}`}
            </span>
          </>
        )}
      </Toolbar>
      <div style={{ height: 300 }}>
        <CardWindow data={data} cardRect={cardRect} onScroll={setLast}>
          {SampleCard}
        </CardWindow>
      </div>
    </div>
  );
};

export default ScrollEvent;
