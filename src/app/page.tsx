
'use client';

import { useEffect, useState } from 'react';
import { firestore } from '@/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Car, MapPin, Phone, Search, Star, Users, Filter } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CustomDialog } from '@/components/ui/custom-dialog';
import { Label } from '@/components/ui/label';

interface Carwash {
  id: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  avgRating?: number;
  reviewCount?: number;
  availableCleaners?: number;
}

interface Review {
    rating: number;
}

interface Job {
    servicedBy: string[];
    status: string;
}

interface TeamMember {
    id: string;
    fullName: string;
    roleId: string;
}

interface Location {
    latitude: number;
    longitude: number;
}

// Haversine formula to calculate distance between two points on Earth
const calculateDistance = (loc1: Location, loc2: Location) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = 
        0.5 - Math.cos(dLat)/2 + 
        Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) * 
        (1 - Math.cos(dLon))/2;

    return R * 2 * Math.asin(Math.sqrt(a)); // Distance in km
};

const renderStars = (rating: number) => {
    return (
        <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
};


export default function Home() {
  const [allCarwashes, setAllCarwashes] = useState<Carwash[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [cleanerFilter, setCleanerFilter] = useState<number>(0);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

   useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(firestore, 'carwashes'),
      where('approved', '==', true)
    );
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const carwashesData: Carwash[] = [];
      for (const doc of querySnapshot.docs) {
          const carwash = { id: doc.id, ...doc.data() } as Carwash;
          
          // Fetch reviews for each carwash
          const reviewsRef = collection(firestore, 'carwashes', carwash.id, 'reviews');
          const reviewsSnapshot = await getDocs(reviewsRef);
          const reviews = reviewsSnapshot.docs.map(reviewDoc => reviewDoc.data() as Review);
          
          const reviewCount = reviews.length;
          const avgRating = reviewCount > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount : 0;
          
          carwash.reviewCount = reviewCount;
          carwash.avgRating = avgRating;

          // Fetch team members and jobs to calculate available cleaners
          const teamRef = collection(firestore, 'carwashes', carwash.id, 'team');
          const jobsRef = collection(firestore, 'carwashes', carwash.id, 'jobs');
          
          const [teamSnapshot, jobsSnapshot] = await Promise.all([
            getDocs(teamRef),
            getDocs(query(jobsRef, where('status', '==', 'Ongoing')))
          ]);
          
          const allTeamMembers = teamSnapshot.docs.map(d => d.data() as TeamMember);
          const cleaners = allTeamMembers.filter(m => m.roleId === 'Cleaner' || m.roleId === 'cleaner');

          const ongoingJobs = jobsSnapshot.docs.map(jobDoc => jobDoc.data() as Job);
          const busyCleaners = new Set(ongoingJobs.flatMap(job => job.servicedBy));
          
          const availableCleanersCount = cleaners.filter(c => !busyCleaners.has(c.fullName)).length;

          carwash.availableCleaners = availableCleanersCount;

          carwashesData.push(carwash);
      }
      
      
      setAllCarwashes(carwashesData);
      setIsLoading(false);

       // Try to get user's location after fetching carwashes
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userLocation: Location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            
            setAllCarwashes(currentCarwashes => {
                const carwashesWithDistance = currentCarwashes
                .map(cw => {
                    if (cw.latitude && cw.longitude) {
                        const carwashLocation: Location = { latitude: cw.latitude, longitude: cw.longitude };
                        const distance = calculateDistance(userLocation, carwashLocation);
                        return { ...cw, distance };
                    }
                    return cw;
                })
                .sort((a, b) => {
                  if (a.distance === undefined) return 1;
                  if (b.distance === undefined) return -1;
                  return a.distance - b.distance;
                });
              return [...carwashesWithDistance];
            });

          },
          (error) => {
            console.error("Geolocation error:", error);
            setLocationError("Could not get your location. Showing all carwashes.");
          }
        );
      } else {
          setLocationError("Geolocation is not supported by your browser.");
      }
    }, (error) => {
        console.error("Error fetching carwashes:", error);
        setIsLoading(false);
        setAllCarwashes([]);
    });

    return () => unsubscribe();
  }, []);
  
  const filteredCarwashes = allCarwashes.filter((carwash) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = carwash.name.toLowerCase().includes(query);
    const addressMatch = carwash.address?.toLowerCase().includes(query) ?? false;
    const searchMatch = nameMatch || addressMatch;

    const ratingMatch = ratingFilter === 0 || (carwash.avgRating || 0) >= ratingFilter;
    const cleanerMatch = cleanerFilter === 0 || (carwash.availableCleaners || 0) >= cleanerFilter;

    return searchMatch && ratingMatch && cleanerMatch;
  });
  
  const clearFilters = () => {
    setRatingFilter(0);
    setCleanerFilter(0);
  }

  return (
    <div className="flex flex-col justify-center min-h-[90vh]">
      <div className="text-center mb-12 max-w-2xl mx-auto mt-20">
        <p className="text-md text-muted-foreground mt-2">
          Find the best <span className="text-primary underline">carwash</span> services near you.
        </p>
         <div className="flex gap-2 mt-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by name or location..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Button variant="outline" size="icon" onClick={() => setIsFilterDialogOpen(true)}>
                <Filter className="h-4 w-4" />
                <span className="sr-only">Open filters</span>
            </Button>
        </div>
         <p className="text-sm text-muted-foreground mt-4">
            Showing {filteredCarwashes.length} of {allCarwashes.length} carwashes.
        </p>
      </div>

       {locationError && (
            <div className="text-center text-yellow-600 bg-yellow-100 p-4 rounded-md mb-6">
                {locationError}
            </div>
        )}

      <div className="mb-10 w-full max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div>
                                <Skeleton className="h-6 w-48" />
                                <Skeleton className="h-4 w-32 mt-2" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-24" />
                            <div className="flex flex-col items-center">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-4 w-12 mt-1" />
                            </div>
                        </div>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCarwashes.length > 0 ? (
          <div className="space-y-4">
            {filteredCarwashes.map((carwash) => (
              <Card key={carwash.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full">
                        <div className="bg-primary/10 p-3 rounded-full hidden sm:block">
                            <Car className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <p className="font-bold text-base text-gray-800 dark:text-gray-200 truncate">{carwash.name}</p>
                            <p className="text-sm text-muted-foreground truncate">
                                {carwash.address && carwash.address.length > 30
                                ? `${carwash.address.substring(0, 30)}...`
                                : carwash.address}
                            </p>
                             <div className="flex items-center gap-2 mt-1">
                                {carwash.reviewCount !== undefined && carwash.reviewCount > 0 ? (
                                    <>
                                        {renderStars(carwash.avgRating || 0)}
                                        <span className="text-xs text-muted-foreground">({carwash.reviewCount} reviews)</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-muted-foreground">No reviews yet</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-4 shrink-0">
                        {carwash.availableCleaners !== undefined && (
                            <div className="flex flex-col items-center justify-center text-center">
                               <div className="flex items-center text-lg text-secondary font-bold">
                                    <Users className="h-5 w-5 mr-1" />
                                    {carwash.availableCleaners}
                                </div>
                                <p className="text-xs text-muted-foreground">cleaners free</p>
                            </div>
                        )}
                        {carwash.distance !== undefined && (
                        <div className="flex flex-col items-center justify-center text-center">
                            <div className="flex items-center text-lg text-primary font-bold">
                                <MapPin className="h-5 w-5 mr-1" />
                                {carwash.distance.toFixed(1)}
                            </div>
                            <p className="text-xs text-muted-foreground">km away</p>
                        </div>
                        )}
                        {carwash.phoneNumber && (
                             <Button asChild size="sm">
                                <Link href={`tel:${carwash.phoneNumber}`}>
                                    <Phone className="mr-2 h-4 w-4" /> Call
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <p>No carwashes found matching your criteria. Try adjusting your filters.</p>
          </div>
        )}
      </div>

       <CustomDialog
            isOpen={isFilterDialogOpen}
            onClose={() => setIsFilterDialogOpen(false)}
            title="Filter Carwashes"
            description="Refine your search to find the perfect carwash."
        >
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rating-filter" className="text-right">
                        Rating
                    </Label>
                    <Select onValueChange={(value) => setRatingFilter(Number(value))} value={String(ratingFilter)}>
                        <SelectTrigger id="rating-filter" className="col-span-3">
                            <SelectValue placeholder="Filter by rating" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">Any Rating</SelectItem>
                            <SelectItem value="4">4+ Stars</SelectItem>
                            <SelectItem value="3">3+ Stars</SelectItem>
                            <SelectItem value="2">2+ Stars</SelectItem>
                            <SelectItem value="1">1+ Stars</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                     <Label htmlFor="cleaner-filter" className="text-right">
                        Cleaners
                    </Label>
                    <Select onValueChange={(value) => setCleanerFilter(Number(value))} value={String(cleanerFilter)}>
                        <SelectTrigger id="cleaner-filter" className="col-span-3">
                            <SelectValue placeholder="Filter by cleaners" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">Any</SelectItem>
                            <SelectItem value="1">1+ Available</SelectItem>
                            <SelectItem value="2">2+ Available</SelectItem>
                            <SelectItem value="3">3+ Available</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => {
                    clearFilters();
                    setIsFilterDialogOpen(false);
                }}>Clear Filters</Button>
                <Button type="button" onClick={() => setIsFilterDialogOpen(false)}>Done</Button>
            </div>
      </CustomDialog>
    </div>
  );
}
