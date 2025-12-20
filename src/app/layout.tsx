
'use client';

import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Toaster } from "@/components/ui/toaster";
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { OnlineStatusNotifier } from '@/components/online-status-notifier';
import { PWAInstallProvider } from '@/context/PWAInstallContext';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isCarwashSection = pathname.startsWith('/carwash');
  const isSuperAdminSection = pathname.startsWith('/cw/overview') || pathname.startsWith('/cw/carwashes') || pathname.startsWith('/cw/settings');
  const isSuperAdminAuth = pathname.startsWith('/cw/login') || pathname.startsWith('/cw/signup');

  const showHeader = !isSuperAdminSection && !isSuperAdminAuth;
  const showFooter = !isCarwashSection && !isSuperAdminSection && !isSuperAdminAuth;
  const mainContentPadding = !isSuperAdminSection;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#0398C8" />
        <title>Cawash | Find the best carwash services near you.</title>
        <meta name="description" content="Find the best carwash services near you with Cawash. Search for your service history, and keep your car sparkling clean." />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <PWAInstallProvider>
          <OnlineStatusNotifier />
          {showHeader && <Header />}
          <main className="flex-grow">
            {mainContentPadding ? (
                <div className="w-[90%] mx-auto">
                    {children}
                </div>
            ) : (
                children
            )}
          </main>
          {showFooter && <Footer />}
          <Toaster />
        </PWAInstallProvider>
      </body>
    </html>
  );
}
