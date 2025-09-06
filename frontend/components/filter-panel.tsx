"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface FileFilters {
  fileTypes: string[]
  owners: string[]
  shared: boolean | null
  dateRange: string | null
}

interface FilterPanelProps {
  filters: FileFilters
  onFiltersChange: (filters: FileFilters) => void
  onClose: () => void
  availableFiles: any[]
}

export function FilterPanel({ filters, onFiltersChange, onClose, availableFiles }: FilterPanelProps) {
  const availableFileTypes = Array.from(
    new Set(availableFiles.map((file) => (file.type === "folder" ? "folder" : file.fileType)).filter(Boolean)),
  )

  const availableOwners = Array.from(new Set(availableFiles.map((file) => file.owner)))

  const handleFileTypeChange = (fileType: string, checked: boolean) => {
    const newFileTypes = checked
      ? [...filters.fileTypes, fileType]
      : filters.fileTypes.filter((type) => type !== fileType)

    onFiltersChange({ ...filters, fileTypes: newFileTypes })
  }

  const handleOwnerChange = (owner: string, checked: boolean) => {
    const newOwners = checked ? [...filters.owners, owner] : filters.owners.filter((o) => o !== owner)

    onFiltersChange({ ...filters, owners: newOwners })
  }

  const handleSharedChange = (shared: boolean | null) => {
    onFiltersChange({ ...filters, shared })
  }

  const handleDateRangeChange = (dateRange: string | null) => {
    onFiltersChange({ ...filters, dateRange })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      fileTypes: [],
      owners: [],
      shared: null,
      dateRange: null,
    })
  }

  const getFileTypeLabel = (fileType: string) => {
    const labels: Record<string, string> = {
      folder: "Folders",
      pdf: "PDF Documents",
      excel: "Spreadsheets",
      word: "Documents",
      image: "Images",
      figma: "Figma Files",
      sketch: "Sketch Files",
      archive: "Archives",
    }
    return labels[fileType] || fileType.toUpperCase()
  }

  const activeFilterCount =
    filters.fileTypes.length + filters.owners.length + (filters.shared !== null ? 1 : 0) + (filters.dateRange ? 1 : 0)

  return (
    <div className="border-b border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-foreground">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs">
              Clear all
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* File Types */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-3 block">Type</Label>
          <div className="space-y-2">
            {availableFileTypes.map((fileType) => (
              <div key={fileType} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${fileType}`}
                  checked={filters.fileTypes.includes(fileType)}
                  onCheckedChange={(checked) => handleFileTypeChange(fileType, checked as boolean)}
                />
                <Label htmlFor={`type-${fileType}`} className="text-sm text-foreground cursor-pointer">
                  {getFileTypeLabel(fileType)}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Owners */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-3 block">Owner</Label>
          <div className="space-y-2">
            {availableOwners.map((owner) => (
              <div key={owner} className="flex items-center space-x-2">
                <Checkbox
                  id={`owner-${owner}`}
                  checked={filters.owners.includes(owner)}
                  onCheckedChange={(checked) => handleOwnerChange(owner, checked as boolean)}
                />
                <Label htmlFor={`owner-${owner}`} className="text-sm text-foreground cursor-pointer">
                  {owner}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Shared Status */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-3 block">Sharing</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shared-true"
                checked={filters.shared === true}
                onCheckedChange={(checked) => handleSharedChange(checked ? true : null)}
              />
              <Label htmlFor="shared-true" className="text-sm text-foreground cursor-pointer">
                Shared
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shared-false"
                checked={filters.shared === false}
                onCheckedChange={(checked) => handleSharedChange(checked ? false : null)}
              />
              <Label htmlFor="shared-false" className="text-sm text-foreground cursor-pointer">
                Not shared
              </Label>
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-3 block">Modified</Label>
          <div className="space-y-2">
            {[
              { value: "today", label: "Today" },
              { value: "week", label: "This week" },
              { value: "month", label: "This month" },
            ].map((range) => (
              <div key={range.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`date-${range.value}`}
                  checked={filters.dateRange === range.value}
                  onCheckedChange={(checked) => handleDateRangeChange(checked ? range.value : null)}
                />
                <Label htmlFor={`date-${range.value}`} className="text-sm text-foreground cursor-pointer">
                  {range.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
