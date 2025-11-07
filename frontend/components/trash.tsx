"use client";

export function Trash() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex items-center justify-between">
        <span className="text-lg font-semibold">Trash</span>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
        <p className="text-sm">Deleted files will appear here until permanently removed.</p>
      </div>
    </div>
  );
}
