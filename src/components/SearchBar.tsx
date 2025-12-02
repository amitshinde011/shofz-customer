import { Search, Mic, Camera } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { SearchDropdown } from "./SearchDropdown";
import { useSearchSuggestions, useRecentSearches, usePopularSearches } from "@/hooks/useSearch";
import { loadGoogleMaps } from "@/lib/googleMaps";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void;
  enablePlacesAutocomplete?: boolean;
  showDropdown?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "Search products, shops, or services...",
  className = "",
  onPlaceSelected,
  enablePlacesAutocomplete = false,
  showDropdown = true,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search hooks
  const { data: suggestions = [], isLoading: isLoadingSuggestions } = useSearchSuggestions(
    value,
    showDropdown && dropdownOpen && !enablePlacesAutocomplete
  );
  const { searches: recentSearches, addSearch, clearSearches } = useRecentSearches();
  const { data: popularSearches = [] } = usePopularSearches();

  // Initialize Google Places Autocomplete if enabled
  useEffect(() => {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    const trimmedValue = value.trim();
    if (trimmedValue && onSearch) {
      addSearch(trimmedValue);
      onSearch(trimmedValue);
      setDropdownOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    addSearch(suggestion);
    if (onSearch) {
      onSearch(suggestion);
    }
    setDropdownOpen(false);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (showDropdown) {
      setDropdownOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex items-center bg-white rounded-lg px-4 py-2.5 border-2 transition-all duration-300 ${
          isFocused
            ? "border-primary shadow-md scale-[1.01]"
            : "border-border hover:border-primary/50"
        }`}
      >
        <Search className="w-5 h-5 text-muted-foreground mr-3 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        {/* Voice Search Button - Future Feature */}
        <button
          type="button"
          className="p-1.5 hover:bg-accent rounded-md transition-colors ml-2"
          title="Voice search (coming soon)"
        >
          <Mic className="w-4 h-4 text-muted-foreground" />
        </button>
        {/* Visual Search Button - Future Feature */}
        <button
          type="button"
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
          title="Image search (coming soon)"
        >
          <Camera className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Search Dropdown */}
      {showDropdown && !enablePlacesAutocomplete && (
        <SearchDropdown
          isOpen={dropdownOpen}
          query={value}
          suggestions={suggestions}
          recentSearches={recentSearches}
          popularSearches={popularSearches}
          isLoadingSuggestions={isLoadingSuggestions}
          onSelectSuggestion={handleSelectSuggestion}
          onSelectRecent={handleSelectSuggestion}
          onClearRecent={clearSearches}
          onClose={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
}
