import { state } from "../auth.js";

export function renderDashboard(container) {
  const name = state.profile?.name || state.user?.email || "";
  container.innerHTML = `
    <div class="module-header"><h1>🏠 Übersicht</h1></div>
    <div class="card">
      <p>Willkommen zurück, <strong>${name}</strong>!</p>
      <p style="color:var(--color-text-muted); font-size:14px;">
        Wähle links einen Bereich aus. Weitere Module (Kasse, Training, Website, Spielerpässe,
        Schiri-App, Turniere, Liga) werden nach und nach ergänzt.
      </p>
    </div>
  `;
}
