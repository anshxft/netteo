import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '../styles/globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { Web3Provider } from '@/lib/chain/Web3Provider';
import { ToastProvider } from '@/components/ui/Toast/ToastContext';

const roundo = localFont({
  src: [
    {
      path: '../../public/fonts/Roundo-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Roundo-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Roundo-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Roundo-SemiBold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Roundo-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-roundo',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://netteo-six.vercel.app'),
  title: 'Netteo — Multilateral Obligation Netting & MUSD Settlement',
  description: 'Many obligations. One net settlement. Reconcile mutual payment obligations and settle only resulting net balances in MUSD on Mezo.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Netteo — Multilateral Obligation Netting & MUSD Settlement',
    description: 'Many obligations. One net settlement. Reconcile mutual payment obligations and settle only resulting net balances in MUSD on Mezo.',
    url: 'https://netteo-six.vercel.app',
    siteName: 'Netteo',
    images: [
      {
        url: '/brand/netteo-logo-original.png',
        width: 1254,
        height: 1254,
        alt: 'Netteo Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Netteo — Multilateral Obligation Netting & MUSD Settlement',
    description: 'Many obligations. One net settlement. Reconcile mutual payment obligations and settle only resulting net balances in MUSD on Mezo.',
    images: ['/brand/netteo-logo-original.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roundo.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var stored = localStorage.getItem('netteo-theme');
                if (stored === 'dark') {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <Web3Provider>
            <ToastProvider>{children}</ToastProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
