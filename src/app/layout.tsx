import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Veritabanı Dönüştürücü',
  description: 'Farklı veritabanı formatları arasında veri aktarımı yapmanızı sağlar',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen flex flex-col">
        <header className="bg-blue-600 text-white py-4 shadow">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold">Veritabanı Dönüştürücü</h1>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="bg-gray-200 text-center py-4 text-sm text-gray-600">
          &copy; {new Date().getFullYear()} Veritabanı Dönüştürücü. Tüm hakları saklıdır.
        </footer>
      </body>
    </html>
  );
}