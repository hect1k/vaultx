"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileItem {
  id: string;
  name: string;
  type: "file";
  fileType?: string;
  size: string;
  modified: string;
  owner: string;
  shared: boolean;
  shared_with?: string[];
  is_shared_with_me?: boolean;
}

interface FileGridProps {
  files: FileItem[];
  onShareFile?: (fileId: string) => void;
  onDownloadFile?: (fileId: string) => void;
  onDeleteFile?: (fileId: string) => void;
}

export function FileGrid({ files, onShareFile, onDownloadFile, onDeleteFile }: FileGridProps) {
  return (
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {files.map((file) => (
          <DropdownMenu key={file.id}>
            <DropdownMenuTrigger asChild>
              <div className="group relative p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer text-center">
                <div className="flex justify-center mb-3">
                  <FileIcon fileType={file.fileType} className="w-12 h-12" />
                </div>
                <p className="text-sm font-medium text-foreground truncate" title={file.name}>
                  {file.name}
                </p>
                {file.shared && (
                  <div className="flex justify-center mt-1">
                    <svg
                      className="w-3 h-3 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="center" className="w-32">
              <DropdownMenuItem onClick={() => onDownloadFile?.(file.id)}>
                Download
              </DropdownMenuItem>

              {!file.is_shared_with_me && (
                <>
                  <DropdownMenuItem onClick={() => onShareFile?.(file.id)}>
                    Share
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => onDeleteFile?.(file.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>
    </div>
  );
}

function FileIcon({ fileType, className }: { fileType?: string; className?: string }) {
  const icons = {
    pdf: (
      <svg className={`${className} text-red-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z" />
      </svg>
    ),
    excel: (
      <svg className={`${className} text-green-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z" />
      </svg>
    ),
    word: (
      <svg className={`${className} text-blue-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z" />
      </svg>
    ),
    image: (
      <svg className={`${className} text-purple-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5V5C5,3.89 5.89,3 7,3H19C20.1,3 21,3.89 21,5V19A2,2 0 0,1 19,21H5C3.9,21 3,20.1 3,19V5C3,3.89 3.9,3 5,3H7" />
      </svg>
    ),
  };

  return icons[fileType as keyof typeof icons] || (
    <svg className={`${className} text-muted-foreground`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586l5.414 5.414V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
