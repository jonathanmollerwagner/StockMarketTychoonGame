import { useState } from 'react';
import type { Nationality } from '@/types/game';
import nationalitiesData from '@/data/nationalities.json';

const nationalities = nationalitiesData as Nationality[];

interface PlayerSetupProps {
  onStartGame: (players: { name: string; emoji: string; nationality: Nationality }[]) => void;
}

export default function PlayerSetup({ onStartGame }: PlayerSetupProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState<{ name: string; emoji: string; nationalityId: string }[]>([
    { name: 'Player 1', emoji: '👤', nationalityId: 'usa' },
    { name: 'Player 2', emoji: '🚀', nationalityId: 'norway' },
    { name: 'Player 3', emoji: '👽', nationalityId: 'japan' },
    { name: 'Player 4', emoji: '⭐', nationalityId: 'uk' },
  ]);

  const handleStart = () => {
    const configs = players.slice(0, playerCount).map(p => ({
      name: p.name,
      emoji: p.emoji,
      nationality: nationalities.find(n => n.id === p.nationalityId)!,
    }));
    onStartGame(configs);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl font-bold text-gold mb-2">
            STOCK EXCHANGE
          </h1>
          <p className="text-xl text-muted-foreground font-body tracking-wide">
            The Board Game of Global Markets • 1950–2026
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <label className="block text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Number of Players
          </label>
          <div className="flex gap-3 mb-6">
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                className={`flex-1 py-3 rounded-lg text-lg font-bold transition-all ${
                  playerCount === n
                    ? 'bg-primary text-primary-foreground glow-gold'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {players.slice(0, playerCount).map((player, idx) => (
            <div key={idx} className="mb-4 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg leading-none block">{player.emoji}</span>
                <input
                  type="text"
                  value={player.name}
                  onChange={e => {
                    const updated = [...players];
                    updated[idx] = { ...updated[idx], name: e.target.value };
                    setPlayers(updated);
                  }}
                  className="flex-1 bg-card border border-border rounded px-3 py-2 text-foreground font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {nationalities.map(nat => {
                  const selected = player.nationalityId === nat.id;
                  return (
                    <button
                      key={nat.id}
                      onClick={() => {
                        const updated = [...players];
                        updated[idx] = { ...updated[idx], nationalityId: nat.id };
                        setPlayers(updated);
                      }}
                      className={`p-2 rounded text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                        selected
                          ? 'bg-primary/20 border-2 border-primary text-foreground'
                          : 'bg-card border border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <span className="text-xl">{nat.flag}</span>
                      <span className="text-xs">{nat.name}</span>
                    </button>
                  );
                })}
              </div>

              {(() => {
                const nat = nationalities.find(n => n.id === player.nationalityId);
                if (!nat) return null;
                return (
                  <p className="text-xs text-muted-foreground mt-2">
                    {nat.description}
                  </p>
                );
              })()}
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          className="w-full py-4 bg-primary text-primary-foreground font-display text-xl font-bold rounded-lg glow-gold hover:scale-[1.02] transition-transform active:scale-[0.98]"
        >
          Start Trading
        </button>
      </div>
    </div>
  );
}
