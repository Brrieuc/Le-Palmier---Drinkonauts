import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, Auth, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, Firestore, collection, addDoc, serverTimestamp, increment } from "firebase/firestore";
import { Player, GameSettings, DrinkosaurProfile } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyDVDFY2AHllINoyUMwABQp1TBonUOKaeKE",
  authDomain: "tacklor-mark.firebaseapp.com",
  projectId: "tacklor-mark",
  appId: "1:629798377570:web:e68f69fb0f104e484b593b"
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
    } catch (error) {
      console.error("Google Auth Error:", error);
      return null;
    }
  },

  getCurrentUser: () => auth?.currentUser,
  
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
           await updateDoc(userRef, {
             "stats.totalSips": increment(p.sipsTaken),
             "stats.totalGames": increment(1),
             "stats.simonFailures": increment(p.simonFailures),
             "stats.mathFailures": increment(p.mathFailures || 0),
             "stats.sipsGiven": increment(p.sipsGiven)
           });
        }
      }
    } catch (e) {
      console.warn("Error saving stats:", e);
    }
  }
};

export { auth, db };