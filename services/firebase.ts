import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithRedirect, getRedirectResult, Auth, User, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDoc, updateDoc, Firestore, collection, addDoc, serverTimestamp, increment } from "firebase/firestore";
import { Player, GameSettings, DrinkosaurProfile } from "../types";

// Configuration mise à jour pour le projet 'drinkonauts'
const firebaseConfig = {
  apiKey: "AIzaSyA3j394cOpuBkCyCnI9G4u9s3tM1txqOvU",
  authDomain: "drinkonauts.firebaseapp.com",
  projectId: "drinkonauts",
  storageBucket: "drinkonauts.firebasestorage.app",
  messagingSenderId: "663570393503",
  appId: "1:663570393503:web:3ac944de2b8d0b049ff5aa",
  measurementId: "G-PVK24591PW"
};

let app;
let auth: Auth | undefined;
let db: Firestore | undefined;

// Initialisation unique et robuste
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
}

try {
  if (app) {
    auth = getAuth(app);
    // Utilisation de initializeFirestore pour mieux gérer la persistance et éviter les erreurs "Client Offline" immédiates
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
    
    // Définir la persistance une seule fois au démarrage
    if (auth) {
        setPersistence(auth, browserLocalPersistence).catch((error) => {
            console.error("Auth Persistence Error:", error);
        });
    }
  }
} catch (e) {
  console.error("Firebase service registration failed:", e);
}

// Helper robuste pour créer ou récupérer le profil utilisateur
const ensureUserProfile = async (user: User): Promise<DrinkosaurProfile> => {
    // Profil par défaut (fallback) si Firestore est inaccessible
    const fallbackProfile: DrinkosaurProfile = {
        uid: user.uid,
        displayName: user.displayName || "Joueur",
        photoURL: user.photoURL,
        stats: {
            totalSips: 0,
            totalGames: 0,
            simonFailures: 0,
            mathFailures: 0,
            sipsGiven: 0
        },
        createdAt: Date.now() // Timestamp local au lieu de serverTimestamp pour le fallback
    };

    if (!db) return fallbackProfile;

    try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            const newProfile = { 
                ...fallbackProfile, 
                createdAt: serverTimestamp() // On remet le serverTimestamp pour l'écriture
            };
            await setDoc(userDocRef, newProfile);
            return fallbackProfile;
        }
        return userDoc.data() as DrinkosaurProfile;
    } catch (error) {
        console.warn("Firestore access failed (offline mode?), using local profile:", error);
        // CRITICAL FIX: Return fallback profile instead of null on error
        return fallbackProfile;
    }
};

export const authService = {
  loginAnonymous: async () => {
    if (!auth) return null;
    try {
      const userCredential = await signInAnonymously(auth);
      return userCredential.user;
    } catch (error) {
      console.warn("Anon Auth Error:", error);
      return null;
    }
  },
  
  // Modifié pour utiliser signInWithRedirect
  loginGoogle: async (): Promise<void> => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      console.error("Google Auth Redirect Error:", error);
      if (error.code === 'auth/unauthorized-domain') {
          alert("Erreur de domaine. Vérifiez la console Firebase.");
      }
    }
  },

  // Nouvelle fonction pour vérifier explicitement le résultat de redirection
  checkRedirect: async () => {
    if (!auth) return;
    try {
        await getRedirectResult(auth);
    } catch (error) {
        console.error("Redirect check error:", error);
    }
  },

  getCurrentUser: () => auth?.currentUser,

  subscribeAuth: (callback: (user: User | null) => void) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  },
  
  getUserProfile: async (uid: string): Promise<DrinkosaurProfile | null> => {
    if (!db) return null;
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) return docSnap.data() as DrinkosaurProfile;
      return null;
    } catch (e) {
      console.error("Error fetching profile:", e);
      return null;
    }
  },

  ensureUserProfile // Exporté pour usage interne ou externe si besoin
};

export const dbService = {
  saveGameSession: async (players: Player[], settings: GameSettings) => {
    if (!db) return;
    try {
      await addDoc(collection(db, "game_sessions"), {
        date: serverTimestamp(),
        settings,
        players: players.map(p => ({
          name: p.name,
          sips: p.sipsTaken,
          uid: p.uid || null
        }))
      });

      for (const p of players) {
        if (p.uid) {
           const userRef = doc(db, "users", p.uid);
           try {
               await updateDoc(userRef, {
                 "stats.totalSips": increment(p.sipsTaken),
                 "stats.totalGames": increment(1),
                 "stats.simonFailures": increment(p.simonFailures),
                 "stats.mathFailures": increment(p.mathFailures || 0),
                 "stats.sipsGiven": increment(p.sipsGiven)
               });
           } catch (updateError) {
               console.warn(`Could not update stats for user ${p.uid}`, updateError);
           }
        }
      }
    } catch (e) {
      console.warn("Error saving stats:", e);
    }
  }
};

export { auth, db };