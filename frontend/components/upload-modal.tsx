"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, UploadCloud, AlertTriangle } from "lucide-react";
import { aesEncryptArrayBuffer, encryptStringWithAes } from "@/lib/crypto/aes";
import { generateFileKey } from "@/lib/crypto/keys";
import { bufToB64, genRandomBytes } from "@/lib/crypto/base";
import { api } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";
import { clearVaultXContext } from "@/lib/crypto/context";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  errorMessage?: string;
  selectedKeywords?: string[];
  autoKeywords?: string[];
}

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: () => void;
}

async function extractKeywordsFromFile(file: File): Promise<string[]> {
  const nameKeywords = file.name
    .replace(/\.[^/.]+$/, "")
    .split(/[\s\-_]+/)
    .map((k) => k.toLowerCase())
    .filter((k) => k.length > 2);

  const typeKeywords = getTypeKeywords(file.type, file.name);
  const contentText = await readFileContent(file);
  const contentKeywords = getTopKeywords(contentText, 4);

  const combined = new Set([...nameKeywords, ...typeKeywords, ...contentKeywords]);
  return Array.from(combined).slice(0, 6);
}

function getTypeKeywords(type: string, name: string): string[] {
  const lower = name.toLowerCase();
  if (type.startsWith("text/")) return ["text", "document"];
  if (type.startsWith("image/")) return ["image", "photo"];
  if (type.startsWith("video/")) return ["video", "media"];
  if (type === "application/pdf" || lower.endsWith(".pdf")) return ["pdf", "document"];
  if (lower.endsWith(".docx")) return ["word", "document"];
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return ["excel", "spreadsheet"];
  if (lower.endsWith(".csv")) return ["csv", "data"];
  if (lower.endsWith(".pptx")) return ["presentation", "slides"];
  if (lower.endsWith(".zip") || lower.endsWith(".tar") || lower.endsWith(".gz")) return ["archive"];
  return [];
}

async function readFileContent(file: File): Promise<string> {
  const lower = file.name.toLowerCase();

  try {
    if (file.type.startsWith("text/") || lower.endsWith(".json") || lower.endsWith(".csv")) {
      return await file.text();
    }

    // PDF files
    if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
      const pdfjsLib = await import("pdfjs-dist/webpack");
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs";

      const pdf = await (pdfjsLib as any)
        .getDocument({ data: await file.arrayBuffer() })
        .promise;

      let text = "";
      const maxPages = Math.min(pdf.numPages, 3);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((i: any) => i.str).join(" ");
      }
      return text;
    }

    // DOCX
    if (lower.endsWith(".docx")) {
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value || "";
    }

    // Excel
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const text = workbook.SheetNames.map(
        (sheet) => XLSX.utils.sheet_to_csv(workbook.Sheets[sheet])
      ).join(" ");
      return text;
    }

    return ""; // unsupported format
  } catch {
    return "";
  }
}

function getTopKeywords(text: string, max: number): string[] {
  if (!text) return [];
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  const stopWords = new Set([
    "this", "that", "from", "with", "have", "were", "there", "their", "which", "about",
    "would", "could", "your", "when", "where", "what", "will", "then", "them", "they",
    "been", "into", "some", "more", "than", "just", "also", "very", "and", "for", "not",
    "are", "was", "the", "you", "but", "all", "can"
  ]);

  return Object.entries(freq)
    .filter(([w]) => !stopWords.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newFiles = await Promise.all(
      files.map(async (file) => {
        const autoKeywords = await extractKeywordsFromFile(file);
        return {
          id: crypto.randomUUID(),
          file,
          autoKeywords,
          selectedKeywords: [...autoKeywords],
          status: "pending",
          progress: 0,
        };
      })
    );

    setUploadFiles((prev) => [...prev, ...newFiles]);
  }

  function handleToggleKeyword(fileId: string, kw: string) {
    setUploadFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        const exists = f.selectedKeywords?.includes(kw);
        const updated = exists
          ? f.selectedKeywords?.filter((k) => k !== kw)
          : [...(f.selectedKeywords || []), kw];
        return { ...f, selectedKeywords: updated };
      })
    );
  }


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

  const inferKeywordsFromType = (type: string): string[] => {
    if (!type) return [];

    const [category, extension] = type.split("/");
    const result = new Set<string>();

    if (category) result.add(category.toLowerCase());
    if (extension) result.add(extension.toLowerCase());

    if (category === "image") result.add("photo");
    if (category === "video") result.add("media");
    if (category === "application") {
      if (extension.includes("pdf")) result.add("pdf");
      if (extension.includes("zip")) result.add("archive");
    }

    return Array.from(result);
  };

  const handleDone = async () => {
    if (uploadFiles.length === 0) return;

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

      const masterKeyBytes = Uint8Array.from(atob(masterKey_b64), (c) =>
        c.charCodeAt(0)
      );
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
        const fileKeyBytes = Uint8Array.from(atob(fileKey_b64), (c) =>
          c.charCodeAt(0)
        );
        const fileKey = await crypto.subtle.importKey(
          "raw",
          fileKeyBytes,
          { name: "AES-GCM" },
          false,
          ["encrypt"]
        );

        const fileBuffer = await item.file.arrayBuffer();
        const fileEnc = await aesEncryptArrayBuffer(fileBuffer, fileKey);

        const allKeywords = [
          ...new Set([
            ...globalKeywords,
            ...(item.selectedKeywords?.length
              ? item.selectedKeywords
              : item.autoKeywords || []),
          ]),
        ];

        const metadata = JSON.stringify({
          name: item.file.name,
          size: item.file.size,
          type: item.file.type,
          keywords: allKeywords,
        });

        const metadataEnc = await aesEncryptArrayBuffer(
          new TextEncoder().encode(metadata).buffer,
          fileKey
        );

        const kfEnc = await aesEncryptArrayBuffer(
          fileKeyBytes.buffer,
          masterKey
        );

        const searchKey_b64 = sessionStorage.getItem("vaultx_search_key");
        if (!searchKey_b64) {
          alert("Missing search key. Please log in again.");
          clearVaultXContext();
          window.location.href = "/";
          return;
        }
        const encFileId = await encryptStringWithAes(item.id, searchKey_b64);

        const tokens = allKeywords.map((kw) => {
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
        const fileCtBytes = Uint8Array.from(atob(fileEnc.ciphertext_b64), (c) =>
          c.charCodeAt(0)
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
      sessionStorage.setItem(
        "vaultx_keyword_chain",
        JSON.stringify(keywordChains)
      );

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
    b < 1024
      ? `${b} B`
      : b < 1024 * 1024
        ? `${(b / 1024).toFixed(2)} KB`
        : b < 1024 * 1024 * 1024
          ? `${(b / 1024 / 1024).toFixed(2)} MB`
          : `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;

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
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
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
            <Button
              onClick={handleAddKeyword}
              disabled={!currentKeyword.trim()}
            >
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
                  className="ml-1.5 hover:bg-secondary/80 cursor-pointer rounded-full p-0.5"
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
              <div
                key={f.id}
                className="flex justify-between bg-muted/50 p-3 rounded-md"
              >
                <div className="flex-1 truncate text-sm">
                  <p className="font-medium truncate">{f.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(f.file.size)}</p>

                  <div className="flex flex-col space-x-2 mt-2">
                    <span className="text-xs text-muted-foreground">Suggested Keywords (click to remove/toggle):</span>
                    {f.autoKeywords?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {f.autoKeywords?.map((kw) => {
                          const selected = f.selectedKeywords?.includes(kw);
                          return (
                            <span
                              key={kw}
                              onClick={() => handleToggleKeyword(f.id, kw)}
                              className={`cursor-pointer px-2 py-1 rounded text-sm ${selected ? "bg-white/80 text-black" : "bg-secondary"
                                }`}
                            >
                              {kw}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <Button variant="ghost" size="sm" onClick={() => removeFile(f.id)} className="hover:bg-red-500/50 dark:hover:bg-red-500/50 cursor-pointer">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => closeModal(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDone}
            disabled={isUploading || uploadFiles.length === 0}
          >
            {isUploading ? "Uploading..." : "Done"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
