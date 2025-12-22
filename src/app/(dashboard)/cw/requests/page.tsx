
'use client';

import { useEffect, useState } from 'react';
import { firestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface Carwash {
  id: string;
  name: string;
  email: string;
  approved: boolean;
  credits: number;
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

export default function SuperAdminRequestsPage() {
  const [pendingCarwashes, setPendingCarwashes] = useState<Carwash[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    setIsLoading(true);
    
    const pendingQuery = query(collection(firestore, 'carwashes'), where('approved', '==', false));
    const unsubscribePending = onSnapshot(pendingQuery, (querySnapshot) => {
      const carwashes: Carwash[] = [];
      querySnapshot.forEach((doc) => {
        carwashes.push({ id: doc.id, ...doc.data() } as Carwash);
      });
      setPendingCarwashes(carwashes);
      setIsLoading(false);
    });
    
    return () => {
      unsubscribePending();
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

  return (
     <Card>
        <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Review and approve new carwash signups.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
    </Card>
  );
}
