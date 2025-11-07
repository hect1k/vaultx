"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, CheckCircle, UploadCloud, AlertTriangle } from "lucide-react";
import { aesEncryptArrayBuffer, encryptStringWithAes } from "@/lib/crypto/aes";
import { generateFileKey } from "@/lib/crypto/keys";
import { bufToB64, genRandomBytes } from "@/lib/crypto/base";
import { api } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";
import { clearVaultXContext } from "@/lib/crypto/context";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  errorMessage?: string;
}

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [globalKeywords, setGlobalKeywords] = useState<string[]>([]);
  const [currentKeyword, setCurrentKeyword] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const resetModal = () => {
    setUploadFiles([]);
    setGlobalKeywords([]);
    setCurrentKeyword("");
    setIsUploading(false);
  };

  const closeModal = (openState: boolean) => {
    if (!openState && !isUploading) resetModal();
    onOpenChange(openState);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };

  const addFiles = (files: File[]) => {
    const newFiles = files.map((file) => ({
      id: uuidv4(),
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setUploadFiles((prev) => [...prev, ...newFiles]);
  };

  const handleAddKeyword = () => {
    const k = currentKeyword.trim().toLowerCase();
    if (k && !globalKeywords.includes(k)) {
      setGlobalKeywords((prev) => [...prev, k]);
      setCurrentKeyword("");
    }
  };

  const handleRemoveKeyword = (kw: string) =>
    setGlobalKeywords((prev) => prev.filter((k) => k !== kw));

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleDone = async () => {
    if (uploadFiles.length === 0 || globalKeywords.length === 0) return;

    const token = localStorage.getItem("vaultx_access_token");
    const masterKey_b64 = sessionStorage.getItem("vaultx_master_key");
    if (!token || !masterKey_b64) {
      alert("Missing keys or token. Please log in again.");
      return;
    }

    setIsUploading(true);
    try {
      const keywordChains: Record<string, string> = JSON.parse(
        sessionStorage.getItem("vaultx_keyword_chain") || "{}"
      );

      const masterKeyBytes = Uint8Array.from(atob(masterKey_b64), (c) => c.charCodeAt(0));
      const masterKey = await crypto.subtle.importKey(
        "raw",
        masterKeyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );

      for (const item of uploadFiles) {
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "uploading", progress: 1 } : f
          )
        );

        const fileKey_b64 = await generateFileKey();
        const fileKeyBytes = Uint8Array.from(atob(fileKey_b64), (c) => c.charCodeAt(0));
        const fileKey = await crypto.subtle.importKey(
          "raw",
          fileKeyBytes,
          { name: "AES-GCM" },
          false,
          ["encrypt"]
        );

        const fileBuffer = await item.file.arrayBuffer();
        const fileEnc = await aesEncryptArrayBuffer(fileBuffer, fileKey);

        const metadata = JSON.stringify({
          name: item.file.name,
          size: item.file.size,
          type: item.file.type,
          keywords: globalKeywords,
        });
        const metadataEnc = await aesEncryptArrayBuffer(
          new TextEncoder().encode(metadata).buffer,
          fileKey
        );

        const kfEnc = await aesEncryptArrayBuffer(fileKeyBytes.buffer, masterKey);

        const searchKey_b64 = sessionStorage.getItem("vaultx_search_key");
        if (!searchKey_b64) {
          alert("Missing search key. Please log in again.");
          clearVaultXContext();
          window.location.href = "/";
          return;
        }
        const encFileId = await encryptStringWithAes(item.id, searchKey_b64);

        const tokens = globalKeywords.map((kw) => {
          const tokenBytes = genRandomBytes(16);
          const prev_token = keywordChains[kw] || null;
          const obj = {
            token: bufToB64(tokenBytes.buffer),
            value: {
              ciphertext_b64: encFileId.ciphertext_b64,
              iv_b64: encFileId.iv_b64,
            },
            prev_token,
          };
          keywordChains[kw] = obj.token;
          return obj;
        });

        const tokens_json = JSON.stringify(tokens);

        const fileCtBytes = Uint8Array.from(
          atob(fileEnc.ciphertext_b64),
          (c) => c.charCodeAt(0)
        );

        const formData = new FormData();
        formData.append("file_id", item.id);
        formData.append("metadata_ciphertext", metadataEnc.ciphertext_b64);
        formData.append("metadata_iv", metadataEnc.iv_b64);
        formData.append("encrypted_kf_b64", kfEnc.ciphertext_b64);
        formData.append("encrypted_kf_iv", kfEnc.iv_b64);
        formData.append("file_iv", fileEnc.iv_b64);
        formData.append("tokens_json", tokens_json);
        formData.append("file", new Blob([fileCtBytes.buffer]));

        await api.post("/files/upload", formData, token, false);

        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "completed", progress: 100 } : f
          )
        );
      }

      const chainJson = JSON.stringify(keywordChains);
      const encChain = await encryptStringWithAes(chainJson, masterKey_b64);
      await api.post(
        "/user/index_state",
        {
          index_state_ciphertext: encChain.ciphertext_b64,
          index_state_iv: encChain.iv_b64,
        },
        token
      );
      sessionStorage.setItem("vaultx_keyword_chain", JSON.stringify(keywordChains));

      window.location.reload();
    } catch (err: any) {
      setUploadFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: "error",
          errorMessage: err?.message || "Upload failed",
        }))
      );
      alert(err?.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (id: string) =>
    setUploadFiles((prev) => prev.filter((f) => f.id !== id));

  const icon = (s: UploadFile["status"]) =>
    s === "completed" ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : s === "uploading" ? (
      <span className="w-4 h-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
    ) : s === "error" ? (
      <AlertTriangle className="w-4 h-4 text-red-500" />
    ) : (
      <UploadCloud className="w-4 h-4 text-muted-foreground" />
    );

  const formatSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(2)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto p-4 border-dashed border-2 rounded-lg mb-4 text-center"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <UploadCloud className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm mb-2">Drag files here or</p>
          <Button variant="outline" asChild>
            <label className="cursor-pointer">
              Select files
              <input type="file" multiple className="hidden" onChange={handleFileSelect} />
            </label>
          </Button>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Keywords</h3>
          <div className="flex space-x-2 mb-2">
            <input
              value={currentKeyword}
              onChange={(e) => setCurrentKeyword(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Add keyword"
              className="flex-1 border rounded px-2 py-1 text-sm"
            />
            <Button onClick={handleAddKeyword} disabled={!currentKeyword.trim()}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {globalKeywords.map((kw) => (
              <span
                key={kw}
                className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full flex items-center"
              >
                {kw}
                <button
                  onClick={() => handleRemoveKeyword(kw)}
                  className="ml-1.5 hover:bg-secondary/80 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {uploadFiles.length > 0 && (
          <div className="space-y-3 overflow-y-auto flex-1">
            {uploadFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
                <div className="flex-1 truncate text-sm">
                  <p className="font-medium truncate">{f.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(f.file.size)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {icon(f.status)}
                  <Progress value={f.progress} className="w-24 h-2" />
                  <Button variant="ghost" size="sm" onClick={() => removeFile(f.id)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => closeModal(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleDone}
            disabled={isUploading || uploadFiles.length === 0 || globalKeywords.length === 0}
          >
            {isUploading ? "Uploading..." : "Done"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
