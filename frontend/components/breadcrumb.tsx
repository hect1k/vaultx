"use client"

import { Button } from "@/components/ui/button"

interface BreadcrumbProps {
  path: string[]
  onNavigate?: (index: number) => void
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  return (
    <div className="flex items-center space-x-1 text-sm">
      {path.map((segment, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <svg className="w-4 h-4 mx-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2 ${index === path.length - 1 ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => onNavigate?.(index)}
          >
            {segment}
          </Button>
        </div>
      ))}
    </div>
  )
}
