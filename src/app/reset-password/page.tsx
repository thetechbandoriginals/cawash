'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/firebase';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { useSearchParams } from 'next/navigation';

const formSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

function ResetPasswordContent() {
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const oobCode = searchParams.get('oobCode');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
        password: '',
        },
    });

    useEffect(() => {
        const checkCode = async () => {
        if (!oobCode) {
            setError('Invalid password reset link. Please request a new one.');
            setIsLoading(false);
            return;
        }

        try {
            const userEmail = await verifyPasswordResetCode(auth, oobCode);
            setEmail(userEmail);
        } catch (err) {
            setError('The password reset link is invalid or has expired. Please request a new one.');
        } finally {
            setIsLoading(false);
        }
        };

        checkCode();
    }, [oobCode]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!oobCode) return;
        setIsSubmitting(true);
        try {
        await confirmPasswordReset(auth, oobCode, values.password);
        setIsSubmitted(true);
        } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Error Resetting Password',
            description: 'Could not reset your password. Please try again.',
        });
        } finally {
        setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <Card className="mx-auto max-w-md">
                <CardHeader><CardTitle>Verifying link...</CardTitle></CardHeader>
                <CardContent className="flex justify-center items-center p-10">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }
    
    if (error) {
        return (
            <Card className="mx-auto max-w-md">
                <CardHeader>
                    <CardTitle className="text-destructive">Invalid Link</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/forgot-password">Request a New Link</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (isSubmitted) {
        return (
            <Card className="mx-auto max-w-md">
                <CardHeader>
                    <CardTitle>Password Reset Successfully!</CardTitle>
                    <CardDescription>Your password has been changed. You can now sign in with your new password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/login">Go to Login</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mx-auto max-w-md">
            <CardHeader>
                <CardTitle className="text-2xl">Reset Your Password</CardTitle>
                <CardDescription>
                    Enter a new password for your account: {email}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                    <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                            <div className="relative">
                            <Input type={showPassword ? 'text' : 'password'} {...field} />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                                onClick={() => setShowPassword((prev) => !prev)}
                                type="button"
                            >
                                {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                                ) : (
                                <Eye className="h-4 w-4" />
                                )}
                                <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                            </Button>
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                        </>
                    ) : (
                        'Reset Password'
                    )}
                    </Button>
                </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex items-center justify-center py-12">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <ResetPasswordContent />
            </Suspense>
        </div>
    );
}
