import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Filter, X, Star, Truck } from "lucide-react";
import { useShopCategories } from "@/hooks/useShops";

export interface FilterState {
  categories: string[];
  priceRange: [number, number];
  distance: number;
  rating: number;
  inStockOnly: boolean;
  isVerified?: boolean;
  hasDelivery?: boolean;
  deliversToMe?: boolean;
  isOpen?: boolean;
  minReviews?: number;
  brands?: string[];
  subcategories?: string[];
  isFeatured?: boolean;
}

interface FilterSheetProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  activeFilterCount: number;
}

const defaultFilters: FilterState = {
  categories: [],
  priceRange: [0, 50000],
  distance: 50,
  rating: 0,
  inStockOnly: false,
  hasDelivery: false,
  deliversToMe: false,
  isOpen: false,
  minReviews: 0,
  brands: [],
  subcategories: [],
  isFeatured: false,
};

export default function FilterSheet({ filters, onFiltersChange, activeFilterCount }: FilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const { data: categoriesResponse } = useShopCategories();
  const categories = categoriesResponse?.data || [];

  // Sync local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleCategoryChange = (category: string, checked: boolean) => {
    const updatedCategories = checked
      ? [...localFilters.categories, category]
      : localFilters.categories.filter(c => c !== category);
    
    setLocalFilters({
      ...localFilters,
      categories: updatedCategories,
    });
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const clearAllFilters = () => {
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    setIsOpen(false);
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        // Reset local state when closing without applying
        setLocalFilters(filters);
      }
    }}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-8 rounded-full font-medium text-xs"
        >
          <Filter className="w-3.5 h-3.5 mr-1.5" />
          Filters
          {hasActiveFilters && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0 flex items-center justify-center text-[10px]"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </div>
          <SheetDescription>
            Refine your search results
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Categories */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Shop Categories</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {categories.map((category) => (
                <div key={category} className="flex items-center space-x-3">
                  <Checkbox
                    id={category}
                    checked={localFilters.categories.includes(category)}
                    onCheckedChange={(checked) =>
                      handleCategoryChange(category, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={category}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {category}
                  </label>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">No categories available</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Price Range */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              Price Range: ₹{localFilters.priceRange[0].toLocaleString()} - ₹{localFilters.priceRange[1].toLocaleString()}
            </h3>
            <Slider
              value={localFilters.priceRange}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, priceRange: value as [number, number] })
              }
              max={50000}
              min={0}
              step={100}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Distance */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              Distance: {localFilters.distance} km
            </h3>
            <Slider
              value={[localFilters.distance]}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, distance: value[0] })
              }
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Rating */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              Minimum Rating: {localFilters.rating} stars
            </h3>
            <Slider
              value={[localFilters.rating]}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, rating: value[0] })
              }
              max={5}
              min={0}
              step={0.1}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Featured Filter */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="isFeatured"
                checked={localFilters.isFeatured}
                onCheckedChange={(checked) =>
                  setLocalFilters({ ...localFilters, isFeatured: checked as boolean })
                }
              />
              <label
                htmlFor="isFeatured"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Show Featured Only
              </label>
            </div>
          </div>

          <Separator />

          {/* Stock Status */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="inStock"
                checked={localFilters.inStockOnly}
                onCheckedChange={(checked) =>
                  setLocalFilters({ ...localFilters, inStockOnly: checked as boolean })
                }
              />
              <label
                htmlFor="inStock"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                In Stock Only
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="hasDelivery"
                checked={localFilters.hasDelivery}
                onCheckedChange={(checked) =>
                  setLocalFilters({ ...localFilters, hasDelivery: checked as boolean })
                }
              />
              <label
                htmlFor="hasDelivery"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                <Truck className="w-4 h-4 text-primary" />
                Delivery Available
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="deliversToMe"
                checked={localFilters.deliversToMe}
                onCheckedChange={(checked) =>
                  setLocalFilters({ ...localFilters, deliversToMe: checked as boolean })
                }
              />
              <label
                htmlFor="deliversToMe"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
              >
                <Truck className="w-4 h-4 text-success" />
                Delivers to My Location
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="isOpen"
                checked={localFilters.isOpen}
                onCheckedChange={(checked) =>
                  setLocalFilters({ ...localFilters, isOpen: checked as boolean })
                }
              />
              <label
                htmlFor="isOpen"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Open Now
              </label>
            </div>
          </div>

          <Separator />

          {/* Minimum Reviews */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">
              Minimum Reviews: {localFilters.minReviews || 0}
            </h3>
            <Slider
              value={[localFilters.minReviews || 0]}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, minReviews: value[0] })
              }
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-8 pb-6">
          <Button className="flex-1" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
          <Button variant="outline" className="flex-1" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}