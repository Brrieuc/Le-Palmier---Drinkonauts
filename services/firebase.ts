import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, Auth } from "firebase/auth";
import { getFirestore, doc, setDoc, Firestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Player, GameSettings } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyDVDFY2AHllINoyUMwABQp1TBonUOKaeKE",
  authDomain: "tacklor-mark.firebaseapp.com",
  projectId: "tacklor-mark",
  appId: "1:629798377570:web:e68f69fb0f104e484b593b"
};

// Singleton pattern to ensure initializeApp is called only once
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
  console.error("Firebase initialization failed:", e);
}

try {
  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Firebase service registration failed:", e);
}

export const authService = {
  loginAnonymous: async () => {
    if (!auth) {
      console.warn("Offline Mode: Auth not initialized.");
      return null;
    }
    try {
      const userCredential = await signInAnonymously(auth);
      return userCredential.user;
    } catch (error: any) {
      // Handle the case where Anonymous Auth is disabled in Firebase Console
      if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
        console.warn("Offline Mode: Anonymous Authentication is not enabled in Firebase Console.");
        return null;
      }
      
      console.error("Auth Error:", error);
      // Return null for other errors to prevent app crash and allow offline play
      return null;
    }
  },
  getCurrentUser: () => auth?.currentUser
};

export const dbService = {
  saveGameSession: async (players: Player[], settings: GameSettings) => {
    if (!auth?.currentUser || !db) {
      return;
    }
    try {
      await addDoc(collection(db, "game_sessions"), {
        hostId: auth.currentUser.uid,
        date: serverTimestamp(),
        settings,
        players: players.map(p => ({
          name: p.name,
          sips: p.sipsTaken,
          simonFails: p.simonFailures
        }))
      });
    } catch (e) {
      console.error("Error saving game:", e);
    }
  },
  addFriend: async (friendId: string, friendName: string) => {
    if (!auth?.currentUser || !db) {
      return;
    }
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid, "friends", friendId), {
        uid: friendId,
        name: friendName,
        addedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error adding friend:", e);
    }
  }
};

export { auth, db };