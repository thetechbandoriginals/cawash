
'use client';

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { auth, firestore } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import Breadcrumbs from '@/components/breadcrumbs';


export default function CarwashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const carwashRef = doc(firestore, 'carwashes', currentUser.uid);
        const carwashSnap = await getDoc(carwashRef);
        if (carwashSnap.exists() && carwashSnap.data().approved) {
          setUser(currentUser);
        } else {
           if (pathname.startsWith('/carwash')) {
             router.push('/carwash-login');
           }
        }
      } else {
        if (pathname.startsWith('/carwash')) {
            router.push('/carwash-login');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);


  if (isLoading) {
    return (
      <div className="py-10">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-screen w-full" />
        </div>
      </div>
    );
  }

  if (!user && pathname.startsWith('/carwash')) {
      return (
        <div className="py-10">
            <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-screen w-full" />
            </div>
        </div>
      )
  }

  return (
    <div className="py-10">
      <Breadcrumbs />
      {children}
    </div>
  );
}
