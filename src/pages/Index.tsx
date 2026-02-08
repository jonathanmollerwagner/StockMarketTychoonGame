import { useGameState } from '@/hooks/useGameState';
import PlayerSetup from '@/components/game/PlayerSetup';
import GameBoard from '@/components/game/GameBoard';
import GameHUD from '@/components/game/GameHUD';
import TurnPanel from '@/components/game/TurnPanel';
import GameOver from '@/components/game/GameOver';

const Index = () => {
  const {
    state, currentPlayer, stocks, board,
    startGame, rollMovementDice, resolveLanding,
    applyEvent, applyChance, buyStock, sellStock,
    skipStockAction, rollStockValuation, endTurn,
    getPlayerNetWorth,
  } = useGameState();

  if (state.phase === 'setup') {
    return <PlayerSetup onStartGame={startGame} />;
  }

  if (state.phase === 'game_over') {
    return (
      <GameOver
        players={state.players}
        getPlayerNetWorth={getPlayerNetWorth}
        onRestart={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row gap-3 p-3 overflow-auto">
      {/* Left: HUD */}
      <div className="lg:w-64 flex-shrink-0 order-2 lg:order-1">
        <GameHUD
          year={state.year}
          currentPlayer={currentPlayer!}
          players={state.players}
          getPlayerNetWorth={getPlayerNetWorth}
          stocks={stocks}
        />
      </div>

      {/* Center: Board */}
      <div className="flex-1 flex flex-col items-center justify-center order-1 lg:order-2">
        <GameBoard
          tiles={board}
          players={state.players}
          stocks={stocks}
          currentPlayerIndex={state.currentPlayerIndex}
        />
      </div>

      {/* Right: Turn Panel */}
      <div className="lg:w-72 flex-shrink-0 order-3">
        <TurnPanel
          state={state}
          stocks={stocks}
          onRollDice={rollMovementDice}
          onResolveLanding={resolveLanding}
          onApplyEvent={applyEvent}
          onApplyChance={applyChance}
          onBuyStock={buyStock}
          onSellStock={sellStock}
          onSkipStock={skipStockAction}
          onRollValuation={rollStockValuation}
          onEndTurn={endTurn}
        />

        {/* Game log */}
        <div className="bg-card rounded-lg border border-border p-3 mt-3 max-h-40 overflow-y-auto">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Ticker</h3>
          {state.gameLog.slice(0, 15).map((log, i) => (
            <p key={i} className={`text-xs py-0.5 ${i === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {log}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
