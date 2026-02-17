"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/auth";

export default function Hero() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 py-20 sm:py-32 text-white min-h-screen flex items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center animate-slide-up">
          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Organize Your Work
            </span>
            <span className="block mt-2 text-white">
              With Focus & Clarity
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-blue-100 opacity-90">
            A modern task management platform designed for productivity,
            simplicity, and speed. Stay focused and get things done.
          </p>

          {/* Features grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: "Secure by Design",
                desc: "Enterprise-grade authentication and data protection",
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
              },
              {
                title: "Fast Workflow",
                desc: "Create, update, and track tasks instantly",
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                title: "Minimal Interface",
                desc: "Clean UI focused on what matters most",
                icon: (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-6 hover:bg-white/20 transition-all shadow-xl card-hover animate-fade-in"
                style={{animationDelay: `${i * 0.1}s`}}
              >
                <div className="w-12 h-12 mb-4 mx-auto rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-blue-100 opacity-80">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Call to action buttons */}
          <div className="mt-16 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all shadow-2xl transform hover:scale-105 btn-transition"
              >
                <span className="mr-2">Go to Dashboard</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 transition-all shadow-2xl transform hover:scale-105 btn-transition"
                >
                  <span className="mr-2">Get Started Free</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-medium border-2 border-white/30 text-white hover:bg-white/10 transition-all shadow-lg transform hover:scale-105 btn-transition"
                >
                  <span className="mr-2">Sign In</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v4m0-11h3a2 2 0 012 2v10a2 2 0 01-2 2h-3" />
                  </svg>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
