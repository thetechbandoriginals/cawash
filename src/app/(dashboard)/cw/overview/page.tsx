'use client';

import { useEffect, useState } from 'react';
import { firestore } from '@/firebase';
import { collection, query, onSnapshot, orderBy, limit, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Handshake, Users, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Carwash {
  id: string;
  approved: boolean;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  status?: string;
  createdAt: { toDate: () => Date };
}

interface Transaction {
    amount: number;
}

export default function SuperAdminOverviewPage() {
  const [carwashes, setCarwashes] = useState<Carwash[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
      setIsLoading(true);

      const carwashesQuery = query(collection(firestore, 'carwashes'));
      const unsubscribeCarwashes = onSnapshot(carwashesQuery, (querySnapshot) => {
        const carwashesData: Carwash[] = [];
        querySnapshot.forEach((doc) => {
          carwashesData.push({ id: doc.id, ...doc.data() } as Carwash);
        });
        setCarwashes(carwashesData);
        setIsLoading(false);
      });
      
      const activitiesQuery = query(
            collectionGroup(firestore, 'activities'), 
            orderBy('createdAt', 'desc'),
            limit(5)
        );
      const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
          const acts = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Activity));
          setActivities(acts);
      });

      const transactionsQuery = query(collection(firestore, 'transactions'));
      const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
        let total = 0;
        snapshot.forEach((doc) => {
            const transaction = doc.data() as Transaction;
            total += transaction.amount;
        });
        setTotalRevenue(total);
      });

      return () => {
        unsubscribeCarwashes();
        unsubscribeActivities();
        unsubscribeTransactions();
      };
  }, []);


  const getRelativeTime = (date: Date | undefined) => {
    if (!date) return '';
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  const approvedCount = carwashes.filter(c => c.approved).length;
  const pendingCount = carwashes.length - approvedCount;

  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Platform Revenue</CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">Ksh {totalRevenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">From all credit purchases</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Approved Carwashes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{approvedCount}</div>
                    <p className="text-xs text-muted-foreground">Total active partners</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                    <Handshake className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingCount}</div>
                    <p className="text-xs text-muted-foreground">New carwashes awaiting review</p>
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>A log of recent platform events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {activities.length > 0 ? (
                    activities.map((activity) => (
                         <div key={activity.id} className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <Badge variant={activity.type === 'Job' ? 'secondary' : 'default'} className="h-8 w-8 items-center justify-center rounded-full">
                                    {activity.type.charAt(0)}
                                </Badge>
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm">{activity.description}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {getRelativeTime(activity.createdAt?.toDate())}
                                </p>
                            </div>
                        </div>
                    ))
                 ) : (
                    <div className="text-center text-sm text-muted-foreground py-10">No recent activity.</div>
                 )}
            </CardContent>
        </Card>
    </div>
  );
}
