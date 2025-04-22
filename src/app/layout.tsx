import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AIVA - Virtual Assistant',
  description: 'A full-stack virtual assistant app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} h-screen flex flex-col`}>
        <Providers>
          <main className="flex flex-col flex-1 h-full overflow-hidden">
            
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
