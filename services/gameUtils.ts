import { Card, Rank, Suit, AlcoholType, Difficulty, Player } from "../types";

export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, id: `${rank}-${suit}` });
    }
  }
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

export const getCardRule = (rank: Rank): { title: string; description: string; action: string } => {
  switch (rank) {
    case 'A': return { title: 'As', description: 'Cul Sec !', action: 'drink_all' };
    case '2': return { title: 'Deux', description: 'Distribue 2 gorgées.', action: 'distribute_2' };
    case '3': return { title: 'Trois', description: 'Distribue 3 gorgées.', action: 'distribute_3' };
    case '4': return { title: 'Four to the Floor', description: 'Dernier avec le doigt en bas boit !', action: 'game_floor' };
    case '5': return { title: 'Five to the Sky', description: 'Dernier avec le doigt en haut boit !', action: 'game_sky' };
    case '6': return { title: 'Dans ma Valise', description: 'Jeu de mémoire. Le premier qui se trompe boit.', action: 'game_memory' };
    case '7': return { title: 'Maître de la Question', description: 'Si tu poses une question et qu\'on répond, ils boivent.', action: 'status_question' };
    case '8': return { title: 'Huit', description: 'Distribue 8 gorgées.', action: 'distribute_8' };
    case '9': return { title: 'Je n\'ai jamais', description: 'Ceux qui l\'ont déjà fait boivent.', action: 'game_never' };
    case '10': return { title: 'Maître du Freeze', description: 'Si tu te figes, tout le monde doit te suivre. Le dernier boit.', action: 'status_freeze' };
    case 'J': return { title: 'Thème', description: 'Choisis un thème. Le premier qui sèche boit.', action: 'game_theme' };
    case 'Q': return { title: 'Dame', description: 'À la tienne ! Tout le monde boit.', action: 'drink_everyone' };
    case 'K': return { title: 'Roi', description: 'Invente une règle pour la partie.', action: 'status_rule' };
    default: return { title: '', description: '', action: '' };
  }
};

export const getDifficultyMultiplier = (diff: Difficulty): number => {
  switch (diff) {
    case 'soft': return 0.5;
    case 'medium': return 1.0;
    case 'hard': return 1.5;
    case 'goated': return 2.5;
  }
};

export const getAlcoholCoeff = (type: AlcoholType): number => {
  switch (type) {
    case 'beer': return 1.0;
    case 'wine': return 1.4;
    case 'mix_weak': return 1.5;
    case 'mix_strong': return 2.5;
    case 'hard': return 4.0;
  }
};

export const getAlcoholIcon = (type: AlcoholType): string => {
  switch (type) {
    case 'beer': return '🍺';
    case 'wine': return '🍷';
    case 'mix_weak': return '🍹';
    case 'mix_strong': return '🥃';
    case 'hard': return '🧪';
    default: return '🍺';
  }
};

/**
 * Returns how many "points" it costs to give 1 sip to this player.
 * E.g., giving 1 sip to a Vodka drinker costs 4 points from the distribution pool.
 */
export const getDistributionCost = (type: AlcoholType): number => {
  switch (type) {
    case 'beer': return 1;
    case 'wine': return 2;
    case 'mix_weak': return 2;
    case 'mix_strong': return 3;
    case 'hard': return 4;
  }
};

/**
 * Calculates how many sips a player should take based on base penalty, difficulty, and alcohol type.
 * Stronger alcohol = fewer sips.
 * Higher difficulty = more sips.
 */
export const calculateDynamicSips = (baseSips: number, difficulty: Difficulty, alcoholType: AlcoholType): number => {
  const diffMult = getDifficultyMultiplier(difficulty);
  const cost = getDistributionCost(alcoholType);
  
  // Basic formula: (Base * Difficulty) / AlcoholStrengthFactor
  // We use the 'cost' as a proxy for strength. 
  // If cost is 4 (Hard liquor), we divide the sips by roughly that amount, but kept fun (min 1).
  
  let result = (baseSips * diffMult);
  
  // Balancing: Reduce sips for strong alcohol
  if (cost > 1) {
    result = result / (cost * 0.7); // 0.7 makes it slightly punishing still
  }
  
  return Math.max(1, Math.round(result));
};

export const calculateWidmark = (player: Player): string => {
    const baseUnitPerSip = 0.1;
    const totalUnits = player.sipsTaken * baseUnitPerSip * getAlcoholCoeff(player.alcoholType);
    const weight = player.weight || 70;
    const r = player.gender === 'female' ? 0.6 : 0.7;
    const grams = totalUnits * 10;
    const permille = grams / (weight * r);

    return permille.toFixed(2);
};