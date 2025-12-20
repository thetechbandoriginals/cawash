'use client';

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

import { auth, firestore } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, Car, Settings, LogOut } from 'lucide-react';

export default function SuperAdminLayout({
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
        const superAdminRef = doc(firestore, 'superadmins', currentUser.uid);
        const superAdminSnap = await getDoc(superAdminRef);
        if (superAdminSnap.exists()) {
          setUser(currentUser);
        } else {
          // If the user is not a super admin, but is trying to access a cw page,
          // redirect them to the super admin login page.
          if (pathname.startsWith('/cw')) {
             router.push('/cw/login');
          }
        }
      } else {
        // No user, redirect to login if they are in a protected route
        if (pathname.startsWith('/cw') && pathname !== '/cw/login' && pathname !== '/cw/signup') {
            router.push('/cw/login');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);
  
  const handleSignOut = () => {
    auth.signOut().then(() => {
      router.push('/cw/login');
    });
  };
  
  const getInitials = (email: string | null | undefined) => {
    return email ? email.charAt(0).toUpperCase() : 'A';
  };

  if (isLoading) {
    return (
        <div className="flex h-screen">
            <Skeleton className="h-full w-64" />
            <div className="flex-1 p-8 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-screen w-full" />
            </div>
        </div>
    );
  }

  // If there's no user and we are not on a public super admin page, don't render children
  if (!user && pathname.startsWith('/cw') && pathname !== '/cw/login' && pathname !== '/cw/signup') return null;
  
  // Don't show layout on login/signup pages
  if (pathname === '/cw/login' || pathname === '/cw/signup') {
    return <>{children}</>;
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-2">
                <Avatar className="size-8">
                    <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-sidebar-foreground">
                        Super Admin
                    </span>
                     <span className="text-xs text-sidebar-foreground/70">
                        {user?.email}
                    </span>
                </div>
            </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="pt-4">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/cw/overview'}>
                <Link href="/cw/overview">
                  <LayoutDashboard />
                  Overview
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/cw/carwashes'}>
                <Link href="/cw/carwashes">
                  <Car />
                  Carwashes
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/cw/settings'}>
                <Link href="/cw/settings">
                  <Settings />
                  Settings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-background px-4">
             <SidebarTrigger />
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            Super Admin
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                        </p>
                    </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
