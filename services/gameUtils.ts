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
    case 'A': return { title: 'L\'As', description: 'Cul Sec !', action: 'drink_all' };
    case '2': return { title: 'Le Deux', description: 'Distribue 2 gorgées.', action: 'distribute_2' };
    case '3': return { title: 'Le Trois', description: 'Distribue 3 gorgées.', action: 'distribute_3' };
    case '4': return { title: 'Four to the Floor', description: 'Dernier avec le doigt en bas boit !', action: 'game_floor' };
    case '5': return { title: 'Five to the Sky', description: 'Dernier avec le doigt en haut boit !', action: 'game_sky' };
    case '6': return { title: 'Dans ma Valise', description: 'Jeu de mémoire. Le premier qui se trompe boit.', action: 'game_memory' };
    case '7': return { title: 'Maître de la Question', description: 'Si tu poses une question et qu\'on répond, ils boivent.', action: 'status_question' };
    case '8': return { title: 'Le Huit', description: 'Distribue 8 gorgées.', action: 'distribute_8' };
    case '9': return { title: 'Je n\'ai jamais', description: 'Ceux qui l\'ont déjà fait boivent.', action: 'game_never' };
    case '10': return { title: 'Maître du Freeze', description: 'Si tu te figes, tout le monde doit te suivre. Le dernier boit.', action: 'status_freeze' };
    case 'J': return { title: 'Le Thème', description: 'Choisis un thème. Le premier qui sèche boit.', action: 'game_theme' };
    case 'Q': return { title: 'La Dame', description: 'À la tienne ! Tout le monde boit.', action: 'drink_everyone' };
    case 'K': return { title: 'Le Roi', description: 'Invente une règle pour la partie.', action: 'status_rule' };
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
  // Representation of "strength" relative to a standard beer unit roughly
  switch (type) {
    case 'beer': return 1.0;
    case 'wine': return 1.4; // Stronger than beer
    case 'mix_weak': return 1.5;
    case 'mix_strong': return 2.5;
    case 'hard': return 4.0; // Shots
  }
};

export const calculateWidmark = (player: Player): string => {
    // Very simplified estimation based on sips
    // Standard sip ~ 10-15ml.
    // 1 Standard drink ~ 10g alcohol.
    // Let's assume 1 sip of beer = 1/10th of a unit.
    // Adjusted by alcohol type coefficient.

    const baseUnitPerSip = 0.1;
    const totalUnits = player.sipsTaken * baseUnitPerSip * getAlcoholCoeff(player.alcoholType);
    
    // Default weight/gender if not provided (70kg male average)
    const weight = player.weight || 70;
    const r = player.gender === 'female' ? 0.6 : 0.7;

    // Widmark: (Alcohol in grams) / (Weight in kg * r)
    // 1 Unit ~ 10g
    const grams = totalUnits * 10;
    const permille = grams / (weight * r);

    return permille.toFixed(2);
};
