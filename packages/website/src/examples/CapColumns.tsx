import { useLayoutEffect, useRef, useState } from 'react';

import { CardWindow, range } from '@annetaan/card-window';

import { SampleCard, Toolbar, useSelect } from './shared';

const CapColumns = () => {
  const [columns, columnsSelect] = useSelect('columns', [1, 2, 3, 4, 5] as const, 2);
  const data = range(100);
  // Narrow cards, so that five columns fit the width of this page.
  const cardRect = { width: 100, height: 120 };
  const spacing = { x: 8, left: 8, right: 8 };
  // The root reserves a scrollbar gutter: 0px with overlay scrollbars, the scrollbar width with classic ones.
  const ref = useRef<HTMLDivElement>(null);
  const [gutter, setGutter] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setGutter(el.offsetWidth - el.clientWidth);
  }, []);
  const width = spacing.left + spacing.right + columns * cardRect.width + (columns - 1) * spacing.x + gutter;
  return (
    <div>
      <Toolbar>{columnsSelect}</Toolbar>
      <div style={{ width, maxWidth: '100%', height: 300 }}>
        <CardWindow ref={ref} data={data} cardRect={cardRect} spacing={spacing} justifyContent="stretch">
          {SampleCard}
        </CardWindow>
      </div>
    </div>
  );
};

export default CapColumns;
