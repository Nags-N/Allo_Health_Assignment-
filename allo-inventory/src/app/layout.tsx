import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allo Inventory | Multi-Warehouse Stock Fulfillment",
  description: "Real-time, race-condition-free inventory reservation and checkout system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <header className="sticky top-0 z-50 backdrop-blur-md bg-white/75 dark:bg-slate-900/75 border-b border-slate-200 dark:border-slate-800 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/30">
                A
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
                Allo Inventory
              </span>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/" className="text-sm font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                Catalog
              </Link>
              <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Live System
                </span>
              </div>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 py-6 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} Allo Health. Take-home engineering exercise.
            </p>
            <div className="flex gap-4">
              <a href="/api/products" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                Products API
              </a>
              <a href="/api/warehouses" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                Warehouses API
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
