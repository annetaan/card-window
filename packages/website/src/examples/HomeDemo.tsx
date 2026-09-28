import { type CardProps, CardWindow, range } from '@annetaan/card-window';

const Tile = ({ index, style }: CardProps) => (
  <div
    style={{
      display: 'grid',
      placeItems: 'center',
      borderRadius: 8,
      background: `hsl(${(index * 37) % 360} 70% 60%)`,
      color: '#000',
      ...style,
    }}
  >
    {index}
  </div>
);

const HomeDemo = () => {
  const data = range(1000);
  const cardRect = { width: 80, height: 80 };
  return (
    <div style={{ height: 176 }}>
      <CardWindow data={data} cardRect={cardRect}>
        {Tile}
      </CardWindow>
    </div>
  );
};

export default HomeDemo;
