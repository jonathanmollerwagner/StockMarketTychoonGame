import type { BoardTile, Player, StockDefinition } from '@/types/game';

interface GameBoardProps {
  tiles: BoardTile[];
  players: Player[];
  stocks: StockDefinition[];
  currentPlayerIndex: number;
}

const SIDE = 8; // tiles per side
const TOTAL = SIDE * 4; // 32 tiles

function getTilePosition(index: number, boardSize: number): { row: number; col: number } {
  // Square board: top (0-7), right (8-15), bottom (16-23), left (24-31)
  if (index < SIDE) return { row: 0, col: index }; // top, left to right
  if (index < SIDE * 2) return { row: index - SIDE, col: SIDE - 1 }; // right, top to bottom
  if (index < SIDE * 3) return { row: SIDE - 1, col: SIDE - 1 - (index - SIDE * 2) }; // bottom, right to left
  return { row: SIDE - 1 - (index - SIDE * 3), col: 0 }; // left, bottom to top
}

function getTileLabel(tile: BoardTile, stocks: StockDefinition[]): { label: string; icon: string; category?: string } {
  if (tile.type === 'event') return { label: 'EVENT', icon: '📰' };
  if (tile.type === 'chance') return { label: 'CHANCE', icon: '🎲' };
  if (tile.type === 'blank') return { label: '', icon: '—' };
  if (tile.type === 'stock' && tile.stockId) {
    const stock = stocks.find(s => s.id === tile.stockId);
    if (stock) return { label: stock.name, icon: getCategoryIcon(stock.category), category: stock.category };
  }
  return { label: '?', icon: '?' };
}

function getCategoryIcon(cat: string): string {
  switch (cat) {
    case 'energy': return '⚡';
    case 'industry': return '🏭';
    case 'tech': return '💻';
    case 'consumption': return '🛒';
    default: return '📊';
  }
}

function getTileBgClass(tile: BoardTile, stocks: StockDefinition[]): string {
  if (tile.type === 'event') return 'bg-[hsl(var(--tile-event))]';
  if (tile.type === 'chance') return 'bg-[hsl(var(--tile-chance))]';
  if (tile.type === 'blank') return 'bg-[hsl(var(--tile-blank))]';
  if (tile.type === 'stock' && tile.stockId) {
    const stock = stocks.find(s => s.id === tile.stockId);
    if (stock) {
      switch (stock.category) {
        case 'energy': return 'bg-[hsl(var(--tile-stock-energy))]';
        case 'industry': return 'bg-[hsl(var(--tile-stock-industry))]';
        case 'tech': return 'bg-[hsl(var(--tile-stock-tech))]';
        case 'consumption': return 'bg-[hsl(var(--tile-stock-consumption))]';
      }
    }
  }
  return 'bg-muted';
}

export default function GameBoard({ tiles, players, stocks, currentPlayerIndex }: GameBoardProps) {
  // Build a grid
  const grid: (number | null)[][] = Array.from({ length: SIDE }, () => Array(SIDE).fill(null));
  tiles.forEach((_, i) => {
    const { row, col } = getTilePosition(i, TOTAL);
    grid[row][col] = i;
  });

  return (
    <div className="w-full aspect-square max-w-[600px] mx-auto">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SIDE}, 1fr)`, gridTemplateRows: `repeat(${SIDE}, 1fr)` }}>
        {grid.flat().map((tileIdx, flatIdx) => {
          if (tileIdx === null) {
            // Center area - empty
            return <div key={`empty-${flatIdx}`} className="aspect-square" />;
          }
          const tile = tiles[tileIdx];
          const { label, icon } = getTileLabel(tile, stocks);
          const bgClass = getTileBgClass(tile, stocks);
          const playersHere = players.filter(p => p.position === tileIdx);

          return (
            <div
              key={tileIdx}
              className={`aspect-square ${bgClass} rounded-sm border border-border/50 flex flex-col items-center justify-center relative p-0.5 transition-all ${
                players[currentPlayerIndex]?.position === tileIdx ? 'ring-2 ring-primary animate-pulse-glow' : ''
              }`}
            >
              <span className="text-sm leading-none">{icon}</span>
              <span className="text-[7px] leading-tight text-center font-semibold text-foreground/80 line-clamp-2 mt-0.5">
                {label}
              </span>
              {/* Player tokens */}
              {playersHere.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-px pb-0.5">
                  {playersHere.map(p => (
                    <div
                      key={p.id}
                      className="w-2.5 h-2.5 rounded-full border border-foreground/30"
                      style={{ backgroundColor: p.color }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
