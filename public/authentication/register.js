// /authentication/register.js

import { auth, db } from "./config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

function showError(message) {
  alert("❌ " + message);
}

function init() {
  const nameInput = document.getElementById("nameInput");
  const emailInput = document.getElementById("emailInput");
  const phoneInput = document.getElementById("phoneInput");
  const passwordInput = document.getElementById("passwordInput");
  const confirmInput = document.getElementById("confirmPasswordInput");
  const registerBtn = document.getElementById("registerBtn");

  registerBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    if (!name || !email || !password || !confirm) {
      showError("Please fill in all required fields.");
      return;
    }

    if (password !== confirm) {
      showError("Passwords do not match.");
      return;
    }

    try {
      // 1) Create auth user
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // 2) Set display name
      await updateProfile(user, { displayName: name });

      // 3) Save profile to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        phone: phone || null,
        roles: ["customer"],
        employeeTypes: [],
        isAdmin: false,
        isOwner: false,
        createdAt: serverTimestamp()
      });

      alert("✅ Account created successfully!");
      window.location.href = "./login.html";
    } catch (err) {
      showError(err.message);
    }
  });
}

onReady(init);
