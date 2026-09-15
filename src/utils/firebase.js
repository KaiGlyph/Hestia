// src/utils/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDg6Ynf2X31elffRqvRLFGZSZ4mId6EUok",
  authDomain: "hestia-4b665.firebaseapp.com",
  projectId: "hestia-4b665",
  storageBucket: "hestia-4b665.firebasestorage.app",
  messagingSenderId: "1011637769048",
  appId: "1:1011637769048:web:99bfb56f36025bd8ff8b2d"
};

// 1. Inicializar la app solo si no existe
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. Inicializar Auth de forma segura para Hot Reload
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  // Si el error es específicamente que ya está inicializado, lo recuperamos
  if (e.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    // Si es otro error, lo lanzamos para verlo
    throw e;
  }
}

// 3. Inicializar Firestore
export const db = getFirestore(app);
export { app, auth };