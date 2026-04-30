import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-JVFUMruTXcuiXyAztpxJWE7bKh3Xp2k",
  authDomain: "khozha-bequwa.firebaseapp.com",
  projectId: "khozha-bequwa",
  storageBucket: "khozha-bequwa.firebasestorage.app",
  messagingSenderId: "376620303417",
  appId: "1:376620303417:web:5aef89d4a10ba9ccc039e8",
  measurementId: "G-13KTXHWVHK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
