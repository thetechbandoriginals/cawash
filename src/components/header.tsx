
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useContext } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, LogOut, LayoutDashboard, Settings, Menu, X, Building, Download } from 'lucide-react';
import Image from 'next/image';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { PWAInstallContext } from '@/context/PWAInstallContext';


export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isCarwashAdmin, setIsCarwashAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isRegularUser, setIsRegularUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { deferredPrompt, triggerInstall } = useContext(PWAInstallContext);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const carwashRef = doc(firestore, 'carwashes', currentUser.uid);
        const carwashSnap = await getDoc(carwashRef);
        const isCarwash = carwashSnap.exists() && carwashSnap.data().approved;
        setIsCarwashAdmin(isCarwash);

        const superAdminRef = doc(firestore, 'superadmins', currentUser.uid);
        const superAdminSnap = await getDoc(superAdminRef);
        const isSuper = superAdminSnap.exists();
        setIsSuperAdmin(isSuper);
        
        const userRef = doc(firestore, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const isUser = userSnap.exists();
        setIsRegularUser(isUser);

      } else {
        setIsCarwashAdmin(false);
        setIsSuperAdmin(false);
        setIsRegularUser(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    auth.signOut().then(() => {
      router.push('/');
    });
  };

  const getInitials = (email: string | null | undefined) => {
    return email ? email.charAt(0).toUpperCase() : <UserIcon className="h-5 w-5" />;
  };

  const isDashboardPage = pathname.startsWith('/carwash') || pathname.startsWith('/cw') || pathname.startsWith('/dashboard');

  const navLinks = [
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/need-help', label: 'Need Help?' },
  ];

  const UserMenu = () => (
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
              {user?.displayName || user?.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              { isSuperAdmin ? "Super Admin" : isCarwashAdmin ? "Carwash Admin" : "Customer" }
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isCarwashAdmin && (
            <DropdownMenuItem asChild><Link href="/carwash/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /><span>Dashboard</span></Link></DropdownMenuItem>
        )}
        {isRegularUser && (
            <DropdownMenuItem asChild><Link href="/dashboard"><LayoutDashboard className="mr-2 h-4 w-4" /><span>My Dashboard</span></Link></DropdownMenuItem>
        )}
        {isRegularUser && (
             <DropdownMenuItem asChild><Link href="/dashboard/profile"><UserIcon className="mr-2 h-4 w-4" /><span>Profile</span></Link></DropdownMenuItem>
        )}
        {isCarwashAdmin && (
          <>
            <DropdownMenuItem asChild><Link href="/carwash/profile"><UserIcon className="mr-2 h-4 w-4" /><span>Profile</span></Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/carwash/settings"><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link></DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b h-16">
      <div className="flex items-center gap-6">
        <Link href="/" className="no-underline">
            <Image
            src="/Cawash.png"
            alt="Cawash Logo"
            width={120}
            height={40}
            className="object-contain"
            />
        </Link>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-4">
        {!isDashboardPage && navLinks.map(link => (
          <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            {link.label}
          </Link>
        ))}
         {deferredPrompt && (
          <Button variant="outline" size="sm" onClick={triggerInstall}>
            <Download className="mr-2 h-4 w-4" />
            Install App
          </Button>
        )}
        {isLoading ? null : user ? (
          <UserMenu />
        ) : (
          <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">Login</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href="/login">
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>Client</span>
                        </Link>
                    </DropdownMenuItem>
                     <DropdownMenuItem asChild>
                        <Link href="/carwash-login">
                            <Building className="mr-2 h-4 w-4" />
                            <span>Carwash</span>
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        )}
      </nav>

       {/* Mobile Navigation */}
      <div className="md:hidden flex items-center gap-2">
        {user && !isLoading && <UserMenu />}
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px]">
                 <nav className="flex flex-col gap-4 text-sm font-medium mt-10">
                    <SheetClose asChild>
                         <Link href="/" className="flex items-center gap-2 font-semibold mb-4">
                            <Image src="/Cawash.png" alt="Cawash Logo" width={100} height={30} />
                        </Link>
                    </SheetClose>
                    {!isDashboardPage && navLinks.map(link => (
                        <SheetClose asChild key={link.href}>
                             <Link href={link.href} className="text-muted-foreground hover:text-foreground">
                                {link.label}
                            </Link>
                        </SheetClose>
                    ))}
                     <div className="mt-auto pt-6 border-t">
                        {isLoading ? null : user ? (
                            <div className="flex flex-col gap-4">
                                {deferredPrompt && (
                                  <SheetClose asChild>
                                    <Button variant="outline" size="sm" onClick={triggerInstall}>
                                      <Download className="mr-2 h-4 w-4" />
                                      Install App
                                    </Button>
                                  </SheetClose>
                                )}
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                {isCarwashAdmin && <SheetClose asChild><Link href="/carwash/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link></SheetClose>}
                                {isRegularUser && <SheetClose asChild><Link href="/dashboard" className="text-muted-foreground hover:text-foreground">My Dashboard</Link></SheetClose>}
                                <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {deferredPrompt && (
                                   <SheetClose asChild>
                                    <Button variant="outline" size="sm" onClick={triggerInstall}>
                                      <Download className="mr-2 h-4 w-4" />
                                      Install App
                                    </Button>
                                  </SheetClose>
                                )}
                                <SheetClose asChild>
                                    <Button asChild variant="outline"><Link href="/login">Client Login</Link></Button>
                                </SheetClose>
                                 <SheetClose asChild>
                                    <Button asChild variant="outline"><Link href="/carwash-login">Carwash Login</Link></Button>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Button asChild><Link href="/signup">Get Started</Link></Button>
                                </SheetClose>
                            </div>
                        )}
                    </div>
                 </nav>
            </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
