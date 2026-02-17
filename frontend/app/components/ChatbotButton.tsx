"use client";

import Link from "next/link";
import { useState } from "react";

export default function ChatbotButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href="/chat"
      className="fixed bottom-6 right-6 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Bouncing animation wrapper */}
      <div className={`relative ${isHovered ? '' : 'animate-bounce-slow'}`}>
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-70 animate-pulse"></div>
        
        {/* Main button */}
        <div className="relative w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full shadow-2xl flex items-center justify-center transform transition-all duration-300 hover:scale-110 cursor-pointer">
          {/* Chat icon */}
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>

        {/* Tooltip */}
        <div className={`absolute bottom-full right-0 mb-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 whitespace-nowrap transform transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}>
          <p className="text-sm font-medium text-gray-800 dark:text-white">
            💬 Chat with AI
          </p>
          <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-gray-200 dark:border-slate-700"></div>
        </div>
      </div>

      {/* Custom bounce animation styles */}
      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </Link>
  );
}
