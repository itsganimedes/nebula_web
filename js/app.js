// ================================================
// NEBULA - App Principal
// ================================================

import { observeAuth, loginWithGoogle, logout, createFamily, joinFamily } from "./auth.js";
import { addTransaction, startListeningTransactions, calcSummary, groupByCategory, CATEGORIES, resetPeriod, getArchivedPeriods, getFamilyMemberCount } from "./transactions.js";

// ---- Estado global ----
let currentUser        = null;
let currentFamily      = null;
let currentTransactions = [];

// ---- Referencias DOM ----
const screens = {
  loading:  document.getElementById("screen-loading"),
  auth:     document.getElementById("screen-auth"),
  family:   document.getElementById("screen-family"),
  app:      document.getElementById("screen-app"),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// ================================================
// ARRANQUE
// ================================================
observeAuth(
  async (user, userData) => {
    currentUser = user;
    document.getElementById("user-avatar").src  = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=8a2be2&color=fff`;
    document.getElementById("user-name-nav").textContent = user.displayName.split(" ")[0];

    if (userData?.familyId) {
      currentFamily = userData.familyId;
      document.getElementById("family-code-display").textContent = userData.familyId;
      startListeningTransactions(userData.familyId, renderAll);
      showScreen("app");
    } else {
      showScreen("family");
    }
  },
  () => showScreen("auth")
);

// ================================================
// AUTH
// ================================================
document.getElementById("btn-google-login").addEventListener("click", async () => {
  try {
    await loginWithGoogle();
  } catch (e) {
    alert("No se pudo iniciar sesión. Intentá de nuevo.");
  }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  if (confirm("¿Cerrar sesión?")) await logout();
});

// ================================================
// FAMILY SETUP
// ================================================
document.getElementById("btn-create-family").addEventListener("click", async () => {
  try {
    setLoading("btn-create-family", true);
    const code = await createFamily(currentUser);
    currentFamily = code;
    document.getElementById("family-code-display").textContent = code;
    startListeningTransactions(code, renderAll);
    showScreen("app");
  } catch (e) {
    alert("Error al crear familia: " + e.message);
  } finally {
    setLoading("btn-create-family", false);
  }
});

document.getElementById("btn-join-family").addEventListener("click", async () => {
  const code = document.getElementById("input-family-code").value.trim();
  if (!code) return;
  try {
    setLoading("btn-join-family", true);
    const familyId = await joinFamily(currentUser, code);
    currentFamily  = familyId;
    document.getElementById("family-code-display").textContent = familyId;
    startListeningTransactions(familyId, renderAll);
    showScreen("app");
  } catch (e) {
    alert("Error: " + e.message);
  } finally {
    setLoading("btn-join-family", false);
  }
});

// ================================================
// MODAL DE NUEVA TRANSACCIÓN
// ================================================
let modalType = "expense"; // default

const modal    = document.getElementById("modal-add");
const btnPlus  = document.getElementById("btn-add");
const btnClose = document.getElementById("btn-modal-close");

btnPlus.addEventListener("click",  () => openModal("expense"));
btnClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

document.getElementById("tab-expense").addEventListener("click", () => setModalType("expense"));
document.getElementById("tab-income").addEventListener("click",  () => setModalType("income"));

function openModal(type = "expense") {
  setModalType(type);
  document.getElementById("input-amount").value   = "";
  document.getElementById("input-note").value     = "";
  modal.classList.remove("hidden");
  modal.classList.add("modal-visible");
  setTimeout(() => document.getElementById("input-amount").focus(), 100);
}

function closeModal() {
  modal.classList.remove("modal-visible");
  setTimeout(() => modal.classList.add("hidden"), 300);
}

function setModalType(type) {
  modalType = type;
  renderCategoryPills(type);

  document.getElementById("tab-expense").classList.toggle("tab-active", type === "expense");
  document.getElementById("tab-income").classList.toggle("tab-active",  type === "income");

  const btn = document.getElementById("btn-save-transaction");
  btn.className = type === "expense" ? "btn-save expense" : "btn-save income";
  btn.textContent = type === "expense" ? "Registrar Gasto" : "Registrar Ingreso";
}

function renderCategoryPills(type) {
  const container = document.getElementById("category-pills");
  container.innerHTML = "";
  CATEGORIES[type].forEach((cat, i) => {
    const pill = document.createElement("button");
    pill.className   = "cat-pill" + (i === 0 ? " cat-active" : "");
    pill.dataset.cat = cat.id;
    pill.innerHTML   = `${cat.icon} ${cat.label}`;
    pill.addEventListener("click", () => {
      document.querySelectorAll(".cat-pill").forEach(p => p.classList.remove("cat-active"));
      pill.classList.add("cat-active");
    });
    container.appendChild(pill);
  });
}

// ---- Guardar transacción ----
document.getElementById("btn-save-transaction").addEventListener("click", async () => {
  const amountRaw = document.getElementById("input-amount").value.trim();
  const note      = document.getElementById("input-note").value.trim();
  const activeCat = document.querySelector(".cat-pill.cat-active");

  if (!amountRaw || isNaN(amountRaw) || parseFloat(amountRaw) <= 0) {
    shakeInput("input-amount");
    return;
  }

  const category = activeCat?.dataset.cat || "otros";

  try {
    setLoading("btn-save-transaction", true);
    await addTransaction(currentFamily, currentUser.uid, currentUser.displayName, {
      type: modalType,
      amount: amountRaw,
      category,
      note
    });
    closeModal();
  } catch (e) {
    alert("Error al guardar: " + e.message);
  } finally {
    setLoading("btn-save-transaction", false);
  }
});

// ================================================
// RENDER PRINCIPAL
// ================================================
function renderAll(transactions) {
  currentTransactions = transactions;
  const summary = calcSummary(transactions);
  renderSummary(summary);
  renderList(transactions.slice(0, 30));
  renderReport(transactions);
  renderArchivedPeriods();
  renderMemberCount();
}

function renderSummary({ balance, income, expense }) {
  const fmt = (n) => formatCurrency(n);

  const balanceEl = document.getElementById("balance-amount");
  const sign = balance >= 0 ? "+" : "";
  balanceEl.textContent = sign + fmt(balance);
  balanceEl.className   = "balance-number " + (balance >= 0 ? "positive" : "negative");

  document.getElementById("summary-income").textContent  = "+" + fmt(income);
  document.getElementById("summary-expense").textContent = "-"  + fmt(expense);
}

function renderList(transactions) {
  const list = document.getElementById("transaction-list");
  if (transactions.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <span>🌌</span>
      <p>Sin movimientos aún.<br>Tocá el <b>+</b> para empezar.</p>
    </div>`;
    return;
  }

  list.innerHTML = transactions.map(t => {
    const cat   = [...CATEGORIES.expense, ...CATEGORIES.income].find(c => c.id === t.category);
    const icon  = cat?.icon || "📦";
    const label = cat?.label || t.category;
    const sign  = t.type === "income" ? "+" : "-";
    const cls   = t.type === "income" ? "income" : "expense";
    const date  = t.createdAt?.toDate ? formatDate(t.createdAt.toDate()) : "Ahora";

    return `<div class="tx-item">
      <div class="tx-icon">${icon}</div>
      <div class="tx-info">
        <span class="tx-label">${label}</span>
        <span class="tx-meta">${t.note ? t.note + " · " : ""}${t.userName?.split(" ")[0] || ""} · ${date}</span>
      </div>
      <span class="tx-amount ${cls}">${sign}${formatCurrency(t.amount)}</span>
    </div>`;
  }).join("");
}

function renderReport(transactions) {
  const byCategory = groupByCategory(transactions, "expense");
  const total      = byCategory.reduce((s, c) => s + c.total, 0);
  const container  = document.getElementById("report-categories");

  if (byCategory.length === 0) {
    container.innerHTML = `<p class="report-empty">Sin datos de gastos aún.</p>`;
    return;
  }

  container.innerHTML = byCategory.slice(0, 6).map(c => {
    const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
    return `<div class="report-row">
      <div class="report-label">
        <span>${c.icon} ${c.label}</span>
        <span class="report-pct">${pct}%</span>
      </div>
      <div class="report-bar-bg">
        <div class="report-bar-fill" style="width:${pct}%"></div>
      </div>
      <span class="report-total">${formatCurrency(c.total)}</span>
    </div>`;
  }).join("");
}

// ================================================
// TABS DE NAVEGACIÓN INTERNA
// ================================================
document.querySelectorAll(".nav-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${target}`).classList.add("active");
  });
});

// Copiar código de familia
document.getElementById("btn-copy-code").addEventListener("click", () => {
  navigator.clipboard.writeText(currentFamily || "");
  const btn = document.getElementById("btn-copy-code");
  btn.textContent = "¡Copiado!";
  setTimeout(() => btn.textContent = "📋 Copiar", 1500);
});

// ================================================
// MIEMBROS
// ================================================
async function renderMemberCount() {
  try {
    const count = await getFamilyMemberCount(currentFamily);
    const el = document.getElementById("member-count");
    if (el) el.textContent = count === 1
      ? "1 integrante en la mesa"
      : `${count} integrantes en la mesa`;
  } catch (e) { /* silencioso */ }
}

// ================================================
// RESET DE PERÍODO
// ================================================
document.getElementById("btn-reset-period").addEventListener("click", async () => {
  const confirmed = confirm(
    "⚠️ ¿Reiniciar el período?\n\nSe guardará el resumen (balance, ingresos y gastos totales) en Reportes y se borrarán todos los movimientos. Esta acción no se puede deshacer."
  );
  if (!confirmed) return;

  try {
    setLoading("btn-reset-period", true);
    const summary = calcSummary(currentTransactions);
    await resetPeriod(currentFamily, summary);
    await renderArchivedPeriods(); // refrescar historial
  } catch (e) {
    alert("Error al reiniciar: " + e.message);
  } finally {
    setLoading("btn-reset-period", false);
  }
});

// ================================================
// PERÍODOS ARCHIVADOS
// ================================================
async function renderArchivedPeriods() {
  const container = document.getElementById("archived-periods");
  if (!container) return;
  try {
    const periods = await getArchivedPeriods(currentFamily);
    if (periods.length === 0) {
      container.innerHTML = `<p class="report-empty">Aún no hay períodos cerrados.</p>`;
      return;
    }
    container.innerHTML = periods.map(p => {
      const date = p.closedAt?.toDate ? formatDate(p.closedAt.toDate()) : "—";
      const balSign = p.balance >= 0 ? "+" : "";
      const balCls  = p.balance >= 0 ? "positive" : "negative";
      return `<div class="period-card">
        <div class="period-date">📅 Cerrado el ${date}</div>
        <div class="period-row">
          <span class="period-item income">▲ Ingresos: ${formatCurrency(p.income)}</span>
          <span class="period-item expense">▼ Gastos: ${formatCurrency(p.expense)}</span>
        </div>
        <div class="period-balance ${balCls}">${balSign}${formatCurrency(p.balance)}</div>
      </div>`;
    }).join("");
  } catch (e) {
    container.innerHTML = `<p class="report-empty">Error al cargar historial.</p>`;
  }
}

// ================================================
// EXPORTAR (CSV → abre en Excel)
// ================================================
document.getElementById("btn-export").addEventListener("click", () => {
  if (!currentTransactions || currentTransactions.length === 0) {
    alert("No hay movimientos para exportar.");
    return;
  }

  // Encabezado CSV con BOM para que Excel lo abra bien en español
  const BOM  = "\uFEFF";
  const rows = [["Tipo", "Categoría", "Monto", "Nota", "Quién", "Fecha"]];

  currentTransactions.forEach(t => {
    const cat  = [...CATEGORIES.expense, ...CATEGORIES.income].find(c => c.id === t.category);
    const tipo = t.type === "income" ? "Ingreso" : "Gasto";
    const fecha = t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString("es-AR") : "";
    rows.push([
      tipo,
      cat?.label || t.category,
      t.amount.toFixed(2),
      `"${(t.note || "").replace(/"/g, '""')}"`,
      t.userName || "",
      fecha
    ]);
  });

  const csv  = BOM + rows.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `nebula-${currentFamily}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ================================================
// UTILS
// ================================================
function formatCurrency(n) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0
  }).format(n);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date);
}

function shakeInput(id) {
  const el = document.getElementById(id);
  el.classList.add("shake");
  setTimeout(() => el.classList.remove("shake"), 500);
}

function setLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) btn.dataset.originalText = btn.textContent;
  btn.textContent = loading ? "..." : btn.dataset.originalText;
}
