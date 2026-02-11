import React, { useState, useEffect } from 'react';

interface MathGameProps {
  onComplete: (success: boolean) => void;
}

export const MathGame: React.FC<MathGameProps> = ({ onComplete }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<number[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  useEffect(() => {
    generateQuestion();
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && selectedAnswer === null) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && selectedAnswer === null) {
      // Time's up
      onComplete(false);
    }
  }, [timeLeft, selectedAnswer]);

  const generateQuestion = () => {
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    let a = 0, b = 0, res = 0;

    // Generate relatively easy numbers for 5s limit
    if (operator === '+') {
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      res = a + b;
    } else if (operator === '-') {
      a = Math.floor(Math.random() * 20) + 10;
      b = Math.floor(Math.random() * 10) + 1;
      res = a - b;
    } else { // *
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      res = a * b;
    }

    setQuestion(`${a} ${operator} ${b}`);
    setCorrectAnswer(res);
    
    // Generate distractors
    const opts = new Set<number>();
    opts.add(res);
    while (opts.size < 4) {
      const offset = Math.floor(Math.random() * 5) + 1;
      const sign = Math.random() > 0.5 ? 1 : -1;
      const val = res + (offset * sign);
      if (val !== res && val >= 0) opts.add(val);
    }
    
    setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
  };

  const handleAnswer = (ans: number) => {
    setSelectedAnswer(ans);
    if (ans === correctAnswer) {
      setTimeout(() => onComplete(true), 500);
    } else {
      setTimeout(() => onComplete(false), 800);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-8">
            <span className="text-purple-400 font-bold uppercase tracking-widest text-sm">Calcul Mental</span>
            <span className={`text-2xl font-mono font-bold ${timeLeft <= 2 ? 'text-red-500 animate-pulse' : 'text-white'}`}>0:0{timeLeft}</span>
        </div>

        <div className="bg-white/10 rounded-2xl p-8 mb-8 text-center border border-white/10 shadow-2xl">
            <h2 className="text-5xl font-black text-white">{question}</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {options.map((opt, i) => {
                let btnClass = "bg-white/5 border border-white/20 hover:bg-white/10";
                if (selectedAnswer !== null) {
                    if (opt === correctAnswer) btnClass = "bg-green-600 border-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)]";
                    else if (opt === selectedAnswer) btnClass = "bg-red-600 border-red-500 text-white";
                    else btnClass = "bg-white/5 opacity-50";
                }

                return (
                    <button 
                        key={i}
                        onClick={() => selectedAnswer === null && handleAnswer(opt)}
                        className={`h-20 rounded-xl text-3xl font-bold transition-all duration-200 active:scale-95 ${btnClass}`}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};
