// Firebase SDK (Modular v10, CDN import — gleiches Muster wie im Eventplaner-Projekt)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6T0-7FhfzIsKyC4oNhNaRc6tDj-XlXdU",
  authDomain: "svs1926-80d7b.firebaseapp.com",
  projectId: "svs1926-80d7b",
  storageBucket: "svs1926-80d7b.firebasestorage.app",
  messagingSenderId: "898398690894",
  appId: "1:898398690894:web:a01574f703389f89c76d1f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
