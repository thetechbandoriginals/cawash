'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useParams, useRouter } from 'next/navigation';
import { auth, firestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Car, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
    id: string;
    fullName: string;
    phoneNumber: string;
    roleId: string;
    canLogin: boolean;
}

interface Job {
    id: string;
    service: string;
    status: string;
    price: number;
    receivedBy: string;
    servicedBy: string[];
    createdAt: { toDate: () => Date };
}

interface MemberStats {
    totalVehicles: number;
    totalRevenue: number;
}

export default function ViewTeamMemberPage() {
    const [user, setUser] = useState<User | null>(null);
    const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
    const [stats, setStats] = useState<MemberStats>({ totalVehicles: 0, totalRevenue: 0 });
    const [activityLogs, setActivityLogs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const params = useParams();
    const { memberId } = params;

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
        if (user && memberId) {
            const memberDocRef = doc(firestore, 'carwashes', user.uid, 'team', memberId as string);
            
            const unsubscribeMember = onSnapshot(memberDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const memberData = { id: docSnap.id, ...docSnap.data() } as TeamMember;
                    setTeamMember(memberData);
                    
                    // Now fetch jobs and calculate stats
                    const jobsQuery = query(collection(firestore, 'carwashes', user.uid, 'jobs'));
                    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
                        const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
                        
                        const memberJobs = jobsData.filter(job => 
                            job.receivedBy === memberData.fullName || (job.servicedBy && job.servicedBy.includes(memberData.fullName))
                        );

                        const totalVehicles = memberJobs.length;
                        const totalRevenue = memberJobs
                            .filter(job => job.status === 'Completed')
                            .reduce((acc, job) => acc + job.price, 0);
                        
                        setStats({ totalVehicles, totalRevenue });
                        
                        const sortedLogs = memberJobs.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
                        setActivityLogs(sortedLogs);
                        setIsLoading(false);
                    });

                    return () => unsubscribeJobs();

                } else {
                    router.push('/carwash/team');
                }
            });
            return () => unsubscribeMember();
        }
    }, [user, memberId, router]);


    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    if (!teamMember) {
        return <div>Team member not found.</div>;
    }


    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/carwash/team">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{teamMember.fullName}'s Profile</h1>
                    <p className="text-muted-foreground">Performance and activity overview.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Vehicles Involved</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalVehicles}</div>
                        <p className="text-xs text-muted-foreground">Total vehicles serviced by {teamMember.fullName}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue Involved</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Ksh {stats.totalRevenue.toLocaleString()}</div>
                         <p className="text-xs text-muted-foreground">Total revenue from jobs involving {teamMember.fullName}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>
                    A log of recent activities by {teamMember.fullName}.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                     {activityLogs.length > 0 ? (
                        activityLogs.map((log) => (
                            <TableRow key={log.id}>
                            <TableCell>Involved in job: {log.service}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{log.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{log.createdAt.toDate().toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))
                     ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">No activity logged yet.</TableCell>
                        </TableRow>
                     )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
    );
}
