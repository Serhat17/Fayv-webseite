import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB5VEToHMimWEVewDf71mQjWFNNEOUbOAE",
  authDomain: "outfitinspo-5bf9e.firebaseapp.com",
  projectId: "outfitinspo-5bf9e",
  storageBucket: "outfitinspo-5bf9e.firebasestorage.app",
  messagingSenderId: "966712576034",
  appId: "1:966712576034:web:0761e3ee8964d3fe7bb" // Best guess for web, though it usually doesn't strictly matter for non-analytics
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
