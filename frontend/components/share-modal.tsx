"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Copy, Check } from "lucide-react"

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

interface ShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FileItem | null
}

interface SharedUser {
  id: string
  email: string
  name: string
  permission: "view" | "edit" | "owner"
  avatar?: string
}

export function ShareModal({ open, onOpenChange, file }: ShareModalProps) {
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState<"view" | "edit">("view")
  const [linkSharing, setLinkSharing] = useState(false)
  const [linkPermission, setLinkPermission] = useState<"view" | "edit">("view")
  const [copied, setCopied] = useState(false)
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([
    {
      id: "1",
      email: "john.doe@example.com",
      name: "John Doe",
      permission: "edit",
    },
    {
      id: "2",
      email: "jane.smith@example.com",
      name: "Jane Smith",
      permission: "view",
    },
  ])

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      const newUser: SharedUser = {
        id: Date.now().toString(),
        email: email.trim(),
        name: email.split("@")[0],
        permission,
      }
      setSharedUsers((prev) => [...prev, newUser])
      setEmail("")
    }
  }

  const handleRemoveUser = (userId: string) => {
    setSharedUsers((prev) => prev.filter((user) => user.id !== userId))
  }

  const handlePermissionChange = (userId: string, newPermission: "view" | "edit") => {
    setSharedUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, permission: newPermission } : user)))
  }

  const handleCopyLink = async () => {
    const shareLink = `https://vaultx.com/share/${file?.id}`
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy link:", err)
    }
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
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
                <Select value={permission} onValueChange={(value: "view" | "edit") => setPermission(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="sm" disabled={!email.trim()}>
                Add
              </Button>
            </form>
          </div>

          {/* Current Shared Users */}
          {sharedUsers.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-foreground mb-3 block">People with access</Label>
              <div className="space-y-3">
                {sharedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {user.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select
                        value={user.permission}
                        onValueChange={(value: "view" | "edit") => handlePermissionChange(user.id, value)}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleRemoveUser(user.id)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Link Sharing */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-foreground">Share with link</Label>
              <Switch checked={linkSharing} onCheckedChange={setLinkSharing} />
            </div>

            {linkSharing && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-2 bg-muted rounded-lg text-sm text-muted-foreground font-mono truncate">
                    https://vaultx.com/share/{file.id}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-shrink-0 bg-transparent">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Label className="text-sm text-muted-foreground">Anyone with the link can:</Label>
                  <Select value={linkPermission} onValueChange={(value: "view" | "edit") => setLinkPermission(value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

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
