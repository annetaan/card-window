import { expect, test } from 'vitest';

import DefaultCardWindow, { CardWindow } from '.';

test('exports CardWindow as both default and named export', () => {
  expect(DefaultCardWindow).toBe(CardWindow);
});

test('exports only default, CardWindow and range', async () => {
  expect(Object.keys(await import('.')).sort()).toEqual(['CardWindow', 'default', 'range']);
});
