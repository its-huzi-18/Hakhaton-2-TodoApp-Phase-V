import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import ClientProviders from "./ClientProviders";
import ChatbotButton from "./components/ChatbotButton";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TaskFlow - AI-Powered Task Management",
  description: "Manage your tasks with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased overflow-x-hidden`}
      >
        <ClientProviders>
          <Navbar />
          <div className="min-h-screen">
            {children}
          </div>
          <ChatbotButton />
        </ClientProviders>
      </body>
    </html>
  );
}
