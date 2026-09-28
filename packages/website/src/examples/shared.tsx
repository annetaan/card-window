import { type CSSProperties, type ReactElement, type ReactNode, useState } from 'react';

import type { CardProps } from '@annetaan/card-window';

// Starlight CSS variables, so the cards follow the light and dark theme of the site.
const cardLook: CSSProperties = {
  boxSizing: 'border-box',
  padding: 8,
  border: '1px solid var(--sl-color-gray-5)',
  borderRadius: 8,
  background: 'var(--sl-color-gray-6)',
  overflow: 'hidden',
};

/** A card that shows its index, row and column. Pass `style` on to the root element. */
export const SampleCard = ({ index, style, row, col }: CardProps) => (
  <div style={{ ...cardLook, ...style }}>
    <strong>{index}</strong>
    <div>
      row: {row}, col: {col}
    </div>
  </div>
);

/** A placeholder for a card or a row that is still loading. */
export const LoadingCard = ({ style }: { style: CSSProperties }) => (
  <div style={{ ...cardLook, ...style }}>Loading…</div>
);

/** A row of controls above an example. */
export const Toolbar = ({ children }: { children: ReactNode }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
    {children}
  </div>
);

/** Returns the selected option and a labelled `<select>` that changes it. */
export const useSelect = <T extends string | number>(
  label: string,
  options: readonly T[],
  initialIndex = 0,
): [T, ReactElement] => {
  const [index, setIndex] = useState(initialIndex);
  const element = (
    <label>
      {label}{' '}
      <select value={index} onChange={(e) => setIndex(Number(e.target.value))}>
        {options.map((o, i) => (
          <option key={String(o)} value={i}>
            {String(o)}
          </option>
        ))}
      </select>
    </label>
  );
  return [options[index], element];
};
