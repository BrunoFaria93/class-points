"use client"
import { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/firebaseConfig'; // Importando a configuração do Firebase
import { doc, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Verificar se o usuário já está autenticado e se a sessão é válida
    const checkSession = () => {
      const loginTime = localStorage.getItem('loginTime');
      const currentTime = Date.now();
      const sessionDuration = 30 * 60 * 1000; // 30 minutos em milissegundos

      if (loginTime && (currentTime - loginTime < sessionDuration)) {
        router.push('/upload'); // Redireciona para o upload se a sessão for válida
      }
    };

    checkSession();
  }, [router]);


  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
  
    try {
      // Cria o usuário com email e senha
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Cria um documento no Firestore para o novo usuário
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        createdAt: new Date(),
      });
  
      // Armazena o tempo de login
      localStorage.setItem('loginTime', Date.now());
      router.push('/upload');
    } catch (error) {
      console.error('Erro ao fazer cadastro:', error);
      setError('Erro ao fazer cadastro. Tente novamente.');
    }
  };
  
  

  return (
    <div className="flex-col items-center justify-center min-h-screen bg-slate-900">
      <div className='flex justify-center items-center mx-auto'>
      <Image src="/class.png" alt="Class" width={180} height={180} />
      </div>
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-slate-900">
          Cadastrar
        </h2>
        {error && <p className="text-red-500">{error}</p>}
        <form onSubmit={handleSignUp} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full text-black px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="block w-full text-black  px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700"
            >
              Confirmar Senha
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="block w-full text-black  px-3 py-2 mt-1 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cadastrar
            </button>
          </div>
        </form>
        <div className="flex justify-between w-full text-slate-500 gap-x-20 text-xs">
          Já tem uma conta?{" "}
          <div className="hover:underline text-indigo-500 text-xs">
              <Link href="/login/"> Faça login</Link>
            </div>
        </div>
      </div>
    </div>
  );
}
