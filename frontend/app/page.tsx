"use client";


import Hero from "./components/Hero";
import Features from "./components/features/page";
import Footer from "./components/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">


      <main className="flex-grow">
        <Hero />
        <Features />
        
        {/* AI Chat CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-br from-green-500/10 via-teal-500/10 to-blue-500/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-6">
              Try AI-Powered Task Management
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Chat with our AI assistant to manage your tasks naturally
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Start Chatting Now
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
