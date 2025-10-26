"use client"

import type React from "react"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sidebar } from "@/components/sidebar"
import { FileGrid } from "@/components/file-grid"
import { FileList } from "@/components/file-list"
import { Breadcrumb } from "@/components/breadcrumb"
import { UploadModal } from "@/components/upload-modal"
import { NewFolderModal } from "@/components/new-folder-modal"
import { ShareModal } from "@/components/share-modal"
import { DashboardLayout } from "@/components/dashboard-layout"
import { FilterPanel } from "@/components/filter-panel"

const mockFileStructure: Record<string, any[]> = {
  "My Drive": [
    {
      id: "1",
      name: "Project Proposal.pdf",
      type: "file",
      fileType: "pdf",
      size: "2.4 MB",
      modified: "2 hours ago",
      owner: "You",
      shared: false,
    },
    {
      id: "2",
      name: "Marketing Assets",
      type: "folder",
      size: "—",
      modified: "Yesterday",
      owner: "You",
      shared: true,
    },
    {
      id: "3",
      name: "Budget Spreadsheet.xlsx",
      type: "file",
      fileType: "excel",
      size: "1.2 MB",
      modified: "3 days ago",
      owner: "John Doe",
      shared: true,
    },
    {
      id: "4",
      name: "Team Photo.jpg",
      type: "file",
      fileType: "image",
      size: "5.8 MB",
      modified: "1 week ago",
      owner: "You",
      shared: false,
    },
    {
      id: "5",
      name: "Meeting Notes.docx",
      type: "file",
      fileType: "word",
      size: "856 KB",
      modified: "2 weeks ago",
      owner: "Jane Smith",
      shared: true,
    },
    {
      id: "6",
      name: "Design Files",
      type: "folder",
      size: "—",
      modified: "1 month ago",
      owner: "You",
      shared: false,
    },
  ],
  "Marketing Assets": [
    {
      id: "7",
      name: "Brand Guidelines.pdf",
      type: "file",
      fileType: "pdf",
      size: "3.2 MB",
      modified: "1 day ago",
      owner: "You",
      shared: false,
    },
    {
      id: "8",
      name: "Logo Assets",
      type: "folder",
      size: "—",
      modified: "2 days ago",
      owner: "You",
      shared: false,
    },
    {
      id: "9",
      name: "Campaign Images.zip",
      type: "file",
      fileType: "archive",
      size: "15.6 MB",
      modified: "3 days ago",
      owner: "Marketing Team",
      shared: true,
    },
  ],
  "Design Files": [
    {
      id: "10",
      name: "UI Mockups.fig",
      type: "file",
      fileType: "figma",
      size: "8.4 MB",
      modified: "5 days ago",
      owner: "You",
      shared: true,
    },
    {
      id: "11",
      name: "Icons",
      type: "folder",
      size: "—",
      modified: "1 week ago",
      owner: "You",
      shared: false,
    },
  ],
  "Logo Assets": [
    {
      id: "12",
      name: "logo-primary.svg",
      type: "file",
      fileType: "image",
      size: "24 KB",
      modified: "2 days ago",
      owner: "You",
      shared: false,
    },
    {
      id: "13",
      name: "logo-white.svg",
      type: "file",
      fileType: "image",
      size: "22 KB",
      modified: "2 days ago",
      owner: "You",
      shared: false,
    },
  ],
  Icons: [
    {
      id: "14",
      name: "icon-set.sketch",
      type: "file",
      fileType: "sketch",
      size: "2.1 MB",
      modified: "1 week ago",
      owner: "You",
      shared: false,
    },
  ],
}

interface FileFilters {
  fileTypes: string[]
  owners: string[]
  shared: boolean | null
  dateRange: string | null
}

export function FileManager() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [currentPath, setCurrentPath] = useState(["My Drive"])
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareFileId, setShareFileId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FileFilters>({
    fileTypes: [],
    owners: [],
    shared: null,
    dateRange: null,
  })

  const getCurrentFiles = () => {
    const pathKey = currentPath[currentPath.length - 1]
    return mockFileStructure[pathKey] || []
  }

  const filteredFiles = useMemo(() => {
    let files = getCurrentFiles()

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      files = files.filter(
        (file) =>
          file.name.toLowerCase().includes(query) ||
          file.owner.toLowerCase().includes(query) ||
          file.type.toLowerCase().includes(query) ||
          (file.fileType && file.fileType.toLowerCase().includes(query)),
      )
    }

    // Apply file type filter
    if (filters.fileTypes.length > 0) {
      files = files.filter((file) => {
        if (file.type === "folder") return filters.fileTypes.includes("folder")
        return file.fileType ? filters.fileTypes.includes(file.fileType) : false
      })
    }

    // Apply owner filter
    if (filters.owners.length > 0) {
      files = files.filter((file) => filters.owners.includes(file.owner))
    }

    // Apply shared filter
    if (filters.shared !== null) {
      files = files.filter((file) => file.shared === filters.shared)
    }

    // Apply date range filter (simplified for demo)
    if (filters.dateRange) {
      const now = new Date()
      files = files.filter((file) => {
        switch (filters.dateRange) {
          case "today":
            return file.modified.includes("hour") || file.modified.includes("minute")
          case "week":
            return (
              file.modified.includes("hour") ||
              file.modified.includes("minute") ||
              file.modified.includes("day") ||
              file.modified.includes("Yesterday")
            )
          case "month":
            return !file.modified.includes("month")
          default:
            return true
        }
      })
    }

    return files
  }, [getCurrentFiles, searchQuery, filters])

  const handleFolderOpen = (folderName: string) => {
    setCurrentPath((prev) => [...prev, folderName])
    setSelectedFiles([]) // Clear selection when navigating
    setSearchQuery("") // Clear search when navigating
  }

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath((prev) => prev.slice(0, index + 1))
    setSelectedFiles([]) // Clear selection when navigating
    setSearchQuery("") // Clear search when navigating
  }

  const handleSidebarNavigation = (section: string) => {
    switch (section) {
      case "My Drive":
        setCurrentPath(["My Drive"])
        break
      case "Recent":
        setCurrentPath(["Recent"])
        break
      case "Starred":
        setCurrentPath(["Starred"])
        break
      default:
        setCurrentPath(["My Drive"])
    }
    setSelectedFiles([])
    setSearchQuery("") // Clear search when navigating
  }

  const handleCreateFolder = (folderName: string) => {
    const pathKey = currentPath[currentPath.length - 1]
    const newFolder = {
      id: Date.now().toString(),
      name: folderName,
      type: "folder" as const,
      size: "—",
      modified: "Just now",
      owner: "You",
      shared: false,
    }

    if (!mockFileStructure[pathKey]) {
      mockFileStructure[pathKey] = []
    }
    mockFileStructure[pathKey].unshift(newFolder)
    mockFileStructure[folderName] = [] // Create empty folder structure
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    setUploadModalOpen(true)
  }, [])

  const handleSelectFile = (fileId: string) => {
    setSelectedFiles((prev) => (prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]))
  }

  const handleSelectAll = () => {
    setSelectedFiles(selectedFiles.length === filteredFiles.length ? [] : filteredFiles.map((f) => f.id))
  }

  const handleShareFile = (fileId: string) => {
    setShareFileId(fileId)
    setShareModalOpen(true)
  }

  const handleShareSelected = () => {
    if (selectedFiles.length > 0) {
      setShareFileId(selectedFiles[0]) // Share first selected file for demo
      setShareModalOpen(true)
    }
  }

  const getFileById = (fileId: string) => {
    return filteredFiles.find((file) => file.id === fileId)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleFilterToggle = () => {
    setShowFilters(!showFilters)
  }

  const handleFiltersChange = (newFilters: FileFilters) => {
    setFilters(newFilters)
  }

  const clearFilters = () => {
    setFilters({
      fileTypes: [],
      owners: [],
      shared: null,
      dateRange: null,
    })
    setSearchQuery("")
  }

  const hasActiveFilters =
    searchQuery.trim() ||
    filters.fileTypes.length > 0 ||
    filters.owners.length > 0 ||
    filters.shared !== null ||
    filters.dateRange

  return (
    <DashboardLayout onSearch={handleSearch} onFilterToggle={handleFilterToggle}>
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar onNavigate={handleSidebarNavigation} onCreateFolder={() => setNewFolderModalOpen(true)} />

        <div
          className={`flex-1 flex flex-col ${isDragOver ? "bg-primary/5" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragOver && (
            <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-xl font-medium text-primary">Drop files to upload</p>
              </div>
            </div>
          )}

          {/* Filter Panel */}
          {showFilters && (
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClose={() => setShowFilters(false)}
              availableFiles={getCurrentFiles()}
            />
          )}

          {/* Toolbar */}
          <div className="border-b border-border bg-background p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Breadcrumb path={currentPath} onNavigate={handleBreadcrumbClick} />
                {hasActiveFilters && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      {filteredFiles.length} of {getCurrentFiles().length} items
                    </span>
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs">
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* View Mode Toggle */}
                <div className="flex items-center border border-border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-8 px-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-8 px-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                  </Button>
                </div>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
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
                    <DropdownMenuItem>Sort by name</DropdownMenuItem>
                    <DropdownMenuItem>Sort by modified</DropdownMenuItem>
                    <DropdownMenuItem>Sort by size</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Show file details</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Selection Actions */}
            {selectedFiles.length > 0 && (
              <div className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium text-foreground">{selectedFiles.length} selected</span>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={handleShareSelected}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                      />
                    </svg>
                    Share
                  </Button>
                  <Button variant="ghost" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download
                  </Button>
                  <Button variant="ghost" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* File Content Area */}
          <div className="flex-1 overflow-auto">
            {filteredFiles.length === 0 && (searchQuery.trim() || hasActiveFilters) ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No files found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery.trim() ? `No results for "${searchQuery}"` : "No files match the current filters"}
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear search and filters
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <FileGrid
                files={filteredFiles}
                selectedFiles={selectedFiles}
                onSelectFile={handleSelectFile}
                onSelectAll={handleSelectAll}
                onFolderOpen={handleFolderOpen}
                onShareFile={handleShareFile}
              />
            ) : (
              <FileList
                files={filteredFiles}
                selectedFiles={selectedFiles}
                onSelectFile={handleSelectFile}
                onSelectAll={handleSelectAll}
                onFolderOpen={handleFolderOpen}
                onShareFile={handleShareFile}
              />
            )}
          </div>

          <UploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} />
          <NewFolderModal
            open={newFolderModalOpen}
            onOpenChange={setNewFolderModalOpen}
            onCreateFolder={handleCreateFolder}
          />
          <ShareModal
            open={shareModalOpen}
            onOpenChange={setShareModalOpen}
            file={shareFileId ? getFileById(shareFileId) : null}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
