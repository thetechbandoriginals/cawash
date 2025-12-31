'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, Timestamp, getDocs } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import Link from 'next/link';

interface Client {
    id: string; 
    name: string;
    phoneNumber?: string;
    email?: string;
    jobCount: number;
    lastSeen: Date;
}

export default function ClientsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;

        const clientsQuery = query(collection(firestore, 'carwashes', user.uid, 'clients'));
        const unsubscribeClients = onSnapshot(clientsQuery, async (snapshot) => {
            const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Omit<Client, 'jobCount' | 'lastSeen'> & {createdAt: Timestamp})[];
            
            const jobsQuery = query(collection(firestore, 'carwashes', user.uid, 'jobs'));
            const jobsSnapshot = await getDocs(jobsQuery);
            
            const jobCounts = new Map<string, number>();
            const lastSeenMap = new Map<string, Date>();

            jobsSnapshot.forEach(doc => {
                const job = doc.data();
                if(job.clientId) {
                    jobCounts.set(job.clientId, (jobCounts.get(job.clientId) || 0) + 1);
                    const jobDate = job.createdAt.toDate();
                    const currentLastSeen = lastSeenMap.get(job.clientId);
                    if (!currentLastSeen || jobDate > currentLastSeen) {
                        lastSeenMap.set(job.clientId, jobDate);
                    }
                }
            });

            const clientsList = clientsData.map(client => ({
                ...client,
                jobCount: jobCounts.get(client.id) || 0,
                lastSeen: lastSeenMap.get(client.id) || client.createdAt.toDate(),
            })).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

            setClients(clientsList);
            setIsLoading(false);
        });

        return () => unsubscribeClients();
    }, [user]);

  return (
    <Card>
        <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>A list of all your clients based on job history.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Total Jobs</TableHead>
                        <TableHead>Last Visit</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">Loading clients...</TableCell>
                        </TableRow>
                    ) : clients.length > 0 ? (
                        clients.map((client) => (
                            <TableRow key={client.id}>
                                <TableCell className="font-medium">{client.name}</TableCell>
                                <TableCell>{client.phoneNumber || 'N/A'}</TableCell>
                                <TableCell>{client.email || 'N/A'}</TableCell>
                                <TableCell>{client.jobCount}</TableCell>
                                <TableCell>{client.lastSeen.toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="icon" asChild>
                                        <Link href={`/carwash/clients/${client.id}`}>
                                            <Eye className="h-4 w-4" />
                                            <span className="sr-only">View Client</span>
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">No clients found. Create a job to add one.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}
