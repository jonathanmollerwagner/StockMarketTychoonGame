import { useState, useCallback } from 'react';
import type { GameState, Player, Nationality, StockDefinition, EventCard, ChanceCard, BoardTile, GamePhase, StockRollResult, PlayerStock, StockCategory, DividendResult } from '@/types/game';
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

const PLAYER_EMOJI = [
  '👤',
  '🚀',
  '👽',
  '⭐',
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
    dividendResults: [],
    stockValues: {},
    gameLog: [],
    phaseBeforeStockAction: null,
    phaseSavedTile: null,
    phaseSavedLastDiceRoll: null,
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
      emoji: PLAYER_EMOJI[i] || `P${i + 1}`,
    }));
    
    // Initialize stock values from stock definitions
    const stockValues: { [id: string]: number } = {};
    stocks.forEach(s => {
      stockValues[s.id] = s.price;
    });
    
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
      dividendResults: [],
      stockValues,
      gameLog: [`Game started! Year ${START_YEAR}. ${players[0].name}'s turn.`],
      phaseBeforeStockAction: null,
      phaseSavedTile: null,
      phaseSavedLastDiceRoll: null,
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
      return { ...prev, phase: 'turn_end' };
    });
  }, []);

  const applyEvent = useCallback(() => {
    setState(prev => {
      const event = prev.currentEvent;
      if (!event) return prev;

      // Update global stock values based on event impact
      const updatedStockValues = { ...prev.stockValues };
      stocks.forEach(stock => {
        const affected = event.impact.category === 'all' || event.impact.category === stock.category;
        if (affected) {
          const change = updatedStockValues[stock.id] * (event.impact.modifier / 100);
          updatedStockValues[stock.id] = Math.max(1, updatedStockValues[stock.id] + change);
        }
      });

      return {
        ...prev,
        stockValues: updatedStockValues,
        phase: 'turn_end',
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
      let updatedStockValues = { ...prev.stockValues };

      switch (chance.effect) {
        case 'gain_cash':
          player.cash += chance.value;
          log.push(`${player.name} gained $${chance.value}.`);
          break;
        case 'lose_cash':
          if (player.cash >= chance.value) {
            player.cash -= chance.value;
          } else if (player.stocks.length > 0) {
            // Force sell cheapest stock to cover
            const cheapest = [...player.stocks].sort((a, b) => {
              const aValue = prev.stockValues[a.stockId] || 0;
              const bValue = prev.stockValues[b.stockId] || 0;
              return aValue - bValue;
            })[0];
            const sellValue = Math.round((prev.stockValues[cheapest.stockId] || 0) * 0.9);
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
          {
            const randomStockIds = Object.keys(updatedStockValues);
            if (randomStockIds.length > 0) {
              const ri = Math.floor(Math.random() * randomStockIds.length);
              const stockId = randomStockIds[ri];
              updatedStockValues[stockId] = Math.round(updatedStockValues[stockId] * (1 + chance.value / 100));
            }
          }
          break;
        case 'hurt_random_stock':
          {
            const randomStockIds = Object.keys(updatedStockValues);
            if (randomStockIds.length > 0) {
              const ri = Math.floor(Math.random() * randomStockIds.length);
              const stockId = randomStockIds[ri];
              updatedStockValues[stockId] = Math.max(1, Math.round(updatedStockValues[stockId] * (1 - chance.value / 100)));
            }
          }
          break;
        case 'boost_all_stocks':
          Object.keys(updatedStockValues).forEach(stockId => {
            updatedStockValues[stockId] = Math.round(updatedStockValues[stockId] * (1 + chance.value / 100));
          });
          break;
        case 'hurt_all_stocks':
          Object.keys(updatedStockValues).forEach(stockId => {
            updatedStockValues[stockId] = Math.max(1, Math.round(updatedStockValues[stockId] * (1 - chance.value / 100)));
          });
          break;
      }

      const updatedPlayers = prev.players.map((p, i) => i === idx ? player : p);
      return {
        ...prev,
        players: updatedPlayers,
        stockValues: updatedStockValues,
        phase: 'turn_end',
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
      
      const buyPrice = Math.round(prev.stockValues[stockId] || stockDef.price);
      
      if (player.cash < buyPrice) return prev;

      player.cash -= buyPrice;
      
      const existing = player.stocks.find(s => s.stockId === stockId);
      if (existing) {
        player.stocks = player.stocks.map(s =>
          s.stockId === stockId
            ? { ...s, shares: s.shares + 1, totalInvested: s.totalInvested + buyPrice }
            : s
        );
      } else {
        player.stocks = [...player.stocks, {
          stockId,
          shares: 1,
          totalInvested: buyPrice,
        }];
      }

      const updatedPlayers = prev.players.map((p, i) => i === idx ? player : p);
      return {
        ...prev,
        players: updatedPlayers,
        gameLog: [`${player.name} bought ${stockDef.name} for $${buyPrice}.`, ...prev.gameLog].slice(0, 50),
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

      // Sell at global stock value minus 10% spread
      const currentValue = prev.stockValues[stockId] || 0;
      const sellPrice = Math.round(currentValue * 0.9);

      player.cash += sellPrice;

      if (stock.shares === 1) {
        player.stocks = player.stocks.filter(s => s.stockId !== stockId);
      } else {
        const pricePerShare = stock.totalInvested / stock.shares;
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
        gameLog: [`${player.name} sold 1 share of ${stockDef.name} for $${sellPrice} (10% spread applied).`, ...prev.gameLog].slice(0, 50),
      };
    });
  }, []);

  const skipStockAction = useCallback(() => {
    setState(prev => {
      // If we came from HUD (phaseBeforeStockAction is set), restore that phase
      if (prev.phaseBeforeStockAction) {
        return {
          ...prev,
          phase: prev.phaseBeforeStockAction,
          phaseBeforeStockAction: null,
          currentTile: prev.phaseSavedTile || null,
          lastDiceRoll: prev.phaseSavedLastDiceRoll ?? null,
          phaseSavedTile: null,
          phaseSavedLastDiceRoll: null,
        };
      }
      // Move to turn_end (stock valuation will happen on last player's turn)
      return { ...prev, phase: 'turn_end' };
    });
  }, []);

  const calculateDividends = (results: StockRollResult[], prevState: GameState): { dividendResults: DividendResult[]; updatedPlayers: Player[] } => {
    const dividendResults: DividendResult[] = [];
    const updatedPlayers = prevState.players.map(player => ({ ...player, cash: player.cash }));

    results.forEach(result => {
      const stockDef = getStockById(result.stockId)!;
      const valueChange = result.newValue - result.oldValue;
      
      // Only pay dividends if stock value increased
      if (valueChange <= 0) return;

      const recipients: Array<{ playerId: number; playerName: string; dividendAmount: number }> = [];

      // Check each player to see if they have the matching nationality bonus
      updatedPlayers.forEach((player, idx) => {
        // Only pay dividend to players whose nationality bonus matches this stock's category
        if (player.nationality.bonus.category === stockDef.category) {
          const playerStock = prevState.players[idx].stocks.find(s => s.stockId === result.stockId);
          if (playerStock && playerStock.shares > 0) {
            // Calculate dividend: value increase per share * number of shares
            const dividendAmount = Math.round(valueChange * playerStock.shares);
            recipients.push({
              playerId: player.id,
              playerName: player.name,
              dividendAmount,
            });
            // Add cash to player
            player.cash += dividendAmount;
          }
        }
      });

      // Only add to dividendResults if someone received dividends
      if (recipients.length > 0) {
        dividendResults.push({
          stockId: result.stockId,
          stockName: stockDef.name,
          category: stockDef.category,
          valueChange,
          recipients,
        });
      }
    });

    return { dividendResults, updatedPlayers };
  };

  const rollStockValuation = useCallback(() => {
    setState(prev => {
      // Only the last player can trigger valuation
      const isLastPlayer = prev.currentPlayerIndex === prev.players.length - 1;
      if (!isLastPlayer) {
        return { ...prev, phase: 'turn_end' };
      }

      // Find all unique stocks that are owned by any player
      const ownedStockIds = new Set<string>();
      prev.players.forEach(player => {
        player.stocks.forEach(ps => {
          ownedStockIds.add(ps.stockId);
        });
      });

      if (ownedStockIds.size === 0) {
        return { ...prev, phase: 'turn_end', stockRollResults: [] };
      }

      // Roll for each owned stock
      const results: StockRollResult[] = Array.from(ownedStockIds).map(stockId => {
        const stockDef = getStockById(stockId)!;
        const roll = rollDie(20);
        const diff = roll - stockDef.neutralRoll;
        const rawPercent = diff * stockDef.rateOfChange;
        const totalChange = rawPercent;
        const oldValue = prev.stockValues[stockId];
        const newValue = Math.max(1, Math.round(oldValue * (1 + totalChange / 100)));

        return {
          stockId,
          stockName: stockDef.name,
          roll,
          multiplier: diff,
          percentChange: rawPercent,
          totalChange,
          oldValue,
          newValue,
        };
      });

      // Update global stock values
      const updatedStockValues = { ...prev.stockValues };
      results.forEach(result => {
        updatedStockValues[result.stockId] = result.newValue;
      });

      // Calculate dividends based on nationality bonuses
      const { dividendResults, updatedPlayers } = calculateDividends(results, prev);

      // Always show valuation results first, store dividends to show after
      return {
        ...prev,
        players: updatedPlayers,
        stockValues: updatedStockValues,
        stockRollResults: results,
        dividendResults,
        phase: 'valuation_results',
        gameLog: [`Stock valuation complete.`, ...prev.gameLog].slice(0, 50),
      };
    });
  }, []);

  const endTurn = useCallback(() => {
    setState(prev => {
      // If we're coming from valuation_results, check for dividends to display
      if (prev.phase === 'valuation_results') {
        // If there are dividends to display, show them before advancing to next player
        if (prev.dividendResults.length > 0) {
          return {
            ...prev,
            phase: 'dividend_display',
            gameLog: [`Dividend distribution...`, ...prev.gameLog].slice(0, 50),
          };
        }

        // No dividends, advance to next player
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
          dividendResults: [],
          gameLog: [...log, ...prev.gameLog].slice(0, 50),
          phaseBeforeStockAction: null,
          phaseSavedTile: null,
          phaseSavedLastDiceRoll: null,
        };
      }

      const isLastPlayer = prev.currentPlayerIndex === prev.players.length - 1;
      
      // If this is the last player's turn, perform stock valuation automatically
      if (isLastPlayer) {
        // Find all unique stocks that are owned by any player
        const ownedStockIds = new Set<string>();
        prev.players.forEach(player => {
          player.stocks.forEach(ps => {
            ownedStockIds.add(ps.stockId);
          });
        });

        // If there are stocks to valuate, perform valuation
        if (ownedStockIds.size > 0) {
          // Roll for each owned stock
          const results: StockRollResult[] = Array.from(ownedStockIds).map(stockId => {
            const stockDef = getStockById(stockId)!;
            const roll = rollDie(20);
            const diff = roll - stockDef.neutralRoll;
            const rawPercent = diff * stockDef.rateOfChange;
            const totalChange = rawPercent;
            const oldValue = prev.stockValues[stockId];
            const newValue = Math.max(1, Math.round(oldValue * (1 + totalChange / 100)));

            return {
              stockId,
              stockName: stockDef.name,
              roll,
              multiplier: diff,
              percentChange: rawPercent,
              totalChange,
              oldValue,
              newValue,
            };
          });

          // Update global stock values
          const updatedStockValues = { ...prev.stockValues };
          results.forEach(result => {
            updatedStockValues[result.stockId] = result.newValue;
          });

          // Calculate dividends based on nationality bonuses
          const { dividendResults, updatedPlayers } = calculateDividends(results, prev);

          // Always show valuation results first, store dividends to show after
          return {
            ...prev,
            players: updatedPlayers,
            stockValues: updatedStockValues,
            stockRollResults: results,
            dividendResults,
            phase: 'valuation_results',
            gameLog: [`Stock valuation round complete.`, ...prev.gameLog].slice(0, 50),
          };
        }
      }

      // Not the last player or no stocks to valuate, advance to next player
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
        phaseBeforeStockAction: null,
        phaseSavedTile: null,
        phaseSavedLastDiceRoll: null,
      };
    });
  }, []);

  const acknowledgeDividends = useCallback(() => {
    setState(prev => {
      // Advance to next player
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
        dividendResults: [],
        gameLog: [...log, ...prev.gameLog].slice(0, 50),
        phaseBeforeStockAction: null,
        phaseSavedTile: null,
        phaseSavedLastDiceRoll: null,
      };
    });
  }, []);

  const openStockAction = useCallback((stockId?: string) => {
    setState(prev => ({
      ...prev,
      phase: 'stock_action',
      currentTile: stockId ? { type: 'stock', stockId } : null,
      phaseBeforeStockAction: stockId ? prev.phase : null,
      phaseSavedTile: stockId ? prev.currentTile : null,
      phaseSavedLastDiceRoll: stockId ? prev.lastDiceRoll ?? null : null,
    }));
  }, []);

  const currentPlayer = state.players[state.currentPlayerIndex] || null;

  const getPlayerNetWorth = useCallback((player: Player) => {
    const stockValue = player.stocks.reduce((sum, s) => sum + (state.stockValues[s.stockId] || 0) * s.shares, 0);
    return player.cash + stockValue;
  }, [state.stockValues]);

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
    acknowledgeDividends,
    openStockAction,
    getPlayerNetWorth,
  };
}
