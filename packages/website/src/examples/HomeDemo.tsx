import { type CardProps, CardWindow, range } from '@annetaan/card-window';

const Tile = ({ index, style }: CardProps) => (
  <div
    style={{
      display: 'grid',
      placeItems: 'center',
      borderRadius: 12,
      background: '#fff',
      boxShadow: '0 4px 16px rgb(0 0 0 / 0.15)',
      color: '#555',
      fontSize: '1.25rem',
      fontWeight: 600,
      ...style,
    }}
  >
    {index}
  </div>
);

const HomeDemo = () => {
  const data = range(1000);
  const cardRect = { width: 240, height: 150 };
  const spacing = { x: 20, y: 20, top: 20, bottom: 20, left: 20, right: 20 };
  const root = { style: { borderRadius: 12 } };
  const container = { style: { background: 'linear-gradient(170deg, #f13f79, #2196f3)' } };
  return (
    <div style={{ height: '40dvh' }}>
      <CardWindow
        data={data}
        cardRect={cardRect}
        spacing={spacing}
        justifyContent="center"
        root={root}
        container={container}
      >
        {Tile}
      </CardWindow>
    </div>
  );
};

export default HomeDemo;
