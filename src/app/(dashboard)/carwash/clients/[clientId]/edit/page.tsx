'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

const formSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  clientPhoneNumber: z.string().optional(),
});

export default function EditClientPage() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { clientId } = params;
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clientName: '',
            clientEmail: '',
            clientPhoneNumber: '',
        },
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/carwash-login');
            }
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (user && clientId) {
            setIsLoading(true);
            const clientDocRef = doc(firestore, 'carwashes', user.uid, 'clients', clientId as string);
            getDoc(clientDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const clientData = docSnap.data();
                     form.reset({
                        clientName: clientData.name || '',
                        clientEmail: clientData.email || '',
                        clientPhoneNumber: clientData.phoneNumber || '',
                    });
                }
                 setIsLoading(false);
            }).catch(error => {
                console.error("Error fetching client data:", error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not fetch client details.'
                });
                setIsLoading(false);
            });
        }
    }, [user, clientId, form, toast]);
    
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user || !clientId) return;
        
        setIsSubmitting(true);
        try {
            const clientDocRef = doc(firestore, 'carwashes', user.uid, 'clients', clientId as string);
            await updateDoc(clientDocRef, {
                name: values.clientName,
                email: values.clientEmail,
                phoneNumber: values.clientPhoneNumber,
            });

            toast({
                title: 'Client Updated',
                description: "The client's details have been updated."
            });
            router.push(`/carwash/clients/${clientId}`);

        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: 'Could not update client details. Please try again.'
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
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href={`/carwash/clients/${clientId}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <CardTitle>Edit Client</CardTitle>
                        <CardDescription>Update the details for this client.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="clientName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Client Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="clientPhoneNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number (Optional)</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="0712345678" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="clientEmail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Client Email (Optional)</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="john.doe@example.com" {...field} />
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
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
