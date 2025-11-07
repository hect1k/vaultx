"use client";

export function Recents() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex items-center justify-between">
        <span className="text-lg font-semibold">Recents</span>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground">
        <p className="text-sm">Your recently accessed files will appear here.</p>
      </div>
    </div>
  );
}
