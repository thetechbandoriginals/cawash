
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import LocationSearchInput from '@/components/location-search-input';
import { Save, Loader2, LocateIcon } from 'lucide-react';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';

interface Carwash {
    address?: string;
    latitude?: number;
    longitude?: number;
}

interface LocationCoordinates {
    lat: number;
    lng: number;
}

const locationSchema = z.object({
    address: z.string().min(1, 'Address is required'),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
});

const libraries: "places"[] = ["places"];

export default function LocationSettingsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [mapCenter, setMapCenter] = useState<LocationCoordinates | null>(null);
    const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

     const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries,
    });

    useEffect(() => {
        if(isLoaded && !geocoder) {
            setGeocoder(new window.google.maps.Geocoder());
        }
    }, [isLoaded, geocoder]);


    const locationForm = useForm<z.infer<typeof locationSchema>>({
        resolver: zodResolver(locationSchema),
        defaultValues: {
            address: '',
        },
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    const geocodeAddress = (address: string, callback?: (coords: LocationCoordinates) => void) => {
        if(!geocoder) return;
        geocoder.geocode({ address: address, componentRestrictions: { country: "KE" } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                const location = results[0].geometry.location;
                const coords = { lat: location.lat(), lng: location.lng() };
                setMapCenter(coords);
                if (callback) callback(coords);
            }
        });
    };

    const reverseGeocode = (coords: LocationCoordinates) => {
        if (!geocoder) return;
        geocoder.geocode({ location: coords }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                locationForm.setValue('address', results[0].formatted_address);
                locationForm.setValue('latitude', coords.lat);
                locationForm.setValue('longitude', coords.lng);
                setMapCenter(coords);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not find an address for this location.' });
            }
        });
    }

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const carwashRef = doc(firestore, 'carwashes', user.uid);
        const unsubscribeCarwash = onSnapshot(carwashRef, (docSnap) => {
            if(docSnap.exists()){
                const carwashData = docSnap.data() as Carwash;
                locationForm.reset({ 
                    address: carwashData.address || '',
                    latitude: carwashData.latitude,
                    longitude: carwashData.longitude,
                });
                if(carwashData.latitude && carwashData.longitude) {
                     setMapCenter({ lat: carwashData.latitude, lng: carwashData.longitude });
                } else if (carwashData.address && geocoder) {
                    geocodeAddress(carwashData.address);
                }
            }
            setIsLoading(false);
        });

        return () => {
            unsubscribeCarwash();
        };
    }, [user, locationForm, geocoder]);


     const onLocationSubmit = async (values: z.infer<typeof locationSchema>) => {
        if (!user) return toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        
        setIsSubmitting(true);
        const updateLocation = async (coords?: {lat: number, lng: number}) => {
             try {
                const carwashDocRef = doc(firestore, 'carwashes', user.uid);
                await updateDoc(carwashDocRef, { 
                    address: values.address,
                    latitude: coords?.lat ?? values.latitude,
                    longitude: coords?.lng ?? values.longitude,
                });
                toast({ title: 'Location Updated', description: `Your carwash address and coordinates have been updated.` });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Uh oh!', description: 'Could not update the location. Please try again.' });
            } finally {
                setIsSubmitting(false);
            }
        }

        if (values.latitude && values.longitude) {
            await updateLocation({ lat: values.latitude, lng: values.longitude });
             if(!mapCenter || mapCenter.lat !== values.latitude || mapCenter.lng !== values.longitude){
                setMapCenter({ lat: values.latitude, lng: values.longitude });
            }
        } else {
             geocodeAddress(values.address, (coords) => updateLocation(coords));
        }
    };
    
    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast({ variant: 'destructive', title: 'Error', description: 'Geolocation is not supported by your browser.' });
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords: LocationCoordinates = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                reverseGeocode(coords);
                setIsLocating(false);
            },
            (error) => {
                toast({ variant: 'destructive', title: 'Location Error', description: 'Could not retrieve your location. Please ensure you have granted permission.' });
                setIsLocating(false);
            }
        )
    };

    if (isLoading || !isLoaded) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-10 w-32" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
        <CardHeader>
            <CardTitle>Manage Location</CardTitle>
            <CardDescription>
            Search for your carwash address below, or use your device's current location.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...locationForm}>
            <form onSubmit={locationForm.handleSubmit(onLocationSubmit)} className="space-y-4">
                 <div className="flex flex-col sm:flex-row gap-2">
                    <FormField control={locationForm.control} name="address" render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormLabel>Carwash Address</FormLabel>
                            <FormControl>
                            <LocationSearchInput
                                defaultValue={field.value}
                                onSelect={({ address, coordinates }) => {
                                    field.onChange(address);
                                    if (coordinates) {
                                        setMapCenter(coordinates);
                                        locationForm.setValue('latitude', coordinates.lat);
                                        locationForm.setValue('longitude', coordinates.lng);
                                    } else {
                                        locationForm.setValue('latitude', undefined);
                                        locationForm.setValue('longitude', undefined);
                                    }
                                }}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <div className="flex-shrink-0 self-end">
                        <Button type="button" variant="outline" onClick={handleGetCurrentLocation} disabled={isLocating}>
                             {isLocating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Locating...
                                </>
                            ) : (
                                <>
                                    <LocateIcon className="mr-2 h-4 w-4" />
                                    Use Current Location
                                </>
                            )}
                        </Button>
                    </div>
                 </div>
                
                {mapCenter && (
                    <div className="h-64 w-full rounded-md overflow-hidden mt-4">
                        <GoogleMap
                            mapContainerStyle={{ height: '100%', width: '100%' }}
                            center={mapCenter}
                            zoom={15}
                        >
                            <MarkerF position={mapCenter} />
                        </GoogleMap>
                    </div>
                )}

                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> 
                            Save Address
                        </>
                    )}
                </Button>
            </form>
            </Form>
        </CardContent>
        </Card>
    );
}
