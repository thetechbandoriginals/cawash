'use client';

import { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfToday, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface Job {
  id: string;
  price: number;
  status: string;
  createdAt: Timestamp;
  service: string;
  clientName: string;
  carMake?: string;
  servicedBy: string[];
}

interface Expense {
  id: string;
  amount: number;
  date: Timestamp;
}

interface Review {
    id: string;
    rating: number;
    comment: string;
    customerName: string;
    createdAt: Timestamp;
}

type FilterType = 'all' | 'today' | 'week' | 'month' | 'year';

const countOccurrences = (arr: (string | undefined)[]) => {
    return arr.reduce((acc, curr) => {
        if (curr) {
            acc[curr] = (acc[curr] || 0) + 1;
        }
        return acc;
    }, {} as { [key: string]: number });
};

const getTopItems = (data: { [key: string]: number }, limit = 5) => {
    return Object.entries(data)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));
};


export default function ReportsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const jobsQuery = query(collection(firestore, 'carwashes', user.uid, 'jobs'));
        const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
            setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
            setIsLoading(false); // Main loading indicator
        });

        const expensesQuery = query(collection(firestore, 'carwashes', user.uid, 'expenses'));
        const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
        });
        
        const reviewsQuery = query(collection(firestore, 'carwashes', user.uid, 'reviews'), orderBy('createdAt', 'desc'));
        const unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
            setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
        });

        return () => {
            unsubscribeJobs();
            unsubscribeExpenses();
            unsubscribeReviews();
        };
    }, [user]);

    const filteredData = useMemo(() => {
        const now = new Date();
        let startDate: Date;

        switch (filter) {
            case 'today':
                startDate = startOfToday();
                break;
            case 'week':
                startDate = startOfWeek(now);
                break;
            case 'month':
                startDate = startOfMonth(now);
                break;
            case 'year':
                startDate = startOfYear(now);
                break;
            case 'all':
            default:
                startDate = new Date(0); // far past
                break;
        }

        const filteredJobs = jobs.filter(job => job.createdAt.toDate() >= startDate);
        const filteredExpenses = expenses.filter(expense => expense.date.toDate() >= startDate);

        const completedJobs = filteredJobs.filter(job => job.status === 'Completed');
        const totalRevenue = completedJobs.reduce((acc, job) => acc + job.price, 0);
        const totalExpenses = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        
        const topServices = getTopItems(countOccurrences(completedJobs.map(j => j.service)));
        const topClients = getTopItems(countOccurrences(completedJobs.map(j => j.clientName)));
        const topCarMakes = getTopItems(countOccurrences(completedJobs.map(j => j.carMake)));
        
        const teamPerformance = countOccurrences(completedJobs.flatMap(j => j.servicedBy));
        const topTeamMembers = getTopItems(teamPerformance);

        return {
            totalRevenue,
            totalExpenses,
            netProfit,
            topServices,
            topClients,
            topCarMakes,
            topTeamMembers,
        };
    }, [jobs, expenses, filter]);
    
    if(isLoading) {
        return (
             <div className="space-y-6">
                <Card><CardHeader><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 mt-2" /></CardHeader></Card>
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
                 <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
             </div>
        )
    }

    const renderStars = (rating: number) => {
        return (
            <div className="flex">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Reports</CardTitle>
                    <CardDescription>
                        An overview of your carwash performance. Filter by time range.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                     <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All Time</Button>
                     <Button size="sm" variant={filter === 'today' ? 'default' : 'outline'} onClick={() => setFilter('today')}>Today</Button>
                     <Button size="sm" variant={filter === 'week' ? 'default' : 'outline'} onClick={() => setFilter('week')}>This Week</Button>
                     <Button size="sm" variant={filter === 'month' ? 'default' : 'outline'} onClick={() => setFilter('month')}>This Month</Button>
                     <Button size="sm" variant={filter === 'year' ? 'default' : 'outline'} onClick={() => setFilter('year')}>This Year</Button>
                </CardContent>
            </Card>

            <Tabs defaultValue="overview">
                 <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview">Performance Overview</TabsTrigger>
                    <TabsTrigger value="reviews">Customer Reviews</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground text-green-500" />
                            </CardHeader>
                            <CardContent><p className="text-2xl font-bold">Ksh {filteredData.totalRevenue.toLocaleString()}</p></CardContent>
                        </Card>
                        <Card>
                           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                                <TrendingDown className="h-4 w-4 text-muted-foreground text-red-500" />
                            </CardHeader>
                            <CardContent><p className="text-2xl font-bold">Ksh {filteredData.totalExpenses.toLocaleString()}</p></CardContent>
                        </Card>
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className={`text-2xl font-bold ${filteredData.netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                    Ksh {filteredData.netProfit.toLocaleString()}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Top Booked Services</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Service Name</TableHead><TableHead className="text-right">Jobs</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredData.topServices.length > 0 ? filteredData.topServices.map(service => (
                                            <TableRow key={service.name}><TableCell>{service.name}</TableCell><TableCell className="text-right font-bold">{service.count}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={2} className="h-24 text-center">No data for this period.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Top Performing Team Members</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Team Member</TableHead><TableHead className="text-right">Jobs</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredData.topTeamMembers.length > 0 ? filteredData.topTeamMembers.map(member => (
                                            <TableRow key={member.name}><TableCell>{member.name}</TableCell><TableCell className="text-right font-bold">{member.count}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={2} className="h-24 text-center">No data for this period.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Top Booking Clients</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Client Name</TableHead><TableHead className="text-right">Jobs</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredData.topClients.length > 0 ? filteredData.topClients.map(client => (
                                            <TableRow key={client.name}><TableCell>{client.name}</TableCell><TableCell className="text-right font-bold">{client.count}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={2} className="h-24 text-center">No data for this period.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Top Washed Car Makes</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Car Make</TableHead><TableHead className="text-right">Washes</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {filteredData.topCarMakes.length > 0 ? filteredData.topCarMakes.map(make => (
                                            <TableRow key={make.name}><TableCell>{make.name}</TableCell><TableCell className="text-right font-bold">{make.count}</TableCell></TableRow>
                                        )) : <TableRow><TableCell colSpan={2} className="h-24 text-center">No data for this period.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="reviews" className="mt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Customer Reviews</CardTitle>
                            <CardDescription>See what your customers are saying.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead>Comment</TableHead>
                                        <TableHead className="text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reviews.length > 0 ? (
                                        reviews.map((review) => (
                                            <TableRow key={review.id}>
                                                <TableCell className="font-medium">{review.customerName}</TableCell>
                                                <TableCell>{renderStars(review.rating)}</TableCell>
                                                <TableCell className="text-muted-foreground">{review.comment}</TableCell>
                                                <TableCell className="text-right">{review.createdAt.toDate().toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">No reviews yet.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
