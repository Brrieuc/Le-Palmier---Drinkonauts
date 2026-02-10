
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

export type ActionType = 'distribute' | 'select_loser' | 'ace_check' | 'king_rule' | 'question_master_trap';

export interface PendingAction {
  type: ActionType;
  sipsToDistribute?: number; // Pour 2, 3, 8
  initiatorId?: string; // Pour savoir qui distribue ou qui est le roi
  cardName?: string; // Pour afficher "Qui a perdu à 'Dans ma valise' ?"
}

export interface ActiveRule {
  id: string;
  playerId: string;
  type: 'king' | 'question_master';
  timestamp: number;
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
  pendingAction: PendingAction | null;
  activeRules: ActiveRule[]; // Liste des Rois actifs et du Maître de la question actuel
}
