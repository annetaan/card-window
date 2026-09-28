import { useRef } from 'react';

import { CardWindow, range } from '@annetaan/card-window';

import { SampleCard, Toolbar } from './shared';

const ScrollRef = () => {
  const ref = useRef<HTMLDivElement>(null);
  const data = range(1000);
  const cardRect = { width: 200, height: 120 };
  const toTop = () => ref.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const toEnd = () => {
    const el = ref.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };
  return (
    <div>
      <Toolbar>
        <button type="button" onClick={toTop}>
          Back to top
        </button>
        <button type="button" onClick={toEnd}>
          To the end
        </button>
      </Toolbar>
      <div style={{ height: 300 }}>
        <CardWindow ref={ref} data={data} cardRect={cardRect}>
          {SampleCard}
        </CardWindow>
      </div>
    </div>
  );
};

export default ScrollRef;
