export interface Nationality {
  id: string;
  name: string;
  flag: string;
  bonus: { category: StockCategory; percentage: number };
  weakness: { category: StockCategory; eventTag: string; extraPenalty: number };
  description: string;
}

export type StockCategory = 'energy' | 'industry' | 'tech' | 'consumption';

export interface StockDefinition {
  id: string;
  name: string;
  category: StockCategory;
  price: number;
  neutralRoll: number;
  rateOfChange: number;
  description: string;
}

export interface PlayerStock {
  stockId: string;
  shares: number; // number of times purchased
  totalInvested: number;
  currentValue: number; // market value per share for this player
}

export interface Player {
  id: number;
  name: string;
  nationality: Nationality;
  cash: number;
  position: number;
  stocks: PlayerStock[];
  color: string;
}

export interface EventCard {
  id: string;
  title: string;
  description: string;
  tags: string[];
  impact: { category: StockCategory | 'all'; modifier: number };
}

export interface ChanceCard {
  id: string;
  title: string;
  description: string;
  effect: 'boost_random_stock' | 'hurt_random_stock' | 'boost_all_stocks' | 'hurt_all_stocks' | 'gain_cash' | 'lose_cash';
  value: number;
}

export interface BoardTile {
  type: 'stock' | 'event' | 'chance' | 'blank';
  stockId?: string;
}

export type GamePhase = 
  | 'setup'
  | 'rolling'
  | 'landed'
  | 'event_display'
  | 'chance_display'
  | 'stock_action'
  | 'stock_valuation'
  | 'valuation_results'
  | 'turn_end'
  | 'game_over';

export interface StockRollResult {
  stockId: string;
  stockName: string;
  roll: number;
  multiplier: number;
  percentChange: number;
  nationalityBonus: number;
  totalChange: number;
  oldValue: number;
  newValue: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  year: number;
  phase: GamePhase;
  lastDiceRoll: number | null;
  currentEvent: EventCard | null;
  currentChance: ChanceCard | null;
  currentTile: BoardTile | null;
  stockRollResults: StockRollResult[];
  gameLog: string[];
  phaseBeforeStockAction: GamePhase | null;
}
