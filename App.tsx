import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { PlayingCard } from './components/Card';
import { SimonGame } from './components/SimonGame';
import { authService, dbService } from './services/firebase';
import { createDeck, getDifficultyMultiplier, calculateWidmark } from './services/gameUtils';
import { Player, GameSettings, GameState, Card, AlcoholType, Difficulty } from './types';

// Screen Components (Inline for single file simplicity, normally separate)

// 1. HOME SCREEN
const HomeScreen = ({ onStart }: { onStart: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-8 p-6 text-center">
    <div className="relative group">
      {/* Decorative blur behind logo */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-full blur-xl opacity-40 animate-pulse"></div>
      
      <img 
        src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh9vA7gqfKi_kCFn4ofzRAQ1AnJ2DDUsHjY2sxF5tGjlB7UilNBy5HCyH4GB84ow4kiX42DC1oKyTaUst2cCgO9JH-YoXsxlXObvKjbEYWBlU7TPvY4cgBOQii3k7Vostr4w1un99tMZiPSirstDUpcpXlie8kdtETMcwY6taR4216NBJdv1I6yOJUx3v0/s16000/logo%20palmier.png" 
        alt="Logo Le Palmier" 
        className="relative w-48 h-48 object-contain drop-shadow-2xl transform transition-transform duration-700 hover:scale-105"
      />
    </div>
    
    <div className="space-y-2">
      <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 drop-shadow-sm tracking-tight">
        Le Palmier
      </h1>
      <p className="text-lg text-white/70 font-light tracking-wide max-w-xs mx-auto">
        L'expérience de soirée ultime.
      </p>
    </div>

    <button
      onClick={onStart}
      className="group relative px-10 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full overflow-hidden transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    >
      <span className="relative z-10 text-xl font-medium text-white">Jouer</span>
    </button>
  </div>
);

// 2. SETUP SCREEN
const SetupScreen = ({ onStartGame }: { onStartGame: (players: Player[], settings: GameSettings) => void }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState<number>(70);
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');
  const [newAlcohol, setNewAlcohol] = useState<AlcoholType>('beer');

  const [settings, setSettings] = useState<GameSettings>({
    mode: 'fun',
    difficulty: 'medium',
    simonEnabled: false,
    maxPlayers: 20
  });

  // Camera Refs for Scanner
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  const addPlayer = () => {
    if (!newName.trim()) return;
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newName,
      alcoholType: newAlcohol,
      sipsTaken: 0,
      simonFailures: 0,
      gender: newGender,
      weight: newWeight
    };
    setPlayers([...players, newPlayer]);
    setNewName('');
    // Reset to defaults
    setNewWeight(70);
    setNewGender('male');
    setNewAlcohol('beer');
  };

  const startScanning = async () => {
    setIsScanning(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error", err);
        setIsScanning(false);
      }
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const simulateScan = () => {
      // Mock adding a friend
      setPlayers([...players, {
          id: 'scanned-friend-' + Date.now(),
          name: 'Ami Scanné',
          alcoholType: 'mix_strong',
          sipsTaken: 0,
          simonFailures: 0,
          weight: 75,
          gender: 'male'
      }]);
      stopScanning();
  };

  const alcoholLabels: Record<AlcoholType, string> = {
      beer: 'Bière (5%)',
      wine: 'Vin (12%)',
      mix_weak: 'Soft Mix',
      mix_strong: 'Hard Mix',
      hard: 'Shots'
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto pb-20">
      <h2 className="text-3xl font-bold mb-6">Configuration</h2>
      
      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-2xl flex flex-col">
          <label className="text-xs text-gray-400 mb-2">Mode</label>
          <div className="flex gap-2">
            <button onClick={() => setSettings({...settings, mode: 'quick'})} className={`flex-1 py-1 rounded-lg text-sm ${settings.mode === 'quick' ? 'bg-white text-black' : 'bg-white/10'}`}>Rapide</button>
            <button onClick={() => setSettings({...settings, mode: 'fun'})} className={`flex-1 py-1 rounded-lg text-sm ${settings.mode === 'fun' ? 'bg-white text-black' : 'bg-white/10'}`}>Fun</button>
          </div>
        </div>
        
        <div className="glass-panel p-4 rounded-2xl flex flex-col">
          <label className="text-xs text-gray-400 mb-2">Simon</label>
          <button onClick={() => setSettings({...settings, simonEnabled: !settings.simonEnabled})} 
            className={`w-full py-1 rounded-lg text-sm transition-colors ${settings.simonEnabled ? 'bg-green-500 text-white' : 'bg-red-500/50'}`}>
            {settings.simonEnabled ? 'Activé' : 'Désactivé'}
          </button>
        </div>

        {/* Hide Difficulty in Quick Mode */}
        {settings.mode !== 'quick' && (
             <div className="glass-panel p-4 rounded-2xl flex flex-col col-span-2">
              <label className="text-xs text-gray-400 mb-2">Difficulté</label>
              <div className="flex justify-between gap-1">
                {(['soft', 'medium', 'hard', 'goated'] as Difficulty[]).map(d => (
                    <button key={d} onClick={() => setSettings({...settings, difficulty: d})}
                        className={`flex-1 py-1 rounded-lg text-xs capitalize ${settings.difficulty === d ? 'bg-purple-500 text-white' : 'bg-white/10'}`}>
                        {d}
                    </button>
                ))}
              </div>
            </div>
        )}
      </div>

      {/* Players List */}
      <div className="flex-1 glass-panel rounded-2xl p-4 mb-4 overflow-hidden flex flex-col">
        <h3 className="text-lg font-bold mb-3">Joueurs ({players.length})</h3>
        <div className="overflow-y-auto flex-1 space-y-2 mb-4">
            {players.length === 0 && <p className="text-sm text-gray-500 text-center italic">Aucun joueur</p>}
            {players.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                    <div>
                        <span className="font-medium block">{p.name}</span>
                        <span className="text-[10px] text-gray-400">{alcoholLabels[p.alcoholType]} • {p.weight}kg • {p.gender === 'male' ? 'H' : 'F'}</span>
                    </div>
                    <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-red-400 text-xs px-2">✕</button>
                </div>
            ))}
        </div>
        
        {/* Add Player Form */}
        <div className="bg-black/20 p-3 rounded-xl space-y-2">
            <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du joueur"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-white/30"
            />
            
            <div className="flex gap-2">
                 <select 
                    value={newAlcohol}
                    onChange={(e) => setNewAlcohol(e.target.value as AlcoholType)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-2 text-xs focus:outline-none"
                 >
                     {Object.entries(alcoholLabels).map(([key, label]) => (
                         <option key={key} value={key} className="bg-gray-900 text-white">{label}</option>
                     ))}
                 </select>
            </div>

            <div className="flex gap-2 items-center">
                <div className="flex-1 flex items-center bg-white/10 border border-white/20 rounded-lg px-2">
                    <input 
                        type="number" 
                        value={newWeight}
                        onChange={(e) => setNewWeight(parseInt(e.target.value) || 0)}
                        className="w-full bg-transparent py-2 text-xs focus:outline-none"
                        placeholder="70"
                    />
                    <span className="text-xs text-gray-400 mr-1">kg</span>
                </div>
                
                <div className="flex bg-white/10 border border-white/20 rounded-lg p-1">
                    <button 
                        onClick={() => setNewGender('male')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${newGender === 'male' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}
                    >H</button>
                    <button 
                        onClick={() => setNewGender('female')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${newGender === 'female' ? 'bg-pink-500 text-white' : 'text-gray-400'}`}
                    >F</button>
                </div>
                
                <button onClick={addPlayer} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors">+</button>
            </div>
        </div>
        
        <button onClick={startScanning} className="mt-3 w-full py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs hover:bg-indigo-500/30 transition-colors">
            📸 Scanner un Pass Ami
        </button>
      </div>

      {isScanning && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
              <div className="relative flex-1">
                 <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-64 h-64 border-2 border-white/50 rounded-xl"></div>
                 </div>
              </div>
              <div className="p-6 flex gap-4 bg-black">
                  <button onClick={stopScanning} className="flex-1 py-3 bg-red-600 rounded-xl">Annuler</button>
                  <button onClick={simulateScan} className="flex-1 py-3 bg-green-600 rounded-xl">Simuler Scan</button>
              </div>
          </div>
      )}

      <button 
        onClick={() => onStartGame(players, settings)}
        disabled={players.length === 0}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-lg disabled:opacity-50 shadow-lg shadow-purple-900/50"
      >
        Lancer la Partie
      </button>
    </div>
  );
};

// 3. GAME SCREEN
const GameScreen = ({ players, settings, onEndGame }: { players: Player[], settings: GameSettings, onEndGame: (finalPlayers: Player[]) => void }) => {
    const [gameState, setGameState] = useState<GameState>({
        currentCard: null,
        deck: [],
        discardPile: [],
        currentPlayerIndex: 0,
        isCardFlipped: false,
        isSimonActive: false,
        gameStarted: false,
        gameOver: false
    });
    const [localPlayers, setLocalPlayers] = useState<Player[]>(players);
    const [showSimon, setShowSimon] = useState(false);

    useEffect(() => {
        // Init Game
        setGameState(prev => ({
            ...prev,
            deck: createDeck(),
            gameStarted: true
        }));
    }, []);

    const currentPlayer = localPlayers[gameState.currentPlayerIndex];

    const handleNextTurn = () => {
        if (gameState.deck.length === 0) {
            onEndGame(localPlayers);
            return;
        }

        // Logic: 
        // 1. If card is flipped, move to next player and hide card
        if (gameState.isCardFlipped) {
             setGameState(prev => ({
                ...prev,
                isCardFlipped: false,
                currentCard: null,
                currentPlayerIndex: (prev.currentPlayerIndex + 1) % localPlayers.length
            }));
            
            // Check for Simon Trigger on next turn start? 
            if (settings.simonEnabled && Math.random() > 0.7) { // 30% chance of Simon
                setShowSimon(true);
            }
        } else {
            // 2. Draw card
            const newDeck = [...gameState.deck];
            const card = newDeck.pop()!;
            
            setGameState(prev => ({
                ...prev,
                deck: newDeck,
                currentCard: card,
                isCardFlipped: true,
                discardPile: [...prev.discardPile, card]
            }));

            // Calculate sips based on difficulty
            const difficultyMult = getDifficultyMultiplier(settings.difficulty);
            // In quick mode, we might want faster gameplay (maybe higher base), but keeping it consistent for now.
            // If mode is 'quick' and difficulty is hidden, we assume 'medium' (1.0) or we force it in setup.
            const baseSip = 1; 
            
            const updatedPlayers = [...localPlayers];
            updatedPlayers[gameState.currentPlayerIndex].sipsTaken += (baseSip * difficultyMult);
            setLocalPlayers(updatedPlayers);
        }
    };

    const handleSimonComplete = (success: boolean) => {
        setShowSimon(false);
        if (!success) {
            const updatedPlayers = [...localPlayers];
            updatedPlayers[gameState.currentPlayerIndex].simonFailures += 1;
            updatedPlayers[gameState.currentPlayerIndex].sipsTaken += 5; // Penalty
            setLocalPlayers(updatedPlayers);
        }
    };

    const handleQuit = () => {
        if (confirm("Quitter la partie ?")) {
            onEndGame(localPlayers);
        }
    };

    return (
        <div className="relative h-full flex flex-col p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={handleQuit} className="px-3 py-1 bg-white/10 rounded-full text-xs">Quitter</button>
                <div className="flex flex-col items-end">
                    <span className="font-bold text-lg">{currentPlayer?.name}</span>
                    <span className="text-xs text-purple-300">C'est ton tour</span>
                </div>
            </div>

            {/* Game Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {showSimon ? (
                    <SimonGame onComplete={handleSimonComplete} />
                ) : (
                    gameState.currentCard ? (
                        <PlayingCard 
                            card={gameState.currentCard} 
                            isFlipped={gameState.isCardFlipped} 
                            onClick={handleNextTurn} 
                        />
                    ) : (
                         <div 
                            onClick={handleNextTurn}
                            className="w-64 h-96 rounded-2xl bg-gradient-to-br from-indigo-900 to-black border-2 border-white/20 shadow-2xl flex items-center justify-center cursor-pointer animate-pulse"
                         >
                             <div className="text-center">
                                 <span className="text-4xl block mb-2">🃏</span>
                                 <span className="text-sm text-gray-400 font-medium">Tirer une carte</span>
                                 <p className="mt-4 text-xs text-gray-500">{gameState.deck.length} cartes restantes</p>
                             </div>
                         </div>
                    )
                )}
            </div>
            
            {/* Player Bar */}
            <div className="mt-8 h-20 glass-panel rounded-xl flex items-center px-4 overflow-x-auto gap-4">
                {localPlayers.map((p, i) => (
                    <div key={p.id} className={`flex-shrink-0 flex flex-col items-center min-w-[60px] ${i === gameState.currentPlayerIndex ? 'scale-110 opacity-100' : 'opacity-50'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${i === gameState.currentPlayerIndex ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-700'}`}>
                            {p.name.charAt(0)}
                        </div>
                        <span className="text-[10px] mt-1">{p.sipsTaken} g.</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// 4. END SCREEN
const EndScreen = ({ players, settings, onRestart }: { players: Player[], settings: GameSettings, onRestart: () => void }) => {
    
    // Save to Firebase on mount
    useEffect(() => {
        dbService.saveGameSession(players, settings);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Determine max simon failures for badge
    const maxSimonFails = Math.max(...players.map(p => p.simonFailures));

    // Sort by BAC (Widmark) descending
    const sortedPlayers = [...players].sort((a, b) => {
        const bacA = parseFloat(calculateWidmark(a));
        const bacB = parseFloat(calculateWidmark(b));
        return bacB - bacA;
    });

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto">
            <h2 className="text-4xl font-black text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500">
                Statistiques
            </h2>

            <div className="space-y-4 mb-8">
                {sortedPlayers.map((p, index) => {
                    const bac = calculateWidmark(p);
                    const isBourreDeLaGare = settings.simonEnabled && p.simonFailures === maxSimonFails && maxSimonFails > 0;

                    return (
                        <div key={p.id} className={`glass-panel p-4 rounded-xl flex flex-col relative overflow-hidden ${index === 0 ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : ''}`}>
                            {/* Rank Badge */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                                        #{index + 1}
                                    </span>
                                    <div>
                                        <p className="font-bold text-lg flex items-center gap-2">
                                            {p.name}
                                            {index === 0 && <span>👑</span>}
                                        </p>
                                        <p className="text-xs text-gray-400">{p.sipsTaken} gorgées totales</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-purple-400">{bac}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">g/L ALC.</p>
                                </div>
                            </div>
                            
                            {/* Badges / Extras */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {isBourreDeLaGare && (
                                    <div className="flex items-center gap-2 bg-red-900/40 border border-red-500/30 px-3 py-1 rounded-full">
                                        <span className="text-lg">🥴</span>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-red-200 uppercase leading-none">Bourré de la gare</span>
                                            <span className="text-[9px] text-red-400">{p.simonFailures} échecs Simon</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button onClick={onRestart} className="w-full py-4 bg-white text-black font-bold rounded-xl mt-auto">
                Rejouer
            </button>
        </div>
    );
};

export default function App() {
  const [screen, setScreen] = useState<'home' | 'setup' | 'game' | 'end'>('home');
  const [gameData, setGameData] = useState<{players: Player[], settings: GameSettings} | null>(null);

  useEffect(() => {
    // Initialize Auth anonymously
    authService.loginAnonymous().then(user => {
        if (user) {
            console.log("Logged in as", user.uid);
        } else {
            console.log("Running in offline mode (Auth failed or disabled).");
        }
    }).catch(err => {
        console.warn("Failed to initialize auth, continuing offline:", err);
    });
  }, []);

  return (
    <Layout>
      {screen === 'home' && <HomeScreen onStart={() => setScreen('setup')} />}
      
      {screen === 'setup' && (
        <SetupScreen onStartGame={(players, settings) => {
            setGameData({ players, settings });
            setScreen('game');
        }} />
      )}

      {screen === 'game' && gameData && (
        <GameScreen 
            players={gameData.players} 
            settings={gameData.settings} 
            onEndGame={(finalPlayers) => {
                setGameData(prev => prev ? ({ ...prev, players: finalPlayers }) : null);
                setScreen('end');
            }} 
        />
      )}

      {screen === 'end' && gameData && (
          <EndScreen 
            players={gameData.players} 
            settings={gameData.settings}
            onRestart={() => setScreen('home')} 
          />
      )}
    </Layout>
  );
}