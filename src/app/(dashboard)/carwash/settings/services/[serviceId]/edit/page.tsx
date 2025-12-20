
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { ArrowLeft, PlusCircle, Save, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { useRouter, useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const vehicleTypes = [
    "Saloon", "Hatchback", "SUV", "Truck", "Van", "Motorbike", "Other"
];

const vehiclePriceSchema = yup.object().shape({
    vehicleType: yup.string().required("Vehicle type is required"),
    price: yup.number().typeError("Price must be a number").positive("Price must be a positive number").required("Price is required"),
    duration: yup.number().typeError("Duration must be a number").positive("Duration must be a positive number").integer("Duration must be a whole number").required("Duration is required"),
});

const serviceSchema = yup.object().shape({
    name: yup.string().required('Service name is required'),
    vehiclePrices: yup.array().of(vehiclePriceSchema).min(1, "At least one vehicle price is required.").required(),
});


export default function EditServicePage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { serviceId } = params;

  const form = useForm<yup.InferType<typeof serviceSchema>>({
    resolver: yupResolver(serviceSchema),
    defaultValues: {
      name: '',
      vehiclePrices: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "vehiclePrices"
  });

   useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) router.push('/carwash-login');
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (user && serviceId) {
        const serviceDocRef = doc(firestore, 'carwashes', user.uid, 'services', serviceId as string);
        getDoc(serviceDocRef).then(docSnap => {
            if (docSnap.exists()) {
                const serviceData = docSnap.data();
                form.reset({
                    name: serviceData.name,
                    vehiclePrices: serviceData.vehiclePrices || [{ vehicleType: '', price: 0, duration: 0 }]
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Not Found',
                    description: 'The service you are trying to edit does not exist.'
                });
                router.push('/carwash/settings');
            }
             setIsLoading(false);
        });
    }
  }, [user, serviceId, form, router, toast]);

  const onSubmit = async (values: yup.InferType<typeof serviceSchema>) => {
    if (!user || !serviceId) return;

    setIsSubmitting(true);
    try {
        const serviceDocRef = doc(firestore, 'carwashes', user.uid, 'services', serviceId as string);
        await updateDoc(serviceDocRef, {
            name: values.name,
            vehiclePrices: values.vehiclePrices
        });

        toast({
            title: 'Service Updated',
            description: `${values.name} has been successfully updated.`,
        });

        router.push('/carwash/settings');

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: 'Could not update the service. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                 <Skeleton className="h-10 w-48" />
                 <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <Skeleton className="h-64 w-full" />
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
                <Link href="/carwash/settings">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
           </Button>
            <div>
                <CardTitle>Edit Service</CardTitle>
                <CardDescription>
                Update the details for this service.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Service Name</FormLabel><FormControl><Input placeholder="e.g., Full Wash" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
              </div>

              <div className="space-y-4">
                <FormLabel className="font-medium text-base">Vehicle Pricing</FormLabel>
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border p-4 rounded-md relative">
                        <FormField
                            control={form.control}
                            name={`vehiclePrices.${index}.vehicleType`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Vehicle Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {vehicleTypes.map((type) => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField control={form.control} name={`vehiclePrices.${index}.price`} render={({ field }) => (
                            <FormItem><FormLabel>Price (Ksh)</FormLabel><FormControl><Input type="number" placeholder="1000" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name={`vehiclePrices.${index}.duration`} render={({ field }) => (
                            <FormItem><FormLabel>Duration (mins)</FormLabel><FormControl><Input type="number" placeholder="45" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>
                    </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ vehicleType: '', price: 0, duration: 0 })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Vehicle Type
                </Button>
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
