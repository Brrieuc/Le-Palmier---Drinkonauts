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
  simonFailures: number;
  weight?: number; // Optional for Widmark
  gender?: 'male' | 'female'; // Optional for Widmark
}

export interface GameSettings {
  mode: 'quick' | 'fun';
  difficulty: Difficulty;
  simonEnabled: boolean;
  maxPlayers: number;
}

export interface GameState {
  currentCard: Card | null;
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  isCardFlipped: boolean;
  isSimonActive: boolean;
  gameStarted: boolean;
  gameOver: boolean;
}
