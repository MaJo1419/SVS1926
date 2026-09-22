// Einfacher Hash-Router: schaltet zwischen den Modulen um.
import { hasAccess } from "./auth.js";

const contentArea = document.getElementById("content-area");
const navLinks = document.querySelectorAll(".nav-link");

// Modul-Renderer werden hier registriert (siehe app.js)
const moduleRegistry = {};
export function registerModule(name, renderFn) {
  moduleRegistry[name] = renderFn;
}

const roleMap = {}; // wird aus data-roles Attributen befüllt
navLinks.forEach((link) => {
  const modul = link.dataset.module;
  const roles = link.dataset.roles ? link.dataset.roles.split(",") : [];
  roleMap[modul] = roles;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.hash = modul;
    if (window.innerWidth <= 720) {
      document.getElementById("sidebar").classList.remove("open");
    }
  });
});

document.getElementById("sidebar-toggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

export function navigate() {
  const modul = (window.location.hash || "#dashboard").replace("#", "");

  if (!hasAccess(modul, roleMap[modul])) {
    contentArea.innerHTML = `<div class="empty-state">🔒 Kein Zugriff auf diesen Bereich.</div>`;
    return;
  }

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.module === modul);
  });

  const renderFn = moduleRegistry[modul];
  if (renderFn) {
    renderFn(contentArea);
  } else {
    contentArea.innerHTML = `
      <div class="module-header"><h1>${modul}</h1></div>
      <div class="empty-state">🚧 Dieses Modul ist noch nicht implementiert.</div>
    `;
  }
}

window.addEventListener("hashchange", navigate);
