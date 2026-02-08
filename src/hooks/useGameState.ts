import { useState, useCallback } from 'react';
import type { GameState, Player, Nationality, StockDefinition, EventCard, ChanceCard, BoardTile, GamePhase, StockRollResult, PlayerStock, StockCategory } from '@/types/game';
import stocksData from '@/data/stocks.json';
import eventsData from '@/data/events.json';
import chancesData from '@/data/chances.json';
import boardData from '@/data/boardLayout.json';

const stocks = stocksData as StockDefinition[];
const events = eventsData as EventCard[];
const chances = chancesData as ChanceCard[];
const board = boardData as BoardTile[];

const STARTING_CASH = 2000;
const START_YEAR = 1950;
const END_YEAR = 2026;

const PLAYER_COLORS = [
  'hsl(var(--player-1))',
  'hsl(var(--player-2))',
  'hsl(var(--player-3))',
  'hsl(var(--player-4))',
];

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function getStockById(id: string): StockDefinition | undefined {
  return stocks.find(s => s.id === id);
}

export function useGameState() {
  const [state, setState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    year: START_YEAR,
    phase: 'setup',
    lastDiceRoll: null,
    currentEvent: null,
    currentChance: null,
    currentTile: null,
    stockRollResults: [],
    gameLog: [],
  });

  const addLog = useCallback((msg: string) => {
    setState(prev => ({ ...prev, gameLog: [msg, ...prev.gameLog].slice(0, 50) }));
  }, []);

  const startGame = useCallback((playerConfigs: { name: string; nationality: Nationality }[]) => {
    const players: Player[] = playerConfigs.map((cfg, i) => ({
      id: i,
      name: cfg.name,
      nationality: cfg.nationality,
      cash: STARTING_CASH,
      position: 0,
      stocks: [],
      color: PLAYER_COLORS[i],
    }));
    setState({
      players,
      currentPlayerIndex: 0,
      year: START_YEAR,
      phase: 'rolling',
      lastDiceRoll: null,
      currentEvent: null,
      currentChance: null,
      currentTile: null,
      stockRollResults: [],
      gameLog: [`Game started! Year ${START_YEAR}. ${players[0].name}'s turn.`],
    });
  }, []);

  const rollMovementDice = useCallback(() => {
    const roll = rollDie(6);
    setState(prev => {
      const player = prev.players[prev.currentPlayerIndex];
      const newPos = (player.position + roll) % board.length;
      const tile = board[newPos];
      const updatedPlayers = prev.players.map((p, i) =>
        i === prev.currentPlayerIndex ? { ...p, position: newPos } : p
      );

      let nextPhase: GamePhase = 'landed';
      const hasStocks = player.stocks.length > 0;
      if (tile.type === 'blank') nextPhase = hasStocks ? 'stock_valuation' : 'turn_end';

      return {
        ...prev,
        players: updatedPlayers,
        lastDiceRoll: roll,
        currentTile: tile,
        phase: nextPhase,
        gameLog: [`${player.name} rolled a ${roll} and moved to tile ${newPos + 1}.`, ...prev.gameLog].slice(0, 50),
      };
    });
  }, []);

  const resolveLanding = useCallback(() => {
    setState(prev => {
      const tile = prev.currentTile;
      if (!tile) return prev;

      const hasStocks = prev.players[prev.currentPlayerIndex].stocks.length > 0;

      if (tile.type === 'event') {
        const event = events[Math.floor(Math.random() * events.length)];
        return { ...prev, currentEvent: event, phase: 'event_display' };
      }
      if (tile.type === 'chance') {
        const chance = chances[Math.floor(Math.random() * chances.length)];
        return { ...prev, currentChance: chance, phase: 'chance_display' };
      }
      if (tile.type === 'stock') {
        return { ...prev, phase: 'stock_action' };
      }
      return { ...prev, phase: hasStocks ? 'stock_valuation' : 'turn_end' };
    });
  }, []);

  const applyEvent = useCallback(() => {
    setState(prev => {
      const event = prev.currentEvent;
      if (!event) return prev;

      const updatedPlayers = prev.players.map(player => {
        const updatedStocks = player.stocks.map(ps => {
          const stockDef = getStockById(ps.stockId);
          if (!stockDef) return ps;

          const affected = event.impact.category === 'all' || event.impact.category === stockDef.category;
          if (!affected) return ps;

          let modifier = event.impact.modifier;
          // Check weakness
          const weakness = player.nationality.weakness;
          if (event.tags.some(t => t === weakness.eventTag) && stockDef.category === weakness.category) {
            modifier -= weakness.extraPenalty;
          }

          const change = ps.currentValue * (modifier / 100);
          const newValue = Math.max(1, ps.currentValue + change);
          return { ...ps, currentValue: Math.round(newValue) };
        });
        return { ...player, stocks: updatedStocks };
      });

      const hasStocks = prev.players[prev.currentPlayerIndex].stocks.length > 0;
      return {
        ...prev,
        players: updatedPlayers,
        phase: hasStocks ? 'stock_valuation' : 'turn_end',
        gameLog: [`EVENT: ${event.title} - ${event.description}`, ...prev.gameLog].slice(0, 50),
      };
    });
  }, []);

  const applyChance = useCallback(() => {
    setState(prev => {
      const chance = prev.currentChance;
      if (!chance) return prev;
      const idx = prev.currentPlayerIndex;
      const player = { ...prev.players[idx] };
      const log: string[] = [`CHANCE: ${chance.title} - ${chance.description}`];

      switch (chance.effect) {
        case 'gain_cash':
          player.cash += chance.value;
          log.push(`${player.name} gained $${chance.value}.`);
          break;
        case 'lose_cash':
          if (player.cash < chance.value && player.stocks.length > 0) {
            // Force sell cheapest stock
            const cheapest = [...player.stocks].sort((a, b) => a.currentValue - b.currentValue)[0];
            const sellValue = Math.min(cheapest.currentValue, cheapest.totalInvested / cheapest.shares);
            player.cash += sellValue;
            player.stocks = player.stocks.filter(s => s.stockId !== cheapest.stockId || s.shares > 1);
            if (player.stocks.find(s => s.stockId === cheapest.stockId)) {
              player.stocks = player.stocks.map(s => s.stockId === cheapest.stockId ? { ...s, shares: s.shares - 1 } : s);
            }
            log.push(`${player.name} had to sell stock to cover the fine.`);
          }
          player.cash = Math.max(0, player.cash - chance.value);
          log.push(`${player.name} lost $${chance.value}.`);
          break;
        case 'boost_random_stock':
          if (player.stocks.length > 0) {
            const ri = Math.floor(Math.random() * player.stocks.length);
            player.stocks = player.stocks.map((s, i) =>
              i === ri ? { ...s, currentValue: Math.round(s.currentValue * (1 + chance.value / 100)) } : s
            );
          }
          break;
        case 'hurt_random_stock':
          if (player.stocks.length > 0) {
            const ri = Math.floor(Math.random() * player.stocks.length);
            player.stocks = player.stocks.map((s, i) =>
              i === ri ? { ...s, currentValue: Math.max(1, Math.round(s.currentValue * (1 - chance.value / 100))) } : s
            );
          }
          break;
        case 'boost_all_stocks':
          player.stocks = player.stocks.map(s => ({
            ...s,
            currentValue: Math.round(s.currentValue * (1 + chance.value / 100)),
          }));
          break;
        case 'hurt_all_stocks':
          player.stocks = player.stocks.map(s => ({
            ...s,
            currentValue: Math.max(1, Math.round(s.currentValue * (1 - chance.value / 100))),
          }));
          break;
      }

      const updatedPlayers = prev.players.map((p, i) => i === idx ? player : p);
      const hasStocks = prev.players[prev.currentPlayerIndex].stocks.length > 0;
      return {
        ...prev,
        players: updatedPlayers,
        phase: hasStocks ? 'stock_valuation' : 'turn_end',
        gameLog: [...log, ...prev.gameLog].slice(0, 50),
      };
    });
  }, []);

  const buyStock = useCallback((stockId: string) => {
    setState(prev => {
      const stockDef = getStockById(stockId);
      if (!stockDef) return prev;
      const idx = prev.currentPlayerIndex;
      const player = { ...prev.players[idx] };
      if (player.cash < stockDef.price) return prev;

      player.cash -= stockDef.price;
      const existing = player.stocks.find(s => s.stockId === stockId);
      if (existing) {
        player.stocks = player.stocks.map(s =>
          s.stockId === stockId
            ? { ...s, shares: s.shares + 1, totalInvested: s.totalInvested + stockDef.price }
            : s
        );
      } else {
        player.stocks = [...player.stocks, {
          stockId,
          shares: 1,
          totalInvested: stockDef.price,
          currentValue: stockDef.price,
        }];
      }

      const updatedPlayers = prev.players.map((p, i) => i === idx ? player : p);
      return {
        ...prev,
        players: updatedPlayers,
        gameLog: [`${player.name} bought ${stockDef.name} for $${stockDef.price}.`, ...prev.gameLog].slice(0, 50),
      };
    });
  }, []);

  const sellStock = useCallback((stockId: string) => {
    setState(prev => {
      const stockDef = getStockById(stockId);
      if (!stockDef) return prev;
      const idx = prev.currentPlayerIndex;
      const player = { ...prev.players[idx] };
      const stock = player.stocks.find(s => s.stockId === stockId);
      if (!stock || stock.shares <= 0) return prev;

      // Sell at market price, but never more than original purchase price per share
      const pricePerShare = stock.totalInvested / stock.shares;
      const sellPrice = Math.min(stock.currentValue, pricePerShare);

      player.cash += Math.round(sellPrice);

      if (stock.shares === 1) {
        player.stocks = player.stocks.filter(s => s.stockId !== stockId);
      } else {
        player.stocks = player.stocks.map(s =>
          s.stockId === stockId
            ? { ...s, shares: s.shares - 1, totalInvested: s.totalInvested - pricePerShare }
            : s
        );
      }

      const updatedPlayers = prev.players.map((p, i) => i === idx ? player : p);
      return {
        ...prev,
        players: updatedPlayers,
        gameLog: [`${player.name} sold 1 share of ${stockDef.name} for $${Math.round(sellPrice)}.`, ...prev.gameLog].slice(0, 50),
      };
    });
  }, []);

  const skipStockAction = useCallback(() => {
    setState(prev => {
      const hasStocks = prev.players[prev.currentPlayerIndex].stocks.length > 0;
      return { ...prev, phase: hasStocks ? 'stock_valuation' : 'turn_end' };
    });
  }, []);

  const rollStockValuation = useCallback(() => {
    setState(prev => {
      const player = prev.players[prev.currentPlayerIndex];
      if (player.stocks.length === 0) {
        return { ...prev, phase: 'turn_end', stockRollResults: [] };
      }

      const results: StockRollResult[] = player.stocks.map(ps => {
        const stockDef = getStockById(ps.stockId)!;
        const roll = rollDie(20);
        const diff = roll - stockDef.neutralRoll;
        const rawPercent = diff * stockDef.rateOfChange;

        let nationalityBonus = 0;
        if (stockDef.category === player.nationality.bonus.category) {
          nationalityBonus = rawPercent > 0 ? player.nationality.bonus.percentage : 0;
        }

        const totalChange = rawPercent + nationalityBonus;
        const oldValue = ps.currentValue;
        const newValue = Math.max(1, Math.round(oldValue * (1 + totalChange / 100)));

        return {
          stockId: ps.stockId,
          stockName: stockDef.name,
          roll,
          multiplier: diff,
          percentChange: rawPercent,
          nationalityBonus,
          totalChange,
          oldValue,
          newValue,
        };
      });

      const updatedStocks = player.stocks.map(ps => {
        const result = results.find(r => r.stockId === ps.stockId);
        return result ? { ...ps, currentValue: result.newValue } : ps;
      });

      const updatedPlayers = prev.players.map((p, i) =>
        i === prev.currentPlayerIndex ? { ...p, stocks: updatedStocks } : p
      );

      return {
        ...prev,
        players: updatedPlayers,
        stockRollResults: results,
        phase: 'valuation_results',
      };
    });
  }, []);

  const endTurn = useCallback(() => {
    setState(prev => {
      const nextIdx = (prev.currentPlayerIndex + 1) % prev.players.length;
      const yearAdvance = nextIdx === 0;
      const newYear = yearAdvance ? prev.year + 1 : prev.year;

      if (newYear > END_YEAR) {
        return { ...prev, phase: 'game_over' };
      }

      const log = yearAdvance
        ? [`--- Year ${newYear} begins ---`, `${prev.players[nextIdx].name}'s turn.`]
        : [`${prev.players[nextIdx].name}'s turn.`];

      return {
        ...prev,
        currentPlayerIndex: nextIdx,
        year: newYear,
        phase: 'rolling',
        lastDiceRoll: null,
        currentEvent: null,
        currentChance: null,
        currentTile: null,
        stockRollResults: [],
        gameLog: [...log, ...prev.gameLog].slice(0, 50),
      };
    });
  }, []);

  const openStockAction = useCallback((stockId?: string) => {
    setState(prev => ({
      ...prev,
      phase: 'stock_action',
      currentTile: stockId ? { type: 'stock', stockId } : null,
    }));
  }, []);

  const currentPlayer = state.players[state.currentPlayerIndex] || null;

  const getPlayerNetWorth = useCallback((player: Player) => {
    const stockValue = player.stocks.reduce((sum, s) => sum + s.currentValue * s.shares, 0);
    return player.cash + stockValue;
  }, []);

  return {
    state,
    currentPlayer,
    stocks,
    board,
    startGame,
    rollMovementDice,
    resolveLanding,
    applyEvent,
    applyChance,
    buyStock,
    sellStock,
    skipStockAction,
    rollStockValuation,
    endTurn,
    openStockAction,
    getPlayerNetWorth,
  };
}
