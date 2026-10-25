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
  title: 'Netteo — Multilateral Obligation Netting & MUSD Settlement',
  description: 'Many obligations. One net settlement. Reconcile mutual payment obligations and settle only resulting net balances in MUSD on Mezo.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={roundo.variable} suppressHydrationWarning>
      <head>
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
