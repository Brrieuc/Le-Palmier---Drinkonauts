import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, Auth, User, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, Firestore, collection, addDoc, serverTimestamp, increment } from "firebase/firestore";
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

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} catch (e) {
  console.warn("Firebase initialization failed:", e);
}

try {
  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn("Firebase service registration failed:", e);
}

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
  
  loginGoogle: async (): Promise<DrinkosaurProfile | null> => {
    if (!auth || !db) return null;
    try {
      const provider = new GoogleAuthProvider();
      // Ajout de scopes optionnels si besoin dans le futur
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let profile: DrinkosaurProfile;

      if (!userDoc.exists()) {
        // Create new profile
        profile = {
          uid: user.uid,
          displayName: user.displayName || "Joueur Anonyme",
          photoURL: user.photoURL,
          stats: {
            totalSips: 0,
            totalGames: 0,
            simonFailures: 0,
            mathFailures: 0,
            sipsGiven: 0
          },
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, profile);
      } else {
        profile = userDoc.data() as DrinkosaurProfile;
      }
      return profile;
    } catch (error: any) {
      console.error("Google Auth Error Code:", error.code);
      console.error("Google Auth Error Message:", error.message);
      if (error.code === 'auth/unauthorized-domain') {
          alert("Domaine non autorisé. Ajoutez ce domaine (localhost ou vercel) dans la console Firebase > Authentication > Settings > Authorized Domains.");
      }
      return null;
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
  }
};

export const dbService = {
  saveGameSession: async (players: Player[], settings: GameSettings) => {
    if (!db) return;
    try {
      // 1. Save Session
      await addDoc(collection(db, "game_sessions"), {
        date: serverTimestamp(),
        settings,
        players: players.map(p => ({
          name: p.name,
          sips: p.sipsTaken,
          uid: p.uid || null
        }))
      });

      // 2. Update Cumulative Stats for Linked Players
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