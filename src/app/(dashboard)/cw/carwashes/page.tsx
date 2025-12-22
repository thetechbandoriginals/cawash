
'use client';

import { useEffect, useState } from 'react';
import { firestore } from '@/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

export default function SuperAdminCarwashesPage() {
  const [approvedCarwashes, setApprovedCarwashes] = useState<Carwash[]>([]);
  const [isApprovedLoading, setIsApprovedLoading] = useState(true);
  
  useEffect(() => {
    setIsApprovedLoading(true);

    const settingsRef = doc(firestore, 'settings', 'global');
    
    const approvedQuery = query(collection(firestore, 'carwashes'), where('approved', '==', true));
    const unsubscribeApproved = onSnapshot(approvedQuery, async (querySnapshot) => {
      const carwashesPromises = querySnapshot.docs.map(async (doc) => {
        const carwash = { id: doc.id, ...doc.data() } as Carwash;
        
        const jobsRef = collection(firestore, 'carwashes', carwash.id, 'jobs');
        const expensesRef = collection(firestore, 'carwashes', carwash.id, 'expenses');

        const [jobsSnap, expensesSnap, settingsSnap] = await Promise.all([
          getDocs(jobsRef),
          getDocs(expensesRef),
          getDoc(settingsRef)
        ]);

        const jobCount = jobsSnap.size;
        const expenseCount = expensesSnap.size;
        
        const settingsData = settingsSnap.data() as Settings | undefined;
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
      unsubscribeApproved();
    };
  }, []);

  return (
     <Card>
        <CardHeader>
            <CardTitle>Approved Carwashes</CardTitle>
            <CardDescription>A list of all active carwash partners on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
    </Card>
  );
}
