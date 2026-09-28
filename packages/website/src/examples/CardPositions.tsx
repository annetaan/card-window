import { CardWindow, range } from '@annetaan/card-window';

import { SampleCard, Toolbar, useSelect } from './shared';

const justifyContentList = [
  'left',
  'right',
  'start',
  'end',
  'center',
  'space-around',
  'space-between',
  'space-evenly',
  'stretch',
] as const;
const spacingList = [0, 4, 8, 20, 50] as const;

const CardPositions = () => {
  const [justifyContent, justifyContentSelect] = useSelect('justifyContent', justifyContentList, 7);
  const [x, xSelect] = useSelect('x', spacingList, 2);
  const [y, ySelect] = useSelect('y', spacingList, 2);
  const [top, topSelect] = useSelect('top', spacingList, 2);
  const [bottom, bottomSelect] = useSelect('bottom', spacingList, 2);
  const [left, leftSelect] = useSelect('left', spacingList, 2);
  const [right, rightSelect] = useSelect('right', spacingList, 2);
  const data = range(10);
  const cardRect = { width: 200, height: 120 };
  const spacing = { x, y, top, bottom, left, right };
  const props = { data, cardRect, justifyContent, spacing };
  return (
    <div>
      <Toolbar>{justifyContentSelect}</Toolbar>
      <Toolbar>
        <span>spacing:</span>
        {xSelect}
        {ySelect}
        {topSelect}
        {bottomSelect}
        {leftSelect}
        {rightSelect}
      </Toolbar>
      <div style={{ height: 400 }}>
        <CardWindow {...props}>{SampleCard}</CardWindow>
      </div>
    </div>
  );
};

export default CardPositions;
