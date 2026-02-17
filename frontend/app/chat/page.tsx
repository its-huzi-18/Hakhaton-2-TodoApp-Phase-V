"use client";

import { useAuth } from "../../hooks/auth";
import ChatInterface from "../../src/components/ChatInterface";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
        <div className="text-white text-lg">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">AI Chat Assistant</h1>
          <p className="text-slate-300 mt-2">
            Chat with your AI assistant to manage your tasks and productivity
          </p>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white/5 backdrop-blur-lg rounded-xl shadow-xl p-4 sm:p-6 h-[60vh] max-w-4xl mx-auto">
          <ChatInterface userId={user?.id} />
        </div>
      </main>
    </div>
  );
}