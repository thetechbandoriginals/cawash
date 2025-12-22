
'use client';

import { useEffect, useState } from 'react';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Carwash {
  id: string;
  name: string;
  email: string;
  approved: boolean;
  credits: number;
  jobCount?: number;
  creditsUsed?: number;
}

interface Settings {
    jobCardCost?: number;
    expenseCreditCost?: number;
}

const approvalEmailTemplate = (carwashName: string) => {
  const loginUrl = `${window.location.origin}/carwash-login`;
  return `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h1 style="color: #005A9C;">Congratulations, ${carwashName}!</h1>
      <p>We are thrilled to inform you that your carwash account has been approved.</p>
      <p>You can now log in to your dashboard to set up your services, add your team, and start managing your jobs.</p>
      <a href="${loginUrl}" style="display: inline-block; background-color: #007BFF; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold;">Login to Your Dashboard</a>
      <p style="margin-top: 30px; font-size: 0.9em; color: #666;">Welcome aboard,<br>The Cawash Team</p>
    </div>
  `;
}

export default function SuperAdminCarwashesPage() {
  const [pendingCarwashes, setPendingCarwashes] = useState<Carwash[]>([]);
  const [approvedCarwashes, setApprovedCarwashes] = useState<Carwash[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isApprovedLoading, setIsApprovedLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    setIsLoading(true);
    setIsApprovedLoading(true);

    const settingsRef = doc(firestore, 'settings', 'global');
    const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
        if(docSnap.exists()){
            setSettings(docSnap.data() as Settings);
        }
    });
    
    // Listener for pending carwashes
    const pendingQuery = query(collection(firestore, 'carwashes'), where('approved', '==', false));
    const unsubscribePending = onSnapshot(pendingQuery, (querySnapshot) => {
      const carwashes: Carwash[] = [];
      querySnapshot.forEach((doc) => {
        carwashes.push({ id: doc.id, ...doc.data() } as Carwash);
      });
      setPendingCarwashes(carwashes);
      setIsLoading(false);
    });

    // Listener for approved carwashes
    const approvedQuery = query(collection(firestore, 'carwashes'), where('approved', '==', true));
    const unsubscribeApproved = onSnapshot(approvedQuery, async (querySnapshot) => {
      const carwashesPromises = querySnapshot.docs.map(async (doc) => {
        const carwash = { id: doc.id, ...doc.data() } as Carwash;
        
        const jobsRef = collection(firestore, 'carwashes', carwash.id, 'jobs');
        const expensesRef = collection(firestore, 'carwashes', carwash.id, 'expenses');

        const [jobsSnap, expensesSnap] = await Promise.all([
          getDocs(jobsRef),
          getDocs(expensesRef)
        ]);

        const jobCount = jobsSnap.size;
        const expenseCount = expensesSnap.size;
        
        const settingsData = (await getDoc(settingsRef)).data() as Settings | undefined;
        const jobCardCost = settingsData?.jobCardCost || 1.5;
        const expenseCreditCost = settingsData?.expenseCreditCost || 0.5;

        const creditsUsed = (jobCount * jobCardCost) + (expenseCount * expenseCreditCost);

        return { ...carwash, jobCount, creditsUsed };
      });

      const carwashes = await Promise.all(carwashesPromises);
      setApprovedCarwashes(carwashes);
      setIsApprovedLoading(false);
    });
    
    return () => {
      unsubscribeSettings();
      unsubscribePending();
      unsubscribeApproved();
    };
  }, []);

  const handleApprove = async (carwash: Carwash) => {
    const carwashDocRef = doc(firestore, 'carwashes', carwash.id);
    try {
      await updateDoc(carwashDocRef, { approved: true });

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: carwash.email,
          subject: "Your Cawash Account is Approved!",
          html: approvalEmailTemplate(carwash.name),
        }),
      });

      const activityCollectionRef = collection(firestore, 'carwashes', carwash.id, 'activities');
      await addDoc(activityCollectionRef, {
        type: 'Admin',
        description: `Account approved by Super Admin`,
        status: 'Approved',
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Carwash Approved',
        description: `An approval email has been sent to ${carwash.name}.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: 'Approval Failed',
        description: 'Could not approve the carwash account or send the email. Please try again.',
      });
    }
  };

  const renderPendingTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Carwash Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow><TableCell colSpan={3} className="h-24 text-center">Loading...</TableCell></TableRow>
        ) : pendingCarwashes.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center">
              No pending approvals.
            </TableCell>
          </TableRow>
        ) : (
          pendingCarwashes.map((carwash) => (
            <TableRow key={carwash.id}>
              <TableCell className="font-medium">{carwash.name}</TableCell>
              <TableCell>{carwash.email}</TableCell>
              <TableCell className="text-right">
                  <Button onClick={() => handleApprove(carwash)}>Approve</Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderApprovedTable = () => (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Carwash Name</TableHead>
          <TableHead>Credit Balance</TableHead>
          <TableHead>Job Cards</TableHead>
          <TableHead>Credits Used</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isApprovedLoading ? (
          <TableRow><TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell></TableRow>
        ) : approvedCarwashes.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              No approved carwashes.
            </TableCell>
          </TableRow>
        ) : (
          approvedCarwashes.map((carwash) => (
            <TableRow key={carwash.id}>
              <TableCell className="font-medium">{carwash.name}</TableCell>
              <TableCell>{carwash.credits.toLocaleString()}</TableCell>
              <TableCell>{carwash.jobCount?.toLocaleString() ?? 'N/A'}</TableCell>
              <TableCell>{carwash.creditsUsed?.toFixed(2) ?? 'N/A'}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )

  return (
     <Card>
        <CardHeader>
            <CardTitle>Manage Carwashes</CardTitle>
            <CardDescription>Approve new carwash signups and view all partners.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="pending">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
                    <TabsTrigger value="approved">Approved Carwashes</TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4">
                    {renderPendingTable()}
                </TabsContent>
                <TabsContent value="approved" className="mt-4">
                    {renderApprovedTable()}
                </TabsContent>
            </Tabs>
        </CardContent>
    </Card>
  );
}
