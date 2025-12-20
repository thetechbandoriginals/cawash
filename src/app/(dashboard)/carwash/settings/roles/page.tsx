'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, MoreHorizontal, Trash2, Edit, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { auth, firestore } from '@/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface Role {
    id: string;
    name: string;
}

const roleSchema = z.object({
    name: z.string().min(1, 'Role name is required'),
});

export default function RolesSettingsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const roleForm = useForm<z.infer<typeof roleSchema>>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: '',
        },
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const rolesQuery = query(collection(firestore, 'carwashes', user.uid, 'roles'));

        const unsubscribeRoles = onSnapshot(rolesQuery, (querySnapshot) => {
            const rolesData: Role[] = [];
            querySnapshot.forEach((doc) => {
                rolesData.push({ id: doc.id, ...doc.data() } as Role);
            });
            setRoles(rolesData);
            setIsLoading(false);
        });

        return () => {
            unsubscribeRoles();
        };
    }, [user]);

    const onRoleSubmit = async (values: z.infer<typeof roleSchema>) => {
        if (!user) return toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        
        setIsSubmitting(true);
        try {
            const rolesCollectionRef = collection(firestore, 'carwashes', user.uid, 'roles');
            await addDoc(rolesCollectionRef, { name: values.name, carwashId: user.uid });
            toast({ title: 'Role Added', description: `${values.name} has been successfully added.` });
            roleForm.reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Uh oh!', description: 'Could not add the role. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteRole = async (roleId: string) => {
        if(!user) return;
        try {
            await deleteDoc(doc(firestore, 'carwashes', user.uid, 'roles', roleId));
            toast({ title: 'Role Deleted', description: 'The role has been deleted.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete role. Please try again.' });
        }
    };

    if (isLoading) {
         return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Skeleton className="h-10 w-full max-w-sm" />
                         <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
            <CardHeader>
                <CardTitle>Manage Roles</CardTitle>
                <CardDescription>
                Define roles for your team members (e.g., Manager, Cleaner, Cashier).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...roleForm}>
                <form onSubmit={roleForm.handleSubmit(onRoleSubmit)} className="space-y-4">
                    <div className="flex items-end gap-4">
                    <FormField control={roleForm.control} name="name" render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel>Role Name</FormLabel><FormControl><Input placeholder="e.g., Supervisor" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                            </>
                        ) : (
                             <>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Role
                            </>
                        )}
                    </Button>
                    </div>
                </form>
                </Form>
            </CardContent>
            </Card>

            <Card>
            <CardHeader><CardTitle>Existing Roles</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Role Name</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.length > 0 ? roles.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell className="font-medium">{role.name}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem disabled><Edit className="mr-2 h-4 w-4" /><span>Edit (soon)</span></DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteRole(role.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={2} className="text-center h-24">No roles added yet.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
            </Card>
        </div>
    );
}
