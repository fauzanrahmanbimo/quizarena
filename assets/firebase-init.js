import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, push, update, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBRuaSh8yMqLygmWsO8xPzdGmAwo4cSjLw",
  authDomain: "quizarena-75a65.firebaseapp.com",
  projectId: "quizarena-75a65",
  storageBucket: "quizarena-75a65.firebasestorage.app",
  messagingSenderId: "328024770904",
  appId: "1:328024770904:web:bb019bdeba3c3f3db4fd2d",
  measurementId: "G-8T96WFLL9E",
  databaseURL: "https://quizarena-75a65-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

window.fbApp = app;
window.fbAuth = auth;
window.fbDb = db;
window.fbRef = ref;
window.fbSet = set;
window.fbGet = get;
window.fbOnValue = onValue;
window.fbPush = push;
window.fbUpdate = update;
window.fbQuery = query;
window.fbOrderByChild = orderByChild;
window.fbLimitToLast = limitToLast;

// Firebase Authentication Logic
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User logged in:", user.uid);
    const playerNameInput = document.getElementById("player-name");
    if (playerNameInput && user.displayName) {
      playerNameInput.value = user.displayName;
    }
  } else {
    console.log("No user, signing in anonymously...");
    signInAnonymously(auth).catch(err => console.error("Auth Error:", err));
  }
});

// Save name to Firebase when typing
window.addEventListener('DOMContentLoaded', () => {
  const playerNameInput = document.getElementById("player-name");
  if (playerNameInput) {
    playerNameInput.addEventListener('blur', (e) => {
      const newName = e.target.value.trim();
      const currentUser = auth.currentUser;
      if (currentUser && newName && newName !== currentUser.displayName) {
        updateProfile(currentUser, { displayName: newName })
          .then(() => console.log("Name updated to", newName))
          .catch(err => console.error("Error updating name", err));
      }
    });
  }
});

console.log("Firebase berhasil diinisialisasi!");
