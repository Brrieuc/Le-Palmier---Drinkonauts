import React, { useState, useEffect } from 'react';

interface SimonGameProps {
  onComplete: (success: boolean) => void;
}

type Color = 'red' | 'green' | 'blue' | 'yellow';

export const SimonGame: React.FC<SimonGameProps> = ({ onComplete }) => {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playbackIdx, setPlaybackIdx] = useState<number | null>(null);
  const [userStep, setUserStep] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'watch' | 'play' | 'result'>('start');
  const [resultMessage, setResultMessage] = useState('');

  const colors: Color[] = ['red', 'green', 'blue', 'yellow'];
  const SEQUENCE_LENGTH = 4;

  useEffect(() => {
    if (gameState === 'start') {
      const newSeq: Color[] = [];
      for(let i=0; i<SEQUENCE_LENGTH; i++) {
        newSeq.push(colors[Math.floor(Math.random() * 4)]);
      }
      setSequence(newSeq);
      setGameState('watch');
      
      // Start playback after a short delay
      let step = 0;
      const interval = setInterval(() => {
        if (step < SEQUENCE_LENGTH) {
            setPlaybackIdx(step);
            setTimeout(() => setPlaybackIdx(null), 500); // Light up for 500ms
            step++;
        } else {
            clearInterval(interval);
            setGameState('play');
        }
      }, 800);

      return () => clearInterval(interval);
    }
  }, [gameState]);

  const handleColorClick = (color: Color) => {
    if (gameState !== 'play') return;

    if (color === sequence[userStep]) {
        if (userStep === SEQUENCE_LENGTH - 1) {
            setGameState('result');
            setResultMessage('Success!');
            setTimeout(() => onComplete(true), 1000);
        } else {
            setUserStep(prev => prev + 1);
        }
    } else {
        setGameState('result');
        setResultMessage('Raté ! Cul Sec !');
        setTimeout(() => onComplete(false), 1500);
    }
  };

  const getColorClass = (color: Color, index: number) => {
    const base = "w-24 h-24 rounded-2xl cursor-pointer transition-all duration-150 border-2 border-white/20 shadow-lg";
    const isActive = playbackIdx === index; // This logic is slightly wrong for indices, simplified below
    
    // We can't map index purely to color in playback view, so we check if current playback COLOR matches this button
    const isLit = (gameState === 'watch' && sequence[playbackIdx || 0] === color && playbackIdx !== null);
    
    switch (color) {
        case 'red': return `${base} bg-red-500 ${isLit ? 'brightness-150 scale-105 shadow-red-500/50' : 'opacity-80'}`;
        case 'green': return `${base} bg-green-500 ${isLit ? 'brightness-150 scale-105 shadow-green-500/50' : 'opacity-80'}`;
        case 'blue': return `${base} bg-blue-500 ${isLit ? 'brightness-150 scale-105 shadow-blue-500/50' : 'opacity-80'}`;
        case 'yellow': return `${base} bg-yellow-500 ${isLit ? 'brightness-150 scale-105 shadow-yellow-500/50' : 'opacity-80'}`;
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <h2 className="text-3xl font-bold mb-8 text-white tracking-wider">SIMON SAYS</h2>
      
      {gameState === 'watch' && <p className="text-white mb-4 animate-pulse">Mémorise la séquence...</p>}
      {gameState === 'play' && <p className="text-green-400 mb-4">À toi !</p>}
      {gameState === 'result' && <p className="text-2xl font-bold text-white mb-4">{resultMessage}</p>}

      <div className="grid grid-cols-2 gap-4">
        {colors.map((c, i) => (
            <div key={i} 
                 className={getColorClass(c, -1)} // -1 because simple function above is color based
                 onClick={() => handleColorClick(c)}
                 onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                 onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
        ))}
      </div>
    </div>
  );
};
