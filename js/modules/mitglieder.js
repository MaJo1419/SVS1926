// Modul: Mitgliederverwaltung
// Stammdaten, Beitragsverwaltung, Mitgliedsstatus.
import { db } from "../firebase-config.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state } from "../auth.js";

const COLLECTION = "mitglieder";
let unsubscribe = null;
let mitgliederCache = [];

export function renderMitglieder(container) {
  container.innerHTML = `
    <div class="module-header">
      <h1>👥 Mitglieder</h1>
      <button class="btn-primary" id="btn-neues-mitglied" style="width:auto;">+ Neues Mitglied</button>
    </div>
    <div class="card">
      <input type="search" id="mitglieder-suche" placeholder="Suchen (Name, E-Mail, Status)..."
        style="width:100%; padding:8px 10px; border:1px solid var(--color-border); border-radius:8px; margin-bottom:16px;">
      <table>
        <thead>
          <tr>
            <th>Name</th><th>E-Mail</th><th>Beitritt</th><th>Beitrag</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody id="mitglieder-tbody">
          <tr><td colspan="6" class="empty-state">Lade Mitglieder…</td></tr>
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("btn-neues-mitglied").addEventListener("click", () => openMitgliedModal());
  document.getElementById("mitglieder-suche").addEventListener("input", (e) => {
    renderTable(filterMitglieder(e.target.value));
  });

  if (unsubscribe) unsubscribe();
  const q = query(collection(db, COLLECTION), orderBy("nachname"));
  unsubscribe = onSnapshot(q, (snap) => {
    mitgliederCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTable(mitgliederCache);
  }, (err) => {
    console.error(err);
    document.getElementById("mitglieder-tbody").innerHTML =
      `<tr><td colspan="6" class="empty-state">Fehler beim Laden: ${err.message}</td></tr>`;
  });
}

function filterMitglieder(term) {
  const t = term.toLowerCase();
  return mitgliederCache.filter((m) =>
    `${m.vorname} ${m.nachname} ${m.email} ${m.status}`.toLowerCase().includes(t)
  );
}

function renderTable(list) {
  const tbody = document.getElementById("mitglieder-tbody");
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Keine Mitglieder gefunden.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map((m) => `
    <tr>
      <td>${m.nachname || ""}, ${m.vorname || ""}</td>
      <td>${m.email || "—"}</td>
      <td>${m.beitrittsdatum || "—"}</td>
      <td>${m.beitrag ? m.beitrag + " €/Jahr" : "—"}</td>
      <td>${statusBadge(m.status)}</td>
      <td style="text-align:right;">
        <button class="btn-secondary" style="width:auto;padding:6px 10px;" data-edit="${m.id}">✎</button>
        <button class="btn-secondary" style="width:auto;padding:6px 10px;" data-delete="${m.id}">🗑</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const m = mitgliederCache.find((x) => x.id === btn.dataset.edit);
      openMitgliedModal(m);
    })
  );
  tbody.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (confirm("Dieses Mitglied wirklich löschen?")) {
        await deleteDoc(doc(db, COLLECTION, btn.dataset.delete));
      }
    })
  );
}

function statusBadge(status) {
  const map = {
    aktiv: '<span class="badge badge-success">Aktiv</span>',
    inaktiv: '<span class="badge badge-muted">Inaktiv</span>',
    gekuendigt: '<span class="badge badge-danger">Gekündigt</span>'
  };
  return map[status] || '<span class="badge badge-muted">Unbekannt</span>';
}

function openMitgliedModal(mitglied = null) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box">
      <h2>${mitglied ? "Mitglied bearbeiten" : "Neues Mitglied"}</h2>
      <form id="mitglied-form">
        <div class="form-grid">
          <label>Vorname
            <input type="text" name="vorname" value="${mitglied?.vorname || ""}" required>
          </label>
          <label>Nachname
            <input type="text" name="nachname" value="${mitglied?.nachname || ""}" required>
          </label>
          <label>E-Mail
            <input type="email" name="email" value="${mitglied?.email || ""}">
          </label>
          <label>Geburtsdatum
            <input type="date" name="geburtsdatum" value="${mitglied?.geburtsdatum || ""}">
          </label>
          <label>Beitrittsdatum
            <input type="date" name="beitrittsdatum" value="${mitglied?.beitrittsdatum || ""}">
          </label>
          <label>Jahresbeitrag (€)
            <input type="number" name="beitrag" value="${mitglied?.beitrag || ""}" min="0" step="0.01">
          </label>
          <label>Status
            <select name="status">
              <option value="aktiv" ${mitglied?.status === "aktiv" ? "selected" : ""}>Aktiv</option>
              <option value="inaktiv" ${mitglied?.status === "inaktiv" ? "selected" : ""}>Inaktiv</option>
              <option value="gekuendigt" ${mitglied?.status === "gekuendigt" ? "selected" : ""}>Gekündigt</option>
            </select>
          </label>
          <label>Abteilung
            <input type="text" name="abteilung" value="${mitglied?.abteilung || ""}" placeholder="z.B. Fußball">
          </label>
        </div>
        <div style="display:flex; gap:10px; margin-top:20px;">
          <button type="submit" class="btn-primary">Speichern</button>
          <button type="button" class="btn-secondary" id="modal-cancel">Abbrechen</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#modal-cancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector("#mitglied-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (data.beitrag) data.beitrag = parseFloat(data.beitrag);
    data.aktualisiertVon = state.user?.email || null;
    data.aktualisiertAm = new Date().toISOString();

    try {
      if (mitglied) {
        await updateDoc(doc(db, COLLECTION, mitglied.id), data);
      } else {
        data.erstelltAm = new Date().toISOString();
        await addDoc(collection(db, COLLECTION), data);
      }
      overlay.remove();
    } catch (err) {
      alert("Fehler beim Speichern: " + err.message);
    }
  });
}
