'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Star, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  customerName: z.string().min(1, 'Your name is required'),
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().optional(),
});

interface JobDetails {
    id: string;
    carwashId: string;
    service: string;
    clientName: string;
    registrationPlate: string;
}

export default function ReviewPage() {
    const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [hasReviewed, setHasReviewed] = useState(false);
    const router = useRouter();
    const params = useParams();
    const { jobId } = params;
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            customerName: '',
            rating: 0,
            comment: '',
        },
    });
    
    const currentRating = form.watch('rating');
    
    useEffect(() => {
        if (!jobId) {
            setIsLoading(false);
            return;
        }

        const findJobAndCheckReview = async () => {
            setIsLoading(true);
            try {
                // Because we don't know the carwashId from the URL, we have to search for the job.
                // This is not efficient, but it's a simplification for this app structure.
                // In a production app, the carwashId might be part of the URL.
                const carwashesSnapshot = await getDocs(collection(firestore, 'carwashes'));
                let foundJob: JobDetails | null = null;

                for (const carwashDoc of carwashesSnapshot.docs) {
                    const carwashId = carwashDoc.id;
                    const jobDocRef = doc(firestore, 'carwashes', carwashId, 'jobs', jobId as string);
                    const jobSnap = await getDoc(jobDocRef);

                    if (jobSnap.exists()) {
                        const jobData = jobSnap.data();
                        foundJob = {
                            id: jobSnap.id,
                            carwashId: carwashId,
                            service: jobData.service,
                            clientName: jobData.clientName,
                            registrationPlate: jobData.registrationPlate,
                        };
                        form.setValue('customerName', jobData.clientName || '');
                        break; 
                    }
                }

                if (foundJob) {
                    setJobDetails(foundJob);
                    // Check if this job has already been reviewed
                    const reviewsRef = collection(firestore, 'carwashes', foundJob.carwashId, 'reviews');
                    const reviewQuery = query(reviewsRef, where('jobId', '==', jobId as string));
                    const reviewSnapshot = await getDocs(reviewQuery);
                    if (!reviewSnapshot.empty) {
                        setHasReviewed(true);
                    }
                }
            } catch (error) {
                console.error("Error fetching job details:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load job details. Please try again.' });
            } finally {
                setIsLoading(false);
            }
        };

        findJobAndCheckReview();

    }, [jobId, form, toast]);


    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!jobDetails) return;

        setIsSubmitting(true);
        try {
            const reviewsCollectionRef = collection(firestore, 'carwashes', jobDetails.carwashId, 'reviews');
            await addDoc(reviewsCollectionRef, {
                ...values,
                carwashId: jobDetails.carwashId,
                jobId: jobDetails.id,
                createdAt: serverTimestamp(),
            });
            setIsSubmitted(true);
            toast({
                title: 'Review Submitted!',
                description: 'Thank you for your feedback.',
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: 'Could not submit your review. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Card className="mx-auto max-w-lg w-full">
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-10 w-32" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!jobDetails) {
        return (
             <div className="flex items-center justify-center py-12">
                <Card className="mx-auto max-w-lg w-full">
                    <CardHeader>
                        <CardTitle>Job Not Found</CardTitle>
                        <CardDescription>The job you are trying to review could not be found. Please check the link.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (hasReviewed || isSubmitted) {
        return (
             <div className="flex items-center justify-center py-12">
                <Card className="mx-auto max-w-lg w-full text-center">
                    <CardHeader>
                        <CardTitle>Thank You!</CardTitle>
                        <CardDescription>
                            {hasReviewed && !isSubmitted ? "You have already submitted a review for this service." : "Your feedback has been successfully submitted."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>We appreciate you taking the time to share your experience.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center py-12 bg-muted">
            <Card className="mx-auto max-w-lg w-full">
                <CardHeader className="text-center">
                    <CardTitle>Leave a Review</CardTitle>
                    <CardDescription>
                        Share your experience for the service on vehicle <span className="font-bold">{jobDetails.registrationPlate}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                             <FormField
                                control={form.control}
                                name="customerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="rating"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Overall Rating</FormLabel>
                                        <FormControl>
                                             <div 
                                                className="flex items-center gap-2"
                                                onMouseLeave={() => setHoveredRating(0)}
                                             >
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            'h-8 w-8 cursor-pointer transition-colors',
                                                            (hoveredRating >= star || currentRating >= star) 
                                                                ? 'text-yellow-400 fill-yellow-400' 
                                                                : 'text-gray-300'
                                                        )}
                                                        onMouseEnter={() => setHoveredRating(star)}
                                                        onClick={() => field.onChange(star)}
                                                    />
                                                ))}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="comment"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Comments (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Tell us more about your experience..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Review'
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
