'use client';

import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Loader2 } from 'lucide-react';
import { seedGlobalSettings } from '@/lib/seed-db';

const formSchema = z.object({
  jobCardCost: z.preprocess((a) => parseFloat(z.string().parse(a || '0')), z.number().min(0, 'Cost must be non-negative')),
  minCreditPurchase: z.preprocess((a) => parseFloat(z.string().parse(a || '0')), z.number().min(0, 'Amount must be non-negative')),
  expenseCreditCost: z.preprocess((a) => parseFloat(z.string().parse(a || '0')), z.number().min(0, 'Cost must be non-negative')),
});

export default function SuperAdminSettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobCardCost: 1.5,
      minCreditPurchase: 50,
      expenseCreditCost: 0.5,
    },
  });

   useEffect(() => {
    onAuthStateChanged(auth, async (currentUser) => {
        if(currentUser) {
            setUser(currentUser);
            await seedGlobalSettings();
            const settingsRef = doc(firestore, 'settings', 'global');
            const docSnap = await getDoc(settingsRef);
            if (docSnap.exists()) {
                form.reset(docSnap.data());
            }
        }
        setIsLoading(false);
    });
  }, [form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    setIsSubmitting(true);
    const settingsRef = doc(firestore, 'settings', 'global');
    try {
      await setDoc(settingsRef, values, { merge: true });
      toast({
        title: 'Settings Updated',
        description: 'Global application settings have been updated.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: 'Could not update settings. Please try again.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                 <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-32" />
            </CardContent>
        </Card>
    );
  }

  return (
      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>
            Manage credit and payment settings for the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="jobCardCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Card Creation Cost (Credits)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="1.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="minCreditPurchase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Credit Purchase (KES)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="expenseCreditCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Recording Cost (Credits)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Settings
                    </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}
