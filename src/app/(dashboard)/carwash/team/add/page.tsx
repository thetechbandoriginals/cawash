'use client';

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
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection, onSnapshot, query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { useRouter } from 'next/navigation';

interface Role {
    id: string;
    name: string;
}

const salaryTypes = ["Fixed Price per Wash", "Percentage per Wash", "Monthly Salary"];

const formSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  nationalId: z.string().min(1, 'National ID is required'),
  nextOfKinName: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
  roleId: z.string().min(1, 'Role is required'),
  canLogin: z.boolean().default(false),
  salaryType: z.enum(["Fixed Price per Wash", "Percentage per Wash", "Monthly Salary"]).optional(),
  salaryAmount: z.preprocess(
    (a) => (a === '' ? undefined : parseFloat(z.string().parse(a || '0'))),
    z.number().positive('Salary must be a positive number').optional()
  ),
});

export default function AddTeamMemberPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '',
      email: '',
      nationalId: '',
      nextOfKinName: '',
      nextOfKinPhone: '',
      roleId: '',
      canLogin: false,
      salaryType: undefined,
      salaryAmount: undefined,
    },
  });

  const salaryType = useWatch({
    control: form.control,
    name: 'salaryType'
  });

   useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const rolesQuery = query(collection(firestore, 'carwashes', user.uid, 'roles'));
    const unsubscribeRoles = onSnapshot(rolesQuery, (snapshot) => {
        const rolesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Role[];
        setRoles(rolesData);
    });

    return () => {
        unsubscribeRoles();
    };
  }, [user]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const teamCollectionRef = collection(firestore, 'carwashes', user.uid, 'team');
        const docRef = await addDoc(teamCollectionRef, {
            ...values,
            carwashId: user.uid,
        });
        
        await updateDoc(doc(teamCollectionRef, docRef.id), { id: docRef.id });

        const activityCollectionRef = collection(firestore, 'carwashes', user.uid, 'activities');
        await addDoc(activityCollectionRef, {
            type: 'Team',
            description: `Added new team member: ${values.fullName}`,
            status: values.roleId,
            createdAt: serverTimestamp(),
        });

        toast({
            title: 'Team Member Added',
            description: `${values.fullName} has been added to your team.`,
        });

        router.push('/carwash/team');

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Uh oh! Something went wrong.',
            description: 'Could not add team member. Please try again.',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
           <Button variant="outline" size="icon" asChild>
                <Link href="/carwash/team">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
           </Button>
            <div>
                <CardTitle>Add New Team Member</CardTitle>
                <CardDescription>
                Fill in the details below to add a new member to your team.
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-4 p-4 border rounded-lg">
                <CardTitle className="text-lg">Personal Details</CardTitle>
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                            <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                            <Input placeholder="0712345678" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                            <Input type="email" placeholder="john.doe@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="nationalId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>National ID Number</FormLabel>
                            <FormControl>
                            <Input placeholder="12345678" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
                <CardTitle className="text-lg">Next of Kin Details (Optional)</CardTitle>
                 <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="nextOfKinName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="nextOfKinPhone"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                            <Input placeholder="0787654321" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>

             <div className="space-y-4 p-4 border rounded-lg">
                <CardTitle className="text-lg">Role & Permissions</CardTitle>
                <div className="grid md:grid-cols-2 gap-6 items-center">
                    <FormField
                        control={form.control}
                        name="roleId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.name}>
                                    {role.name}
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
                        name="canLogin"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4 md:mt-0">
                            <div className="space-y-0.5">
                              <FormLabel>Allow Login</FormLabel>
                              <FormMessage />
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                </div>
             </div>

             <div className="space-y-4 p-4 border rounded-lg">
                <CardTitle className="text-lg">Salary Details (Optional)</CardTitle>
                 <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="salaryType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Salary Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select salary type" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {salaryTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="salaryAmount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                {salaryType === 'Percentage per Wash' ? 'Commission (%)' : 'Amount (Ksh)'}
                            </FormLabel>
                            <FormControl>
                            <Input 
                                type="number" 
                                placeholder={salaryType === 'Percentage per Wash' ? 'e.g., 10' : 'e.g., 500'}
                                {...field} 
                                value={field.value ?? ''}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                    </>
                    ) : (
                    'Save Team Member'
                )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
