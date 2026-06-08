// ================================================
// NEBULA - Firebase Configuration
// ================================================
// Reemplazá estos valores con los de tu proyecto
// en Firebase Console > Project Settings > Web App
// ================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDkUFQ1uXjuchxORVICR6zgzoPWx05TBCI",
  authDomain: "nebula-84f67.firebaseapp.com",
  projectId: "nebula-84f67",
  storageBucket: "nebula-84f67.firebasestorage.app",
  messagingSenderId: "759858175404",
  appId: "1:759858175404:web:bce0156ed780f132602e09",
  measurementId: "G-187765PTF0"
};

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
