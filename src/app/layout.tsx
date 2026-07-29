import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enic System - Master Edition',
  description: 'Next.js migration of Enic Web System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
