// Modul: Platzbuchung / Belegungsplan
// Buchung von Sportstätten und Vereinsbussen mit Datum+Uhrzeit-Slots.
// Eigenständig, keine Verknüpfung zu Events.
// Rolle A/B haben immer Zugriff zum Buchen, Rolle C nur mit individueller Freigabe (freigaben.belegungsplan).
import { db } from "../firebase-config.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state } from "../auth.js";

const RESSOURCEN_COLLECTION = "ressourcen";
const BUCHUNGEN_COLLECTION = "belegungsplan";

let unsubRessourcen = null;
let unsubBuchungen = null;
let ressourcenCache = [];
let buchungenCache = [];
let aktuellerTag = todayISO();

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function darfBuchen() {
  const rolle = state.profile?.rolle;
  if (rolle === "A" || rolle === "B") return true;
  return !!(state.profile?.freigaben && state.profile.freigaben.belegungsplan === true);
}

export function renderBelegungsplan(container) {
  container.innerHTML = `
    <div class="module-header">
      <h1>📅 Platzbuchung / Belegungsplan</h1>
      ${darfBuchen() ? `<button class="btn-primary" id="btn-neue-buchung" style="width:auto;">+ Neue Buchung</button>` : ""}
    </div>

    <div class="card" id="ressourcen-verwaltung">
      <!-- gefüllt in renderRessourcenVerwaltung() -->
    </div>

    <div class="card">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
        <button class="btn-secondary" id="tag-zurueck" style="width:auto; padding:6px 12px;">←</button>
        <input type="date" id="tag-auswahl" value="${aktuellerTag}" style="padding:8px 10px; border:1px solid var(--color-border); border-radius:8px;">
        <button class="btn-secondary" id="tag-vor" style="width:auto; padding:6px 12px;">→</button>
      </div>
      <div id="belegungsplan-tabelle">
        <p class="empty-state">Lade Belegungsplan…</p>
      </div>
    </div>
  `;

  document.getElementById("tag-auswahl").addEventListener("change", (e) => {
    aktuellerTag = e.target.value;
    renderTagesplan();
  });
  document.getElementById("tag-zurueck").addEventListener("click", () => {
    aktuellerTag = shiftDay(aktuellerTag, -1);
    document.getElementById("tag-auswahl").value = aktuellerTag;
    renderTagesplan();
  });
  document.getElementById("tag-vor").addEventListener("click", () => {
    aktuellerTag = shiftDay(aktuellerTag, 1);
    document.getElementById("tag-auswahl").value = aktuellerTag;
    renderTagesplan();
  });

  const btnNeu = document.getElementById("btn-neue-buchung");
  if (btnNeu) btnNeu.addEventListener("click", () => openBuchungModal());

  if (unsubRessourcen) unsubRessourcen();
  if (unsubBuchungen) unsubBuchungen();

  const qRessourcen = query(collection(db, RESSOURCEN_COLLECTION), orderBy("name"));
  unsubRessourcen = onSnapshot(qRessourcen, (snap) => {
    ressourcenCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderRessourcenVerwaltung();
    renderTagesplan();
  });

  const qBuchungen = query(collection(db, BUCHUNGEN_COLLECTION), orderBy("startzeit"));
  unsubBuchungen = onSnapshot(qBuchungen, (snap) => {
    buchungenCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTagesplan();
  }, (err) => {
    console.error(err);
    document.getElementById("belegungsplan-tabelle").innerHTML =
      `<p class="empty-state">Fehler beim Laden: ${err.message}</p>`;
  });
}

function shiftDay(iso, delta) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function renderRessourcenVerwaltung() {
  const box = document.getElementById("ressourcen-verwaltung");
  if (!box) return;
  const kannVerwalten = state.profile?.rolle === "A" || state.profile?.rolle === "B";
  box.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
      <strong>Ressourcen (Plätze, Hallen, Busse)</strong>
      ${kannVerwalten ? `<button class="btn-secondary" id="btn-neue-ressource" style="width:auto; padding:6px 12px;">+ Ressource</button>` : ""}
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:8px;">
      ${ressourcenCache.length === 0
        ? `<span style="color:var(--color-text-muted); font-size:14px;">Noch keine Ressourcen angelegt.</span>`
        : ressourcenCache.map((r) => `<span class="badge badge-muted">${r.name}</span>`).join("")}
    </div>
  `;
  const btnNeueRessource = document.getElementById("btn-neue-ressource");
  if (btnNeueRessource) btnNeueRessource.addEventListener("click", () => openRessourceModal());
}

function renderTagesplan() {
  const box = document.getElementById("belegungsplan-tabelle");
  if (!box) return;

  if (ressourcenCache.length === 0) {
    box.innerHTML = `<p class="empty-state">Erst eine Ressource anlegen (Platz, Halle oder Bus), dann können Buchungen erfasst werden.</p>`;
    return;
  }

  const buchungenHeute = buchungenCache.filter((b) => b.datum === aktuellerTag);

  box.innerHTML = `
    <table>
      <thead>
        <tr><th>Ressource</th><th>Zeit</th><th>Titel</th><th>Gebucht von</th><th></th></tr>
      </thead>
      <tbody>
        ${ressourcenCache.map((r) => {
          const buchungenFuerRessource = buchungenHeute
            .filter((b) => b.ressourceId === r.id)
            .sort((a, b) => a.startzeit.localeCompare(b.startzeit));
          if (buchungenFuerRessource.length === 0) {
            return `<tr><td>${r.name}</td><td colspan="4" style="color:var(--color-text-muted);">frei</td></tr>`;
          }
          return buchungenFuerRessource.map((b) => `
            <tr>
              <td>${r.name}</td>
              <td>${b.startzeit}–${b.endzeit} Uhr</td>
              <td>${b.titel || "—"}</td>
              <td>${b.gebuchtVon || "—"}</td>
              <td style="text-align:right;">
                ${darfBuchen() ? `
                  <button class="btn-secondary" style="width:auto;padding:6px 10px;" data-edit="${b.id}">✎</button>
                  <button class="btn-secondary" style="width:auto;padding:6px 10px;" data-delete="${b.id}">🗑</button>
                ` : ""}
              </td>
            </tr>
          `).join("");
        }).join("")}
      </tbody>
    </table>
  `;

  box.querySelectorAll("[data-edit]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const b = buchungenCache.find((x) => x.id === btn.dataset.edit);
      openBuchungModal(b);
    })
  );
  box.querySelectorAll("[data-delete]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (confirm("Diese Buchung wirklich löschen?")) {
        await deleteDoc(doc(db, BUCHUNGEN_COLLECTION, btn.dataset.delete));
      }
    })
  );
}

function openRessourceModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box">
      <h2>Neue Ressource</h2>
      <form id="ressource-form">
        <div class="form-grid">
          <label>Name
            <input type="text" name="name" placeholder="z.B. Sportplatz 1, Vereinsbus" required>
          </label>
          <label>Typ
            <select name="typ">
              <option value="platz">Platz / Halle</option>
              <option value="bus">Vereinsbus</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
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
  overlay.querySelector("#ressource-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    try {
      await addDoc(collection(db, RESSOURCEN_COLLECTION), data);
      overlay.remove();
    } catch (err) {
      alert("Fehler beim Speichern: " + err.message);
    }
  });
}

function openBuchungModal(buchung = null) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box">
      <h2>${buchung ? "Buchung bearbeiten" : "Neue Buchung"}</h2>
      <form id="buchung-form">
        <div class="form-grid">
          <label>Ressource
            <select name="ressourceId" required>
              ${ressourcenCache.map((r) => `
                <option value="${r.id}" ${buchung?.ressourceId === r.id ? "selected" : ""}>${r.name}</option>
              `).join("")}
            </select>
          </label>
          <label>Titel
            <input type="text" name="titel" value="${buchung?.titel || ""}" placeholder="z.B. Training U15">
          </label>
          <label>Datum
            <input type="date" name="datum" value="${buchung?.datum || aktuellerTag}" required>
          </label>
          <label>Von
            <input type="time" name="startzeit" value="${buchung?.startzeit || ""}" required>
          </label>
          <label>Bis
            <input type="time" name="endzeit" value="${buchung?.endzeit || ""}" required>
          </label>
        </div>
        <p id="buchung-error" class="error-text"></p>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button type="submit" class="btn-primary">Speichern</button>
          <button type="button" class="btn-secondary" id="modal-cancel">Abbrechen</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#modal-cancel").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector("#buchung-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("buchung-error");
    errorBox.textContent = "";
    const data = Object.fromEntries(new FormData(e.target).entries());

    if (data.startzeit >= data.endzeit) {
      errorBox.textContent = "Die Endzeit muss nach der Startzeit liegen.";
      return;
    }

    // Einfache Überschneidungsprüfung (client-seitig)
    const konflikt = buchungenCache.some((b) =>
      b.id !== buchung?.id &&
      b.ressourceId === data.ressourceId &&
      b.datum === data.datum &&
      data.startzeit < b.endzeit && data.endzeit > b.startzeit
    );
    if (konflikt) {
      errorBox.textContent = "Diese Ressource ist im gewählten Zeitraum bereits belegt.";
      return;
    }

    data.gebuchtVon = state.profile?.name || state.user?.email || "";

    try {
      if (buchung) {
        await updateDoc(doc(db, BUCHUNGEN_COLLECTION, buchung.id), data);
      } else {
        await addDoc(collection(db, BUCHUNGEN_COLLECTION), data);
      }
      overlay.remove();
    } catch (err) {
      errorBox.textContent = "Fehler beim Speichern: " + err.message;
    }
  });
}
