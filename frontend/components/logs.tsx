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
      setVerifyErrors(res.errors || []);
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

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col space-y-6 overflow-auto">
        {loading ? (
          <div className="text-muted-foreground text-sm">
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-muted-foreground text-sm">No logs found.</div>
        ) : (
          <>
            {/* Verification Status */}
            {verified !== null && !verifying && (
              <div
                className={cn(
                  "p-4 rounded-md border text-sm transition-all",
                  verified
                    ? "bg-green-500/50"
                    : "bg-red-500/50"
                )}
              >
                {verified ? (
                  <p>No integrity issues detected. Your audit chain is valid.</p>
                ) : (
                  <>
                    <p>Tamper verification failed. Possible integrity breaches:</p>
                    <div className="mt-2 space-y-1">
                      {verifyErrors.map((err, i) => (
                        <p key={i} className="text-sm ml-8">
                          • {err}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Logs Table */}
            <div className="border border-border rounded-md divide-y divide-border transition-colors">
              {/* Table Header */}
              <div className="grid grid-cols-4 bg-muted/50 text-sm font-medium text-foreground px-4 py-2">
                <span>Action</span>
                <span>IP Address</span>
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
                    className="grid grid-cols-4 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-primary font-medium truncate">
                      {entry.action || "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {entry.ip || "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {entry.user_agent || "—"}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
