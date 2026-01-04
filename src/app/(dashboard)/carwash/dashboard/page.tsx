
'use client';

import React, { useEffect, useState } from 'react';
import { 
    Coins, 
    Car, 
    Users, 
    CreditCard, 
    PlusCircle, 
    Settings, 
    UserPlus, 
    ArrowRight,
    Briefcase,
    FileText,
    UserCheck,
    UserX,
    Building,
    UserRoundPlus,
    UserRoundCheck,
    Wrench,
    MapPin,
    UsersRound,
    Timer,
    CheckCircle,
    XCircle,
    Receipt,
    Phone
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, Timestamp, getDocs, doc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { format, subMonths, startOfMonth } from 'date-fns';


interface Job {
  id: string;
  price: number;
  status: string;
  createdAt: Timestamp;
  clientPhoneNumber: string;
  clientId: string;
  servicedBy: string[];
}

interface Expense {
    id: string;
    amount: number;
    category: string;
    date: Timestamp;
}

interface Carwash {
    name: string;
    credits: number;
    address?: string;
    phoneNumber?: string;
}

interface TeamMember {
    id: string;
    fullName: string;
}

type JobStatusCounts = {
    [key in 'Pending' | 'Ongoing' | 'Completed' | 'Cancelled']: number;
};

const processChartData = (jobs: Job[], expenses: Expense[]) => {
    const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), 5 - i), 'MMM yyyy'));
    const monthlyData: { [key: string]: { revenue: number, expenses: number, profit: number } } = {};
    
    months.forEach(month => {
        monthlyData[month] = { revenue: 0, expenses: 0, profit: 0 };
    });

    jobs.forEach(job => {
        if (job.status === 'Completed') {
            const month = format(job.createdAt.toDate(), 'MMM yyyy');
            if (monthlyData[month]) {
                monthlyData[month].revenue += job.price;
            }
        }
    });

    expenses.forEach(expense => {
        const month = format(expense.date.toDate(), 'MMM yyyy');
         if (monthlyData[month]) {
            monthlyData[month].expenses += expense.amount;
        }
    });

    Object.keys(monthlyData).forEach(month => {
        monthlyData[month].profit = monthlyData[month].revenue - monthlyData[month].expenses;
    });

    return Object.entries(monthlyData).map(([name, data]) => ({ name: name.split(' ')[0], ...data }));
};


export default function CarwashDashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [clientStats, setClientStats] = useState({ new: 0, returning: 0 });
    const [carwashData, setCarwashData] = useState<Carwash | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [engagedCleaners, setEngagedCleaners] = useState(0);
    const [expenseSummary, setExpenseSummary] = useState<{[key: string]: number}>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [jobStatusCounts, setJobStatusCounts] = useState<JobStatusCounts>({
        Pending: 0,
        Ongoing: 0,
        Completed: 0,
        Cancelled: 0,
    });
    
    const chartData = processChartData(jobs, expenses);
    const chartConfig = {
      profit: {
        label: "Profit",
        color: "hsl(var(--chart-1))",
      },
    }

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
             if (!currentUser) {
                setIsLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;

        const carwashDocRef = doc(firestore, 'carwashes', user.uid);
        const unsubscribeCarwash = onSnapshot(carwashDocRef, async (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as Carwash;
                setCarwashData(data);
                
                const teamQuery = query(collection(firestore, 'carwashes', user.uid, 'team'));
                const servicesQuery = query(collection(firestore, 'carwashes', user.uid, 'services'));

                const [teamSnap, servicesSnap] = await Promise.all([getDocs(teamQuery), getDocs(servicesQuery)]);

                const hasTeam = !teamSnap.empty;
                const hasServices = !servicesSnap.empty;
                const hasLocation = !!data.address;
                const hasPhoneNumber = !!data.phoneNumber;

                setIsSetupComplete(hasTeam && hasServices && hasLocation && hasPhoneNumber);
            }
             // Only stop loading after we've checked for setup completeness.
            setIsLoading(false);
        });

        const teamQuery = query(collection(firestore, 'carwashes', user.uid, 'team'));
        const unsubscribeTeam = onSnapshot(teamQuery, (snapshot) => {
            const members = snapshot.docs.map(d => d.data() as TeamMember)
            setTeamMembers(members);
        });

        const jobsQuery = query(collection(firestore, 'carwashes', user.uid, 'jobs'));
        const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
            const jobsData = snapshot.docs.map(doc => doc.data() as Job);
            setJobs(jobsData);

            const revenue = jobsData
                .filter(job => job.status === 'Completed')
                .reduce((acc, job) => acc + job.price, 0);
            setTotalRevenue(revenue);
            
            const clientJobCounts = jobsData.reduce((acc, job) => {
                acc[job.clientId] = (acc[job.clientId] || 0) + 1;
                return acc;
            }, {} as {[key: string]: number});

            let newClients = 0;
            let returningClients = 0;
            Object.values(clientJobCounts).forEach(count => {
                if (count === 1) {
                    newClients++;
                } else {
                    returningClients++;
                }
            });
            setClientStats({ new: newClients, returning: returningClients });


            const ongoingJobs = jobsData.filter(job => job.status === 'Ongoing');
            const engagedCleanersSet = new Set(ongoingJobs.flatMap(job => job.servicedBy));
            setEngagedCleaners(engagedCleanersSet.size);

            const statusCounts = jobsData.reduce((acc, job) => {
                const status = job.status as keyof JobStatusCounts;
                if (acc[status] !== undefined) {
                    acc[status]++;
                }
                return acc;
            }, { Pending: 0, Ongoing: 0, Completed: 0, Cancelled: 0 });
            setJobStatusCounts(statusCounts);

        });

        const expensesQuery = query(collection(firestore, 'carwashes', user.uid, 'expenses'));
        const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
            const expensesData = snapshot.docs.map(doc => doc.data() as Expense);
            setExpenses(expensesData);
            const total = expensesData.reduce((acc, expense) => acc + expense.amount, 0);
            setTotalExpenses(total);

            const summary = expensesData.reduce((acc, expense) => {
                acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
                return acc;
            }, {} as {[key: string]: number});
            setExpenseSummary(summary);
        });

        return () => {
            unsubscribeCarwash();
            unsubscribeTeam();
            unsubscribeJobs();
            unsubscribeExpenses();
        };
    }, [user]); 
    
    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-1/3 bg-muted rounded"></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-lg"></div>)}
                </div>
            </div>
        )
    }

    if (!isSetupComplete && carwashData) {
        return <WelcomeGuide carwashData={carwashData} teamMembers={teamMembers} />;
    }
    
    const profit = totalRevenue - totalExpenses;
    const availableTeamMembers = teamMembers.length - engagedCleaners;
    const statusItems = [
        { name: 'Pending', count: jobStatusCounts.Pending, icon: <Timer className="text-orange-500" /> },
        { name: 'Ongoing', count: jobStatusCounts.Ongoing, icon: <Wrench className="text-blue-500" /> },
        { name: 'Completed', count: jobStatusCounts.Completed, icon: <CheckCircle className="text-green-500" /> },
        { name: 'Cancelled', count: jobStatusCounts.Cancelled, icon: <XCircle className="text-red-500" /> },
    ];
    
    const topExpenses = Object.entries(expenseSummary)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2);


  return (
    <div className="space-y-6">
       <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Hi, {carwashData?.name || 'Carwash Owner'}!</h1>
        <p className="text-muted-foreground">Here's a look at your business performance.</p>
        <div className="mt-4 flex gap-2">
            <Button asChild>
                <Link href="/carwash/jobs/create"><PlusCircle /> Create Job</Link>
            </Button>
            <Button asChild variant="secondary">
                <Link href="/carwash/jobs"><Briefcase /> View Jobs</Link>
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Financial Overview */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Financial Overview</CardTitle>
            <CardDescription>Profit trends over the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="h-48">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <LineChart
                  data={chartData}
                  margin={{
                    top: 5, right: 10, left: 10, bottom: 0,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={() => ""}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={() => ""}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent 
                       formatter={(value) => `Ksh ${Number(value).toLocaleString()}`}
                    />}
                  />
                  <Line
                    dataKey="profit"
                    type="monotone"
                    stroke="var(--color-profit)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mt-4 pt-4 border-t">
                <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">Ksh {totalRevenue.toLocaleString()}</p>
                </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-xl font-bold text-destructive">Ksh {totalExpenses.toLocaleString()}</p>
                </div>
                 <div>
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className={`text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>Ksh {profit.toLocaleString()}</p>
                </div>
             </div>
          </CardContent>
          <CardFooter className="flex justify-start gap-2">
             <Button asChild variant="outline" className="flex-1">
                <Link href="/carwash/reports"><FileText /> View Full Reports</Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Credit Balance */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Credit Balance</CardTitle>
            <CardDescription>Credits are used to create jobs.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="text-3xl font-bold">{carwashData?.credits?.toLocaleString() || 0}</p>
          </CardContent>
          <CardFooter className="flex items-end flex-grow">
             <Button asChild size="sm">
                <Link href="/carwash/credits"><CreditCard /> Buy Credits</Link>
            </Button>
          </CardFooter>
        </Card>
        
        {/* Total Jobs */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Total Jobs</CardTitle>
             <CardDescription>All jobs created: {jobs.length}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-2">
            {statusItems.map((item, index) => (
                <React.Fragment key={item.name}>
                    <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                            {item.icon}
                            <span>{item.name}</span>
                        </div>
                        <span className="font-bold">{item.count}</span>
                    </div>
                    {index < statusItems.length - 1 && <Separator />}
                </React.Fragment>
            ))}
          </CardContent>
           <CardFooter className="flex items-end flex-grow gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href="/carwash/jobs/create"><PlusCircle /> Create Job</Link>
              </Button>
              <Button asChild variant="secondary" size="sm" className="flex-1">
                <Link href="/carwash/jobs"><Briefcase /> Manage Jobs</Link>
              </Button>
          </CardFooter>
        </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Clients */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Clients</CardTitle>
                <CardDescription>New vs returning clients.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                        <p className="text-xs text-muted-foreground">New</p>
                        <div className="flex items-center justify-center gap-1 text-xl font-bold text-sky-600">
                            <UserRoundPlus /> {clientStats.new}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Returning</p>
                            <div className="flex items-center justify-center gap-1 text-xl font-bold text-green-600">
                            <UserRoundCheck /> {clientStats.returning}
                        </div>
                    </div>
                    </div>
                    <p className="text-center text-sm mt-2 text-muted-foreground">Total: {clientStats.new + clientStats.returning}</p>
              </CardContent>
              <CardFooter className="flex items-end flex-grow">
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/carwash/clients"><Users /> View All Clients</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Team Members */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
                    <CardDescription>Your workforce overview.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                     <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                            <p className="text-xs text-muted-foreground">Available</p>
                            <div className="flex items-center justify-center gap-1 text-xl font-bold text-green-600">
                                <UserCheck /> {availableTeamMembers > 0 ? availableTeamMembers : 0}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Engaged</p>
                             <div className="flex items-center justify-center gap-1 text-xl font-bold text-destructive">
                                <UserX /> {engagedCleaners}
                            </div>
                        </div>
                     </div>
                      <p className="text-center text-sm mt-2 text-muted-foreground">Total: {teamMembers.length}</p>
                </CardContent>
                <CardFooter className="flex items-end flex-grow">
                    <Button asChild size="sm">
                        <Link href="/carwash/team"><UserPlus /> Manage Team</Link>
                    </Button>
                </CardFooter>
            </Card>
            
            {/* Expenses */}
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Expenses</CardTitle>
                    <CardDescription>A quick look at your spending.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                    <div>
                        <p className="text-xs text-muted-foreground">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600">Ksh {totalExpenses.toLocaleString()}</p>
                    </div>
                    {topExpenses.length > 0 && (
                        <div className="space-y-2 text-sm">
                            <p className="font-medium text-xs text-muted-foreground">Top Categories:</p>
                            {topExpenses.map(([category, amount]) => {
                                const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                                return (
                                    <div key={category}>
                                        <div className="flex justify-between text-xs">
                                            <span className="font-medium">{category}</span>
                                            <span className="text-muted-foreground">Ksh {amount.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                                            <div className="bg-destructive h-1.5 rounded-full" style={{ width: `${'${percentage}'}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex items-end flex-grow">
                    <Button asChild variant="outline" size="sm">
                        <Link href="/carwash/expenses">
                            <Receipt /> Record & View
                        </Link>
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Settings</CardTitle>
                    <CardDescription>Configure your carwash services, roles, and location.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button asChild variant="outline" className="justify-start">
                        <Link href="/carwash/settings">
                           <Wrench className="mr-2 h-4 w-4 text-blue-500" /> Services & Pricing
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                        <Link href="/carwash/settings/roles">
                           <UsersRound className="mr-2 h-4 w-4 text-purple-500" /> Team Roles
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="justify-start">
                        <Link href="/carwash/settings/location">
                            <MapPin className="mr-2 h-4 w-4 text-green-500" /> Location
                        </Link>
                    </Button>
                     <Button asChild variant="outline" className="justify-start">
                        <Link href="/carwash/profile">
                           <Building className="mr-2 h-4 w-4 text-orange-500" /> Business Profile
                        </Link>
                    </Button>
                </CardContent>
            </Card>
       </div>
   </div>
  );
}


function WelcomeGuide({ carwashData, teamMembers }: { carwashData: Carwash | null, teamMembers: TeamMember[] }) {
  const [hasServices, setHasServices] = useState(false);
  const [hasTeam, setHasTeam] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [hasPhoneNumber, setHasPhoneNumber] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if(!user) return;
    
    // Check for services
    const servicesQuery = query(collection(firestore, 'carwashes', user.uid, 'services'));
    const unsubscribeServices = onSnapshot(servicesQuery, (snapshot) => {
        setHasServices(!snapshot.empty);
    });

    // Check for team
    setHasTeam(teamMembers.length > 0);

    // Check for location and phone from carwashData
    setHasLocation(!!carwashData?.address);
    setHasPhoneNumber(!!carwashData?.phoneNumber);

    return () => unsubscribeServices();

  }, [user, carwashData, teamMembers]);


  const checklist = [
    { name: 'Add Your Location', href: '/carwash/settings/location', completed: hasLocation, icon: <MapPin className="h-5 w-5 text-secondary group-hover:text-primary" /> },
    { name: 'Add Your Business Phone Number', href: '/carwash/profile', completed: hasPhoneNumber, icon: <Phone className="h-5 w-5 text-secondary group-hover:text-primary" /> },
    { name: 'Add Services & Pricing', href: '/carwash/settings', completed: hasServices, icon: <Wrench className="h-5 w-5 text-secondary group-hover:text-primary" /> },
    { name: 'Add Team Members', href: '/carwash/team/add', completed: hasTeam, icon: <UserPlus className="h-5 w-5 text-secondary group-hover:text-primary" /> },
  ];

  return (
    <Card className="max-w-2xl mx-auto my-10">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Welcome to Cawash!</CardTitle>
        <CardDescription>
          Let's get your carwash set up. Complete these steps to start creating jobs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {checklist.map((item, index) => (
            <li key={index}>
              <Link href={item.href} className="group flex items-center gap-4 p-4 rounded-lg transition-colors hover:bg-accent">
                <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${'${item.completed}' ? 'bg-green-100 dark:bg-green-900' : 'bg-muted group-hover:bg-primary/10'}`}>
                  {item.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    item.icon
                  )}
                </div>
                <div>
                  <p className={`font-medium ${'${item.completed}' ? 'text-muted-foreground line-through' : ''}`}>
                    {item.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.completed ? 'Completed!' : 'Click here to set up'}
                  </p>
                </div>
                 <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
