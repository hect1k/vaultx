"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { decryptBytesWithAes, decryptStringWithAes } from "@/lib/crypto/aes";
import { getVaultXContext, clearVaultXContext } from "@/lib/crypto/context";
import { api } from "@/lib/api";
import { bufToB64 } from "@/lib/crypto/base";
import { FileGrid } from "@/components/file-grid";
import { FileList } from "@/components/file-list";

interface FileItem {
  id: string;
  name: string;
  type: "file";
  fileType?: string;
  size: string;
  modified: string;
  owner: string;
  shared: boolean;
}

export function Recents() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================
  // Helper: decrypt and map files
  // ============================
  const decryptFiles = useCallback(async (filesRaw: any[]) => {
    const masterKey_b64 = sessionStorage.getItem("vaultx_master_key");
    if (!masterKey_b64)
      throw new Error("Missing master key — please log in again.");

    const decryptedFiles: FileItem[] = [];
    for (const f of filesRaw) {
      try {
        if (!f.encrypted_kf_b64 || !f.encrypted_kf_iv) continue;

        const kf_bytes = await decryptBytesWithAes(
          f.encrypted_kf_b64,
          f.encrypted_kf_iv,
          masterKey_b64
        );
        const kf_b64 = bufToB64(kf_bytes.buffer);
        sessionStorage.setItem(`vaultx_kf_${f.id}`, kf_b64);

        const metadataJson = await decryptStringWithAes(
          f.metadata_ciphertext,
          f.metadata_iv,
          kf_b64
        );
        const meta = JSON.parse(metadataJson);

        decryptedFiles.push({
          id: f.id,
          name: meta.name || "Untitled",
          type: "file",
          fileType: meta.type || "unknown",
          size: meta.size ? `${(meta.size / 1024).toFixed(2)} KB` : "—",
          modified: new Date(f.created_at).toLocaleString(),
          owner: f.owner_email || "You",
          shared: (f.shared_with || []).length > 0,
        });
      } catch (err) {
        console.warn("Failed to decrypt metadata for file:", f.id, err);
      }
    }

    return decryptedFiles;
  }, []);

  // ============================
  // Fetch recent files
  // ============================
  const fetchRecents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const ctx = getVaultXContext();
      if (!ctx.accessToken) {
        clearVaultXContext();
        alert("Please log in again.");
        window.location.href = "/";
        return;
      }

      // 👇 Change this endpoint to `/files/recents` later
      const data = await api.get("/files", ctx.accessToken);
      const decryptedFiles = await decryptFiles(data.files || []);
      setFiles(decryptedFiles);
    } catch (err: any) {
      console.error("Error fetching recents:", err);
      setError(err.message || "Failed to load recents.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [decryptFiles]);

  useEffect(() => {
    fetchRecents();
  }, [fetchRecents]);

  // ============================
  // Dummy Handlers (for dropdown actions)
  // ============================
  const handleDownloadFile = (id: string) => {
    console.log("📥 Download clicked for:", id);
  };

  const handleShareFile = (id: string) => {
    console.log("🔗 Share clicked for:", id);
  };

  const handleDeleteFile = (id: string) => {
    console.log("🗑️ Delete clicked for:", id);
  };

  // ============================
  // UI
  // ============================
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex items-center justify-between">
        <span className="text-lg font-semibold">Recents</span>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading recent files...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchRecents}>
              Try Again
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No recent files found
          </div>
        ) : viewMode === "grid" ? (
          <FileGrid
            files={files}
            onDownloadFile={handleDownloadFile}
            onShareFile={handleShareFile}
            onDeleteFile={handleDeleteFile}
          />
        ) : (
          <FileList
            files={files}
            onDownloadFile={handleDownloadFile}
            onShareFile={handleShareFile}
            onDeleteFile={handleDeleteFile}
          />
        )}
      </div>
    </div>
  );
}
