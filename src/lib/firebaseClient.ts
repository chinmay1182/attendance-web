
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCS52DcerUvbfavkItXQsD-MMMw1k665tg",
    authDomain: "attendance-web-bcd28.firebaseapp.com",
    projectId: "attendance-web-bcd28",
    storageBucket: "attendance-web-bcd28.firebasestorage.app",
    messagingSenderId: "605269036366",
    appId: "1:605269036366:web:11ff01aabc44a26630221f",
    measurementId: "G-SE6ZVKD6YC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

let analytics;
if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
    });
}

export { app, analytics };
