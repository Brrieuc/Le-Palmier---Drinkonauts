import React from 'react';
import { Card as CardType, Rank, Suit } from '../types';
import { getCardRule } from '../services/gameUtils';

interface CardProps {
  card: CardType;
  isFlipped: boolean;
  onClick: () => void;
  difficultyMultiplier?: number;
}

const SuitIcon: React.FC<{ suit: Suit }> = ({ suit }) => {
  const color = suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-slate-800';
  const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  return <span className={`text-4xl ${color}`}>{symbols[suit]}</span>;
};

export const PlayingCard: React.FC<CardProps> = ({ card, isFlipped, onClick, difficultyMultiplier = 1 }) => {
  const rule = getCardRule(card.rank);

  return (
    <div className="w-64 h-96 cursor-pointer perspective-1000" onClick={onClick}>
      <div className={`relative w-full h-full duration-500 transition-transform card-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* Front of Card (The Back design) */}
        <div className="absolute w-full h-full card-backface-hidden rounded-2xl shadow-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-900 to-black flex items-center justify-center">
            {/* Palm Tree Design Abstract */}
            <div className="text-6xl text-white/20 transform rotate-45">🌴</div>
            <div className="absolute inset-2 border-2 border-dashed border-white/10 rounded-xl"></div>
        </div>

        {/* Back of Card (The Face design with Rule) */}
        <div className="absolute w-full h-full card-backface-hidden rotate-y-180 rounded-2xl shadow-2xl bg-white border border-gray-200 overflow-hidden flex flex-col items-center justify-between p-4">
            
            {/* Top Left */}
            <div className="self-start flex flex-col items-center leading-none">
              <span className="text-2xl font-bold text-gray-800">{card.rank}</span>
              <SuitIcon suit={card.suit} />
            </div>

            {/* Center Content: Rule */}
            <div className="flex flex-col items-center text-center space-y-2">
                <h3 className="text-xl font-bold text-indigo-900">{rule.title}</h3>
                <p className="text-sm text-gray-600 font-medium leading-tight">{rule.description}</p>
                {/* Visual Drink Indicator */}
                {(rule.action.startsWith('distribute') || rule.action === 'drink_all') && (
                    <div className="mt-2 px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold uppercase tracking-wide">
                        {card.rank === 'A' ? '1 Verre' : `${parseInt(card.rank) || 1} Gorgées`}
                    </div>
                )}
            </div>

            {/* Bottom Right */}
            <div className="self-end flex flex-col items-center leading-none rotate-180">
              <span className="text-2xl font-bold text-gray-800">{card.rank}</span>
              <SuitIcon suit={card.suit} />
            </div>

        </div>
      </div>
    </div>
  );
};
