"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-100px] right-[-100px] w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-72 h-72 bg-sky-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-sky-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <span className="font-bold text-xl">TodoApp</span>
            </div>
            <p className="text-gray-300 text-sm max-w-xs">
              A modern task management application designed to help you stay organized and productive.
              Built with Next.js and FastAPI.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 tracking-wider uppercase mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/features"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Features
                </Link>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Pricing
                </a>
              </li>
              <li>
                <Link
                  href="/auth/signup"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Support links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 tracking-wider uppercase mb-4">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="#help"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Help Center
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="#privacy"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#terms"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} TodoApp. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <span className="sr-only">GitHub</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.092.942-.237 1.34-.476a6.565 6.565 0 00-1.162 2.336c.24.03.462.063.684.114a5.952 5.952 0 00-1.162-1.864 7.026 7.026 0 00-1.09.408c-.346 0-.68-.017-1.004-.05A6.99 6.99 0 0121 19.017c0-3.866-3.135-7.017-7.017-7.017zm0 12.6a5.583 5.583 0 01-3.19-1.02c.069-.014.137-.028.204-.043a5.583 5.583 0 003.19 1.02 5.583 5.583 0 01-3.19 1.02c.069.014.137.028.204.043a5.583 5.583 0 003.19-1.02c-.069.014-.137.028-.204.043a5.583 5.583 0 01-3.19 1.02c.069-.014.137-.028.204-.043a5.583 5.583 0 013.19 1.02z" />
              </svg>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <span className="sr-only">Twitter</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 00-1.51-1.013A4.074 4.074 0 0013.81 8.42c-.72-.12-1.39-.406-1.988-.884a4.074 4.074 0 00-3.679 2.532c.72.12 1.39.406 1.988.884a4.074 4.074 0 00-3.679 2.532c-.72-.12-1.39-.406-1.988-.884a4.074 4.074 0 00-1.51-1.013 8.348 8.348 0 00-4.642 9.66c-.178 0-.355.012-.53.052a8.348 8.348 0 002.007-2.257 4.118 4.118 0 01-1.879-.515 4.074 4.074 0 00-1.51-1.013A4.074 4.074 0 0015.81 8.42c-.72-.12-1.39-.406-1.988-.884a4.074 4.074 0 00-3.679 2.532c.72.12 1.39.406 1.988.884a4.074 4.074 0 00-3.679 2.532c-.72-.12-1.39-.406-1.988-.884z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
