
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export type AlcoholType = 'beer' | 'wine' | 'mix_weak' | 'mix_strong' | 'hard';
export type Difficulty = 'soft' | 'medium' | 'hard' | 'goated';

export interface Player {
  id: string;
  name: string;
  alcoholType: AlcoholType;
  sipsTaken: number;
  sipsGiven: number; // Stats: Générosité
  simonFailures: number;
  mathFailures: number;
  weight?: number;
  gender?: 'male' | 'female';
  uid?: string; // Liaison Firebase Drinkosaur
}

// DRINKOSAUR IDENTITY
export interface UserStats {
  totalSips: number;
  totalGames: number;
  simonFailures: number;
  mathFailures: number;
  sipsGiven: number;
}

export interface DrinkosaurProfile {
  uid: string;
  displayName: string;
  photoURL: string | null;
  stats: UserStats;
  createdAt: any;
}

export interface GameSettings {
  mode: 'quick' | 'fun';
  difficulty: Difficulty;
  simonEnabled: boolean;
  mathEnabled: boolean;
  maxPlayers: number;
}

export type ActionType = 'distribute' | 'select_loser' | 'multiple_losers' | 'ace_check' | 'king_rule' | 'question_master_trap' | 'freeze_trap' | 'math_penalty';

export interface PendingAction {
  type: ActionType;
  sipsToDistribute?: number; // Total initial à distribuer
  currentSipsRemaining?: number; // Pour le reset
  initiatorId?: string;
  cardName?: string;
}

export interface ActiveRule {
  id: string;
  playerId: string;
  type: 'king' | 'question_master' | 'freeze_master';
  timestamp: number;
}

export interface GameState {
  currentCard: Card | null;
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  isCardFlipped: boolean;
  isSimonActive: boolean;
  isMathActive: boolean;
  gameStarted: boolean;
  gameOver: boolean;
  pendingAction: PendingAction | null;
  activeRules: ActiveRule[];
}