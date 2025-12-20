
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
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { auth, firestore } from '@/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function CarwashAdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If a user is logged in, check if they are a carwash admin and if they are approved.
        const carwashRef = doc(firestore, 'carwashes', user.uid);
        const carwashSnap = await getDoc(carwashRef);
        if (carwashSnap.exists() && carwashSnap.data().approved) {
          router.push('/carwash/dashboard');
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      const carwashRef = doc(firestore, 'carwashes', user.uid);
      const carwashSnap = await getDoc(carwashRef);

      if (carwashSnap.exists()) {
        if (carwashSnap.data().approved) {
          router.push('/carwash/dashboard');
        } else {
          setIsPendingApproval(true);
          auth.signOut(); // Sign out the user as they are not approved yet
        }
      } else {
        // This email is not for a carwash admin account
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'No carwash account found with this email.',
        });
        auth.signOut();
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid email or password. Please check your credentials and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPendingApproval) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Pending Approval</CardTitle>
            <CardDescription>
              Your account is still waiting for approval from a super admin. You will be notified once it's approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsPendingApproval(false)} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Manage Carwash</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/carwash-create-account" className="underline">
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
