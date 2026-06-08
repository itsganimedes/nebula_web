// ================================================
// NEBULA - Auth & Family Group Logic
// ================================================

import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { startListeningTransactions } from "./transactions.js";

const provider = new GoogleAuthProvider();

// ---- Login con Google ----
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (e) {
    console.error("Error login:", e);
    throw e;
  }
}

// ---- Logout ----
export async function logout() {
  await signOut(auth);
  window.location.reload();
}

// ---- Observador de sesión ----
export function observeAuth(onLoggedIn, onLoggedOut) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userData = await getUserData(user.uid);
      onLoggedIn(user, userData);
    } else {
      onLoggedOut();
    }
  });
}

// ---- Obtener datos del usuario (familia vinculada) ----
export async function getUserData(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
}

// ---- Crear nuevo grupo familiar ----
export async function createFamily(user) {
  const familyId = generateCode();
  const familyRef = doc(db, "families", familyId);
  const userRef   = doc(db, "users", user.uid);

  await setDoc(familyRef, {
    id:        familyId,
    name:      `Familia de ${user.displayName.split(" ")[0]}`,
    members:   [user.uid],
    createdAt: new Date().toISOString()
  });

  await setDoc(userRef, {
    uid:      user.uid,
    name:     user.displayName,
    email:    user.email,
    photo:    user.photoURL,
    familyId: familyId
  });

  return familyId;
}

// ---- Unirse a un grupo existente ----
export async function joinFamily(user, familyId) {
  const familyRef = doc(db, "families", familyId.toUpperCase());
  const snap      = await getDoc(familyRef);

  if (!snap.exists()) throw new Error("Código de familia no encontrado.");

  const userRef = doc(db, "users", user.uid);

  await updateDoc(familyRef, {
    members: arrayUnion(user.uid)
  });

  await setDoc(userRef, {
    uid:      user.uid,
    name:     user.displayName,
    email:    user.email,
    photo:    user.photoURL,
    familyId: familyId.toUpperCase()
  });

  return familyId.toUpperCase();
}

// ---- Generador de código corto (6 chars) ----
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
