import type { Metadata } from 'next';
import { VT323 } from 'next/font/google';
import './globals.css';

// A genuine old-terminal/CRT digital face (the Apple IIe reference) — reads
// as a real digital readout rather than a typewriter-style mono. Only ships
// weight 400; the caption drops its font-weight to match instead of forcing
// a synthetic bold.
const terminalMono = VT323({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-terminal-mono',
});

export const metadata: Metadata = {
  title: 'Signal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={terminalMono.variable}>
      <body>{children}</body>
    </html>
  );
}
