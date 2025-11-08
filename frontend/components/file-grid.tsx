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

export function FileGrid({
  files,
  onShareFile,
  onDownloadFile,
  onDeleteFile,
}: FileGridProps) {
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
                <p
                  className="text-sm font-medium text-foreground truncate"
                  title={file.name}
                >
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

function FileIcon({
  fileType,
  className,
}: {
  fileType?: string;
  className?: string;
}) {
  const type = (fileType || "").toLowerCase();

  // Normalize MIME or extension patterns
  const ext = type.includes("pdf")
    ? "pdf"
    : type.includes("excel") || type.includes("spreadsheet")
    ? "excel"
    : type.includes("word") || type.includes("document")
    ? "word"
    : type.includes("image")
    ? "image"
    : type.includes("audio")
    ? "audio"
    : type.includes("video") || type.includes(".mov")
    ? "video"
    : type.includes("zip") || type.includes("rar") || type.includes("tar")
    ? "archive"
    : type.includes("html")
    ? "html"
    : type.includes("text/plain") || type.endsWith(".txt")
    ? "text"
    : type.endsWith(".md") || type.includes("markdown")
    ? "markdown"
    : type.includes("javascript") ||
      type.includes("json") ||
      type.includes("python")
    ? "code"
    : "default";

  switch (ext) {
    case "pdf":
      return (
        <svg
          className={`${className} text-red-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z" />
        </svg>
      );

    case "excel":
      return (
        <svg
          className={`${className} text-green-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8 8h2l2 3 2-3h2l-3 4 3 4h-2l-2-3-2 3H8l3-4-3-4z" />
        </svg>
      );

    case "word":
      return (
        <svg
          className={`${className} text-blue-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M4 2h14l4 4v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
          <text x="8" y="17" fontSize="8" fill="white" fontWeight="bold">
            W
          </text>
        </svg>
      );

    case "image":
      return (
        <svg
          className={`${className} text-purple-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
        </svg>
      );

    case "audio":
      return (
        <svg
          className={`${className} text-pink-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M9 3v12.26A4 4 0 1 0 11 19V8h4V3H9z" />
        </svg>
      );

    case "video":
      return (
        <svg
          className={`${className} text-indigo-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 7v10l8-5-8-5z" />
          <rect
            x="3"
            y="4"
            width="18"
            height="16"
            rx="2"
            ry="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      );

    case "archive":
      return (
        <svg
          className={`${className} text-orange-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M4 3h16v4H4V3zm2 6h12v12H6V9zm6 3h2v2h-2v-2z" />
        </svg>
      );

    case "html":
      return (
        <svg
          className={`${className} text-orange-500`}
          viewBox="0 0 128 128"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
        >
          <defs>
            <linearGradient id="htmlGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FF6A00" />
              <stop offset="100%" stopColor="#FF3C00" />
            </linearGradient>
          </defs>

          {/* HTML5 badge shape */}
          <path
            fill="url(#htmlGradient)"
            d="M19 2h90l-8 110-37 12-37-12L19 2z"
          />

          {/* Inner white "HTML" layer */}
          <path
            fill="#fff"
            d="M64 112l30-9 6.5-81H64v90zM64 22H33l5 60 26 8V22z"
            opacity="0.1"
          />

          {/* “</>” symbol for extra dev flavor */}
          <path
            fill="#fff"
            d="M46 72l-10-8 10-8v4h8v8h-8v4zm36 0v-4h-8v-8h8v-4l10 8-10 8z"
          />

          {/* Small subtle glow */}
          <path fill="rgba(255,255,255,0.2)" d="M19 2h90l-1 12H20z" />
        </svg>
      );

    case "text":
      return (
        <svg
          className={`${className} text-gray-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6z" />
          <path d="M8 13h8v2H8zm0-4h8v2H8z" fill="#fff" />
        </svg>
      );

    case "markdown":
      return (
        <svg
          className={`${className} text-slate-600`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path
            d="M5 16V8h2l2 3 2-3h2v8h-2v-4l-2 3-2-3v4H5zm12 0l-3-4h2V8h2v4h2l-3 4z"
            fill="#fff"
          />
        </svg>
      );

    case "code":
      return (
        <svg
          className={`${className} text-yellow-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M9 9l-3 3 3 3v-2h6v2l3-3-3-3v2H9V9z" />
        </svg>
      );

    default:
      return (
        <svg
          className={`${className} text-muted-foreground`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586l5.414 5.414V19a2 2 0 01-2 2z"
          />
        </svg>
      );
  }
}
