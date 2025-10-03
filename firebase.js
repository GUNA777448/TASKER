// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB27Sa5pVqfhEhEDexuLnd-E59dIKsl0A8",
  authDomain: "testing-9ba61.firebaseapp.com",
  projectId: "testing-9ba61",
  storageBucket: "testing-9ba61.firebasestorage.app",
  messagingSenderId: "603837051159",
  appId: "1:603837051159:web:e47f934493c42e0c3c8752",
  measurementId: "G-7NR3PC3GDL",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
