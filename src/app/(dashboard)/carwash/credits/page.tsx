'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
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
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { usePaystackPayment } from 'react-paystack';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';

const formSchema = yup.object().shape({
  amount: yup.number().positive('Amount must be positive').min(50, 'Minimum purchase is KES 50').required(),
});

interface Carwash {
    email: string;
    credits: number;
}

export default function BuyCreditsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [carwash, setCarwash] = useState<Carwash | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const form = useForm({
        resolver: yupResolver(formSchema),
        defaultValues: {
            amount: 50,
        },
        mode: 'onBlur',
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const carwashRef = doc(firestore, 'carwashes', currentUser.uid);
                const carwashSnap = await getDoc(carwashRef);
                if (carwashSnap.exists()) {
                    const carwashData = carwashSnap.data();
                    setCarwash({
                        email: currentUser.email || carwashData.email,
                        credits: carwashData.credits,
                    });
                }
            } else {
                router.push('/carwash-login');
            }
            setIsLoading(false);
        });
        return () => unsubscribeAuth();
    }, [router]);

    const initializePayment = usePaystackPayment({
        publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        currency: 'KES',
    });

    const onSuccess = async (transaction: any) => {
        if (!user) return;
        
        setIsProcessing(true);
        try {
            const response = await fetch('/api/paystack/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reference: transaction.reference, carwashId: user.uid }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Payment Successful',
                    description: `Your purchase of ${data.credits} credits was successful.`,
                });
                router.push('/carwash/dashboard');
            } else {
                throw new Error(data.message || 'Verification failed.');
            }
        } catch(error: any) {
            toast({
                variant: 'destructive',
                title: 'Verification Failed',
                description: 'There was an issue verifying your payment. Please contact support.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const onClose = () => {
        toast({
            variant: 'destructive',
            title: 'Payment Closed',
            description: 'The payment window was closed.',
        });
        setIsProcessing(false);
    };

    const onSubmit = (values: yup.InferType<typeof formSchema>) => {
        if (!carwash?.email && !user?.email) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not find user email for payment.',
            });
            return;
        }
        
        setIsProcessing(true);
        const paystackConfig = {
            amount: values.amount! * 100, // in kobo
            email: carwash?.email || user?.email || '',
            reference: new Date().getTime().toString(),
        };

        initializePayment({ 
            onSuccess: (reference) => { onSuccess(reference) }, 
            onClose,
            config: paystackConfig
        });
    };
    
    if (isLoading) {
        return (
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
        )
    }

  return (
    <Card className="max-w-md mx-auto">
        <CardHeader>
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/carwash/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <CardTitle>Buy Credits</CardTitle>
                    <CardDescription>
                        Current Balance: {carwash?.credits?.toLocaleString() || 0} credits. 1 credit = KES 1.
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Amount to Buy (KES)</FormLabel>
                        <FormControl>
                            <Input type="number" min="50" placeholder="50" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={!form.formState.isValid || isProcessing}>
                    {isProcessing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Pay Now
                        </>
                    )}
                </Button>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
