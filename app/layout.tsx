import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spaced Spelling Teacher',
  description: 'Teacher dashboard for spaced spelling review management.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
