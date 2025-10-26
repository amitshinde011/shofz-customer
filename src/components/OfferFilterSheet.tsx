import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Filter, X, CalendarIcon, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface OfferFilterState {
  offerTypes: string[];
  discountRange: [number, number];
  categories: string[];
  shops: string[];
  validFrom?: Date;
  validUntil?: Date;
  minDiscount: number;
  isFeatured?: boolean;
}

interface OfferFilterSheetProps {
  filters: OfferFilterState;
  onFiltersChange: (filters: OfferFilterState) => void;
  activeFilterCount: number;
  availableCategories?: string[];
  availableShops?: Array<{ id: string; name: string }>;
}

export default function OfferFilterSheet({
  filters,
  onFiltersChange,
  activeFilterCount,
  availableCategories = [],
  availableShops = [],
}: OfferFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<OfferFilterState>(filters);

  // Sync local filters when parent filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const offerTypeOptions = [
    { value: "percentage", label: "Percentage Off" },
    { value: "fixed", label: "Fixed Amount" },
    { value: "promotion", label: "Promotion" },
    { value: "bogo", label: "Buy One Get One" },
  ];

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleResetFilters = () => {
    const resetFilters: OfferFilterState = {
      offerTypes: [],
      discountRange: [0, 100],
      categories: [],
      shops: [],
      minDiscount: 0,
      isFeatured: false,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    setIsOpen(false);
  };

  const toggleOfferType = (type: string) => {
    setLocalFilters(prev => ({
      ...prev,
      offerTypes: prev.offerTypes.includes(type)
        ? prev.offerTypes.filter(t => t !== type)
        : [...prev.offerTypes, type]
    }));
  };

  const toggleCategory = (category: string) => {
    setLocalFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const toggleShop = (shopId: string) => {
    setLocalFilters(prev => ({
      ...prev,
      shops: prev.shops.includes(shopId)
        ? prev.shops.filter(s => s !== shopId)
        : [...prev.shops, shopId]
    }));
  };

  return (
      <Sheet open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          // Reset local state to match parent when closing without applying
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
          {activeFilterCount > 0 && (
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
        <SheetHeader>
          <SheetTitle>Filter Offers</SheetTitle>
          <SheetDescription>
            Refine your search with advanced filters
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Offer Type Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Offer Type</Label>
            <div className="flex flex-wrap gap-2">
              {offerTypeOptions.map(type => (
                <Badge
                  key={type.value}
                  variant={localFilters.offerTypes.includes(type.value) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => toggleOfferType(type.value)}
                >
                  {type.label}
                  {localFilters.offerTypes.includes(type.value) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Featured Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Show Featured Only
              </Label>
              <Switch
                checked={localFilters.isFeatured || false}
                onCheckedChange={(checked) => 
                  setLocalFilters(prev => ({ ...prev, isFeatured: checked }))
                }
              />
            </div>
          </div>

          <Separator />

          {/* Discount Range Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Discount Range</Label>
              <span className="text-sm text-muted-foreground">
                {localFilters.discountRange[0]}% - {localFilters.discountRange[1]}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={localFilters.discountRange}
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, discountRange: value as [number, number] }))}
              className="w-full"
            />
          </div>

          {/* Minimum Discount Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Minimum Discount</Label>
              <span className="text-sm text-muted-foreground">{localFilters.minDiscount}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[localFilters.minDiscount]}
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, minDiscount: value[0] }))}
              className="w-full"
            />
          </div>

          {/* Categories Filter */}
          {availableCategories.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Categories</Label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {availableCategories.map(category => (
                  <Badge
                    key={category}
                    variant={localFilters.categories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                    {localFilters.categories.includes(category) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Shops Filter */}
          {availableShops.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Shops</Label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {availableShops.slice(0, 20).map(shop => (
                  <Badge
                    key={shop.id}
                    variant={localFilters.shops.includes(shop.id) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => toggleShop(shop.id)}
                  >
                    {shop.name}
                    {localFilters.shops.includes(shop.id) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Date Range Filters */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Valid From</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localFilters.validFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.validFrom ? format(localFilters.validFrom, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.validFrom}
                  onSelect={(date) => setLocalFilters(prev => ({ ...prev, validFrom: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Valid Until</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localFilters.validUntil && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.validUntil ? format(localFilters.validUntil, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.validUntil}
                  onSelect={(date) => setLocalFilters(prev => ({ ...prev, validUntil: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="flex-1"
          >
            Reset All
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="flex-1"
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
