import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mic, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadGoogleMaps } from "@/lib/googleMaps";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
  enablePlacesAutocomplete?: boolean;
}

export default function SearchBar({ 
  value, 
  onChange, 
  onSearch, 
  placeholder = "Search for products, shops, or services...",
  className,
  onPlaceSelected,
  enablePlacesAutocomplete = false,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    // Initialize Google Places Autocomplete if enabled
    if (!enablePlacesAutocomplete || !inputRef.current || !onPlaceSelected) return;

    const initAutocomplete = async () => {
      try {
        await loadGoogleMaps();

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current!, {
          types: ['establishment'],
          fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'photos'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place && onPlaceSelected) {
            onPlaceSelected(place);
          }
        });
      } catch (error) {
        console.error('Failed to initialize Places Autocomplete:', error);
      }
    };

    initAutocomplete();
  }, [enablePlacesAutocomplete, onPlaceSelected]);

  const handleSearch = () => {
    if (onSearch && value.trim()) {
      onSearch(value.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className={cn(
        "relative flex items-center transition-all duration-200",
        isFocused ? "ring-2 ring-primary/20" : "",
        "bg-background border border-border rounded-lg"
      )}>
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
        
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="pl-10 pr-20 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        
        <div className="absolute right-2 flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => {/* Future: Voice search */}}
          >
            <Mic className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => {/* Future: Visual search */}}
          >
            <Camera className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
