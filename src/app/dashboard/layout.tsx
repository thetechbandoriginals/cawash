'use client';

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { auth, firestore } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(firestore, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(currentUser);
        } else {
           router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);


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

  if (!user) {
      return null;
  }

  return (
    <div className="py-10">
      {children}
    </div>
  );
}
