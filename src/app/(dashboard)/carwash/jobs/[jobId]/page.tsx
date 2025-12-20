'use client';

import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, Timestamp, getDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { auth, firestore } from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface Job {
  id: string;
  clientId: string;
  vehicleId: string;
  clientName?: string;
  clientPhoneNumber: string;
  clientEmail?: string;
  registrationPlate: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  vehicleType: string;
  service: string;
  price: number;
  duration: number;
  status: string;
  receivedBy: string;
  servicedBy: string[];
  createdAt: Timestamp;
}

interface CarwashInfo {
    name: string;
    address?: string;
}

export default function SingleJobPage() {
  const [user, setUser] = useState<User | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [carwashInfo, setCarwashInfo] = useState<CarwashInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { jobId } = params;
  const { toast } = useToast();

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Job-Card-${job?.registrationPlate}-${job?.id.substring(0,5)}`
  });

  const handleShareReviewLink = () => {
    const reviewUrl = `${window.location.origin}/review/${jobId}`;
    navigator.clipboard.writeText(reviewUrl);
    toast({
        title: "Review Link Copied",
        description: "The link has been copied to your clipboard.",
    });
  };


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        router.push('/carwash-login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!user || !jobId) return;

    // Fetch Carwash Info
    const carwashDocRef = doc(firestore, 'carwashes', user.uid);
    const unsubscribeCarwash = onSnapshot(carwashDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setCarwashInfo(docSnap.data() as CarwashInfo);
        }
    });


    const jobDocRef = doc(firestore, 'carwashes', user.uid, 'jobs', jobId as string);
    const unsubscribeJob = onSnapshot(jobDocRef, async (jobSnap) => {
      if (jobSnap.exists()) {
        const jobData = { id: jobSnap.id, ...jobSnap.data() } as Job;
        
        // Fetch related client and vehicle data
        const clientDocRef = doc(firestore, 'carwashes', user.uid, 'clients', jobData.clientId);
        const vehicleDocRef = doc(firestore, 'carwashes', user.uid, 'clients', jobData.clientId, 'vehicles', jobData.vehicleId);

        const [clientSnap, vehicleSnap] = await Promise.all([getDoc(clientDocRef), getDoc(vehicleDocRef)]);

        if(clientSnap.exists()) {
            const clientData = clientSnap.data();
            jobData.clientName = clientData.name;
            jobData.clientPhoneNumber = clientData.phoneNumber;
            jobData.clientEmail = clientData.email;
        }

        if(vehicleSnap.exists()) {
            const vehicleData = vehicleSnap.data();
            jobData.registrationPlate = vehicleData.registrationPlate;
            jobData.carMake = vehicleData.make;
            jobData.carModel = vehicleData.model;
            jobData.carColor = vehicleData.color;
            jobData.vehicleType = vehicleData.type;
        }
        
        setJob(jobData);
      } else {
        setJob(null);
      }
      setIsLoading(false);
    });

    return () => {
        unsubscribeJob();
        unsubscribeCarwash();
    };
  }, [user, jobId]);

  if (isLoading) {
    return (
        <Card>
            <CardHeader><Skeleton className="h-10 w-3/4" /></CardHeader>
            <CardContent className="space-y-8">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </CardContent>
            <CardFooter><Skeleton className="h-10 w-32" /></CardFooter>
        </Card>
    )
  }

  if (!job) {
    return (
         <Card>
            <CardHeader>
                <CardTitle>Job Not Found</CardTitle>
                <CardDescription>This job card could not be found.</CardDescription>
            </CardHeader>
             <CardContent>
                <Button asChild>
                    <Link href="/carwash/jobs">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Jobs
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div>
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-2">
             <Button variant="outline" asChild>
                <Link href="/carwash/jobs">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs List
                </Link>
            </Button>
            <div className="flex items-center gap-2">
                <Button onClick={handleShareReviewLink} variant="outline" size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Review Link
                </Button>
                <Button onClick={handlePrint} size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download as PDF
                </Button>
            </div>
        </div>
        <Card ref={componentRef} className="p-4 sm:p-6 md:p-8">
            <CardHeader className="p-0 mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl font-bold">Job Card</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">Job ID: {job.id.substring(0,7).toUpperCase()}</CardDescription>
                    </div>
                    <div className="text-left sm:text-right mt-4 sm:mt-0">
                         <h3 className="font-bold text-md">{carwashInfo?.name || 'Your Carwash'}</h3>
                         {carwashInfo?.address && <p className="text-sm text-muted-foreground">{carwashInfo.address}</p>}
                         <p className="text-sm text-muted-foreground">{job.createdAt.toDate().toLocaleDateString()}</p>
                    </div>
                </div>
            </CardHeader>

            <Separator className="my-6" />

            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Client Details */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg border-b pb-2">Client Details</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <p className="text-muted-foreground">Name:</p> <p className="font-medium">{job.clientName || 'N/A'}</p>
                            <p className="text-muted-foreground">Phone:</p> <p className="font-medium">{job.clientPhoneNumber}</p>
                            <p className="text-muted-foreground">Email:</p> <p className="font-medium">{job.clientEmail || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Vehicle Details */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg border-b pb-2">Vehicle Details</h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <p className="text-muted-foreground">Reg Plate:</p> <p className="font-mono font-medium">{job.registrationPlate.toUpperCase()}</p>
                            <p className="text-muted-foreground">Make & Model:</p> <p className="font-medium">{job.carMake || ''}{job.carModel ? ` ${job.carModel}` : ''}</p>
                            <p className="text-muted-foreground">Color:</p> <p className="font-medium">{job.carColor || 'N/A'}</p>
                            <p className="text-muted-foreground">Type:</p> <p className="font-medium">{job.vehicleType}</p>
                        </div>
                    </div>
                </div>

                 <Separator className="my-6" />

                 {/* Service Details */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg border-b pb-2">Service Details</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                        <p className="text-muted-foreground col-span-1 sm:col-span-1">Service:</p>
                        <p className="font-semibold col-span-1 sm:col-span-3">{job.service}</p>
                        
                        <p className="text-muted-foreground">Price:</p>
                        <p className="font-medium">Ksh {job.price.toLocaleString()}</p>
                        
                        <p className="text-muted-foreground">Est. Duration:</p> 
                        <p className="font-medium">{job.duration} mins</p>
                        
                        <p className="text-muted-foreground">Status:</p>
                        <p className="font-semibold">{job.status}</p>
                    </div>
                </div>

                <Separator className="my-6" />

                {/* Staff Details */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-lg border-b pb-2">Staff & Time</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                        <p className="text-muted-foreground">Received By:</p> <p className="font-medium">{job.receivedBy}</p>
                        <p className="text-muted-foreground">Date In:</p> <p className="font-medium">{job.createdAt.toDate().toLocaleDateString()}</p>
                        <p className="text-muted-foreground">Time In:</p> <p className="font-medium">{job.createdAt.toDate().toLocaleTimeString()}</p>
                        <p className="text-muted-foreground sm:col-start-1">Serviced By:</p> <p className="font-medium col-span-3">{job.servicedBy.join(', ')}</p>
                    </div>
                </div>
            </CardContent>

             <CardFooter className="p-0 mt-12 text-center text-xs text-muted-foreground">
                <p className="w-full border-t pt-4">Thank you for choosing {carwashInfo?.name || 'our service'}!</p>
            </CardFooter>
        </Card>
    </div>
  );
}

    