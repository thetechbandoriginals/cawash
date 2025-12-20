'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, MoreHorizontal, Trash2, Edit, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

interface Service {
    id: string;
    name: string;
    vehiclePrices: { vehicleType: string; price: number; duration: number }[];
}

const vehicleTypes = [
    "Saloon", "Hatchback", "SUV", "Truck", "Van", "Motorbike", "Other"
];

const vehiclePriceSchema = z.object({
    vehicleType: z.string().min(1, "Vehicle type is required"),
    price: z.preprocess((a) => parseFloat(z.string().parse(a || "0")), z.number().positive("Price must be a positive number")),
    duration: z.preprocess((a) => parseInt(z.string().parse(a || "0"), 10), z.number().positive("Duration must be a positive number")),
});

const serviceSchema = z.object({
    name: z.string().min(1, 'Service name is required'),
    vehiclePrices: z.array(vehiclePriceSchema).min(1, "At least one vehicle price is required."),
});

export default function ServicesSettingsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const serviceForm = useForm<z.infer<typeof serviceSchema>>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            name: '',
            vehiclePrices: [{ vehicleType: '', price: 0, duration: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: serviceForm.control,
        name: "vehiclePrices"
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);
    
    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const servicesQuery = query(collection(firestore, 'carwashes', user.uid, 'services'));

        const unsubscribeServices = onSnapshot(servicesQuery, (querySnapshot) => {
            const servicesData: Service[] = [];
            querySnapshot.forEach((doc) => {
                servicesData.push({ id: doc.id, ...doc.data() } as Service);
            });
            setServices(servicesData);
            setIsLoading(false);
        });
        
        return () => {
            unsubscribeServices();
        };
    }, [user]);

    const onServiceSubmit = async (values: z.infer<typeof serviceSchema>) => {
        if (!user) return toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });

        setIsSubmitting(true);
        try {
            const servicesCollectionRef = collection(firestore, 'carwashes', user.uid, 'services');
            await addDoc(servicesCollectionRef, values);
            toast({ title: 'Service Added', description: `${values.name} has been successfully added.` });
            serviceForm.reset({
                name: '',
                vehiclePrices: [{ vehicleType: '', price: 0, duration: 0 }],
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Uh oh!', description: 'Could not add the service. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteService = async (serviceId: string) => {
        if(!user) return;
        try {
            await deleteDoc(doc(firestore, 'carwashes', user.uid, 'services', serviceId));
            toast({ title: 'Service Deleted', description: 'The service has been deleted.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete service. Please try again.' });
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Skeleton className="h-10 w-full max-w-sm" />
                         <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

  return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Services</CardTitle>
              <CardDescription>
                Add, edit, or remove the services your carwash offers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...serviceForm}>
                <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={serviceForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Service Name</FormLabel><FormControl><Input placeholder="e.g., Full Wash" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                  </div>

                  <div className="space-y-4">
                    <FormLabel className="font-medium text-base">Vehicle Pricing</FormLabel>
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border p-4 rounded-md relative">
                            <FormField
                                control={serviceForm.control}
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
                             <FormField control={serviceForm.control} name={`vehiclePrices.${index}.price`} render={({ field }) => (
                                <FormItem><FormLabel>Price (Ksh)</FormLabel><FormControl><Input type="number" placeholder="1000" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={serviceForm.control} name={`vehiclePrices.${index}.duration`} render={({ field }) => (
                                <FormItem><FormLabel>Duration (mins)</FormLabel><FormControl><Input type="number" placeholder="45" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)}>Remove</Button>
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
                                Adding...
                            </>
                        ) : (
                            <>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Service
                            </>
                        )}
                   </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Existing Services</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Service Name</TableHead>
                            <TableHead>Pricing Details</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {services.length > 0 ? services.map((service) => (
                            <TableRow key={service.id}>
                                <TableCell className="font-medium">{service.name}</TableCell>
                                <TableCell>
                                    {service.vehiclePrices.map((vp, i) => (
                                        <div key={i} className="text-sm">
                                            <span className="font-medium">{vp.vehicleType}:</span> Ksh {vp.price.toLocaleString()} ({vp.duration} mins)
                                        </div>
                                    ))}
                                </TableCell>
                                <TableCell className="text-right">
                                   <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/carwash/settings/services/${service.id}/edit`}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteService(service.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={3} className="text-center h-24">No services added yet.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </div>
  );
}
