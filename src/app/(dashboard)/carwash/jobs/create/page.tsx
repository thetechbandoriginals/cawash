'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { ArrowLeft, Loader2, PlusCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, addDoc, serverTimestamp, where, getDocs, limit, doc, setDoc, runTransaction, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid'; 

interface Service {
    id: string;
    name: string;
    vehiclePrices: { vehicleType: string; price: number; duration: number }[];
}

interface TeamMember {
    id: string;
    fullName: string;
}

interface Client {
    id: string; // phone number
    name: string;
    email?: string;
}

interface Vehicle {
    id: string;
    clientId: string;
    registrationPlate: string;
    make?: string;
    model?: string;
    color?: string;
    type?: string;
}

interface SearchResult {
    type: 'client' | 'vehicle';
    id: string;
    name: string;
    description: string;
    data: Client | Vehicle;
}


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
  searchQuery: z.string().optional(),
  
  // Client fields
  clientPhoneNumber: z.string().min(1, 'Client phone number is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email address').optional().or(z.literal('')),

  // Vehicle fields
  vehicleId: z.string().optional(), // Holds ID of existing vehicle or 'new'
  registrationPlate: z.string().min(1, 'Registration plate is required'),
  carMake: z.string().optional(),
  carModel: z.string().optional(),
  carColor: z.string().optional(),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  
  // Service fields
  service: z.string().min(1, 'Please select a service'),
  price: z.number().optional(),
  duration: z.number().optional(),
  receivedBy: z.string().min(1, 'This field is required'),
  servicedBy: z.array(z.string()).min(1, 'At least one team member is required'),
});

export default function CreateJobCardPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientVehicles, setClientVehicles] = useState<Vehicle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      searchQuery: '',
      clientPhoneNumber: '',
      clientName: `Client ${uuidv4().substring(0, 8)}`,
      clientEmail: '',
      vehicleId: 'new',
      registrationPlate: '',
      carMake: '',
      carModel: '',
      carColor: '',
      vehicleType: '',
      service: '',
      receivedBy: '',
      servicedBy: [],
    },
  });

  const watchedServiceId = useWatch({ control: form.control, name: 'service' });
  const watchedVehicleType = useWatch({ control: form.control, name: 'vehicleType' });
  const searchQuery = useWatch({ control: form.control, name: 'searchQuery' });
  const watchedVehicleId = useWatch({ control: form.control, name: 'vehicleId' });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) router.push('/carwash-login');
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const servicesQuery = query(collection(firestore, 'carwashes', user.uid, 'services'));
    const unsubscribeServices = onSnapshot(servicesQuery, (snapshot) => {
        setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[]);
    });

     const teamQuery = query(collection(firestore, 'carwashes', user.uid, 'team'));
     const unsubscribeTeam = onSnapshot(teamQuery, (snapshot) => {
        setTeamMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TeamMember[]);
     });

    return () => {
        unsubscribeServices();
        unsubscribeTeam();
    };
  }, [user]);

   useEffect(() => {
        if (!searchQuery || !user) {
            setSearchResults([]);
            return;
        }

        const performSearch = async () => {
            setIsSearchLoading(true);
            const results: SearchResult[] = [];
            const upperSearchQuery = searchQuery.toUpperCase();

            // 1. Search Clients by Phone Number
            const clientsRef = collection(firestore, 'carwashes', user.uid, 'clients');
            const clientQuery = query(
                clientsRef, 
                where('phoneNumber', '>=', searchQuery),
                where('phoneNumber', '<=', searchQuery + '\uf8ff'),
                limit(5)
            );
            const clientSnapshot = await getDocs(clientQuery);
            clientSnapshot.forEach(doc => {
                const clientData = { id: doc.id, ...doc.data() } as Client;
                results.push({
                    type: 'client',
                    id: clientData.id,
                    name: clientData.name,
                    description: `Client - ${clientData.id}`,
                    data: clientData
                });
            });

            // 2. Search Vehicles by Registration Plate
            // Firestore doesn't support collection group queries with complex filters on different fields in client sdk well.
            // A simplified search on all vehicles could be slow and expensive.
            // For this implementation, we will fetch all vehicles and filter client-side.
            // This is NOT ideal for large datasets but works for this scenario.
             const allClientsSnapshot = await getDocs(clientsRef);
             for (const clientDoc of allClientsSnapshot.docs) {
                const vehiclesRef = collection(clientDoc.ref, 'vehicles');
                const vehicleQuery = query(vehiclesRef, 
                    where('registrationPlate', '>=', upperSearchQuery),
                    where('registrationPlate', '<=', upperSearchQuery + '\uf8ff'),
                    limit(5)
                );
                const vehicleSnapshot = await getDocs(vehicleQuery);
                for (const vehicleDoc of vehicleSnapshot.docs) {
                     const vehicleData = { id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle;
                     const clientData = { id: clientDoc.id, ...clientDoc.data() } as Client;
                     if (!results.some(r => r.type === 'vehicle' && r.id === vehicleData.id)) {
                        results.push({
                            type: 'vehicle',
                            id: vehicleData.id,
                            name: `${vehicleData.registrationPlate.toUpperCase()}`,
                            description: `Vehicle - owned by ${clientData.name}`,
                            data: vehicleData
                        });
                     }
                }
             }

            setSearchResults(results.slice(0, 10));
            setIsSearchLoading(false);
        };

        const debounceTimer = setTimeout(performSearch, 500);
        return () => clearTimeout(debounceTimer);

    }, [searchQuery, user]);

  useEffect(() => {
    if (watchedServiceId && watchedVehicleType) {
      const selectedService = services.find((s) => s.id === watchedServiceId);
      if (selectedService) {
          const vehiclePrice = selectedService.vehiclePrices.find(vp => vp.vehicleType === watchedVehicleType);
          if (vehiclePrice) {
              form.setValue('price', vehiclePrice.price);
              form.setValue('duration', vehiclePrice.duration);
          } else {
              form.setValue('price', undefined);
              form.setValue('duration', undefined);
          }
      }
    } else {
        form.setValue('price', undefined);
        form.setValue('duration', undefined);
    }
  }, [watchedServiceId, watchedVehicleType, services, form]);

  useEffect(() => {
    if (watchedVehicleId && watchedVehicleId !== 'new' && clientVehicles.length > 0) {
        const vehicle = clientVehicles.find(v => v.id === watchedVehicleId);
        if (vehicle) {
            form.setValue('registrationPlate', vehicle.registrationPlate);
            form.setValue('carMake', vehicle.make);
            form.setValue('carModel', vehicle.model);
            form.setValue('carColor', vehicle.color);
            form.setValue('vehicleType', vehicle.type);
        }
    } else if (watchedVehicleId === 'new') {
        form.setValue('registrationPlate', '');
        form.setValue('carMake', '');
        form.setValue('carModel', '');
        form.setValue('carColor', '');
        form.setValue('vehicleType', '');
    }
  }, [watchedVehicleId, clientVehicles, form]);

  const handleClientSelect = async (result: SearchResult) => {
    let client: Client;
    if (result.type === 'client') {
        client = result.data as Client;
    } else {
        // If a vehicle is selected, we need to fetch its owner client
        const vehicle = result.data as Vehicle;
        if (!user) return;
        const clientDocRef = doc(firestore, 'carwashes', user.uid, 'clients', vehicle.clientId);
        const clientSnap = await getDoc(clientDocRef);
        if (!clientSnap.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not find the owner for the selected vehicle.' });
            return;
        }
        client = { id: clientSnap.id, ...clientSnap.data() } as Client;
    }

    setSelectedClient(client);
    form.setValue('clientName', client.name);
    form.setValue('clientPhoneNumber', client.id);
    form.setValue('clientEmail', client.email || '');
    setSearchResults([]);
    form.setValue('searchQuery', '');

    if (user) {
        const vehiclesRef = collection(firestore, 'carwashes', user.uid, 'clients', client.id, 'vehicles');
        onSnapshot(vehiclesRef, (snapshot) => {
            const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
            setClientVehicles(vehicles);
             if (result.type === 'vehicle') {
                form.setValue('vehicleId', result.id);
            }
        });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const settingsDocRef = doc(firestore, 'settings', 'global');
            const carwashDocRef = doc(firestore, 'carwashes', user.uid);

            const [settingsSnap, carwashSnap] = await Promise.all([
                transaction.get(settingsDocRef),
                transaction.get(carwashDocRef)
            ]);

            if (!settingsSnap.exists()) {
                throw new Error("Global settings not found. Please contact support.");
            }
            if (!carwashSnap.exists()) {
                throw new Error("Carwash data not found.");
            }

            const jobCardCost = settingsSnap.data().jobCardCost || 1.5;
            const currentCredits = carwashSnap.data().credits || 0;

            if (currentCredits < jobCardCost) {
                throw new Error(`Insufficient credits. You need ${jobCardCost} credits to create a job card.`);
            }

            const { price, duration, service: serviceId, ...rest } = values;
            const selectedService = services.find(s => s.id === serviceId);

            if (!price || !duration || !selectedService) {
                throw new Error("Could not find price/duration for the selected service and vehicle type.");
            }
            
            let clientId = selectedClient?.id || values.clientPhoneNumber;
            let vehicleId = values.vehicleId;

            const clientRef = doc(firestore, 'carwashes', user.uid, 'clients', clientId);
            transaction.set(clientRef, {
                id: clientId,
                carwashId: user.uid,
                name: values.clientName,
                phoneNumber: values.clientPhoneNumber,
                email: values.clientEmail,
                createdAt: serverTimestamp(),
            }, { merge: true });

            const vehicleDataToSave = {
                clientId: clientId,
                carwashId: user.uid,
                registrationPlate: values.registrationPlate.toUpperCase(),
                make: values.carMake,
                model: values.carModel,
                color: values.carColor,
                type: values.vehicleType,
            };
            
            const vehiclesRef = collection(firestore, 'carwashes', user.uid, 'clients', clientId, 'vehicles');
            const q = query(vehiclesRef, where("registrationPlate", "==", values.registrationPlate.toUpperCase()), limit(1));
            const querySnapshot = await getDocs(q);
            
            let existingVehicleDoc = null;
            if (!querySnapshot.empty) {
                existingVehicleDoc = querySnapshot.docs[0];
            }

            if (existingVehicleDoc) {
                vehicleId = existingVehicleDoc.id;
                transaction.update(existingVehicleDoc.ref, vehicleDataToSave);
            } else {
                const newVehicleRef = doc(vehiclesRef);
                vehicleId = newVehicleRef.id;
                transaction.set(newVehicleRef, { ...vehicleDataToSave, id: vehicleId });
            }
            
            if (!vehicleId) {
                throw new Error("Vehicle ID could not be determined. Please select or add a vehicle.");
            }

            const jobsCollectionRef = collection(firestore, 'carwashes', user.uid, 'jobs');
            const newJobRef = doc(jobsCollectionRef);
            const jobData = {
                ...rest,
                id: newJobRef.id,
                carwashId: user.uid,
                clientId: clientId,
                vehicleId: vehicleId,
                clientPhoneNumber: values.clientPhoneNumber,
                price: price,
                duration: duration,
                service: selectedService.name,
                status: "Pending",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            transaction.set(newJobRef, jobData);
            
            const activityCollectionRef = collection(firestore, 'carwashes', user.uid, 'activities');
            const newActivityRef = doc(activityCollectionRef);
            transaction.set(newActivityRef, {
                type: 'Job',
                description: `Created job for ${values.registrationPlate} (${selectedService.name})`,
                status: 'Pending',
                createdAt: serverTimestamp(),
            });

            // Deduct credits
            const newCreditBalance = currentCredits - jobCardCost;
            transaction.update(carwashDocRef, { credits: newCreditBalance });
        });

        toast({
          title: 'Job Card Created',
          description: `A new job card for ${values.registrationPlate} has been created.`,
        });
        router.push('/carwash/jobs');

    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: error.message || "Could not create job card. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const price = form.watch('price');
  const duration = form.watch('duration');
  
  const selectClassName = "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" asChild>
                <Link href="/carwash/jobs">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
           </Button>
            <div>
                <CardTitle>Create Job Card</CardTitle>
                <CardDescription>
                Search by phone or reg. plate, or add a new client.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* CLIENT SECTION */}
            <div className="space-y-4 p-4 border rounded-lg relative">
                <CardTitle className="text-lg">Client Details</CardTitle>
                <div className="relative">
                    {!selectedClient ? (
                        <>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search by Phone Number or Registration Plate..." className="pl-10" {...form.register('searchQuery')}/>
                            {searchQuery && (
                                <div className="absolute top-full left-0 right-0 z-10 bg-background border rounded-md shadow-lg mt-1">
                                    {isSearchLoading ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                                    ) : searchResults.length > 0 ? (
                                    <ul className="py-1">
                                        {searchResults.map((result) => (
                                            <li key={`${result.type}-${result.id}`} onClick={() => handleClientSelect(result)} className="px-4 py-2 hover:bg-accent cursor-pointer text-sm">
                                                <p className="font-medium">{result.name}</p>
                                                <p className="text-xs text-muted-foreground">{result.description}</p>
                                            </li>
                                        ))}
                                    </ul>
                                    ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground">No results found. You can add a new client below.</div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="text-center text-muted-foreground py-2">OR</div>
                        </>
                    ) : (
                        <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <p>Selected Client: <span className="font-bold">{selectedClient.name}</span> ({selectedClient.id})</p>
                            <Button variant="link" size="sm" onClick={() => {
                                setSelectedClient(null);
                                setClientVehicles([]);
                                form.reset({ 
                                    ...form.getValues(), 
                                    clientName: `Client ${uuidv4().substring(0, 8)}`,
                                    clientPhoneNumber: '', 
                                    clientEmail: '', 
                                    vehicleId: 'new' 
                                });
                            }}>Change</Button>
                        </div>
                    )}
                </div>
               
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="clientName" render={({ field }) => (
                        <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} disabled={!!selectedClient} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="clientPhoneNumber" render={({ field }) => (
                        <FormItem><FormLabel>Client Phone Number</FormLabel><FormControl><Input placeholder="0712345678" {...field} disabled={!!selectedClient} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="clientEmail" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Client Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="john.doe@example.com" {...field} disabled={!!selectedClient} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            </div>

            {/* VEHICLE SECTION */}
            <div className="space-y-4 p-4 border rounded-lg">
                <CardTitle className="text-lg">Vehicle Details</CardTitle>
                 <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Select Vehicle</FormLabel>
                        <FormControl>
                            <select {...field} className={selectClassName} disabled={!selectedClient && clientVehicles.length === 0}>
                                <option value="new">Add New Vehicle</option>
                                {clientVehicles.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationPlate.toUpperCase()} - {vehicle.make} {vehicle.model}</option>
                                ))}
                            </select>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid md:grid-cols-2 gap-6">
                     <FormField control={form.control} name="registrationPlate" render={({ field }) => (
                        <FormItem><FormLabel>Registration Plate</FormLabel><FormControl><Input placeholder="KDA 123B" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="vehicleType" render={({ field }) => (
                        <FormItem><FormLabel>Vehicle Type</FormLabel>
                            <FormControl>
                                <select {...field} className={selectClassName}>
                                    <option value="" disabled>Select vehicle type</option>
                                    {vehicleTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="carMake" render={({ field }) => (
                        <FormItem><FormLabel>Car Make (Optional)</FormLabel>
                            <FormControl>
                                <select {...field} className={selectClassName}>
                                     <option value="">Select car make</option>
                                    {carMakes.map(make => <option key={make} value={make}>{make}</option>)}
                                </select>
                            </FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="carModel" render={({ field }) => (
                        <FormItem><FormLabel>Car Model (Optional)</FormLabel><FormControl><Input placeholder="Camry" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="carColor" render={({ field }) => (
                        <FormItem><FormLabel>Car Color (Optional)</FormLabel>
                             <FormControl>
                                <select {...field} className={selectClassName}>
                                    <option value="">Select car color</option>
                                    {carColors.map(color => <option key={color} value={color}>{color}</option>)}
                                </select>
                            </FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                </div>
            </div>

             {/* SERVICE SECTION */}
             <div className="space-y-4 pt-4 border-t">
                <CardTitle className="text-lg">Service Details</CardTitle>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                    <FormField control={form.control} name="service" render={({ field }) => (
                        <FormItem><FormLabel>Service</FormLabel>
                            <FormControl>
                                <select {...field} className={selectClassName}>
                                    <option value="" disabled>Select a service</option>
                                    {services.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
                                </select>
                            </FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                    <div>
                        <FormLabel>Price (Ksh)</FormLabel>
                        <Input readOnly value={price !== null && price !== undefined ? `Ksh ${price.toLocaleString()}` : 'N/A'} className="bg-muted font-bold"/>
                    </div>
                     <div>
                        <FormLabel>Estimated Duration (mins)</FormLabel>
                        <Input readOnly value={duration !== null && duration !== undefined ? `${duration} mins` : 'N/A'} className="bg-muted font-bold"/>
                    </div>
                     <FormField control={form.control} name="receivedBy" render={({ field }) => (
                        <FormItem><FormLabel>Car Received By</FormLabel>
                             <FormControl>
                                <select {...field} className={selectClassName}>
                                    <option value="" disabled>Select team member</option>
                                    {teamMembers.map(member => <option key={member.id} value={member.fullName}>{member.fullName}</option>)}
                                </select>
                            </FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormField
                        control={form.control}
                        name="servicedBy"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Serviced By</FormLabel>
                                <FormControl>
                                <select 
                                    multiple 
                                    className="h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    onChange={(e) => field.onChange(Array.from(e.target.selectedOptions, option => option.value))}
                                    value={field.value}
                                >
                                    {teamMembers.map(member => <option key={member.id} value={member.fullName}>{member.fullName}</option>)}
                                </select>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
             </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                  </>
              ) : (
                  'Create Job Card'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
