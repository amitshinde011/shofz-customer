import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, TrendingUp, X, Package, Store, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchDropdownProps {
  isOpen: boolean;
  query: string;
  suggestions: string[];
  recentSearches: string[];
  popularSearches: string[];
  isLoadingSuggestions: boolean;
  onSelectSuggestion: (suggestion: string) => void;
  onSelectRecent: (search: string) => void;
  onClearRecent: () => void;
  onClose: () => void;
}

export const SearchDropdown = ({
  isOpen,
  query,
  suggestions,
  recentSearches,
  popularSearches,
  isLoadingSuggestions,
  onSelectSuggestion,
  onSelectRecent,
  onClearRecent,
  onClose,
}: SearchDropdownProps) => {
  // Show suggestions if query exists and has results
  const showSuggestions = query.length >= 2 && (suggestions.length > 0 || isLoadingSuggestions);
  
  // Show recent/popular if no query
  const showRecent = !query && recentSearches.length > 0;
  const showPopular = !query && !showRecent;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto"
      >
        {/* Loading State */}
        {isLoadingSuggestions && (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && !isLoadingSuggestions && (
          <div className="py-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Suggestions
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSelectSuggestion(suggestion)}
                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-left"
              >
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate">{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        {/* Recent Searches */}
        {showRecent && (
          <div className="py-2">
            <div className="px-3 py-1.5 flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Recent Searches
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearRecent();
                }}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => onSelectRecent(search)}
                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-left group"
              >
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{search}</span>
              </button>
            ))}
          </div>
        )}

        {/* Popular Searches */}
        {showPopular && popularSearches.length > 0 && (
          <div className="py-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Popular Searches
            </div>
            {popularSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => onSelectSuggestion(search)}
                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-accent transition-colors text-left"
              >
                <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate">{search}</span>
              </button>
            ))}
          </div>
        )}

        {/* No Results */}
        {query.length >= 2 && !isLoadingSuggestions && suggestions.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No suggestions found</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
