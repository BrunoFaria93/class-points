// src/app/page.tsx
import React from 'react';
import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-4xl font-bold mb-4">Welcome to Codenames</h1>
            <p className="mb-6 text-lg">A fun game to play with friends online!</p>
            <Link href="/lobby" className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition">
                Enter the Lobby
            </Link>
        </div>
    );
}
