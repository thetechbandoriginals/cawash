
'use client';

import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';

export function OnlineStatusNotifier() {
  const isOnline = useOnlineStatus();
  const { toast, dismiss } = useToast();
  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOnline) {
      // Avoid showing a new toast if one is already visible
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
      }
      const { id } = toast({
        variant: 'destructive',
        title: 'You are currently offline',
        description: 'Please check your internet connection. Some features may not be available.',
        duration: Infinity,
      });
      toastIdRef.current = id;
    } else {
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
        toastIdRef.current = null;
        toast({
          title: 'You are back online!',
          description: 'Your internet connection has been restored.',
          duration: 3000,
        });
      }
    }
  }, [isOnline, toast, dismiss]);

  return null; // This component doesn't render anything itself
}
