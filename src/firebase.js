// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCQF5WkgEfOO61A-UC3a-QNspm8iqD-39g",
  authDomain: "rush-app-5c2b5.firebaseapp.com",
  projectId: "rush-app-5c2b5",
  storageBucket: "rush-app-5c2b5.firebasestorage.app",
  messagingSenderId: "470126248786",
  appId: "1:470126248786:web:91a52681b24617caa3f08b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("🔥 Firebase inicializado correctamente:", app.name);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;