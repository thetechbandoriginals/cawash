'use client';

import * as React from 'react';
import { useLoadScript, StandaloneSearchBox } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';

interface LocationSearchResult {
    address: string;
    coordinates: {
        lat: number;
        lng: number;
    } | null;
}

interface LocationSearchInputProps {
  onSelect: (result: LocationSearchResult) => void;
  defaultValue?: string;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const libraries: "places"[] = ["places"];

const LocationSearchInput: React.FC<LocationSearchInputProps> = ({ onSelect, defaultValue }) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || 'AIzaSyBStLoDw1WHr1EoBFeT3k0saYv5ef7INL8',
    libraries,
  });

  const searchBoxRef = React.useRef<google.maps.places.SearchBox | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handlePlacesChanged = () => {
    if (searchBoxRef.current) {
      const places = searchBoxRef.current.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        const address = place.formatted_address || '';
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();
        
        onSelect({
            address,
            coordinates: (lat !== undefined && lng !== undefined) ? { lat, lng } : null
        });
      }
    }
  };
  
  const handleInputBlur = () => {
     if (inputRef.current && inputRef.current.value) {
        // We don't have coordinates if the user just blurs without selecting.
        // We could geocode it, but for now, we'll just pass the address.
        onSelect({ address: inputRef.current.value, coordinates: null });
     }
  };

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <StandaloneSearchBox
      onLoad={(ref) => (searchBoxRef.current = ref)}
      onPlacesChanged={handlePlacesChanged}
      bounds={new google.maps.LatLngBounds(
        new google.maps.LatLng(-4.8, 33.9), // SW corner of Kenya
        new google.maps.LatLng(5.1, 41.9)    // NE corner of Kenya
      )}
    >
      <Input
        type="text"
        placeholder="Add a location"
        defaultValue={defaultValue}
        ref={inputRef}
        onBlur={handleInputBlur}
      />
    </StandaloneSearchBox>
  );
};

export default LocationSearchInput;
