import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, Filter, X, Save, RotateCcw } from "lucide-react";
import { domainOptions, locationOptions } from '@/services/studentService';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import type { ApiPostingType as PostingType, ApiWorkMode as WorkMode } from "@/types/posting";

export interface FilterState {
  search: string;
  type: PostingType | 'all';
  workMode: WorkMode | 'all';
  locations: string[];
  domains: string[];
  minStipend: number;
  maxCtc: number;
}

interface OpportunityFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onSavePreferences: () => void;
  onResetFilters: () => void;
  activeFilterCount: number;
}

export const defaultFilters: FilterState = {
  search: '',
  type: 'all',
  workMode: 'all',
  locations: [],
  domains: [],
  minStipend: 0,
  maxCtc: 100,
};

export function OpportunityFilters({
  filters,
  onFiltersChange,
  onSavePreferences,
  onResetFilters,
  activeFilterCount,
}: OpportunityFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { options: postingTypeOptions } = usePostingTypeOptions();

  const handleLocationToggle = (location: string) => {
    const newLocations = filters.locations.includes(location)
      ? filters.locations.filter((l) => l !== location)
      : [...filters.locations, location];
    onFiltersChange({ ...filters, locations: newLocations });
  };

  const handleDomainToggle = (domain: string) => {
    const newDomains = filters.domains.includes(domain)
      ? filters.domains.filter((d) => d !== domain)
      : [...filters.domains, domain];
    onFiltersChange({ ...filters, domains: newDomains });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by role, company..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Select
            value={filters.type}
            onValueChange={(value) => onFiltersChange({ ...filters, type: value as PostingType | 'all' })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Posting Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posting Types</SelectItem>
              {postingTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.workMode}
            onValueChange={(value) => onFiltersChange({ ...filters, workMode: value as WorkMode | 'all' })}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Work Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Opportunities</SheetTitle>
                <SheetDescription>
                  Narrow down opportunities based on your preferences
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6 mt-6">
                {/* Locations */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Preferred Locations</Label>
                  <div className="flex flex-wrap gap-2">
                    {locationOptions.map((location) => (
                      <Badge
                        key={location}
                        variant={filters.locations.includes(location) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleLocationToggle(location)}
                      >
                        {location}
                        {filters.locations.includes(location) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Domains */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Domains / Roles</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {domainOptions.slice(0, 8).map((domain) => (
                      <Badge
                        key={domain}
                        variant={filters.domains.includes(domain) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleDomainToggle(domain)}
                      >
                        {domain}
                        {filters.domains.includes(domain) && (
                          <X className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Stipend Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Minimum Stipend: ₹{filters.minStipend}K/month
                  </Label>
                  <Slider
                    value={[filters.minStipend]}
                    onValueChange={([value]) => onFiltersChange({ ...filters, minStipend: value })}
                    min={0}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* CTC Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Maximum CTC: {filters.maxCtc} LPA
                  </Label>
                  <Slider
                    value={[filters.maxCtc]}
                    onValueChange={([value]) => onFiltersChange({ ...filters, maxCtc: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={onResetFilters}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={() => {
                      onSavePreferences();
                      setIsOpen(false);
                    }}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.locations.map((location) => (
            <Badge key={location} variant="secondary" className="gap-1">
              {location}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleLocationToggle(location)}
              />
            </Badge>
          ))}
          {filters.domains.map((domain) => (
            <Badge key={domain} variant="secondary" className="gap-1">
              {domain}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleDomainToggle(domain)}
              />
            </Badge>
          ))}
          {filters.minStipend > 0 && (
            <Badge variant="secondary" className="gap-1">
              Min ₹{filters.minStipend}K
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, minStipend: 0 })}
              />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-xs h-6"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
