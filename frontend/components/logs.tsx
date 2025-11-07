"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getVaultXContext } from "@/lib/crypto/context";
import { api } from "@/lib/api";

interface AuditLog {
  id: string;
  entry: Record<string, any> | string;
  entry_hash: string;
  prev_hash: string;
  created_at: string;
}

export function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<null | boolean>(null);
  const [verifyErrors, setVerifyErrors] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const ctx = getVaultXContext();
      const data = await api.get("/audit/logs", ctx.accessToken);
      const parsedLogs = (data.logs || []).map((log: any) => ({
        ...log,
        entry:
          typeof log.entry === "string"
            ? JSON.parse(log.entry)
            : log.entry || {},
      }));
      setLogs(parsedLogs);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const verifyAudit = async () => {
    setVerifying(true);
    try {
      const ctx = getVaultXContext();
      const res = await api.get("/audit/verify", ctx.accessToken);
      setVerified(res.valid);
      setVerifyErrors([]);
    } catch (err: any) {
      console.error("Audit verification failed:", err);
      setVerified(false);
      setVerifyErrors(err?.detail?.errors || ["Unknown verification error"]);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    verifyAudit();
  }, []);

  const themeClass =
    verified === null
      ? ""
      : verified
      ? "border-green-600/60 bg-green-50/5"
      : "border-red-600/60 bg-red-50/5";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex items-center justify-between">
        <span className="text-lg font-semibold">Audit Trail</span>
        <Button
          variant="outline"
          size="sm"
          disabled={verifying}
          onClick={verifyAudit}
        >
          {verifying ? "Verifying..." : "Re-verify"}
        </Button>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-6 flex flex-col space-y-6 overflow-auto">
        {loading ? (
          <div className="text-muted-foreground text-sm">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-muted-foreground text-sm">No logs found.</div>
        ) : (
          <div
            className={cn(
              "border border-border rounded-md divide-y divide-border transition-colors",
              themeClass
            )}
          >
            {/* Table Header */}
            <div className="grid grid-cols-5 bg-muted/50 text-sm font-medium text-foreground px-4 py-2">
              <span>ID</span>
              <span>Action</span>
              <span>IP</span>
              <span>User Agent</span>
              <span className="text-right">Timestamp</span>
            </div>

            {/* Table Rows */}
            {logs.map((log) => {
              const entry =
                typeof log.entry === "object"
                  ? log.entry
                  : JSON.parse(log.entry || "{}");

              return (
                <div
                  key={log.id}
                  className="grid grid-cols-5 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                >
                  <span className="truncate">{log.id}</span>
                  <span className="text-primary font-medium truncate">
                    {entry.action || "—"}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {entry.ip || "—"}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {entry.user_agent || "—"}
                  </span>
                  <span className="text-right text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Verification Results */}
        {verified !== null && !verifying && (
          <div
            className={cn(
              "mt-3 p-4 rounded-md border text-sm transition-all",
              verified
                ? "border-green-600/60 text-green-600 bg-green-50/10"
                : "border-red-600/60 text-red-600 bg-red-50/10"
            )}
          >
            {verified ? (
              <p>✅ No integrity issues detected. Your audit chain is valid.</p>
            ) : (
              <>
                <p>⚠️ Tamper verification failed. Possible integrity breaches:</p>
                <div className="mt-2 space-y-1">
                  {verifyErrors.map((err, i) => (
                    <p key={i} className="text-sm text-red-500">
                      • {err}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
