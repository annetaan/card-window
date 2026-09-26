import DefaultCardWindow, { CardWindow } from '.';

test('exports CardWindow as both default and named export', () => {
  expect(DefaultCardWindow).toBe(CardWindow);
});
