// ================================================
// NEBULA - Transactions (Gastos & Ingresos)
// ================================================

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let unsubscribe = null;

// ---- Categorías disponibles ----
export const CATEGORIES = {
  expense: [
    { id: "comida",      label: "Comida",        icon: "🍔" },
    { id: "transporte",  label: "Transporte",     icon: "🚗" },
    { id: "servicios",   label: "Servicios",      icon: "💡" },
    { id: "alquiler",    label: "Alquiler",       icon: "🏠" },
    { id: "salud",       label: "Salud",          icon: "💊" },
    { id: "ocio",        label: "Ocio",           icon: "🎬" },
    { id: "educacion",   label: "Educación",      icon: "📚" },
    { id: "ropa",        label: "Ropa",           icon: "👕" },
    { id: "deudas",      label: "Deudas",         icon: "💵"},
    { id: "nafta",      label: "Nafta/Gas",       icon: "⛽"},
    { id: "otros",       label: "Otros",          icon: "📦" },
  ],
  income: [
    { id: "sueldo",      label: "Sueldo",         icon: "💼" },
    { id: "freelance",   label: "Freelance",      icon: "💻" },
    { id: "venta",       label: "Venta",          icon: "🏷️" },
    { id: "regalo",      label: "Regalo",         icon: "🎁" },
    { id: "otros",       label: "Otros",          icon: "✨" },
  ]
};

// ---- Agregar transacción ----
export async function addTransaction(familyId, userId, userName, { type, amount, category, note }) {
  const ref = collection(db, "families", familyId, "transactions");
  await addDoc(ref, {
    type,          // "expense" | "income"
    amount:   parseFloat(amount),
    category,
    note:     note || "",
    userId,
    userName,
    createdAt: serverTimestamp()
  });
}

// ---- Escuchar transacciones en tiempo real ----
export function startListeningTransactions(familyId, callback) {
  if (unsubscribe) unsubscribe(); // limpiar listener anterior

  const ref = collection(db, "families", familyId, "transactions");
  const q   = query(ref, orderBy("createdAt", "desc"));

  unsubscribe = onSnapshot(q, (snap) => {
    const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(transactions);
  });
}

// ---- Detener listener ----
export function stopListening() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

// ---- Calcular balance, ingresos y gastos ----
export function calcSummary(transactions) {
  let income  = 0;
  let expense = 0;

  transactions.forEach(t => {
    if (t.type === "income")  income  += t.amount;
    if (t.type === "expense") expense += t.amount;
  });

  return {
    income,
    expense,
    balance: income - expense
  };
}

// ---- Reiniciar período: guarda resumen y borra transacciones ----
export async function resetPeriod(familyId, summary) {
  const txRef     = collection(db, "families", familyId, "transactions");
  const archivRef = collection(db, "families", familyId, "periods");

  // 1. Guardar resumen del período
  await addDoc(archivRef, {
    income:    summary.income,
    expense:   summary.expense,
    balance:   summary.balance,
    closedAt:  serverTimestamp()
  });

  // 2. Borrar todas las transacciones en batch
  const snap  = await getDocs(txRef);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// ---- Obtener períodos archivados ----
export async function getArchivedPeriods(familyId) {
  const ref  = collection(db, "families", familyId, "periods");
  const q    = query(ref, orderBy("closedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---- Obtener cantidad de miembros de la familia ----
export async function getFamilyMemberCount(familyId) {
  const ref  = doc(db, "families", familyId);
  const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  return (snap.data().members || []).length;
}

// ---- Agrupar gastos por categoría (para reportes) ----
export function groupByCategory(transactions, type = "expense") {
  const map = {};
  transactions
    .filter(t => t.type === type)
    .forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => {
      const found = CATEGORIES[type].find(c => c.id === cat);
      return {
        category: cat,
        label:    found?.label || cat,
        icon:     found?.icon  || "📦",
        total
      };
    });
}
