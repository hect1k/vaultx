"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { decryptBytesWithAes, decryptStringWithAes } from "@/lib/crypto/aes";
import { getVaultXContext, clearVaultXContext } from "@/lib/crypto/context";
import { api } from "@/lib/api";
import { bufToB64 } from "@/lib/crypto/base";
import { RefreshCw, RotateCcw } from "lucide-react";

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
}

export function Trash() {
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
          shared_with: f.shared_with,
        });
      } catch (err) {
        console.warn("Failed to decrypt metadata for file:", f.id, err);
      }
    }

    return decryptedFiles;
  }, []);

  // ============================
  // Fetch trashed files (temporary using /files)
  // ============================
  const fetchTrash = useCallback(async () => {
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

      const data = await api.get("/files/deleted", ctx.accessToken);
      const decryptedFiles = await decryptFiles(data.files || []);
      setFiles(decryptedFiles);
    } catch (err: any) {
      console.error("Error fetching trash:", err);
      setError(err.message || "Failed to load trash.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [decryptFiles]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // ============================
  // Restore file handler
  // ============================
  const handleRestore = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;

    try {
      const ctx = getVaultXContext();
      if (!ctx.accessToken) {
        clearVaultXContext();
        alert("Session expired — please log in again.");
        window.location.href = "/";
        return;
      }

      await api.post(`/files/${id}/restore`, {}, ctx.accessToken);
      alert(`Restored "${file.name}" successfully.`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Restore failed:", err);
      alert(`Failed to restore "${file.name}". Try again.`);
    }
  };

  // ============================
  // UI
  // ============================
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex items-center justify-between">
        <span className="text-lg font-semibold">Trash</span>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTrash}
          className="flex items-center space-x-1"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-muted/10">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading trash...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-500 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchTrash}>
              Try Again
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No deleted files found
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between bg-muted/40 hover:bg-muted/60 transition-colors border border-border rounded-lg p-3"
              >
                <div className="flex flex-col w-[60%] truncate">
                  <span className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {file.size} • {file.modified}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(file.id)}
                    className="bg-green-500/50 dark:bg-green-500/25 hover:bg-green-500 dark:hover:bg-green-500/50"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
