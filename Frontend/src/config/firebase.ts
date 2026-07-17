import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDRkR7uRL22FXHtrYSLoJYn6TmqYDTfu2U",
  authDomain: "hackathon-project-1ea2a.firebaseapp.com",
  projectId: "hackathon-project-1ea2a",
  storageBucket: "hackathon-project-1ea2a.firebasestorage.app",
  messagingSenderId: "1087224292698",
  appId: "1:1087224292698:web:a3d7f0effe352dab86ff63"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth, firebaseConfig };
