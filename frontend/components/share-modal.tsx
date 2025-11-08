"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getVaultXContext } from "@/lib/crypto/context"
import { api } from "@/lib/api"

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

  useEffect(() => {
    if (file?.shared_with && Array.isArray(file.shared_with)) {
      setSharedUsers(file.shared_with)
    } else {
      setSharedUsers([])
    }
  }, [file])

  if (!file) return null

  function pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem.replace(/-----.*-----/g, "").replace(/\s+/g, "")
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  }


  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return
    if (sharedUsers.includes(trimmedEmail)) {
      alert("User already has access.")
      return
    }

    try {
      const ctx = getVaultXContext()
      if (!ctx.accessToken) throw new Error("Not logged in")

      const { public_key_pem } = await api.get(`/auth/public-key/${trimmedEmail}`, ctx.accessToken)
      const pubKey = await window.crypto.subtle.importKey(
        "spki",
        pemToArrayBuffer(public_key_pem),
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
      )

      const fileKey_b64 = sessionStorage.getItem(`vaultx_kf_${file.id}`)
      if (!fileKey_b64) throw new Error("Missing file encryption key (Kf)")

      const fileKeyBytes = Uint8Array.from(atob(fileKey_b64), (c) => c.charCodeAt(0))

      const wrappedKey = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        pubKey,
        fileKeyBytes
      )
      const wrappedKey_b64 = btoa(String.fromCharCode(...new Uint8Array(wrappedKey)))

      await api.post(
        "/shares",
        {
          file_id: file.id,
          recipient_email: trimmedEmail,
          wrapped_key_b64: wrappedKey_b64,
          permissions: "read",
        },
        ctx.accessToken
      )

      setSharedUsers((prev) => [...prev, trimmedEmail])
      setEmail("")
      alert(`File shared with ${trimmedEmail}`)
    } catch (err: any) {
      console.error("Share failed:", err)
      alert(err.message || "Failed to share file.")
    }
  }

  const handleRemoveUser = async (userEmail: string) => {
    const confirmRemove = confirm(`Are you sure you want to revoke sharing to ${userEmail}?`)
    if (!confirmRemove) return

    try {
      const ctx = getVaultXContext()
      if (!ctx.accessToken) throw new Error("Not logged in")

      await api.post(
        "/shares/revoke",
        { file_id: file.id, recipient_email: userEmail },
        ctx.accessToken
      )

      setSharedUsers((prev) => prev.filter((email) => email !== userEmail))
      alert(`Access revoked for ${userEmail}`)
    } catch (err: any) {
      console.error("Revoke failed:", err)
      alert(err.message || "Failed to revoke access.")
    }
  }


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
          <Button onClick={() => window.location.reload()}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
