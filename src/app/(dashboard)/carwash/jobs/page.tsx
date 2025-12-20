
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Eye, ChevronDown, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CustomDialog } from '@/components/ui/custom-dialog';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  clientName: string;
  clientPhoneNumber: string;
  registrationPlate: string;
  carMake?: string;
  service: string;
  status: string;
  createdAt: Timestamp;
}

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    'Completed': 'default',
    'Ongoing': 'secondary',
    'Pending': 'outline',
    'Cancelled': 'destructive',
};

const jobStatuses = ["Pending", "Ongoing", "Completed", "Cancelled"];

export default function JobsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ id: string; plate: string } | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const jobsQuery = query(collection(firestore, 'carwashes', user.uid, 'jobs'));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
        const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setJobs(jobsData);
        setIsLoading(false);
    });

    return () => unsubscribeJobs();
  }, [user]);

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    if (!user) return;
    const jobDocRef = doc(firestore, 'carwashes', user.uid, 'jobs', jobId);
    try {
        await updateDoc(jobDocRef, { status: newStatus });
    } catch(e) {
        console.error("Error updating status: ", e);
    }
  };

  const openDeleteDialog = (job: { id: string; plate: string }) => {
    setJobToDelete(job);
    setDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (!user || !jobToDelete) return;
    setIsDeleting(true);
    const jobDocRef = doc(firestore, 'carwashes', user.uid, 'jobs', jobToDelete.id);
    try {
        await deleteDoc(jobDocRef);
        toast({
            title: 'Job Deleted',
            description: `The job card for "${jobToDelete.plate}" has been deleted.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'Could not delete the job card. Please try again.',
        });
    } finally {
        setIsDeleting(false);
        setJobToDelete(null);
        setDialogOpen(false);
    }
};

  return (
    <>
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Jobs</CardTitle>
                <CardDescription>Manage your jobs here.</CardDescription>
            </div>
            <Button asChild>
                <Link href="/carwash/jobs/create">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Job Card
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                     {isLoading ? (
                         <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">Loading jobs...</TableCell>
                        </TableRow>
                    ) : jobs.length > 0 ? (
                        jobs.map((job) => (
                            <TableRow key={job.id}>
                                <TableCell className="font-medium uppercase">{job.id.substring(0, 7)}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{job.clientName}</div>
                                    <div className="text-sm text-muted-foreground">{job.clientPhoneNumber}</div>
                                </TableCell>
                                <TableCell>{job.carMake || ''} - {job.registrationPlate}</TableCell>
                                <TableCell>{job.service}</TableCell>
                                <TableCell>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full justify-between items-center">
                                                <Badge variant={statusVariant[job.status] || 'default'}>{job.status}</Badge>
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {jobStatuses.map(status => (
                                                <DropdownMenuItem key={status} onSelect={() => handleStatusChange(job.id, status)}>
                                                    <Badge variant={statusVariant[status] || 'default'}>{status}</Badge>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                                <TableCell className="text-right">{job.createdAt.toDate().toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/carwash/jobs/${job.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    <span>View</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openDeleteDialog({ id: job.id, plate: job.registrationPlate })} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={7} className="text-center h-24">No jobs created yet.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>

    <CustomDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Are you absolutely sure?"
        description={`This action cannot be undone. This will permanently delete the job card for vehicle "${jobToDelete?.plate}".`}
    >
        <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDelete} disabled={isDeleting} variant="destructive">
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
            </Button>
        </div>
    </CustomDialog>
    </>
  );
}
