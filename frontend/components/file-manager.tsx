"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { FileGrid } from "@/components/file-grid";
import { FileList } from "@/components/file-list";
import { UploadModal } from "@/components/upload-modal";
import { ShareModal } from "@/components/share-modal";
import { DashboardLayout } from "@/components/dashboard-layout";
import { decryptBytesWithAes, decryptStringWithAes } from "@/lib/crypto/aes";
import { getVaultXContext, clearVaultXContext } from "@/lib/crypto/context";
import { api } from "@/lib/api";
import { bufToB64 } from "@/lib/crypto/base";
import { Logs } from "@/components/logs";
import { Recents } from "./recents";
import { Trash } from "./trash";

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

export function FileManager() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState("My Vault");

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
  // Load default file list
  // ============================
  const fetchAllFiles = useCallback(async () => {
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

      const data = await api.get("/files", ctx.accessToken);
      const decryptedFiles = await decryptFiles(data.files || []);
      setFiles(decryptedFiles);
    } catch (err: any) {
      console.error("Error fetching files:", err);
      setError(err.message || "Failed to load files.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [decryptFiles]);

  useEffect(() => {
    if (activeSection === "My Vault") fetchAllFiles();
  }, [fetchAllFiles, activeSection]);

  // ============================
  // Actual encrypted search
  // ============================
  const suppressNextFetch = useRef(false);
  const handleSearch = useCallback(
    async (query: string) => {
      query = (query || "").trim();

      if (activeSection !== "My Vault") {
        suppressNextFetch.current = true;
        setActiveSection("My Vault");
      }

      if (!query) {
        fetchAllFiles();
        return;
      }

      setLoading(true);
      try {
        const ctx = getVaultXContext();
        if (!ctx.accessToken) {
          clearVaultXContext();
          alert("Please log in again.");
          window.location.href = "/";
          return;
        }

        const chainJson = sessionStorage.getItem("vaultx_keyword_chain");
        if (!chainJson)
          throw new Error(
            "No keyword chain found. Try uploading a file first."
          );

        const keywordChains = JSON.parse(chainJson);
        const latestToken = keywordChains[query.trim().toLowerCase()];
        if (!latestToken) {
          setFiles([]);
          setLoading(false);
          return;
        }

        const searchRes = await api.post(
          "/search",
          { token: latestToken },
          ctx.accessToken
        );
        const values: string[] = searchRes.values || [];
        if (values.length === 0) {
          setFiles([]);
          setLoading(false);
          return;
        }

        const searchKey_b64 = sessionStorage.getItem("vaultx_search_key");
        if (!searchKey_b64) throw new Error("Missing search key.");

        const decryptedIds: string[] = [];
        for (const v of values) {
          try {
            const valueObj = typeof v === "string" ? JSON.parse(v) : v;
            if (!valueObj.ciphertext_b64 || !valueObj.iv_b64) continue;
            const id = await decryptStringWithAes(
              valueObj.ciphertext_b64,
              valueObj.iv_b64,
              searchKey_b64
            );
            decryptedIds.push(id);
          } catch (err) {
            console.warn("Failed to decrypt search result:", err);
          }
        }

        const batchRes = await api.post(
          "/files/batch",
          { ids: decryptedIds },
          ctx.accessToken
        );
        const decryptedFiles = await decryptFiles(batchRes.files || []);
        setFiles(decryptedFiles);
      } catch (err: any) {
        console.error("Search failed:", err);
        setError(err.message || "Search failed");
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [decryptFiles, fetchAllFiles, activeSection]
  );

  // ============================
  // Download, Delete, Share
  // ============================
  const handleDownloadFile = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) {
      console.warn("Download: file not found", id);
      return;
    }

    console.log("📥 Download clicked for:", file.name);

    try {
      const ctx = getVaultXContext();
      if (!ctx.accessToken) {
        clearVaultXContext();
        alert("Session expired — please log in again.");
        window.location.href = "/";
        return;
      }

      // 👇 using api helper instead of fetch
      const response = await api.getRaw(
        `/files/${id}/download`,
        ctx.accessToken
      );
      // assuming api.getRaw() returns a native Response or Blob
      // if not, use api.getBlob or equivalent from your helper

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      console.log(`✅ Downloaded: ${file.name}`);
    } catch (err) {
      console.error("Download failed:", err);
      alert(`Failed to download "${file.name}". Check console for details.`);
    }
  };

  const handleDeleteFile = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) {
      console.warn("Delete: file not found", id);
      return;
    }

    const confirmDelete = confirm(
      `🗑️ Are you sure you want to delete "${file.name}"?`
    );
    if (!confirmDelete) return;

    const prevFiles = files;
    setFiles((cur) => cur.filter((f) => f.id !== id));

    try {
      const ctx = getVaultXContext();
      if (!ctx.accessToken) {
        clearVaultXContext();
        alert("Session expired — please log in again.");
        window.location.href = "/";
        return;
      }

      // 👇 clean api call via api.ts
      await api.delete(`/files/${id}`, ctx.accessToken);

      console.log(`✅ Deleted: ${file.name}`);
    } catch (err) {
      console.error("Delete failed:", err);
      setFiles(prevFiles); // rollback optimistic UI
      alert(`Failed to delete "${file.name}". Try again.`);
    }
  };

  const handleShareFile = (id: string) => {
    setShareFileId(id);
    setShareModalOpen(true);
    // todo
  };

  return (
    <DashboardLayout onSearch={handleSearch} onNavigate={setActiveSection}>
      <div className="flex h-[calc(100dvh-4rem)]">
        {/* Sidebar */}
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onNavigate={setActiveSection}
        />

        <div
          className={`flex-1 flex flex-col ${isDragOver ? "bg-primary/5" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            setUploadModalOpen(true);
          }}
        >
          {activeSection === "Logs" ? (
            <Logs />
          ) : activeSection === "Recents" ? (
            <Recents />
          ) : activeSection === "Trash" ? (
            <Trash />
          ) : (
            <>
              <div className="border-b border-border bg-background p-4 flex items-center justify-between">
                <span className="text-lg font-semibold">My Vault</span>
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

              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading files...
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button variant="outline" onClick={fetchAllFiles}>
                      Try Again
                    </Button>
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No files found
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
            </>
          )}

          <UploadModal
            open={uploadModalOpen}
            onOpenChange={setUploadModalOpen}
          />

          <ShareModal
            open={shareModalOpen}
            onOpenChange={setShareModalOpen}
            file={
              shareFileId
                ? files.find((f) => f.id === shareFileId) ?? null
                : null
            }
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
