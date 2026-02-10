import React, { useEffect, useState } from 'react';
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
  onAcknowledgeDividends: () => void;
  onEndTurn: () => void;
}

export default function TurnPanel({
  state, stocks, onRollDice, onResolveLanding, onApplyEvent, onApplyChance,
  onBuyStock, onSellStock, onSkipStock, onRollValuation, onAcknowledgeDividends, onEndTurn,
}: TurnPanelProps) {
  const player = state.players[state.currentPlayerIndex];
  if (!player) return null;

  const [traded, setTraded] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

  useEffect(() => {
    if (state.phase === 'stock_action') {
      setTraded(false);
      // default selected stock to first owned or current tile stock
      const tileStock = state.currentTile?.stockId || null;
      if (tileStock) setSelectedStockId(tileStock);
      else setSelectedStockId(player.stocks.length > 0 ? player.stocks[0].stockId : null);
    }
  }, [state.phase, state.currentTile?.stockId]);

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
      {state.phase === 'stock_action' && (() => {
        const tileStockId = state.currentTile?.stockId || null;
        // If standing on a stock tile, prefer that stock's UI
        if (tileStockId) {
          const stockDef = stocks.find(s => s.id === tileStockId);
          if (!stockDef) return null;
          const owned = player.stocks.find(s => s.stockId === stockDef.id);
          const currentPrice = Math.round(state.stockValues[tileStockId] || stockDef.price);
          const canBuy = player.cash >= currentPrice;

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
                Price: <span className="font-bold text-gold">${currentPrice}</span>
                {owned && (
                  <span className="ml-2 text-muted-foreground">
                    (Own {owned.shares} share{owned.shares > 1 ? 's' : ''})
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { onBuyStock(stockDef.id); setTraded(true); }}
                  disabled={!canBuy}
                  className={`flex-1 py-3 font-bold rounded-lg active:scale-[0.98] transition-transform ${
                    canBuy
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  Buy ${currentPrice}
                </button>
                {owned && (
                  <button
                    onClick={() => { onSellStock(stockDef.id); setTraded(true); }}
                    className="flex-1 py-3 bg-destructive text-destructive-foreground font-bold rounded-lg active:scale-[0.98]"
                  >
                    Sell ${Math.round(currentPrice * 0.9)}
                  </button>
                )}
                <button
                  onClick={onSkipStock}
                  className="flex-1 py-3 bg-muted text-muted-foreground font-bold rounded-lg active:scale-[0.98]"
                >
                  {traded ? 'Continue' : 'Skip'}
                </button>
              </div>
            </div>
          );
        }

        // If not on a stock tile, allow selling owned stocks by selecting one.
        if (player.stocks.length === 0) {
          return (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">No stocks to sell.</p>
              <button
                onClick={onSkipStock}
                className="w-full py-3 bg-muted text-muted-foreground font-bold rounded-lg active:scale-[0.98]"
              >
                Skip
              </button>
            </div>
          );
        }

        return (
          <div>
            <div className="text-center mb-3">
              <h3 className="font-display text-lg font-bold">Sell a Stock</h3>
              <p className="text-xs text-muted-foreground">You may sell one of your existing stocks.</p>
            </div>

            <div className="mb-3">
              <select
                value={selectedStockId ?? ''}
                onChange={e => setSelectedStockId(e.target.value)}
                className="w-full p-2 border rounded"
              >
                {player.stocks.map(s => {
                  const def = stocks.find(sd => sd.id === s.stockId)!;
                  const currentValue = Math.round(state.stockValues[s.stockId] || 0);
                  return (
                    <option key={s.stockId} value={s.stockId}>
                      {def.name} (Own {s.shares}) - ${currentValue}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                // Buy is disabled when not standing on a stock tile
                disabled
                className={`flex-1 py-3 font-bold rounded-lg active:scale-[0.98] transition-transform bg-muted text-muted-foreground cursor-not-allowed`}
              >
                Buy
              </button>

              <button
                onClick={() => {
                  if (selectedStockId) {
                    onSellStock(selectedStockId);
                    setTraded(true);
                  }
                }}
                className="flex-1 py-3 bg-destructive text-destructive-foreground font-bold rounded-lg active:scale-[0.98]"
              >
                Sell ${Math.round((Math.round(state.stockValues[selectedStockId] || 0)) * 0.9)}
              </button>

              <button
                onClick={onSkipStock}
                className="flex-1 py-3 bg-muted text-muted-foreground font-bold rounded-lg active:scale-[0.98]"
              >
                {traded ? 'Continue' : 'Skip'}
              </button>
            </div>
          </div>
        );
      })()}

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
                  {r.totalChange >= 0 ? '+' : ''}{Math.round(r.totalChange)}%
                  <span className="text-muted-foreground font-normal ml-1">
                    ${Math.round(r.oldValue)}→${Math.round(r.newValue)}
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

      {/* Dividend display */}
      {state.phase === 'dividend_display' && (
        <div>
          <div className="text-center mb-3">
            <span className="text-3xl">💰</span>
            <h3 className="font-display text-lg font-bold text-gold">Dividend Distribution</h3>
            <p className="text-xs text-muted-foreground">Companies paying gains to shareholders with strategic interests</p>
          </div>
          
          {state.dividendResults.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground">No dividends to distribute.</p>
          ) : (
            <div className="space-y-3">
              {state.dividendResults.map(dividend => (
                <div key={dividend.stockId} className="border border-border rounded-lg p-3 bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`badge-${dividend.category} px-2 py-0.5 rounded text-xs font-bold`}>
                      {dividend.category.toUpperCase()}
                    </span>
                    <span className="font-bold text-emerald-gain">
                      +${dividend.valueChange}/share
                    </span>
                  </div>
                  <h4 className="font-bold text-sm mb-2">{dividend.stockName}</h4>
                  <div className="space-y-1">
                    {dividend.recipients.map(recipient => (
                      <div key={recipient.playerId} className="text-sm flex items-center justify-between">
                        <span className="text-foreground">{recipient.playerName}</span>
                        <span className="font-bold text-emerald-gain">
                          +${recipient.dividendAmount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={onAcknowledgeDividends}
            className="w-full mt-3 py-3 bg-primary text-primary-foreground font-bold rounded-lg active:scale-[0.98]"
          >
            Acknowledge Dividends
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
