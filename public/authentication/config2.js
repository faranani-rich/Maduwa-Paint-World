// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCF9Cbu4PQdY6kuZ9LkloUY99mYg0FfYog",
  authDomain: "maduwa-paint-world.firebaseapp.com",
  projectId: "maduwa-paint-world",
  storageBucket: "maduwa-paint-world.firebasestorage.app",
  messagingSenderId: "353343607778",
  appId: "1:353343607778:web:733833673202eb0bac5fbb",
  measurementId: "G-YSPG8LWF2G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);