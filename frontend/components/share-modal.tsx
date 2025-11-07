"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  fileType?: string
  size: string
  modified: string
  owner: string
  shared: boolean
  shared_with?: string[]
}

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
}

export function ShareModal({ open, onOpenChange, file }: ShareModalProps) {
  const [email, setEmail] = useState("")
  const [sharedUsers, setSharedUsers] = useState<string[]>([])

  // Load existing shared users from metadata
  useEffect(() => {
    if (file?.shared_with && Array.isArray(file.shared_with)) {
      setSharedUsers(file.shared_with)
    } else {
      setSharedUsers([])
    }
  }, [file])

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return
    if (sharedUsers.includes(trimmedEmail)) {
      alert("User already has access.")
      return
    }

    // TODO: Replace with real API call -> POST /files/{file_id}/share
    setSharedUsers((prev) => [...prev, trimmedEmail])
    setEmail("")
  }

  const handleRemoveUser = (userEmail: string) => {
    // TODO: Replace with real API call -> DELETE /files/{file_id}/share/{user_email}
    setSharedUsers((prev) => prev.filter((email) => email !== userEmail))
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
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
            <div>
              <p className="font-medium text-foreground">Share "{file.name}"</p>
              <p className="text-sm text-muted-foreground font-normal">Manage who has access</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Add People */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Add people</Label>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={!email.trim()}>
                  Add
                </Button>
              </div>
            </form>
          </div>

          {/* Current Shared Users */}
          {sharedUsers.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-foreground mb-3 block">
                People with access
              </Label>
              <div className="space-y-3">
                {sharedUsers.map((userEmail, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {userEmail.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {userEmail.split("@")[0]}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRemoveUser(userEmail)}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
