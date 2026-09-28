import { useEffect, useState } from 'react';

import { CardWindow, type Loading, range } from '@annetaan/card-window';

import { LoadingCard, SampleCard } from './shared';

const LoadingRow = () => {
  const [{ data, pending }, setState] = useState({ data: range(10), pending: false });

  useEffect(() => {
    if (!pending) return undefined;
    const timer = window.setTimeout(() => setState((s) => ({ data: range(s.data.length + 10), pending: false })), 1000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  const cardRect = { width: 200, height: 120 };
  const next = data.length < 100;
  // Set the loadMore function only if you can call it.
  const loadMore = pending ? undefined : () => setState((s) => ({ ...s, pending: true }));
  const loading: Loading | undefined = next
    ? { type: 'row', LoadingComponent: LoadingCard, height: 80, loadMore }
    : undefined;
  return (
    <div style={{ height: 300 }}>
      <CardWindow data={data} cardRect={cardRect} loading={loading}>
        {SampleCard}
      </CardWindow>
    </div>
  );
};

export default LoadingRow;
