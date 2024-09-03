import Image from "next/image";
import SignUp from "./signup";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Bem-vindo!</h1>
        <SignUp />
      </div>
    </main>
  );
}
