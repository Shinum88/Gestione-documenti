// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8zvDEuIe4xuTRhIz0LHpRObBm-qqNMbc",
  authDomain: "ddt-logistica.firebaseapp.com",
  projectId: "ddt-logistica",
  storageBucket: "ddt-logistica.firebasestorage.app",
  messagingSenderId: "84771320411",
  appId: "1:84771320411:web:2eaedd72fe3791e7d4857e",
  measurementId: "G-5P0V4XX7JY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
