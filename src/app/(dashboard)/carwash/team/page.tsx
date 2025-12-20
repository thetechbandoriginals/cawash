
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Edit, Trash2, Eye, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { CustomDialog } from '@/components/ui/custom-dialog';


interface TeamMember {
    id: string;
    fullName: string;
    phoneNumber: string;
    roleId: string;
    canLogin: boolean;
}

export default function TeamPage() {
    const [user, setUser] = useState<User | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const teamQuery = query(collection(firestore, 'carwashes', user.uid, 'team'));
        const unsubscribeTeam = onSnapshot(teamQuery, (snapshot) => {
            const membersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TeamMember[];
            setTeamMembers(membersData);
            setIsLoading(false);
        });

        return () => unsubscribeTeam();
    }, [user]);

    const openDeleteDialog = (member: TeamMember) => {
        setMemberToDelete(member);
        setDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!user || !memberToDelete) return;

        setIsDeleting(true);
        const memberDocRef = doc(firestore, 'carwashes', user.uid, 'team', memberToDelete.id);
        try {
            await deleteDoc(memberDocRef);
            toast({
                title: 'Team Member Deleted',
                description: `${memberToDelete.fullName} has been removed from your team.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Uh oh! Something went wrong.',
                description: 'Could not delete team member. Please try again.',
            });
        } finally {
            setIsDeleting(false);
            setMemberToDelete(null);
            setDialogOpen(false);
        }
    };


  return (
    <>
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage your team members here.</CardDescription>
            </div>
            <Button asChild>
                <Link href="/carwash/team/add">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Team Member
                </Link>
            </Button>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Login Access</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">Loading team members...</TableCell>
                        </TableRow>
                    ) : teamMembers.length > 0 ? (
                        teamMembers.map((member) => (
                            <TableRow key={member.id}>
                                <TableCell className="font-medium">{member.fullName}</TableCell>
                                <TableCell>{member.phoneNumber}</TableCell>
                                <TableCell>{member.roleId}</TableCell>
                                <TableCell>
                                    <Badge variant={member.canLogin ? 'default' : 'secondary'}>{member.canLogin ? 'Allowed' : 'Denied'}</Badge>
                                </TableCell>
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
                                                <Link href={`/carwash/team/${member.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    <span>View</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/carwash/team/${member.id}/edit`}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Edit</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openDeleteDialog(member)} className="text-destructive">
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
                            <TableCell colSpan={5} className="text-center h-24">No team members added yet.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
    <CustomDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Are you absolutely sure?"
        description={`This action cannot be undone. This will permanently delete ${memberToDelete?.fullName} from your team.`}
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
