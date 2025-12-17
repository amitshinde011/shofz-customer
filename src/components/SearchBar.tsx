import { Search } from "lucide-react";
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
        className={`flex items-center bg-white rounded-full px-3 sm:px-4 py-2.5 sm:py-2 pr-1.5 sm:pr-1 border-2 transition-all duration-300 ${
          isFocused
            ? "border-primary shadow-md"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-base sm:text-sm placeholder:text-muted-foreground min-w-0"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="bg-amber-400 hover:bg-amber-500 text-gray-800 rounded-full h-9 w-9 sm:h-8 sm:w-8 flex items-center justify-center flex-shrink-0 ml-2"
        >
          <Search className="w-4 h-4" />
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
