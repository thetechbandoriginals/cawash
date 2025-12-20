
'use client';

import { useState } from 'react';
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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';


const formSchema = z.object({
  carwashName: z.string().min(1, 'Carwash name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const welcomeEmailTemplate = (carwashName: string) => {
  return `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h1 style="color: #005A9C;">Welcome to Cawash, ${carwashName}!</h1>
      <p>Thank you for registering. Your account is currently pending approval from our team.</p>
      <p>We've credited your account with <strong>200 free credits</strong> to get you started as soon as you're approved.</p>
      <p>You will receive another email once your account has been approved. We're excited to have you on board!</p>
      <p style="margin-top: 30px; font-size: 0.9em; color: #666;">The Cawash Team</p>
    </div>
  `;
}


export default function CarwashCreateAccount() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      carwashName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (user) {
        const batch = writeBatch(firestore);

        const carwashDocRef = doc(firestore, 'carwashes', user.uid);
        batch.set(carwashDocRef, {
          name: values.carwashName,
          ownerId: user.uid,
          email: values.email,
          approved: false,
          credits: 200, // Give 200 free credits on signup
        });

        // Seed default roles
        const rolesCollectionRef = collection(firestore, 'carwashes', user.uid, 'roles');
        const managerRoleRef = doc(rolesCollectionRef, 'manager');
        batch.set(managerRoleRef, { id: 'manager', carwashId: user.uid, name: 'Manager' });
        
        const cleanerRoleRef = doc(rolesCollectionRef, 'cleaner');
        batch.set(cleanerRoleRef, { id: 'cleaner', carwashId: user.uid, name: 'Cleaner' });
        
        await batch.commit();

        // Send welcome email via API route
        await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: values.email,
                subject: `Welcome to Cawash, ${values.carwashName}! Your Account is Pending Approval.`,
                html: welcomeEmailTemplate(values.carwashName),
            }),
        });

        setIsSubmitted(true);
        toast({
          title: 'Account Created!',
          description: 'Your account is pending approval. You have been given 200 free credits to start.',
        });
      }

    } catch (error: any) {
      let friendlyMessage = 'Could not create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'This email is already in use. Please use a different email or log in.';
      }
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: friendlyMessage,
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Thank You!</CardTitle>
            <CardDescription>
              Your account has been created and is now waiting for approval from a super admin. You will be notified once it's approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/carwash-login')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Create your Cawash account</CardTitle>
          <CardDescription>
            Enter your information to create a carwash admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="carwashName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carwash Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Super Suds" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormLabel>Password</FormLabel>
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
                    Creating Account...
                  </>
                ) : (
                  'Create your Cawash account'
                )}
              </Button>
               <div className="px-8 text-center text-sm text-muted-foreground">
                By clicking continue, you agree to our{" "}
                <Link
                    href="/carwash/terms"
                    className="underline underline-offset-4 hover:text-primary"
                >
                    Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                    href="/carwash/privacy"
                    className="underline underline-offset-4 hover:text-primary"
                >
                    Privacy Policy
                </Link>
                .
                </div>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/carwash-login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
