import type { Player, StockDefinition } from '@/types/game';

interface GameHUDProps {
  year: number;
  currentPlayer: Player;
  players: Player[];
  getPlayerNetWorth: (player: Player) => number;
  stocks: StockDefinition[];
  stockValues: { [stockId: string]: number };
  onRequestStockAction: (stockId?: string) => void;
  selectedPlayerId: number | null;
  onSelectPlayer: (playerId: number) => void;
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

export default function GameHUD({ year, currentPlayer, players, getPlayerNetWorth, stocks, stockValues, onRequestStockAction, selectedPlayerId, onSelectPlayer }: GameHUDProps) {
  // Get the selected player or default to current player
  const displayPlayer = players.find(p => p.id === selectedPlayerId) || currentPlayer;
  return (
    <div className="flex flex-col gap-3">
      {/* Year display */}
      <div className="text-center">
        <div className="font-display text-3xl font-bold text-gold">{year}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-widest">Current Year</div>
      </div>

      {/* Scoreboard */}
      <div className="bg-card rounded-lg border border-border p-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Scoreboard</h3>
        {players
          .map(p => ({ ...p, netWorth: getPlayerNetWorth(p) }))
          .sort((a, b) => b.netWorth - a.netWorth)
          .map(p => (
            <div
              key={p.id}
              onClick={() => onSelectPlayer(p.id)}
              className={`flex items-center justify-between py-1.5 px-2 rounded mb-1 text-sm cursor-pointer transition-colors ${
                p.id === currentPlayer.id 
                  ? 'bg-primary/10 border border-primary/30 hover:bg-primary/20' 
                  : 'hover:bg-muted/50'
              } ${selectedPlayerId === p.id ? 'ring-2 ring-gold' : ''}`}
            >
              <div className="flex items-center gap-2">
                {p.id === currentPlayer.id && <span className="text-gold text-lg">◆</span>}
                <span className="text-lg leading-none block">{p.emoji}</span>
                <span className="font-semibold">{p.name}</span>
                <span className="text-xs">{p.nationality.flag}</span>
              </div>
              <span className="font-bold text-gold">${Math.round(p.netWorth).toLocaleString()}</span>
            </div>
          ))}
      </div>

      {/* Selected player portfolio */}
      <div className="bg-card rounded-lg border border-border p-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          {displayPlayer.name}'s Portfolio
        </h3>
        <div className="text-sm mb-2">
          💰 Cash: <span className="font-bold text-gold">${Math.round(displayPlayer.cash).toLocaleString()}</span>
        </div>
        {displayPlayer.stocks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No stocks owned yet</p>
        ) : (
          displayPlayer.stocks.map(ps => {
            const stockDef = stocks.find(s => s.id === ps.stockId);
            if (!stockDef) return null;
            const currentValue = Math.round(stockValues[ps.stockId] || 0);
            const totalValue = Math.round(currentValue * ps.shares);
            const gainLoss = Math.round(totalValue - ps.totalInvested);

            return (
              <div key={ps.stockId} className="flex items-center justify-between py-1 text-xs">
                <div className="flex items-center gap-1">
                  <span className={`badge-${stockDef.category} px-1.5 py-0.5 rounded text-[16px]`}>
                    {getCategoryIcon(stockDef.category)}
                  </span>
                  <span className="font-medium">{stockDef.name}</span>
                  <span className="text-muted-foreground">×{ps.shares}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold">${Math.round(totalValue).toLocaleString()}</span>
                  <span className={`ml-1 ${gainLoss >= 0 ? 'text-emerald-gain' : 'text-crimson-loss'}`}>
                    {gainLoss >= 0 ? '+' : ''}{gainLoss}
                  </span>
                  {displayPlayer.id === currentPlayer.id && (
                    <button
                      onClick={() => onRequestStockAction(ps.stockId)}
                      className="ml-2 py-2 px-2 bg-destructive text-destructive-foreground font-bold rounded-lg active:scale-[0.98]"
                    >
                      Sell
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
