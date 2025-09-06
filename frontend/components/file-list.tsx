"use client"

import type React from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  fileType?: string
  size: string
  modified: string
  owner: string
  shared: boolean
}

interface FileListProps {
  files: FileItem[]
  selectedFiles: string[]
  onSelectFile: (fileId: string) => void
  onSelectAll: () => void
  onFolderOpen?: (folderName: string) => void
  onShareFile?: (fileId: string) => void
}

export function FileList({
  files,
  selectedFiles,
  onSelectFile,
  onSelectAll,
  onFolderOpen,
  onShareFile,
}: FileListProps) {
  const handleItemClick = (file: FileItem, event: React.MouseEvent) => {
    if (event.detail === 2 && file.type === "folder") {
      // Double-click on folder
      onFolderOpen?.(file.name)
    } else {
      // Single-click for selection
      onSelectFile(file.id)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 pb-3 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-1 flex items-center">
          <Checkbox checked={selectedFiles.length === files.length} onChange={onSelectAll} />
        </div>
        <div className="col-span-5">Name</div>
        <div className="col-span-2">Owner</div>
        <div className="col-span-2">Last modified</div>
        <div className="col-span-1">Size</div>
        <div className="col-span-1"></div>
      </div>

      {/* File Rows */}
      <div className="space-y-1 mt-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={`grid grid-cols-12 gap-4 py-3 px-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group ${
              selectedFiles.includes(file.id) ? "bg-primary/10" : ""
            }`}
            onClick={(e) => handleItemClick(file, e)}
          >
            {/* Checkbox */}
            <div className="col-span-1 flex items-center">
              <Checkbox checked={selectedFiles.includes(file.id)} onChange={() => onSelectFile(file.id)} />
            </div>

            {/* Name with Icon */}
            <div className="col-span-5 flex items-center space-x-3">
              <FileIcon type={file.type} fileType={file.fileType} className="w-6 h-6 flex-shrink-0" />
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
                {file.shared && (
                  <svg
                    className="w-4 h-4 text-muted-foreground flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Owner */}
            <div className="col-span-2 flex items-center">
              <span className="text-sm text-muted-foreground">{file.owner}</span>
            </div>

            {/* Modified */}
            <div className="col-span-2 flex items-center">
              <span className="text-sm text-muted-foreground">{file.modified}</span>
            </div>

            {/* Size */}
            <div className="col-span-1 flex items-center">
              <span className="text-sm text-muted-foreground">{file.size}</span>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zM12 13a1 1 0 110-2 1 1 0 010 2zM12 20a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Open</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onShareFile?.(file.id)}>Share</DropdownMenuItem>
                  <DropdownMenuItem>Rename</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Move to trash</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FileIcon({ type, fileType, className }: { type: string; fileType?: string; className?: string }) {
  if (type === "folder") {
    return (
      <svg className={`${className} text-primary`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
      </svg>
    )
  }

  const fileIcons = {
    pdf: (
      <svg className={`${className} text-red-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    ),
    excel: (
      <svg className={`${className} text-green-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    ),
    word: (
      <svg className={`${className} text-blue-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    ),
    image: (
      <svg className={`${className} text-purple-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" />
      </svg>
    ),
    figma: (
      <svg className={`${className} text-orange-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    ),
    sketch: (
      <svg className={`${className} text-yellow-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    ),
    archive: (
      <svg className={`${className} text-gray-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    ),
  }

  return (
    fileIcons[fileType as keyof typeof fileIcons] || (
      <svg className={`${className} text-muted-foreground`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    )
  )
}
