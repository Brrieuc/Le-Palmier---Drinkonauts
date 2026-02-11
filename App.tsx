import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Layout } from './components/Layout';
import { PlayingCard } from './components/Card';
import { SimonGame } from './components/SimonGame';
import { MathGame } from './components/MathGame';
import { authService, dbService } from './services/firebase';
import { createDeck, getDifficultyMultiplier, calculateWidmark, getCardRule, getAlcoholIcon, getDistributionCost, calculateDynamicSips } from './services/gameUtils';
import { Player, GameSettings, GameState, Card, AlcoholType, Difficulty, PendingAction, ActiveRule, DrinkosaurProfile } from './types';

// --- COMPONENTS ---

// 1. QR SCANNER COMPONENT
const QRScanner = ({ onScan, onClose }: { onScan: (uid: string) => void, onClose: () => void }) => {
    useEffect(() => {
        // @ts-ignore
        const html5QrCode = new window.Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        html5QrCode.start({ facingMode: "environment" }, config, (decodedText: string) => {
            html5QrCode.stop().then(() => {
                onScan(decodedText);
            }).catch((err: any) => console.error(err));
        }, (errorMessage: any) => {
            // ignore errors for better UX
        }).catch((err: any) => console.error(err));

        return () => {
             // Cleanup if component unmounts
             try { html5QrCode.stop(); } catch(e) {}
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
            <h3 className="text-white font-bold mb-4 text-xl">Scanne le Pass Ami</h3>
            <div id="reader" className="w-full max-w-sm bg-black border border-white/20 rounded-lg overflow-hidden"></div>
            <button onClick={onClose} className="mt-8 px-6 py-3 bg-red-600 rounded-full font-bold">Annuler</button>
        </div>
    );
};

// 2. USER PROFILE / LOGIN COMPONENT
const UserProfileModal = ({ 
    isOpen, 
    onClose, 
    profile, 
    onLogin 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    profile: DrinkosaurProfile | null, 
    onLogin: () => void 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-sm glass-panel rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col items-center p-6">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
                
                {!profile ? (
                    <div className="text-center py-10">
                        <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-purple-500/50">
                            <span className="text-4xl">🦖</span>
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Identité Drinkosaur</h2>
                        <p className="text-gray-400 mb-8 text-sm px-4">Sauvegarde tes stats, crée ton pass joueur et rejoins la communauté.</p>
                        <button 
                            onClick={onLogin}
                            className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="G" />
                            Connexion Google
                        </button>
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center relative">
                         {/* ID CARD HEADER */}
                        <div className="w-full flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                            <img src={profile.photoURL || "https://ui-avatars.com/api/?name=" + profile.displayName} className="w-16 h-16 rounded-full border-2 border-purple-500 shadow-lg" alt="Profile" />
                            <div className="text-left">
                                <h2 className="text-xl font-bold text-white">{profile.displayName}</h2>
                                <span className="text-xs text-purple-400 font-mono uppercase tracking-widest">Membre Officiel</span>
                            </div>
                        </div>

                        {/* PASS DRINKOSAUR (QR) */}
                        <div className="bg-white p-4 rounded-xl shadow-inner mb-6 relative group cursor-pointer hover:scale-105 transition-transform duration-300">
                             <QRCode value={profile.uid} size={160} />
                             <p className="text-black text-[10px] text-center mt-2 font-mono uppercase font-bold tracking-widest">Pass Drinkosaur</p>
                        </div>

                        {/* STATS GRID */}
                        <div className="w-full grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-blue-400">{profile.stats.totalGames}</span>
                                <span className="text-[10px] text-gray-400 uppercase">Parties</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                                <span className="block text-2xl font-black text-pink-400">{profile.stats.totalSips}</span>
                                <span className="text-[10px] text-gray-400 uppercase">Gorgées</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                                <span className="block text-xl font-bold text-red-400">{profile.stats.simonFailures}</span>
                                <span className="text-[10px] text-gray-400 uppercase">Échecs Simon</span>
                            </div>
                             <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                                <span className="block text-xl font-bold text-green-400">{profile.stats.sipsGiven}</span>
                                <span className="text-[10px] text-gray-400 uppercase">Gorgées Données</span>
                            </div>
                        </div>

                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                            <span>📤</span> Partager mon Pass
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. MODAL OVERLAY (Pour l'AS ou PÉNALITÉ CUL SEC)
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
                // 10 gorgées symboliques pour un cul sec
                onResolve([{ targetId: action.initiatorId, sips: 10 }]);
            }
        } else {
            if (action.initiatorId) {
                onResolve([{ targetId: action.initiatorId, sips: aceSipsInput }]);
            }
        }
    };

    if (action.type === 'ace_check' || action.type === 'math_penalty') {
        const title = action.type === 'ace_check' ? "L'AS !" : "CALCUL RATÉ !";
        const subtitle = action.type === 'ace_check' ? "As-tu fini ton verre (Cul-Sec) ?" : "Tu as brisé le cercle ! Cul sec effectué ?";

        return (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                    <h3 className={`text-3xl font-black mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r ${action.type === 'math_penalty' ? 'from-red-500 to-orange-500' : 'from-yellow-400 to-red-500'}`}>
                        {title}
                    </h3>
                    <p className="text-white/80 mb-6 text-center">{subtitle}</p>
                    
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
                            <p className="mb-4 text-center text-sm">Combien de gorgées as-tu bues ?</p>
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


// 4. ACTIVE RULES SIDEBAR
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
                
                let borderColor = 'border-purple-500';
                let bgColor = 'bg-purple-900/80';
                let icon = '❓';

                if (rule.type === 'king') {
                    borderColor = 'border-yellow-500';
                    bgColor = 'bg-yellow-900/80';
                    icon = '👑';
                } else if (rule.type === 'freeze_master') {
                    borderColor = 'border-cyan-400';
                    bgColor = 'bg-cyan-900/80';
                    icon = '❄️';
                }

                return (
                    <button 
                        key={rule.id}
                        onClick={() => onTriggerRule(rule)}
                        className={`relative w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform active:scale-95 ${borderColor} ${bgColor}`}
                    >
                        <span className="font-bold text-xs text-white truncate w-full text-center px-1">{player.name.substring(0,3)}</span>
                        <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm text-black">
                            <span className="text-xs">{icon}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};


// --- SCREENS ---

// 1. HOME SCREEN
const HomeScreen = ({ onStart, onOpenProfile, currentUser }: { onStart: () => void, onOpenProfile: () => void, currentUser: DrinkosaurProfile | null }) => (
  <div className="flex flex-col items-center justify-center h-full space-y-8 p-6 text-center relative">
    
    {/* Profile Button Top Right */}
    <button 
        onClick={onOpenProfile}
        className="absolute top-4 right-4 z-40 p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 active:scale-95 transition-transform"
    >
        {currentUser ? (
            <img src={currentUser.photoURL || "https://ui-avatars.com/api/?name=" + currentUser.displayName} className="w-8 h-8 rounded-full border border-purple-400" alt="Profile" />
        ) : (
             <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
             </div>
        )}
    </button>

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
const SetupScreen = ({ onStartGame, currentUser }: { onStartGame: (players: Player[], settings: GameSettings) => void, currentUser: DrinkosaurProfile | null }) => {
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
    mathEnabled: false,
    maxPlayers: 20
  });

  const [isScanning, setIsScanning] = useState(false);

  // Auto-add current user if logged in
  useEffect(() => {
      if (currentUser && players.length === 0) {
          setPlayers([{
              id: currentUser.uid,
              name: currentUser.displayName.split(' ')[0], // First name only
              alcoholType: 'beer',
              sipsTaken: 0,
              sipsGiven: 0,
              simonFailures: 0,
              mathFailures: 0,
              weight: 75,
              gender: 'male',
              uid: currentUser.uid
          }]);
      }
  }, [currentUser]);

  const setMiniGame = (type: 'none' | 'simon' | 'math') => {
      setSettings(prev => ({
          ...prev,
          simonEnabled: type === 'simon',
          mathEnabled: type === 'math'
      }));
  };

  const addPlayer = () => {
    if (!newName.trim()) return;
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newName,
      alcoholType: newAlcohol,
      sipsTaken: 0,
      sipsGiven: 0,
      simonFailures: 0,
      mathFailures: 0,
      gender: newGender,
      weight: newWeight
    };
    setPlayers([...players, newPlayer]);
    setNewName('');
    setNewWeight(70);
    setNewGender('male');
    setNewAlcohol('beer');
  };

  const startScanning = () => { setIsScanning(true); };
  
  const handleScanSuccess = async (uid: string) => {
      setIsScanning(false);
      // Fetch user data from Firestore
      const friendProfile = await authService.getUserProfile(uid);
      if (friendProfile) {
          // Check if already added
          if (players.find(p => p.uid === uid)) {
              alert("Ce joueur est déjà dans la partie !");
              return;
          }

          setPlayers([...players, {
              id: friendProfile.uid,
              name: friendProfile.displayName.split(' ')[0],
              alcoholType: 'beer', // Default, maybe store pref in profile later
              sipsTaken: 0,
              sipsGiven: 0,
              simonFailures: 0,
              mathFailures: 0,
              weight: 75, // Default
              gender: 'male',
              uid: friendProfile.uid
          }]);
      } else {
          alert("Profil introuvable !");
      }
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
        
        {/* Mini-Jeu Selector */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col">
          <label className="text-xs text-gray-400 mb-2">Mini-Jeu</label>
          <div className="flex flex-col gap-1">
             <button 
                onClick={() => setMiniGame('none')} 
                className={`w-full py-1 rounded-lg text-xs transition-colors ${!settings.simonEnabled && !settings.mathEnabled ? 'bg-white text-black' : 'bg-white/10'}`}
             >
                Aucun
             </button>
             <div className="flex gap-1">
                <button 
                    onClick={() => setMiniGame('simon')} 
                    className={`flex-1 py-1 rounded-lg text-xs transition-colors ${settings.simonEnabled ? 'bg-green-500 text-white' : 'bg-white/10'}`}
                >
                    Simon
                </button>
                <button 
                    onClick={() => setMiniGame('math')} 
                    className={`flex-1 py-1 rounded-lg text-xs transition-colors ${settings.mathEnabled ? 'bg-blue-500 text-white' : 'bg-white/10'}`}
                >
                    Calcul
                </button>
             </div>
          </div>
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
                        <div className="flex items-center gap-2">
                            {p.uid && <span className="text-xs">🦖</span>}
                            <div>
                                <span className="font-medium block">{p.name}</span>
                                <span className="text-[10px] text-gray-400">{alcoholLabels[p.alcoholType]} • {p.weight}kg • {p.gender === 'male' ? 'H' : 'F'}</span>
                            </div>
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
                    <button onClick={startScanning} className="mt-2 w-full py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs hover:bg-indigo-500/30 transition-colors flex items-center justify-center gap-2">
                        <span>📷</span> Scanner un Pass Ami
                    </button>
                </div>
            )}
          </div>
      )}

      {isScanning && <QRScanner onScan={handleScanSuccess} onClose={() => setIsScanning(false)} />}

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
        isMathActive: false,
        gameStarted: false,
        gameOver: false,
        pendingAction: null,
        activeRules: []
    });
    const [localPlayers, setLocalPlayers] = useState<Player[]>(players);
    const [showSimon, setShowSimon] = useState(false);
    const [showMath, setShowMath] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [showTurnAnnouncement, setShowTurnAnnouncement] = useState(false);
    
    // Quit confirmation modal state
    const [showQuitConfirm, setShowQuitConfirm] = useState(false);
    
    // Distribution state for visual feedback
    const [distribution, setDistribution] = useState<Record<string, number>>({});
    const [sipsToDistribute, setSipsToDistribute] = useState(0);

    useEffect(() => {
        setGameState(prev => ({ ...prev, deck: createDeck(), gameStarted: true }));
    }, []);

    useEffect(() => {
        if (gameState.gameStarted && !gameState.gameOver) {
            setShowTurnAnnouncement(true);
            const timer = setTimeout(() => setShowTurnAnnouncement(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [gameState.currentPlayerIndex, gameState.gameStarted]);

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

        if (gameState.pendingAction?.initiatorId) {
             const initiatorIdx = newPlayers.findIndex(p => p.id === gameState.pendingAction?.initiatorId);
             if (initiatorIdx !== -1) {
                 const totalGiven = updates.reduce((sum, u) => sum + u.sips, 0);
                 newPlayers[initiatorIdx].sipsGiven += totalGiven;
             }
        }

        setLocalPlayers(newPlayers);
        
        if (gameState.pendingAction?.type === 'freeze_trap') {
            const remainingRules = gameState.activeRules.filter(r => !(r.type === 'freeze_master' && r.playerId === gameState.pendingAction?.initiatorId));
            setGameState(prev => ({ ...prev, activeRules: remainingRules, pendingAction: null }));
        } else {
            setGameState(prev => ({ ...prev, pendingAction: null }));
        }

        setDistribution({}); 
        setSipsToDistribute(0);
        finishTurn();
    };

    const finishTurn = () => {
         setGameState(prev => ({
            ...prev,
            isCardFlipped: false,
            currentCard: null,
            currentPlayerIndex: localPlayers.length > 0 ? (prev.currentPlayerIndex + 1) % localPlayers.length : 0
        }));
        
        if (!isQuickMode) {
            if (settings.simonEnabled && Math.random() > 0.8) {
                setShowSimon(true);
            }
            else if (settings.mathEnabled) {
                setShowMath(true);
            }
        }
    };

    const resetDistribution = () => {
        if (!gameState.pendingAction || !gameState.pendingAction.sipsToDistribute) return;
        setDistribution({});
        setSipsToDistribute(gameState.pendingAction.sipsToDistribute);
    };

    const validateMultipleLosers = () => {
        const updates = Object.keys(distribution).map(pid => {
            const p = localPlayers.find(pl => pl.id === pid);
            const sips = p ? calculateDynamicSips(1, settings.difficulty, p.alcoholType) : 1;
            return { targetId: pid, sips: sips };
        });
        handleActionResolve(updates);
    };

    const handleCardClick = () => {
        if (!gameState.currentCard) {
             if (gameState.deck.length === 0) {
                onEndGame(localPlayers);
                return;
            }
            const newDeck = [...gameState.deck];
            const card = newDeck.pop()!;
            
            if (!isQuickMode && card.rank === 'Q') {
                setLocalPlayers(prev => prev.map(p => ({ 
                    ...p, 
                    sipsTaken: p.sipsTaken + calculateDynamicSips(1, settings.difficulty, p.alcoholType) 
                })));
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

        if (gameState.pendingAction) return;
        if (isQuickMode) {
            finishTurn();
            return;
        }

        const card = gameState.currentCard;
        const rule = getCardRule(card.rank);
        let newPendingAction: PendingAction | null = null;
        let newActiveRules = [...gameState.activeRules];

        if (['2', '3', '8'].includes(card.rank)) {
            const amount = parseInt(card.rank);
            newPendingAction = { type: 'distribute', sipsToDistribute: amount, currentSipsRemaining: amount, initiatorId: currentPlayer.id };
            setSipsToDistribute(amount);
        } else if (card.rank === 'A') {
            newPendingAction = { type: 'ace_check', initiatorId: currentPlayer.id };
        } else if (card.rank === '7') {
            newActiveRules = newActiveRules.filter(r => r.type !== 'question_master');
            newActiveRules.push({ id: Date.now().toString(), playerId: currentPlayer.id, type: 'question_master', timestamp: Date.now() });
            showToast(`Nouveau Maître de la question : ${currentPlayer.name}`);
            setGameState(prev => ({ ...prev, activeRules: newActiveRules }));
            finishTurn();
            return;
        } else if (card.rank === '10') {
             newActiveRules = newActiveRules.filter(r => r.type !== 'freeze_master');
             newActiveRules.push({ id: Date.now().toString(), playerId: currentPlayer.id, type: 'freeze_master', timestamp: Date.now() });
             showToast(`Nouveau Maître du Freeze : ${currentPlayer.name}`);
             setGameState(prev => ({ ...prev, activeRules: newActiveRules }));
             finishTurn();
             return;
        } else if (card.rank === 'K') {
            newActiveRules.push({ id: Date.now().toString(), playerId: currentPlayer.id, type: 'king', timestamp: Date.now() });
             setGameState(prev => ({ ...prev, activeRules: newActiveRules }));
             finishTurn();
             return;
        } else if (card.rank === '9') {
             newPendingAction = { type: 'multiple_losers', cardName: "Je n'ai jamais", initiatorId: currentPlayer.id };
        } else if (['4', '5', '6', 'J'].includes(card.rank)) {
            newPendingAction = { type: 'select_loser', cardName: rule.title, initiatorId: currentPlayer.id };
        } else {
            finishTurn();
            return;
        }

        if (newPendingAction) {
            setGameState(prev => ({ ...prev, pendingAction: newPendingAction }));
        }
    };

    const handlePlayerClick = (targetId: string) => {
        if (!gameState.pendingAction) return;
        const action = gameState.pendingAction;
        const targetPlayer = localPlayers.find(p => p.id === targetId);
        if (!targetPlayer) return;

        if (action.type === 'select_loser' || action.type === 'king_rule' || action.type === 'question_master_trap' || action.type === 'freeze_trap') {
            const sips = calculateDynamicSips(3, settings.difficulty, targetPlayer.alcoholType);
            handleActionResolve([{ targetId, sips }]);
        }

        if (action.type === 'distribute') {
            if (sipsToDistribute > 0) {
                const cost = getDistributionCost(targetPlayer.alcoholType);
                if (sipsToDistribute >= cost) {
                    const newDist = { ...distribution, [targetId]: (distribution[targetId] || 0) + 1 };
                    setDistribution(newDist);
                    setSipsToDistribute(prev => prev - cost);
                    if ((sipsToDistribute - cost) < 1) {
                         setTimeout(() => {
                             const updates = Object.entries(newDist).map(([pid, sips]) => ({ targetId: pid, sips: sips as number }));
                             handleActionResolve(updates);
                         }, 500);
                    }
                } else {
                    showToast(`Pas assez de points ! Coût: ${cost}`);
                }
            }
        }

        if (action.type === 'multiple_losers') {
            const newDist = { ...distribution };
            if (newDist[targetId]) {
                delete newDist[targetId];
            } else {
                newDist[targetId] = 1; // Just marking selection
            }
            setDistribution(newDist);
        }
    };

    const handleSidebarRuleTrigger = (rule: ActiveRule) => {
        if (gameState.pendingAction || isQuickMode) return;
        if (rule.type === 'king') {
            setGameState(prev => ({ ...prev, pendingAction: { type: 'king_rule', initiatorId: rule.playerId } }));
        } else if (rule.type === 'question_master') {
            setGameState(prev => ({ ...prev, pendingAction: { type: 'question_master_trap', initiatorId: rule.playerId } }));
        } else if (rule.type === 'freeze_master') {
            setGameState(prev => ({ ...prev, pendingAction: { type: 'freeze_trap', initiatorId: rule.playerId } }));
        }
    };

    const handleSimonComplete = (success: boolean) => {
        setShowSimon(false);
        if (!success && !isQuickMode) {
            const updated = [...localPlayers];
            const sips = calculateDynamicSips(5, settings.difficulty, updated[gameState.currentPlayerIndex].alcoholType);
            updated[gameState.currentPlayerIndex].simonFailures++;
            updated[gameState.currentPlayerIndex].sipsTaken += sips;
            setLocalPlayers(updated);
        }
    };

    const handleMathComplete = (success: boolean) => {
        setShowMath(false);
        if (!success && !isQuickMode) {
            const updated = [...localPlayers];
            updated[gameState.currentPlayerIndex].mathFailures = (updated[gameState.currentPlayerIndex].mathFailures || 0) + 1;
            setLocalPlayers(updated);
            setGameState(prev => ({ ...prev, pendingAction: { type: 'math_penalty', initiatorId: currentPlayer.id } }));
        }
    };

    const getActionInstruction = () => {
        if (!gameState.pendingAction) return null;
        const { type, cardName } = gameState.pendingAction;
        if (type === 'distribute') return `Distribue ${sipsToDistribute} points de gorgées`;
        if (type === 'multiple_losers') return `Sélectionne les perdants (Je n'ai jamais)`;
        if (type === 'select_loser') return `Qui a raté "${cardName}" ?`;
        if (type === 'king_rule') return "Qui a enfreint la règle du Roi ?";
        if (type === 'question_master_trap') return "Qui est tombé dans le piège ?";
        if (type === 'freeze_trap') return "Qui est le dernier à s'être figé ?";
        return null;
    };

    return (
        <div className="relative h-full flex flex-col p-4">
            {notification && (
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-50 bg-white text-black px-6 py-2 rounded-full shadow-xl animate-fade-in-down font-bold text-sm text-center whitespace-nowrap">
                    {notification}
                </div>
            )}

            {/* QUIT CONFIRMATION MODAL - High Z-Index */}
            {showQuitConfirm && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
                        <h3 className="text-2xl font-black text-white mb-4">Abandonner ?</h3>
                        <p className="text-gray-400 mb-8">La partie se terminera et les statistiques seront enregistrées.</p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowQuitConfirm(false)} 
                                className="flex-1 py-3 bg-white/10 rounded-xl font-bold"
                            >
                                NON
                            </button>
                            <button 
                                onClick={() => { setShowQuitConfirm(false); onEndGame(localPlayers); }} 
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white shadow-lg shadow-red-900/50"
                            >
                                OUI
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(gameState.pendingAction?.type === 'ace_check' || gameState.pendingAction?.type === 'math_penalty') && (
                <ModalOverlay action={gameState.pendingAction} onResolve={handleActionResolve} />
            )}

            {showTurnAnnouncement && !isQuickMode && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-[1px] animate-fade-in">
                    <span className="text-sm font-bold text-purple-300 uppercase tracking-[0.2em] mb-4 shadow-black drop-shadow-lg animate-pulse">C'est au tour de</span>
                    <h1 className="text-6xl font-black text-white text-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] scale-110 transition-transform">
                        {currentPlayer?.name}
                    </h1>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-30 w-full">
                {!isQuickMode && (
                    <div className={`flex flex-col items-start transition-all duration-700 transform ${showTurnAnnouncement ? 'opacity-0 -translate-x-10' : 'opacity-100 translate-x-0'}`}>
                        <div className="flex items-center gap-2">
                             <span className="font-black text-2xl tracking-tight text-white drop-shadow-md">{currentPlayer?.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-xs text-green-400 font-medium uppercase tracking-wider">Ton tour</span>
                        </div>
                    </div>
                )}
                {isQuickMode && <div></div>}

                <button 
                    onClick={() => setShowQuitConfirm(true)} 
                    className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-300 active:scale-95 transition-all hover:bg-red-500/20 backdrop-blur-md cursor-pointer pointer-events-auto"
                >
                    QUITTER
                </button>
            </div>

            <ActiveRulesSidebar rules={gameState.activeRules} players={localPlayers} onTriggerRule={handleSidebarRuleTrigger} />

            {/* Game Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {gameState.pendingAction && gameState.pendingAction.type !== 'ace_check' && gameState.pendingAction.type !== 'math_penalty' && (
                    <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 pointer-events-none">
                         <div className="bg-black/90 px-6 py-4 rounded-xl border border-white/20 animate-pulse pointer-events-auto shadow-2xl">
                             <p className="text-xl font-bold text-center text-white mb-2">{getActionInstruction()}</p>
                             {gameState.pendingAction.type === 'distribute' && (
                                 <button onClick={resetDistribution} className="mt-2 text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 w-full transition-colors">
                                     Réinitialiser (Reste: {sipsToDistribute})
                                 </button>
                             )}
                             {gameState.pendingAction.type === 'multiple_losers' && (
                                 <button onClick={validateMultipleLosers} className="mt-2 text-sm font-bold bg-green-600 px-4 py-2 rounded-lg hover:bg-green-500 w-full transition-colors shadow-lg shadow-green-900/50">
                                     Valider
                                 </button>
                             )}
                         </div>
                    </div>
                )}

                {showSimon ? (
                    <SimonGame onComplete={handleSimonComplete} />
                ) : showMath ? (
                    <MathGame onComplete={handleMathComplete} />
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
                            className="w-64 h-96 rounded-2xl bg-gradient-to-br from-indigo-900 to-black border-2 border-white/20 shadow-2xl flex items-center justify-center cursor-pointer animate-pulse hover:scale-105 transition-transform"
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
            
            {!isQuickMode && (
                <div className={`mt-4 glass-panel rounded-t-2xl flex flex-col relative transition-all duration-300 max-h-[35vh] overflow-hidden ${gameState.pendingAction && gameState.pendingAction.type !== 'ace_check' && gameState.pendingAction.type !== 'math_penalty' ? 'ring-2 ring-purple-500 bg-purple-900/20' : ''}`}>
                    <div className="p-2 border-b border-white/5 bg-black/20 text-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest">Joueurs</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-4 gap-4 auto-rows-min">
                            {localPlayers.map((p, i) => (
                                <button 
                                    key={p.id} 
                                    onClick={() => handlePlayerClick(p.id)}
                                    disabled={!gameState.pendingAction || gameState.pendingAction.type === 'ace_check' || gameState.pendingAction.type === 'math_penalty'}
                                    className={`flex flex-col items-center transition-all duration-300 relative 
                                        ${i === gameState.currentPlayerIndex && !gameState.pendingAction ? 'scale-110 opacity-100 z-10' : ''}
                                        ${gameState.pendingAction && gameState.pendingAction.type !== 'ace_check' && gameState.pendingAction.type !== 'math_penalty' ? 'opacity-100 hover:scale-110 cursor-pointer active:scale-95' : 'opacity-60'}
                                    `}
                                >
                                    <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border border-white/10
                                        ${i === gameState.currentPlayerIndex ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30' : 'bg-gray-800'}
                                        ${distribution[p.id] ? 'ring-2 ring-green-400 scale-105' : ''}
                                    `}>
                                        {p.name.charAt(0)}
                                        {gameState.activeRules.find(r => r.playerId === p.id && r.type === 'question_master') && <span className="absolute -top-2 -right-2 text-sm drop-shadow-md">❓</span>}
                                        {gameState.activeRules.find(r => r.playerId === p.id && r.type === 'king') && <span className="absolute -bottom-2 -right-2 text-sm drop-shadow-md">👑</span>}
                                        {gameState.activeRules.find(r => r.playerId === p.id && r.type === 'freeze_master') && <span className="absolute -top-2 -left-2 text-sm drop-shadow-md">❄️</span>}
                                        {distribution[p.id] && distribution[p.id] > 0 && (
                                            <div className="absolute inset-0 bg-green-600/90 rounded-full flex items-center justify-center text-sm font-bold shadow-md animate-bounce backdrop-blur-sm">
                                                +{distribution[p.id]}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] mt-1 font-medium truncate w-full text-center">{p.name}</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-[10px] grayscale brightness-150">{getAlcoholIcon(p.alcoholType)}</span>
                                        <span className="text-[9px] font-mono text-gray-400">{p.sipsTaken}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            
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
    const maxMathFails = Math.max(...players.map(p => p.mathFailures || 0));
    const maxSipsGiven = Math.max(...players.map(p => p.sipsGiven));

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
                    const isMathDuncre = settings.mathEnabled && p.mathFailures === maxMathFails && maxMathFails > 0;
                    const isGenerous = p.sipsGiven === maxSipsGiven && maxSipsGiven > 0;

                    return (
                        <div key={p.id} className={`glass-panel p-4 rounded-xl flex flex-col relative overflow-hidden ${index === 0 ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-400' : 'text-gray-500'}`}>#{index + 1}</span>
                                    <div>
                                        <p className="font-bold text-lg flex items-center gap-2">
                                            {p.name} {index === 0 && <span>👑</span>}
                                            {p.uid && <span className="text-[10px]">🦖</span>}
                                        </p>
                                        <div className="flex flex-col text-xs text-gray-400">
                                            <span>Bu : {p.sipsTaken} | Donné : {p.sipsGiven}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-purple-400">{bac}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">g/L ALC.</p>
                                    <span className="text-lg">{getAlcoholIcon(p.alcoholType)}</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {isBourreDeLaGare && (
                                    <div className="flex items-center gap-1 bg-red-900/40 border border-red-500/30 px-2 py-1 rounded-md">
                                        <span className="text-sm">🥴</span>
                                        <span className="text-[9px] font-bold text-red-200 uppercase">Bourré gare</span>
                                    </div>
                                )}
                                {isMathDuncre && (
                                    <div className="flex items-center gap-1 bg-blue-900/40 border border-blue-500/30 px-2 py-1 rounded-md">
                                        <span className="text-sm">📉</span>
                                        <span className="text-[9px] font-bold text-blue-200 uppercase">Maths Nul</span>
                                    </div>
                                )}
                                {isGenerous && (
                                    <div className="flex items-center gap-1 bg-green-900/40 border border-green-500/30 px-2 py-1 rounded-md">
                                        <span className="text-sm">🎁</span>
                                        <span className="text-[9px] font-bold text-green-200 uppercase">Généreux</span>
                                    </div>
                                )}
                            </div>
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
  
  // Drinkosaur Identity State
  const [showProfile, setShowProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState<DrinkosaurProfile | null>(null);

  // Initialize Auth
  useEffect(() => {
    authService.loginAnonymous().catch(console.warn);
    const auth = authService.getCurrentUser();
    if (auth && !auth.isAnonymous) {
        // If not anonymous (already Google logged in previously)
        authService.getUserProfile(auth.uid).then(setCurrentUser);
    }
  }, []);

  const handleGoogleLogin = async () => {
      const profile = await authService.loginGoogle();
      if (profile) {
          setCurrentUser(profile);
      }
  };

  return (
    <Layout>
      <UserProfileModal 
          isOpen={showProfile} 
          onClose={() => setShowProfile(false)} 
          profile={currentUser}
          onLogin={handleGoogleLogin}
      />
      
      {screen === 'home' && <HomeScreen onStart={() => setScreen('setup')} onOpenProfile={() => setShowProfile(true)} currentUser={currentUser} />}
      {screen === 'setup' && (
        <SetupScreen onStartGame={(players, settings) => {
            setGameData({ players, settings });
            setScreen('game');
        }} currentUser={currentUser} />
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