import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Filter, X } from "lucide-react";
import { useShopCategories } from "@/hooks/useShops";

export interface FilterState {
  categories: string[];
  priceRange: [number, number];
  distance: number;
  rating: number;
  inStockOnly: boolean;
  isVerified?: boolean;
  hasDelivery?: boolean;
  isOpen?: boolean;
  minReviews?: number;
  brands?: string[];
  subcategories?: string[];
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
  isOpen: false,
  minReviews: 0,
  brands: [],
  subcategories: [],
};

export default function FilterSheet({ filters, onFiltersChange, activeFilterCount }: FilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: categoriesResponse } = useShopCategories();
  const categories = categoriesResponse?.data || [];

  const handleCategoryChange = (category: string, checked: boolean) => {
    const updatedCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter(c => c !== category);
    
    onFiltersChange({
      ...filters,
      categories: updatedCategories,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
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
                    checked={filters.categories.includes(category)}
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
              Price Range: ₹{filters.priceRange[0].toLocaleString()} - ₹{filters.priceRange[1].toLocaleString()}
            </h3>
            <Slider
              value={filters.priceRange}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, priceRange: value as [number, number] })
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
              Distance: {filters.distance} km
            </h3>
            <Slider
              value={[filters.distance]}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, distance: value[0] })
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
              Minimum Rating: {filters.rating} stars
            </h3>
            <Slider
              value={[filters.rating]}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, rating: value[0] })
              }
              max={5}
              min={0}
              step={0.1}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Stock Status */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="inStock"
                checked={filters.inStockOnly}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, inStockOnly: checked as boolean })
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
                checked={filters.hasDelivery}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, hasDelivery: checked as boolean })
                }
              />
              <label
                htmlFor="hasDelivery"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Delivery Available
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="isOpen"
                checked={filters.isOpen}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, isOpen: checked as boolean })
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
              Minimum Reviews: {filters.minReviews || 0}
            </h3>
            <Slider
              value={[filters.minReviews || 0]}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, minReviews: value[0] })
              }
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-8 pb-6">
          <Button className="flex-1" onClick={() => setIsOpen(false)}>
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