import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vercel Password Example',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', padding: '2rem' }}>
        <nav style={{ marginBottom: '2rem' }}>
          <a href="/" style={{ marginRight: '1rem' }}>
            Home
          </a>
          <a href="/admin" style={{ marginRight: '1rem' }}>
            Admin (protected)
          </a>
          <a href="/dashboard">Dashboard (protected)</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
