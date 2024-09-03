import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';  // Adicione esta linha
import { getFirestore, doc, updateDoc, increment } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyBK5RJUW2HNnxcldhit5U207y09y45CpVE",
  authDomain: "trabalho-pontos.firebaseapp.com",
  projectId: "trabalho-pontos",
  storageBucket: "trabalho-pontos.appspot.com",
  messagingSenderId: "920644056338",
  appId: "1:920644056338:web:56fb3bd0301b4fecd96fcb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);  // Adicione esta linha
const db = getFirestore(app);

export { auth, storage, db };
