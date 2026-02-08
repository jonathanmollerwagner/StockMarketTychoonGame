import type { GameState, StockDefinition } from '@/types/game';

interface TurnPanelProps {
  state: GameState;
  stocks: StockDefinition[];
  onRollDice: () => void;
  onResolveLanding: () => void;
  onApplyEvent: () => void;
  onApplyChance: () => void;
  onBuyStock: (stockId: string) => void;
  onSellStock: (stockId: string) => void;
  onSkipStock: () => void;
  onRollValuation: () => void;
  onEndTurn: () => void;
}

export default function TurnPanel({
  state, stocks, onRollDice, onResolveLanding, onApplyEvent, onApplyChance,
  onBuyStock, onSellStock, onSkipStock, onRollValuation, onEndTurn,
}: TurnPanelProps) {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return null;

  return (
    <div className="bg-card rounded-lg border border-border p-4 animate-fade-in-up">
      {/* Rolling phase */}
      {state.phase === 'rolling' && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            <span className="font-bold text-foreground">{player.name}</span>'s turn
          </p>
          <button
            onClick={onRollDice}
            className="w-full py-4 bg-primary text-primary-foreground font-display text-xl font-bold rounded-lg glow-gold hover:scale-[1.02] transition-transform active:scale-[0.98]"
          >
            🎲 Roll Dice
          </button>
        </div>
      )}

      {/* Landed phase */}
      {state.phase === 'landed' && state.lastDiceRoll !== null && (
        <div className="text-center">
          <div className="text-5xl font-display font-bold text-gold mb-2 animate-dice-roll">
            {state.lastDiceRoll}
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Landed on a <span className="font-bold text-foreground capitalize">{state.currentTile?.type}</span> tile
          </p>
          <button
            onClick={onResolveLanding}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:scale-[1.02] transition-transform active:scale-[0.98]"
          >
            Continue
          </button>
        </div>
      )}

      {/* Event display */}
      {state.phase === 'event_display' && state.currentEvent && (
        <div>
          <div className="text-center mb-3">
            <span className="text-2xl">📰</span>
            <h3 className="font-display text-lg font-bold text-gold">{state.currentEvent.title}</h3>
          </div>
          <p className="text-sm text-center text-foreground/80 mb-3">{state.currentEvent.description}</p>
          <div className={`text-center text-sm font-bold mb-3 ${state.currentEvent.impact.modifier > 0 ? 'text-emerald-gain' : 'text-crimson-loss'}`}>
            {state.currentEvent.impact.category === 'all' ? 'All stocks' : state.currentEvent.impact.category}:{' '}
            {state.currentEvent.impact.modifier > 0 ? '+' : ''}{state.currentEvent.impact.modifier}%
          </div>
          <button onClick={onApplyEvent} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg active:scale-[0.98]">
            Apply Event
          </button>
        </div>
      )}

      {/* Chance display */}
      {state.phase === 'chance_display' && state.currentChance && (
        <div>
          <div className="text-center mb-3">
            <span className="text-2xl">🎲</span>
            <h3 className="font-display text-lg font-bold text-gold">{state.currentChance.title}</h3>
          </div>
          <p className="text-sm text-center text-foreground/80 mb-3">{state.currentChance.description}</p>
          <button onClick={onApplyChance} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg active:scale-[0.98]">
            Accept Fate
          </button>
        </div>
      )}

      {/* Stock action */}
      {state.phase === 'stock_action' && state.currentTile?.stockId && (() => {
        const stockDef = stocks.find(s => s.id === state.currentTile!.stockId);
        if (!stockDef) return null;
        const owned = player.stocks.find(s => s.stockId === stockDef.id);
        const canBuy = player.cash >= stockDef.price;

        return (
          <div>
            <div className="text-center mb-3">
              <span className={`badge-${stockDef.category} px-2 py-0.5 rounded text-xs inline-block mb-1`}>
                {stockDef.category.toUpperCase()}
              </span>
              <h3 className="font-display text-lg font-bold">{stockDef.name}</h3>
              <p className="text-xs text-muted-foreground">{stockDef.description}</p>
            </div>
            <div className="text-center text-sm mb-3">
              Price: <span className="font-bold text-gold">${stockDef.price}</span>
              {owned && (
                <span className="ml-2 text-muted-foreground">
                  (Own {owned.shares} share{owned.shares > 1 ? 's' : ''})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onBuyStock(stockDef.id)}
                disabled={!canBuy}
                className={`flex-1 py-3 font-bold rounded-lg active:scale-[0.98] transition-transform ${
                  canBuy
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Buy ${stockDef.price}
              </button>
              {owned && (
                <button
                  onClick={() => onSellStock(stockDef.id)}
                  className="flex-1 py-3 bg-destructive text-destructive-foreground font-bold rounded-lg active:scale-[0.98]"
                >
                  Sell 1 Share
                </button>
              )}
              <button
                onClick={onSkipStock}
                className="flex-1 py-3 bg-muted text-muted-foreground font-bold rounded-lg active:scale-[0.98]"
              >
                Skip
              </button>
            </div>
          </div>
        );
      })()}

      {/* Stock valuation */}
      {state.phase === 'stock_valuation' && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Time to roll for stock valuation!</p>
          <button
            onClick={onRollValuation}
            className="w-full py-4 bg-primary text-primary-foreground font-display text-xl font-bold rounded-lg glow-gold hover:scale-[1.02] transition-transform active:scale-[0.98]"
          >
            🎯 Roll D20 for Stocks
          </button>
        </div>
      )}

      {/* Valuation results */}
      {state.phase === 'valuation_results' && (
        <div>
          <h3 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 text-center">
            Stock Valuation Results
          </h3>
          {state.stockRollResults.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground">No stocks to evaluate.</p>
          ) : (
            state.stockRollResults.map(r => (
              <div key={r.stockId} className="flex items-center justify-between py-1.5 text-sm border-b border-border/30 last:border-0">
                <div>
                  <span className="font-medium">{r.stockName}</span>
                  <span className="text-muted-foreground ml-1">(🎲{r.roll})</span>
                </div>
                <div className={`font-bold ${r.totalChange >= 0 ? 'text-emerald-gain' : 'text-crimson-loss'}`}>
                  {r.totalChange >= 0 ? '+' : ''}{r.totalChange.toFixed(1)}%
                  <span className="text-muted-foreground font-normal ml-1">
                    ${r.oldValue}→${r.newValue}
                  </span>
                </div>
              </div>
            ))
          )}
          <button
            onClick={onEndTurn}
            className="w-full mt-3 py-3 bg-primary text-primary-foreground font-bold rounded-lg active:scale-[0.98]"
          >
            End Turn
          </button>
        </div>
      )}

      {/* Turn end (shouldn't stay here long) */}
      {state.phase === 'turn_end' && (
        <div className="text-center">
          <button
            onClick={onEndTurn}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg active:scale-[0.98]"
          >
            Next Player
          </button>
        </div>
      )}
    </div>
  );
}
