import type { Player } from '@/types/game';

interface GameOverProps {
  players: Player[];
  getPlayerNetWorth: (player: Player) => number;
  onRestart: () => void;
}

export default function GameOver({ players, getPlayerNetWorth, onRestart }: GameOverProps) {
  const ranked = players
    .map(p => ({ ...p, netWorth: getPlayerNetWorth(p) }))
    .sort((a, b) => b.netWorth - a.netWorth);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg text-center animate-fade-in-up">
        <h1 className="font-display text-4xl font-bold text-gold mb-2">Game Over!</h1>
        <p className="text-muted-foreground mb-6">Year 2026 — Final Standings</p>

        {ranked.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center justify-between p-4 mb-2 rounded-lg border ${
              i === 0 ? 'bg-primary/10 border-primary glow-gold' : 'bg-card border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl font-bold text-gold">#{i + 1}</span>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
              <div className="text-left">
                <div className="font-bold">{p.name} {p.nationality.flag}</div>
                <div className="text-xs text-muted-foreground">
                  Cash: ${p.cash.toLocaleString()} • Stocks: {p.stocks.length}
                </div>
              </div>
            </div>
            <span className="font-display text-xl font-bold text-gold">
              ${p.netWorth.toLocaleString()}
            </span>
          </div>
        ))}

        <button
          onClick={onRestart}
          className="mt-6 w-full py-4 bg-primary text-primary-foreground font-display text-xl font-bold rounded-lg glow-gold hover:scale-[1.02] transition-transform active:scale-[0.98]"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
