import './globals.css';

export const metadata = {
  title: 'Tanzifco — Conversation Monitor',
  description: 'AI conversation monitoring dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="paper-texture min-h-screen">{children}</body>
    </html>
  );
}
