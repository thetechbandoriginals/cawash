'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function CwPageContent() {
  const router = useRouter();

  useEffect(() => {
    // The auth check is now in the layout.
    // This page will only be reached by authenticated super admins.
    // Redirect to the default dashboard view.
    router.replace('/cw/overview');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}


export default function SuperAdminRootPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <CwPageContent />
        </Suspense>
    );
}
