import './globals.css';

export const metadata = {
  title: 'Offer Seva | ISKCON Chennai',
  description: 'Support ISKCON Chennai — annadanam, deity seva, nitya seva and festival campaigns. 80G-eligible donations, instant receipts.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
