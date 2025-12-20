
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
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, runTransaction } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, MoreHorizontal, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CustomDialog } from '@/components/ui/custom-dialog';
import { useRouter } from 'next/navigation';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: Timestamp;
  teamMemberName?: string;
}

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


export default function ExpensesPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: '',
      description: '',
      amount: 0,
      date: new Date(),
      teamMemberName: '',
    },
  });

  const selectedCategory = useWatch({ control: form.control, name: 'category' });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    if (!user) return;
    
    const expensesQuery = query(collection(firestore, 'carwashes', user.uid, 'expenses'), orderBy('date', 'desc'));
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
        const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
        setExpenses(expensesData);
        setIsLoading(false);
    });

    const teamQuery = query(collection(firestore, 'carwashes', user.uid, 'team'));
     const unsubscribeTeam = onSnapshot(teamQuery, (snapshot) => {
        const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TeamMember[];
        setTeamMembers(membersData);
     });

    return () => {
        unsubscribeExpenses();
        unsubscribeTeam();
    };
  }, [user]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    if (values.category === 'Salary' && !values.teamMemberName) {
        toast({
            variant: "destructive",
            title: "Team Member Required",
            description: "Please select a team member for salary payments.",
        });
        return;
    }
    
    setIsSubmitting(true);

    try {
        await runTransaction(firestore, async (transaction) => {
            const settingsDocRef = doc(firestore, 'settings', 'global');
            const carwashDocRef = doc(firestore, 'carwashes', user.uid);
            
            const [settingsSnap, carwashSnap] = await Promise.all([
                transaction.get(settingsDocRef),
                transaction.get(carwashDocRef)
            ]);

            if (!settingsSnap.exists()) {
                throw new Error("Global settings not found. Please contact support.");
            }
             if (!carwashSnap.exists()) {
                throw new Error("Carwash data not found.");
            }

            const expenseCost = settingsSnap.data().expenseCreditCost || 0.5;
            const currentCredits = carwashSnap.data().credits || 0;

            if (currentCredits < expenseCost) {
                throw new Error(`Insufficient credits. You need ${expenseCost} credits to record an expense.`);
            }

            const expenseData = {
                ...values,
                description: values.category === 'Salary' ? `Salary for ${values.teamMemberName}` : values.description,
                carwashId: user.uid,
                createdAt: serverTimestamp(),
            };

            const newExpenseRef = doc(collection(firestore, 'carwashes', user.uid, 'expenses'));
            transaction.set(newExpenseRef, expenseData);

            const newActivityRef = doc(collection(firestore, 'carwashes', user.uid, 'activities'));
            transaction.set(newActivityRef, {
                type: 'Expense',
                description: `Recorded an expense of Ksh ${values.amount} for ${expenseData.description}`,
                status: values.category,
                createdAt: serverTimestamp(),
            });

            const newCreditBalance = currentCredits - expenseCost;
            transaction.update(carwashDocRef, { credits: newCreditBalance });
        });
        
        toast({
            title: 'Expense Added',
            description: `Your expense of ${values.amount} has been recorded.`,
        });
        form.reset({ category: '', description: '', amount: 0, date: new Date(), teamMemberName: '' });

    } catch(error: any) {
        if (error.message.includes('Insufficient credits')) {
            toast({
                variant: "destructive",
                title: "Insufficient Credits",
                description: "You do not have enough credits to record an expense. Redirecting you to buy more.",
                action: <Button onClick={() => router.push('/carwash/credits')}>Buy Credits</Button>
            });
        } else {
             toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: error.message || "Could not add expense. Please try again.",
            });
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!user || !expenseToDelete) return;
    setIsDeleting(true);
    const expenseDocRef = doc(firestore, 'carwashes', user.uid, 'expenses', expenseToDelete.id);
    try {
        await deleteDoc(expenseDocRef);
        toast({
            title: 'Expense Deleted',
            description: `The expense for "${expenseToDelete.description}" has been deleted.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Delete Failed',
            description: 'Could not delete the expense. Please try again.',
        });
    } finally {
        setIsDeleting(false);
        setExpenseToDelete(null);
        setDialogOpen(false);
    }
};

  const formatDateForInput = (date: Date | string | Timestamp | undefined): string => {
    if (!date) return '';
    try {
        const d = date instanceof Timestamp ? date.toDate() : new Date(date);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
  };


  return (
    <>
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Add New Expense</CardTitle>
                <CardDescription>Record a new business expense. Recording an expense costs credits.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                             <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Expense
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Expense History</CardTitle>
                <CardDescription>A list of all your recorded expenses.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">Loading expenses...</TableCell>
                            </TableRow>
                        ) : expenses.length > 0 ? (
                            expenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{expense.date.toDate().toLocaleDateString()}</TableCell>
                                    <TableCell>{expense.category}</TableCell>
                                    <TableCell>{expense.description}</TableCell>
                                    <TableCell className="text-right font-medium">Ksh {expense.amount.toLocaleString()}</TableCell>
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
                                                    <Link href={`/carwash/expenses/${expense.id}/edit`}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Edit</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openDeleteDialog(expense)} className="text-destructive">
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
                                <TableCell colSpan={5} className="text-center h-24">No expenses recorded yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
    <CustomDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Are you absolutely sure?"
        description={`This action cannot be undone. This will permanently delete the expense for "${expenseToDelete?.description}".`}
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
