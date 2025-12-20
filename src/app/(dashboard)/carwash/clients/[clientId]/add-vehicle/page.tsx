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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

const carMakes = [
    'Toyota', 'Honda', 'Ford', 'Subaru', 'Nissan', 'Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen', 'Mazda', 'Hyundai', 'Kia', 'Land Rover', 'Other'
];

const carColors = [
    'Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Brown', 'Green', 'Beige', 'Yellow', 'Orange', 'Purple', 'Other'
];

const vehicleTypes = [
    "Saloon", "Hatchback", "SUV", "Truck", "Van", "Motorbike", "Other"
];

const formSchema = z.object({
  registrationPlate: z.string().min(1, 'Registration plate is required'),
  carMake: z.string().optional(),
  carModel: z.string().optional(),
  carColor: z.string().optional(),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
});

export default function AddVehiclePage() {
    const [user, setUser] = useState<User | null>(null);
    const [clientName, setClientName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { clientId } = params;
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            registrationPlate: '',
            carMake: '',
            carModel: '',
            carColor: '',
            vehicleType: '',
        },
    });
    
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/carwash-login');
            } else {
                setUser(currentUser);
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (user && clientId) {
            const clientDocRef = doc(firestore, 'carwashes', user.uid, 'clients', clientId as string);
            getDoc(clientDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    setClientName(docSnap.data().name);
                } else {
                    toast({ variant: 'destructive', title: 'Client not found' });
                    router.push('/carwash/clients');
                }
            });
        }
    }, [user, clientId, router, toast]);
    
    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user || !clientId) return;

        setIsSubmitting(true);
        try {
            const vehiclesCollectionRef = collection(firestore, 'carwashes', user.uid, 'clients', clientId as string, 'vehicles');
            
            const newVehicleDocRef = await addDoc(vehiclesCollectionRef, {
                clientId: clientId as string,
                carwashId: user.uid,
                registrationPlate: values.registrationPlate.toUpperCase(),
                make: values.carMake,
                model: values.carModel,
                color: values.carColor,
                type: values.vehicleType,
            });

            // Add the auto-generated ID to the document
            await updateDoc(newVehicleDocRef, {
                id: newVehicleDocRef.id
            });

            toast({
                title: 'Vehicle Added',
                description: `A new vehicle has been added for ${clientName}.`
            });

            router.push(`/carwash/clients/${clientId}`);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Failed to Add Vehicle',
                description: 'An error occurred. Please try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

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
                        <CardTitle>Add New Vehicle</CardTitle>
                        <CardDescription>Add a new vehicle for {clientName}.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="registrationPlate" render={({ field }) => (
                                <FormItem><FormLabel>Registration Plate</FormLabel><FormControl><Input placeholder="KDA 123B" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="vehicleType" render={({ field }) => (
                                <FormItem><FormLabel>Vehicle Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select vehicle type" /></SelectTrigger></FormControl>
                                    <SelectContent>{vehicleTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="carMake" render={({ field }) => (
                                <FormItem><FormLabel>Car Make (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select car make" /></SelectTrigger></FormControl>
                                    <SelectContent>{carMakes.map(make => <SelectItem key={make} value={make}>{make}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="carModel" render={({ field }) => (
                                <FormItem><FormLabel>Car Model (Optional)</FormLabel><FormControl><Input placeholder="Camry" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="carColor" render={({ field }) => (
                                <FormItem><FormLabel>Car Color (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select car color" /></SelectTrigger></FormControl>
                                    <SelectContent>{carColors.map(color => <SelectItem key={color} value={color}>{color}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Vehicle
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
