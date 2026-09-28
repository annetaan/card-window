import CardWindow, { Spacing as _Spacing } from './CardWindow';

// card-window@1.10.x shipped a default export, so keep it for users who migrate from there.
export default CardWindow;
export { CardWindow };
export { range } from './CardWindow';
export type {
  CardProps,
  Rect,
  JustifyContent,
  ScrollDirection,
  OnScrollProps,
  Loading,
  LoadingCard,
  LoadingCardComponentProps,
  LoadingRow,
  LoadingRowComponentProps,
  CardWindowProps,
} from './CardWindow';
export type Spacing = Partial<_Spacing>;
