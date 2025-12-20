'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface TeamMember {
    id: string;
    fullName: string;
}

const expenseCategories = ["Salary", "Rent", "Utilities", "Supplies", "Maintenance", "Refund", "Other"];

const formSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  amount: z.preprocess((a) => parseFloat(z.string().parse(a || "0")), z.number().positive("Amount must be a positive number")),
  date: z.preprocess((arg) => {
    if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
    return new Date();
  }, z.date()),
  teamMemberName: z.string().optional(),
}).refine(data => {
    if (data.category === 'Salary') return true;
    return !!data.description && data.description.length > 0;
}, {
    message: 'Description is required for categories other than Salary.',
    path: ['description'],
});

export default function EditExpensePage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { expenseId } = params;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const selectedCategory = useWatch({ control: form.control, name: 'category' });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) router.push('/carwash-login');
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!user) return;
        
        const teamQuery = query(collection(firestore, 'carwashes', user.uid, 'team'));
        const unsubscribeTeam = onSnapshot(teamQuery, (snapshot) => {
            const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TeamMember[];
            setTeamMembers(membersData);
        });

        if (expenseId) {
            const expenseDocRef = doc(firestore, 'carwashes', user.uid, 'expenses', expenseId as string);
            getDoc(expenseDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const expenseData = docSnap.data();
                    // Convert Firestore Timestamp to Date object for the form
                    form.reset({
                        ...expenseData,
                        date: expenseData.date.toDate(),
                    });
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Expense not found.' });
                    router.push('/carwash/expenses');
                }
                setIsLoading(false);
            });
        }

        return () => {
            unsubscribeTeam();
        };
    }, [user, expenseId, form, router, toast]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!user || !expenseId) return;

        if (values.category === 'Salary' && !values.teamMemberName) {
            toast({ variant: "destructive", title: "Team Member Required", description: "Please select a team member for salary payments." });
            return;
        }

        setIsSubmitting(true);

        try {
            const expenseDocRef = doc(firestore, 'carwashes', user.uid, 'expenses', expenseId as string);
            const expenseData = {
                ...values,
                description: values.category === 'Salary' ? `Salary for ${values.teamMemberName}` : values.description,
            };
            await updateDoc(expenseDocRef, expenseData);
            
            toast({
                title: 'Expense Updated',
                description: `The expense has been successfully updated.`,
            });
            router.push('/carwash/expenses');
        } catch(error: any) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not update the expense. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDateForInput = (date: Date | string | undefined) => {
        if (!date) return '';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/carwash/expenses">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <CardTitle>Edit Expense</CardTitle>
                        <CardDescription>Update the details for this expense.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {expenseCategories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                            {cat}
                                            </SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Date of Expense</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            {...field}
                                            value={formatDateForInput(field.value)}
                                            onChange={(e) => field.onChange(e.target.valueAsDate)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            {selectedCategory === 'Salary' ? (
                                <FormField
                                    control={form.control}
                                    name="teamMemberName"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Team Member</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a team member" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            {teamMembers.map((member) => (
                                                <SelectItem key={member.id} value={member.fullName}>
                                                {member.fullName}
                                                </SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ) : (
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                        <Input placeholder="e.g., Monthly electricity bill" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            )}
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount (Ksh)</FormLabel>
                                    <FormControl>
                                    <Input type="number" placeholder="5000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
