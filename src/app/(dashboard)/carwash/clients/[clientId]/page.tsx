
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, Timestamp, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Car, Coins, Edit, MoreHorizontal, PlusCircle, Trash2, Truck, Loader2, Phone } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CustomDialog } from '@/components/ui/custom-dialog';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  service: string;
  status: string;
  price: number;
  createdAt: Timestamp;
}

interface ClientInfo {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
}

interface Vehicle {
    id: string;
    registrationPlate: string;
    make?: string;
    model?: string;
    type?: string;
}

interface ClientStats {
    totalWashes: number;
    totalSpent: number;
}

export default function ClientProfilePage() {
    const [user, setUser] = useState<User | null>(null);
    const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
    const [stats, setStats] = useState<ClientStats>({ totalWashes: 0, totalSpent: 0 });
    const [jobs, setJobs] = useState<Job[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
    
    const router = useRouter();
    const params = useParams();
    const { clientId } = params;
    const { toast } = useToast();

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
             const clientDocRef = doc(firestore, 'carwashes', user.uid, 'clients', clientId as string);
             const unsubscribeClient = onSnapshot(clientDocRef, (docSnap) => {
                if(docSnap.exists()){
                    const clientData = docSnap.data();
                    setClientInfo({
                        id: docSnap.id,
                        name: clientData.name,
                        email: clientData.email,
                        phoneNumber: clientData.phoneNumber,
                    });
                }
                setIsLoading(false);
             });

            const jobsQuery = query(
                collection(firestore, 'carwashes', user.uid, 'jobs'),
                where('clientId', '==', clientId as string)
            );
            const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
                const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job))
                    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                setJobs(jobsData);
                
                const totalWashes = jobsData.length;
                const totalSpent = jobsData
                    .filter(job => job.status === 'Completed')
                    .reduce((acc, job) => acc + job.price, 0);
                setStats({ totalWashes, totalSpent });
                
            }, (error) => {
                console.error("Error fetching client jobs:", error);
            });
            
            const vehiclesQuery = query(collection(firestore, 'carwashes', user.uid, 'clients', clientId as string, 'vehicles'));
            const unsubscribeVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
                 const vehiclesData = snapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    return { id: docSnap.id, ...data } as Vehicle;
                });
                setVehicles(vehiclesData);
            });


            return () => {
                unsubscribeClient();
                unsubscribeJobs();
                unsubscribeVehicles();
            };
        }
    }, [user, clientId]);

    const openDeleteDialog = (vehicle: Vehicle) => {
        setVehicleToDelete(vehicle);
        setDialogOpen(true);
    };

    const handleDeleteVehicle = async () => {
        if (!user || !vehicleToDelete || !clientId) return;
        setIsDeleting(true);
        try {
            const vehicleDocRef = doc(firestore, 'carwashes', user.uid, 'clients', clientId as string, 'vehicles', vehicleToDelete.id);
            await deleteDoc(vehicleDocRef);
            toast({
                title: 'Vehicle Deleted',
                description: `Vehicle ${vehicleToDelete.registrationPlate} has been deleted.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: 'Could not delete the vehicle. Please try again.',
            });
        } finally {
            setIsDeleting(false);
            setVehicleToDelete(null);
            setDialogOpen(false);
        }
    };


    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <Skeleton className="h-64 w-full" />
                 <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    if (!clientInfo) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Client Not Found</CardTitle>
                    <CardDescription>Could not find a client with this ID.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/carwash/clients">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
        'Completed': 'default',
        'Ongoing': 'secondary',
        'Pending': 'outline',
        'Cancelled': 'destructive',
    };

    return (
        <>
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/carwash/clients">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{clientInfo.name}</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                           {clientInfo.phoneNumber && <><Phone className="h-4 w-4"/> {clientInfo.phoneNumber}</>}
                           {clientInfo.phoneNumber && clientInfo.email && " | "}
                           {clientInfo.email && ` ${clientInfo.email}`}
                        </p>
                    </div>
                </div>
                <Button asChild variant="outline">
                    <Link href={`/carwash/clients/${clientId}/edit`}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Client
                    </Link>
                </Button>
            </div>

             <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Washes</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalWashes}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Ksh {stats.totalSpent.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Client Vehicles</CardTitle>
                        <CardDescription>A list of vehicles registered to {clientInfo.name}.</CardDescription>
                    </div>
                    <Button asChild size="sm">
                        <Link href={`/carwash/clients/${clientId}/add-vehicle`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Vehicle
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vehicles.length > 0 ? (
                            vehicles.map(vehicle => (
                                <Card key={vehicle.id} className="p-4 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <Truck className="h-8 w-8 text-muted-foreground" />
                                            <div>
                                                <p className="font-bold text-lg">{vehicle.registrationPlate.toUpperCase()}</p>
                                                <p className="text-sm text-muted-foreground">{vehicle.make} {vehicle.model}</p>
                                                <p className="text-xs text-muted-foreground">{vehicle.type}</p>
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/carwash/clients/${clientId}/vehicles/${vehicle.id}/edit`}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Edit</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openDeleteDialog(vehicle)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <p className="text-muted-foreground col-span-full text-center">No vehicles registered for this client yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Activity Log / Job History</CardTitle>
                    <CardDescription>A list of all jobs for {clientInfo.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Job ID</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.length > 0 ? (
                                jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell className="font-medium uppercase">{job.id.substring(0, 7)}</TableCell>
                                        <TableCell>{job.service}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[job.status] || 'default'}>{job.status}</Badge>
                                        </TableCell>
                                        <TableCell>{job.createdAt.toDate().toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">Ksh {job.price.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No jobs found for this client.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <CustomDialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Are you absolutely sure?"
            description={`This action cannot be undone. This will permanently delete the vehicle with registration ${vehicleToDelete?.registrationPlate.toUpperCase()}.`}
        >
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleDeleteVehicle} disabled={isDeleting} variant="destructive">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                </Button>
            </div>
        </CustomDialog>
        </>
    );
}
