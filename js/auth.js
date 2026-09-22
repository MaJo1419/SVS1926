// Login/Logout + Rollen-Logik (A/B/C), analog zum Eventplaner-Projekt.
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const state = {
  user: null,       // Firebase Auth user object
  profile: null      // { rolle: "A"|"B"|"C", name, freigaben: {...}, ... } aus /benutzer/{uid}
};

const loginScreen = document.getElementById("login-screen");
const appShell = document.getElementById("app-shell");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const userInfo = document.getElementById("user-info");
const logoutBtn = document.getElementById("logout-btn");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = "Anmeldung fehlgeschlagen: " + mapAuthError(err.code);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

function mapAuthError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-Mail oder Passwort ist falsch.";
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte kurz warten.";
    default:
      return "Bitte prüfe deine Eingaben.";
  }
}

// Wird von app.js gesetzt, damit auth.js den Router nicht direkt importieren muss
let onReadyCallback = null;
export function onAppReady(cb) { onReadyCallback = cb; }

onAuthStateChanged(auth, async (user) => {
  if (user) {
    state.user = user;
    // Benutzerprofil (Rolle A/B/C + individuelle Freigaben) aus Firestore laden
    try {
      const snap = await getDoc(doc(db, "benutzer", user.uid));
      state.profile = snap.exists() ? snap.data() : { rolle: "C", name: user.email, freigaben: {} };
    } catch (err) {
      console.error("Konnte Benutzerprofil nicht laden:", err);
      state.profile = { rolle: "C", name: user.email, freigaben: {} };
    }

    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    userInfo.innerHTML = `<strong>${state.profile.name || user.email}</strong><br>Rolle: ${state.profile.rolle}`;
    applyRoleVisibility(state.profile.rolle, state.profile.freigaben || {});

    if (onReadyCallback) onReadyCallback();
  } else {
    state.user = null;
    state.profile = null;
    appShell.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  }
});

// Blendet Nav-Punkte aus, die per data-roles="A,B" eingeschränkt sind,
// es sei denn die Rolle passt oder es gibt eine individuelle Freigabe (Rolle C + Admin-Häkchen).
function applyRoleVisibility(rolle, freigaben) {
  document.querySelectorAll(".nav-link[data-roles]").forEach((link) => {
    const allowed = link.dataset.roles.split(",");
    const modul = link.dataset.module;
    const individualFreigabe = freigaben && freigaben[modul] === true;
    if (allowed.includes(rolle) || individualFreigabe) {
      link.classList.remove("hidden");
    } else {
      link.classList.add("hidden");
    }
  });
}

export function hasAccess(modul, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (!state.profile) return false;
  if (requiredRoles.includes(state.profile.rolle)) return true;
  return !!(state.profile.freigaben && state.profile.freigaben[modul] === true);
}
