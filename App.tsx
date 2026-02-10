import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { PlayingCard } from './components/Card';
import { SimonGame } from './components/SimonGame';
import { authService, dbService } from './services/firebase';
import { createDeck, getDifficultyMultiplier, calculateWidmark, getCardRule } from './services/gameUtils';
import { Player, GameSettings, GameState, Card, AlcoholType, Difficulty, PendingAction, ActiveRule } from './types';

// --- SUB-COMPONENTS ---

// 1. MODAL OVERLAY (Uniquement pour l'AS ou validation complexe)
const ModalOverlay = ({ 
    action, 
    onResolve 
}: { 
    action: PendingAction, 
    onResolve: (updates: { targetId: string, sips: number }[]) => void 
}) => {
    const [aceChoice, setAceChoice] = useState<'cul_sec' | 'sips' | null>(null);
    const [aceSipsInput, setAceSipsInput] = useState(5);

    const submitAce = () => {
        if (aceChoice === 'cul_sec') {
            if (action.initiatorId) {
                onResolve([{ targetId: action.initiatorId, sips: 10 }]);
            }
        } else {
            if (action.initiatorId) {
                onResolve([{ targetId: action.initiatorId, sips: aceSipsInput }]);
            }
        }
    };

    if (action.type === 'ace_check') {
        return (
            <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                    <h3 className="text-3xl font-black mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">L'AS !</h3>
                    <p className="text-white/80 mb-6 text-center">As-tu fini ton verre (Cul-Sec) ?</p>
                    
                    {!aceChoice ? (
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button onClick={() => setAceChoice('cul_sec')} className="py-4 bg-gradient-to-br from-green-600 to-green-800 rounded-xl font-bold text-lg shadow-lg">OUI 🍺</button>
                            <button onClick={() => setAceChoice('sips')} className="py-4 bg-white/10 rounded-xl font-bold text-lg">NON</button>
                        </div>
                    ) : aceChoice === 'cul_sec' ? (
                        <div className="text-center">
                            <span className="text-5xl mb-4 block animate-bounce">🏆</span>
                            <p className="mb-6 font-bold text-yellow-400">Légende !</p>
                            <button onClick={submitAce} className="w-full py-3 bg-white text-black rounded-xl font-bold">Continuer</button>
                        </div>
                    ) : (
                        <div className="w-full bg-white/5 p-4 rounded-xl">
                            <p className="mb-4 text-center text-sm">Combien de gorgées ?</p>
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => setAceSipsInput(Math.max(1, aceSipsInput - 1))} className="w-10 h-10 rounded-full bg-white/10 text-xl font-bold">-</button>
                                <span className="flex-1 text-center text-3xl font-bold">{aceSipsInput}</span>
                                <button onClick={() => setAceSipsInput(aceSipsInput + 1)} className="w-10 h-10 rounded-full bg-white/10 text-xl font-bold">+</button>
                            </div>
                            <button onClick={submitAce} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">Valider</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};


// 2. ACTIVE RULES SIDEBAR
const ActiveRulesSidebar = ({ 
    rules, 
    players, 
    onTriggerRule 
}: { 
    rules: ActiveRule[], 
    players: Player[], 
    onTriggerRule: (rule: ActiveRule) => void 
}) => {
    if (rules.length === 0) return null;

    return (
        <div className="absolute top-16 right-0 z-30 flex flex-col gap-2 p-2 max-h-[60vh] overflow-y-auto no-scrollbar pointer-events-auto">
            {rules.map(rule => {
                const player = players.find(p => p.id === rule.playerId);
                if (!player) return null;
                const isKing = rule.type === 'king';
                return (
                    <button 
                        key={rule.id}
                        onClick={() => onTriggerRule(rule)}
                        className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isKing ? 'border-yellow-500 bg-yellow-900/80' : 'border-purple-500 bg-purple-900/80'}`}
                    >
                        <span className="font-bold text-xs text-white truncate w-full text-center px-1">{player.name.substring(0,3)}</span>
                        <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <span className="text-xs">{isKing ? '👑' : '❓'}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};


// --- SCREENS ---

// 1. HOME SCREEN
const HomeScreen = ({ onStart }: { onStart: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-8 p-6 text-center">
    <div className="relative group">
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
  const [isFormVisible, setIsFormVisible] = useState(true);
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
    setNewWeight(70);
    setNewGender('male');
    setNewAlcohol('beer');
  };

  const startScanning = async () => { setIsScanning(true); };
  const stopScanning = () => { setIsScanning(false); };
  const simulateScan = () => {
      setPlayers([...players, {
          id: 'scanned-' + Date.now(),
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
      <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
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

      {/* Players Section - Masqué en mode Rapide */}
      {settings.mode !== 'quick' && (
          <div className="flex-1 glass-panel rounded-2xl p-4 mb-4 overflow-hidden flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold">Joueurs ({players.length})</h3>
                <button 
                    onClick={() => setIsFormVisible(!isFormVisible)}
                    className="text-xs px-3 py-1 bg-white/10 rounded-full"
                >
                    {isFormVisible ? 'Masquer Ajout' : 'Ajouter Joueur'}
                </button>
            </div>

            <div className={`overflow-y-auto space-y-2 mb-4 transition-all ${isFormVisible ? 'flex-1' : 'h-full'}`}>
                {players.length === 0 && <p className="text-sm text-gray-500 text-center italic mt-4">Aucun joueur</p>}
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
            
            {isFormVisible && (
                <div className="bg-black/20 p-3 rounded-xl space-y-2 shrink-0 animate-fade-in">
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
                            <input type="number" value={newWeight} onChange={(e) => setNewWeight(parseInt(e.target.value) || 0)} className="w-full bg-transparent py-2 text-xs focus:outline-none" placeholder="70" />
                            <span className="text-xs text-gray-400 mr-1">kg</span>
                        </div>
                        <div className="flex bg-white/10 border border-white/20 rounded-lg p-1">
                            <button onClick={() => setNewGender('male')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${newGender === 'male' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}>H</button>
                            <button onClick={() => setNewGender('female')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${newGender === 'female' ? 'bg-pink-500 text-white' : 'text-gray-400'}`}>F</button>
                        </div>
                        <button onClick={addPlayer} className="bg-white/20 px-4 py-2 rounded-lg hover:bg-white/30 transition-colors">+</button>
                    </div>
                    <button onClick={startScanning} className="mt-2 w-full py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs hover:bg-indigo-500/30 transition-colors">📸 Scanner un Pass Ami</button>
                </div>
            )}
          </div>
      )}

      {isScanning && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
              <button onClick={stopScanning} className="absolute top-4 right-4 bg-red-600 p-2 rounded">Fermer</button>
              <div className="flex-1 flex items-center justify-center"><p>Scanner (Simulé)</p></div>
              <button onClick={simulateScan} className="bg-green-600 p-4 m-4 rounded">Simuler Scan</button>
          </div>
      )}

      <button 
        onClick={() => onStartGame(players, settings)}
        disabled={settings.mode !== 'quick' && players.length === 0}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-lg disabled:opacity-50 shadow-lg shadow-purple-900/50 shrink-0 mt-auto"
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
        gameOver: false,
        pendingAction: null,
        activeRules: []
    });
    const [localPlayers, setLocalPlayers] = useState<Player[]>(players);
    const [showSimon, setShowSimon] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    
    // Distribution state for visual feedback
    const [distribution, setDistribution] = useState<Record<string, number>>({});
    const [sipsToDistribute, setSipsToDistribute] = useState(0);

    useEffect(() => {
        setGameState(prev => ({ ...prev, deck: createDeck(), gameStarted: true }));
    }, []);

    const currentPlayer = localPlayers[gameState.currentPlayerIndex];
    const isQuickMode = settings.mode === 'quick';

    const showToast = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleActionResolve = (updates: { targetId: string, sips: number }[]) => {
        if (isQuickMode) {
             setGameState(prev => ({ ...prev, pendingAction: null }));
             finishTurn();
             return;
        }

        const newPlayers = [...localPlayers];
        updates.forEach(upd => {
            const idx = newPlayers.findIndex(p => p.id === upd.targetId);
            if (idx !== -1) newPlayers[idx].sipsTaken += upd.sips;
        });
        setLocalPlayers(newPlayers);
        setGameState(prev => ({ ...prev, pendingAction: null }));
        setDistribution({}); // Reset visual distribution
        setSipsToDistribute(0);
        finishTurn();
    };

    const finishTurn = () => {
         // Next Turn logic
         setGameState(prev => ({
            ...prev,
            isCardFlipped: false,
            currentCard: null,
            currentPlayerIndex: localPlayers.length > 0 ? (prev.currentPlayerIndex + 1) % localPlayers.length : 0
        }));
        
        if (settings.simonEnabled && !isQuickMode && Math.random() > 0.8) {
            setShowSimon(true);
        }
    };

    const handleCardClick = () => {
        // 1. If no card, draw one
        if (!gameState.currentCard) {
             if (gameState.deck.length === 0) {
                onEndGame(localPlayers);
                return;
            }
            const newDeck = [...gameState.deck];
            const card = newDeck.pop()!;
            
            // Auto-apply Q drink in background if needed, but let's keep it simple
            if (!isQuickMode && card.rank === 'Q') {
                setLocalPlayers(prev => prev.map(p => ({ ...p, sipsTaken: p.sipsTaken + 1 })));
            }

            setGameState(prev => ({
                ...prev,
                deck: newDeck,
                currentCard: card,
                isCardFlipped: true,
                discardPile: [...prev.discardPile, card]
            }));
            return;
        }

        // 2. Card is visible. If Action Pending, prevent click (must resolve via UI)
        if (gameState.pendingAction) return;

        // 3. Card is visible. Click to Trigger Action OR Next Turn
        if (isQuickMode) {
            // Quick mode: always next turn
            finishTurn();
            return;
        }

        // Analyze Card for Interactions
        const card = gameState.currentCard;
        const rule = getCardRule(card.rank);
        let newPendingAction: PendingAction | null = null;
        let newActiveRules = [...gameState.activeRules];

        // Distribution (2, 3, 8)
        if (['2', '3', '8'].includes(card.rank)) {
            newPendingAction = { type: 'distribute', sipsToDistribute: parseInt(card.rank), initiatorId: currentPlayer.id };
            setSipsToDistribute(parseInt(card.rank));
        } 
        // Ace
        else if (card.rank === 'A') {
            newPendingAction = { type: 'ace_check', initiatorId: currentPlayer.id };
        }
        // Question Master
        else if (card.rank === '7') {
            newActiveRules = newActiveRules.filter(r => r.type !== 'question_master');
            newActiveRules.push({ id: Date.now().toString(), playerId: currentPlayer.id, type: 'question_master', timestamp: Date.now() });
            showToast(`Nouveau Maître : ${currentPlayer.name}`);
            // No user action required to proceed, just update state and next turn
            setGameState(prev => ({ ...prev, activeRules: newActiveRules }));
            finishTurn();
            return;
        }
        // King
        else if (card.rank === 'K') {
            newActiveRules.push({ id: Date.now().toString(), playerId: currentPlayer.id, type: 'king', timestamp: Date.now() });
             setGameState(prev => ({ ...prev, activeRules: newActiveRules }));
             finishTurn(); // Rule is invented orally, game moves on
             return;
        }
        // Loser Selectors (4, 5, 6, 9, J, 10)
        else if (['4', '5', '6', '9', '10', 'J'].includes(card.rank)) {
            newPendingAction = { type: 'select_loser', cardName: rule.title };
        }
        // Simple cards (Q) or others
        else {
            finishTurn();
            return;
        }

        // Set action if found
        if (newPendingAction) {
            setGameState(prev => ({ ...prev, pendingAction: newPendingAction }));
        }
    };

    const handlePlayerClick = (targetId: string) => {
        if (!gameState.pendingAction) return;
        const action = gameState.pendingAction;

        if (action.type === 'select_loser' || action.type === 'king_rule' || action.type === 'question_master_trap') {
            // Immediate resolve: 1 penalty (e.g., 3 sips or based on diff)
            handleActionResolve([{ targetId, sips: 3 }]);
        }

        if (action.type === 'distribute') {
            // Increment local distribution map
            const currentDist = distribution[targetId] || 0;
            if (sipsToDistribute > 0) {
                const newDist = { ...distribution, [targetId]: currentDist + 1 };
                setDistribution(newDist);
                setSipsToDistribute(prev => prev - 1);

                // If finished distributing, resolve immediately
                if (sipsToDistribute - 1 === 0) {
                     // small delay for UX
                     setTimeout(() => {
                         const updates = Object.entries(newDist).map(([pid, sips]) => ({ targetId: pid, sips: sips as number }));
                         handleActionResolve(updates);
                     }, 300);
                }
            }
        }
    };

    const handleSidebarRuleTrigger = (rule: ActiveRule) => {
        if (gameState.pendingAction || isQuickMode) return;
        if (rule.type === 'king') {
            setGameState(prev => ({ ...prev, pendingAction: { type: 'king_rule', initiatorId: rule.playerId } }));
        } else if (rule.type === 'question_master') {
            setGameState(prev => ({ ...prev, pendingAction: { type: 'question_master_trap', initiatorId: rule.playerId } }));
        }
    };

    const handleSimonComplete = (success: boolean) => {
        setShowSimon(false);
        if (!success && !isQuickMode) {
            const updated = [...localPlayers];
            updated[gameState.currentPlayerIndex].simonFailures++;
            updated[gameState.currentPlayerIndex].sipsTaken += 5;
            setLocalPlayers(updated);
        }
    };

    // Instruction Text Helper
    const getActionInstruction = () => {
        if (!gameState.pendingAction) return null;
        const { type, cardName } = gameState.pendingAction;
        if (type === 'distribute') return `Distribue ${sipsToDistribute} gorgées en touchant les joueurs`;
        if (type === 'select_loser') return `Qui a raté "${cardName}" ? Touche le joueur.`;
        if (type === 'king_rule') return "Qui a enfreint la règle du Roi ?";
        if (type === 'question_master_trap') return "Qui est tombé dans le piège ?";
        return null;
    };

    return (
        <div className="relative h-full flex flex-col p-4">
            {notification && (
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 bg-white text-black px-6 py-2 rounded-full shadow-xl animate-fade-in-down font-bold text-sm text-center whitespace-nowrap">
                    {notification}
                </div>
            )}

            {/* Modal for Ace only */}
            {gameState.pendingAction?.type === 'ace_check' && (
                <ModalOverlay action={gameState.pendingAction} onResolve={handleActionResolve} />
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10">
                <button onClick={() => confirm("Quitter ?") && onEndGame(localPlayers)} className="px-3 py-1 bg-white/10 rounded-full text-xs">Quitter</button>
                {!isQuickMode && (
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-lg">{currentPlayer?.name}</span>
                        <span className="text-xs text-purple-300">C'est ton tour</span>
                    </div>
                )}
            </div>

            <ActiveRulesSidebar rules={gameState.activeRules} players={localPlayers} onTriggerRule={handleSidebarRuleTrigger} />

            {/* Game Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Dimmer Overlay for Interaction Mode */}
                {gameState.pendingAction && gameState.pendingAction.type !== 'ace_check' && (
                    <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center p-4">
                         <div className="bg-black/80 px-6 py-4 rounded-xl border border-white/20 animate-pulse">
                             <p className="text-xl font-bold text-center text-white">{getActionInstruction()}</p>
                         </div>
                    </div>
                )}

                {showSimon ? (
                    <SimonGame onComplete={handleSimonComplete} />
                ) : (
                    gameState.currentCard ? (
                        <PlayingCard 
                            card={gameState.currentCard} 
                            isFlipped={gameState.isCardFlipped} 
                            onClick={handleCardClick} 
                        />
                    ) : (
                         <div 
                            onClick={handleCardClick}
                            className="w-64 h-96 rounded-2xl bg-gradient-to-br from-indigo-900 to-black border-2 border-white/20 shadow-2xl flex items-center justify-center cursor-pointer animate-pulse"
                         >
                             <div className="text-center">
                                 <span className="text-4xl block mb-2">🃏</span>
                                 <span className="text-sm text-gray-400 font-medium">Tirer une carte</span>
                                 <p className="mt-4 text-xs text-gray-500">{gameState.deck.length} cartes</p>
                             </div>
                         </div>
                    )
                )}
            </div>
            
            {/* Player Bar - Interactive in Action Mode */}
            {!isQuickMode && (
                <div className={`mt-8 h-20 glass-panel rounded-xl flex items-center px-4 overflow-x-auto gap-4 no-scrollbar transition-all duration-300 ${gameState.pendingAction && gameState.pendingAction.type !== 'ace_check' ? 'ring-2 ring-purple-500 bg-purple-900/20' : ''}`}>
                    {localPlayers.map((p, i) => (
                        <button 
                            key={p.id} 
                            onClick={() => handlePlayerClick(p.id)}
                            disabled={!gameState.pendingAction || gameState.pendingAction.type === 'ace_check'}
                            className={`flex-shrink-0 flex flex-col items-center min-w-[60px] transition-all duration-300 relative 
                                ${i === gameState.currentPlayerIndex && !gameState.pendingAction ? 'scale-110 opacity-100' : ''}
                                ${gameState.pendingAction && gameState.pendingAction.type !== 'ace_check' ? 'opacity-100 hover:scale-110 cursor-pointer active:scale-95' : 'opacity-50'}
                            `}
                        >
                            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold 
                                ${i === gameState.currentPlayerIndex ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg' : 'bg-gray-700'}
                                ${gameState.pendingAction && gameState.pendingAction.type === 'distribute' && distribution[p.id] ? 'ring-2 ring-green-400' : ''}
                            `}>
                                {p.name.charAt(0)}
                                {gameState.activeRules.find(r => r.playerId === p.id && r.type === 'question_master') && <span className="absolute -top-1 -right-1 text-[10px]">❓</span>}
                                {gameState.activeRules.find(r => r.playerId === p.id && r.type === 'king') && <span className="absolute -bottom-1 -right-1 text-[10px]">👑</span>}
                                
                                {/* Distribution Badge */}
                                {gameState.pendingAction?.type === 'distribute' && distribution[p.id] > 0 && (
                                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs shadow-md animate-bounce">
                                        +{distribution[p.id]}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] mt-1 font-mono">{p.sipsTaken}</span>
                        </button>
                    ))}
                </div>
            )}
            
            {/* Empty footer for Quick Mode balance */}
            {isQuickMode && <div className="mt-8 h-10 w-full" />}
        </div>
    );
};

// 4. END SCREEN
const EndScreen = ({ players, settings, onRestart }: { players: Player[], settings: GameSettings, onRestart: () => void }) => {
    useEffect(() => {
        if(players.length > 0) dbService.saveGameSession(players, settings);
    }, []);

    if (players.length === 0) {
         return (
            <div className="h-full flex flex-col items-center justify-center p-6">
                <h2 className="text-3xl font-bold mb-4">Partie Terminée</h2>
                <p className="text-gray-400 mb-8">Mode rapide (pas de statistiques)</p>
                <button onClick={onRestart} className="w-full py-4 bg-white text-black font-bold rounded-xl">Rejouer</button>
            </div>
         );
    }

    const maxSimonFails = Math.max(...players.map(p => p.simonFailures));
    const sortedPlayers = [...players].sort((a, b) => {
        const bacA = parseFloat(calculateWidmark(a));
        const bacB = parseFloat(calculateWidmark(b));
        return bacB - bacA;
    });

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto">
            <h2 className="text-4xl font-black text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500">Statistiques</h2>
            <div className="space-y-4 mb-8">
                {sortedPlayers.map((p, index) => {
                    const bac = calculateWidmark(p);
                    const isBourreDeLaGare = settings.simonEnabled && p.simonFailures === maxSimonFails && maxSimonFails > 0;
                    return (
                        <div key={p.id} className={`glass-panel p-4 rounded-xl flex flex-col relative overflow-hidden ${index === 0 ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{index + 1}</span>
                                    <div>
                                        <p className="font-bold text-lg flex items-center gap-2">{p.name} {index === 0 && <span>👑</span>}</p>
                                        <p className="text-xs text-gray-400">{p.sipsTaken} gorgées</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-purple-400">{bac}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">g/L ALC.</p>
                                </div>
                            </div>
                            {isBourreDeLaGare && (
                                <div className="flex items-center gap-2 bg-red-900/40 border border-red-500/30 px-3 py-1 rounded-full w-fit">
                                    <span className="text-lg">🥴</span>
                                    <div className="flex flex-col"><span className="text-[10px] font-bold text-red-200 uppercase leading-none">Bourré de la gare</span></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <button onClick={onRestart} className="w-full py-4 bg-white text-black font-bold rounded-xl mt-auto">Rejouer</button>
        </div>
    );
};

export default function App() {
  const [screen, setScreen] = useState<'home' | 'setup' | 'game' | 'end'>('home');
  const [gameData, setGameData] = useState<{players: Player[], settings: GameSettings} | null>(null);

  useEffect(() => {
    authService.loginAnonymous().catch(console.warn);
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
          <EndScreen players={gameData.players} settings={gameData.settings} onRestart={() => setScreen('home')} />
      )}
    </Layout>
  );
}