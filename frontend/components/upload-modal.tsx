"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { X, CheckCircle, UploadCloud, AlertTriangle } from "lucide-react" 

interface UploadFile {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "completed" | "error"
  errorMessage?: string
  keywords: string[] // Added keywords to the file structure
}

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadSuccess?: () => void 
}

const BASE_URL = "http://127.0.0.1:8000";

export function UploadModal({ open, onOpenChange, onUploadSuccess }: UploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  
  // --- New Keyword States ---
  const [currentKeyword, setCurrentKeyword] = useState<string>("")
  const [globalKeywords, setGlobalKeywords] = useState<string[]>([])
  // --- End New Keyword States ---

  // Reset state when the modal is fully closed
  const handleModalClose = (open: boolean) => {
    if (!open && !uploadFiles.some((f) => f.status === "uploading")) {
      setUploadFiles([]);
      setGlobalKeywords([]);
      setCurrentKeyword("");
    }
    onOpenChange(open);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  // IMPORTANT: The dependency array for handleDrop/handleFileSelect must be empty 
  // because we don't want to assign keywords at the time of file selection. 
  // Keywords will be managed globally and attached before the upload starts.
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    addFiles(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addFiles(files)
    e.target.value = ""
  }, [])

  const handleAddKeyword = () => {
    const keyword = currentKeyword.trim();
    if (keyword && !globalKeywords.includes(keyword)) {
      setGlobalKeywords(prev => [...prev, keyword.toLowerCase()]);
      setCurrentKeyword("");
    }
  }

  const handleRemoveKeyword = (keywordToRemove: string) => {
    setGlobalKeywords(prev => prev.filter(k => k !== keywordToRemove));
  }
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddKeyword();
    }
  }

  const addFiles = (files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: "pending",
      errorMessage: undefined,
      keywords: globalKeywords, // Assign current keywords (can be empty)
    }))

    setUploadFiles((prev) => [...prev, ...newUploadFiles])

    // Start upload immediately
    newUploadFiles.forEach((uploadFile) => {
      setTimeout(() => startUpload(uploadFile.id, uploadFile.file, uploadFile.keywords), 100)
    })
  }

  const startUpload = async (fileId: string, file: File, fileKeywords: string[]) => {
    const token = localStorage.getItem("vaultx_access_token")

    if (!token) {
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "error",
                errorMessage: "Authorization token missing. Please log in.",
              }
            : f
        )
      )
      return
    }

    // --- REMOVED KEYWORD CHECK HERE --- 
    // The check is now on the "Done" button to block closing.

    setUploadFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: "uploading", progress: 1 } : f))
    )

    const formData = new FormData()
    formData.append("file", file)
    
    // Pass keywords, even if empty. The backend API will handle the validation.
    // Since the API requires *at least 1* keyword, the upload will likely fail 
    // without one, but the user is blocked from closing until one is added.
    formData.append("keywords", fileKeywords.join(",")); 

    // Temporary progress simulation function...
    const simulateProgress = (currentProgress: number) => {
      if (currentProgress >= 90) return 
      setUploadFiles((prev) =>
        prev.map((f) => (f.id === fileId && f.status === "uploading"
          ? { ...f, progress: Math.min(currentProgress + Math.random() * 5, 90) }
          : f
        ))
      )
    }

    const progressInterval = setInterval(() => {
        setUploadFiles((prev) => {
            const currentFile = prev.find(f => f.id === fileId);
            if (currentFile && currentFile.status === "uploading") {
                simulateProgress(currentFile.progress);
            }
            return prev;
        });
    }, 500);

    try {
        const response = await fetch(`${BASE_URL}/api/v1/files/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });
        
        const responseBody = await response.json().catch(() => ({ detail: "Network/Server error, no JSON response." }));

        clearInterval(progressInterval);

        if (response.ok) {
            setUploadFiles((prev) =>
                prev.map((f) =>
                    f.id === fileId
                        ? { ...f, status: "completed", progress: 100 }
                        : f
                )
            )
            onUploadSuccess?.()
        } else {
            // Handle API error, including the 422 error for missing keywords
            const errorDetail = responseBody?.detail 
                ? (typeof responseBody.detail === 'string' ? responseBody.detail : JSON.stringify(responseBody.detail)) 
                : `Upload failed (Status: ${response.status})`;

            throw new Error(errorDetail);
        }

    } catch (err: any) {
        clearInterval(progressInterval);
        
        let errorMsg = err.message || "Failed to upload file due to an unknown error.";

        if (errorMsg.includes("401")) {
            errorMsg = "Authentication Error. Token is invalid or expired.";
        }
            
        setUploadFiles((prev) =>
            prev.map((f) =>
                f.id === fileId
                    ? {
                        ...f,
                        status: "error",
                        progress: f.progress > 0 ? f.progress : 0, 
                        errorMessage: errorMsg,
                    }
                    : f
            )
        )
    }
  }

  const removeFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  // Helper to check if any successfully uploaded file (or file not in error) 
  // is missing keywords. Since the API requires it, we assume the upload 
  // will error if keywords are missing. But to be safe, we check the global list.
  const hasIncompleteFiles = uploadFiles.some(f => 
      f.status === "uploading" || 
      (f.status !== "completed" && f.status !== "error") ||
      (f.status === "pending" && globalKeywords.length === 0)
  );

  const isAnyFileUploading = uploadFiles.some((f) => f.status === "uploading");
  
  // New check for "Done" button: disabled if any file is uploading OR 
  // if there are uploaded files and NO keywords have been added globally.
  const isDoneButtonDisabled = isAnyFileUploading || (uploadFiles.length > 0 && globalKeywords.length === 0);

  const closeAndClear = () => {
    if (!isDoneButtonDisabled) {
        handleModalClose(false);
    }
  }

  // formatFileSize, getFileIcon, getStatusIndicator functions (same as before)
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    const BaseFileIcon = ({ className, children }: { className: string, children: React.ReactNode }) => (
      <svg className={`w-8 h-8 ${className}`} fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    );

    switch (extension) {
      case "pdf":
        return <BaseFileIcon className="text-red-500"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></BaseFileIcon>
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <BaseFileIcon className="text-purple-500"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" /></BaseFileIcon>
      case "doc":
      case "docx":
        return <BaseFileIcon className="text-blue-500"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></BaseFileIcon>
      case "xls":
      case "xlsx":
        return <BaseFileIcon className="text-green-500"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></BaseFileIcon>
      default:
        return (
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )
    }
  }

  const getStatusIndicator = (status: UploadFile["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
      case "uploading":
        return <span className="w-4 h-4 animate-spin border-2 border-primary border-t-transparent rounded-full shrink-0" />;
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />;
      case "pending":
      default:
        return <UploadCloud className="w-4 h-4 text-muted-foreground shrink-0" />;
    }
  };


  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>File Upload</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto flex flex-col p-1">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-4 shrink-0 ${
              isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <UploadCloud className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground mb-2">
                  {isDragOver ? "Drop files to begin upload" : "Drag files here"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">or</p>
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    Select files
                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                  </label>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Keyword Section */}
          <div className="mb-4 shrink-0">
            <h3 className="text-sm font-medium text-foreground mb-2">Keywords (Required for all files)</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter keyword for file"
                value={currentKeyword}
                onChange={(e) => setCurrentKeyword(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 px-3 py-2 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <Button onClick={handleAddKeyword} disabled={!currentKeyword.trim()}>
                Add
              </Button>
            </div>
            
            {globalKeywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {globalKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center text-xs font-medium bg-secondary text-secondary-foreground rounded-full px-3 py-1"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="ml-1.5 p-0.5 rounded-full hover:bg-secondary/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {uploadFiles.length > 0 && globalKeywords.length === 0 && (
                <p className="text-xs text-red-500 mt-2">
                    Files have been uploaded/are uploading. You must add at least one keyword to finalize and close.
                </p>
            )}

          </div>


          {/* Upload Progress */}
          {uploadFiles.length > 0 && (
            <div className="mt-4 flex-1 overflow-y-auto">
              <h3 className="text-sm font-medium text-foreground mb-3">
                {isAnyFileUploading ? "Uploading" : "Uploads complete"} ({uploadFiles.filter(f => f.status !== 'completed').length} pending/error)
              </h3>
              <div className="space-y-3">
                {uploadFiles.map((uploadFile) => (
                  <div key={uploadFile.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                    {getFileIcon(uploadFile.file.name)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground truncate">{uploadFile.file.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => removeFile(uploadFile.id)}
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                      
                      {uploadFile.status !== "error" ? (
                          <div className="flex items-center space-x-2">
                            <Progress 
                                value={uploadFile.progress} 
                                className={`flex-1 h-2 ${uploadFile.status === "completed" ? "bg-green-500" : ""}`}
                            />
                            <span className="text-xs text-muted-foreground flex items-center space-x-1">
                                {getStatusIndicator(uploadFile.status)}
                                <span>{uploadFile.status === "completed" ? "Complete" : `${Math.round(uploadFile.progress)}%`}</span>
                            </span>
                          </div>
                      ) : (
                          <p className="text-xs text-red-500 flex items-center space-x-1">
                              {getStatusIndicator("error")}
                              <span>Error: {uploadFile.errorMessage || "Upload failed."}</span>
                          </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground mt-1">{formatFileSize(uploadFile.file.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={closeAndClear}>
            {isAnyFileUploading ? "Close and continue uploading" : "Close"}
          </Button>
          <Button 
            onClick={closeAndClear} 
            disabled={isDoneButtonDisabled}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}