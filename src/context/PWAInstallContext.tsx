
'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';

// Define the shape of the context data
interface PWAInstallContextType {
  deferredPrompt: any;
  triggerInstall: () => void;
}

// Create the context with a default value
export const PWAInstallContext = createContext<PWAInstallContextType>({
  deferredPrompt: null,
  triggerInstall: () => {},
});

// Create a provider component
export const PWAInstallProvider = ({ children }: { children: React.ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We can only use the prompt once, so clear it.
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return (
    <PWAInstallContext.Provider value={{ deferredPrompt, triggerInstall }}>
      {children}
    </PWAInstallContext.Provider>
  );
};
