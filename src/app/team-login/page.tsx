
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, firestore } from '@/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function TeamMemberLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    // This hook can be used to redirect already logged-in team members
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // You might want to check if they are a team member and redirect them
        // For simplicity, we assume if they land here while logged in, they should be redirected
        router.push('/carwash/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // First, find which carwash this team member belongs to
      const carwashesRef = collection(firestore, 'carwashes');
      const carwashesSnapshot = await getDocs(carwashesRef);
      let memberData: any = null;
      let memberCarwashId: string | null = null;

      for (const carwashDoc of carwashesSnapshot.docs) {
          const teamRef = collection(carwashDoc.ref, 'team');
          const teamQuery = query(teamRef, where('email', '==', values.email));
          const teamSnapshot = await getDocs(teamQuery);
          
          if (!teamSnapshot.empty) {
              memberData = teamSnapshot.docs[0].data();
              memberCarwashId = carwashDoc.id;
              break;
          }
      }

      if (!memberData || !memberCarwashId) {
        throw new Error('No team member account found with this email.');
      }
      
      if (!memberData.canLogin) {
        throw new Error('You do not have permission to log in.');
      }
      
      if (memberData.roleId !== 'Manager') {
        throw new Error('Only managers are allowed to log in.');
      }

      // If member found and can login, attempt to sign in with email and password
      await signInWithEmailAndPassword(auth, values.email, values.password);

      // Redirect to the dashboard of their carwash
      // We can't pass the carwash ID to the layout easily from here,
      // so the layout will need to fetch it based on the logged-in user.
      // For a team member, this is more complex. We'll redirect to the main dashboard
      // and let the layout handle auth state.
      router.push('/carwash/dashboard');

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid credentials or insufficient permissions. Please try again.',
      });
      // Ensure user is signed out if any part of the process fails
      auth.signOut();
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Team Member Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your team account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="m@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                      <FormLabel>Password</FormLabel>
                       <Link
                        href="/forgot-password"
                        className="ml-auto inline-block text-sm underline"
                      >
                        Forgot your password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          {...field}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                          onClick={() => setShowPassword((prev) => !prev)}
                          type="button"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {showPassword ? 'Hide password' : 'Show password'}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
