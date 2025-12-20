'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collectionGroup, query, where, onSnapshot, Timestamp, getDoc, doc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Car } from 'lucide-react';

interface Job {
  id: string;
  service: string;
  status: string;
  price: number;
  createdAt: Timestamp;
  carwashId: string;
  carwashName?: string; 
  registrationPlate: string;
}

interface UserData {
    phoneNumber: string;
}

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'Completed': 'default',
    'Ongoing': 'secondary',
    'Pending': 'outline',
    'Cancelled': 'destructive',
};

export default function UserDashboardPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userRef = doc(firestore, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);
                if(userSnap.exists()){
                    setUserData(userSnap.data() as UserData);
                }
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user || !userData) return;

        // This query scans all 'jobs' subcollections across all 'carwashes'
        const jobsQuery = query(
            collectionGroup(firestore, 'jobs'),
            where('clientPhoneNumber', '==', userData.phoneNumber)
        );

        const unsubscribeJobs = onSnapshot(jobsQuery, async (snapshot) => {
            const jobsDataPromises = snapshot.docs.map(async (jobDoc) => {
                const job = { id: jobDoc.id, ...jobDoc.data() } as Job;
                
                // Fetch carwash name
                const carwashRef = doc(firestore, 'carwashes', job.carwashId);
                const carwashSnap = await getDoc(carwashRef);
                if (carwashSnap.exists()) {
                    job.carwashName = carwashSnap.data().name;
                }
                
                return job;
            });

            const jobsData = await Promise.all(jobsDataPromises);
            
            const sortedJobs = jobsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            setJobs(sortedJobs);
            setIsLoading(false);
        });

        return () => unsubscribeJobs();
    }, [user, userData]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>My Carwash History</CardTitle>
                <CardDescription>A list of all your carwash services.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* Mobile View */}
                <div className="md:hidden space-y-4">
                     {isLoading ? (
                        [...Array(3)].map((_, i) => (
                             <Card key={i} className="p-4 space-y-3">
                                <Skeleton className="h-5 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-1/3" />
                                 <div className="flex justify-between items-center pt-2">
                                    <Skeleton className="h-6 w-20" />
                                    <Skeleton className="h-6 w-24" />
                                </div>
                            </Card>
                        ))
                    ) : jobs.length > 0 ? (
                        jobs.map((job) => (
                            <Card key={job.id} className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{job.service}</p>
                                        <p className="text-sm text-muted-foreground">{job.carwashName}</p>
                                    </div>
                                    <Badge variant={statusVariant[job.status] || 'default'}>{job.status}</Badge>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                    <Car className="h-4 w-4" />
                                    <span>{job.registrationPlate}</span>
                                </div>
                                <div className="flex justify-between items-end mt-4">
                                    <p className="text-xs text-muted-foreground">{job.createdAt.toDate().toLocaleDateString()}</p>
                                    <p className="font-semibold">Ksh {job.price.toLocaleString()}</p>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <p>You have no service history yet.</p>
                        </div>
                    )}
                </div>
                
                {/* Desktop View */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Carwash</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Skeleton className="h-6 w-full" />
                                        <Skeleton className="h-6 w-full mt-2" />
                                    </TableCell>
                                </TableRow>
                            ) : jobs.length > 0 ? (
                                jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell>{job.createdAt.toDate().toLocaleDateString()}</TableCell>
                                        <TableCell className="font-medium">{job.carwashName || 'N/A'}</TableCell>
                                        <TableCell>{job.registrationPlate}</TableCell>
                                        <TableCell>{job.service}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[job.status] || 'default'}>{job.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">Ksh {job.price.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        You have no service history yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
