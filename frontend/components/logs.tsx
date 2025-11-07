"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
// import { getVaultXContext } from "@/lib/crypto/context";
// import { api } from "@/lib/api";

interface LogEntry {
  id: string;
  action: string;
  timestamp: string;
  fileName: string;
}

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // const fetchLogs = async () => {
  //   setLoading(true);
  //   try {
  //     const ctx = getVaultXContext();
  //     const data = await api.get("/logs", ctx.accessToken);
  //     setLogs(data.logs || []);
  //   } catch (err) {
  //     console.error("Error fetching logs:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // todo

  useEffect(() => {
    // dummy data for UI testing
    setTimeout(() => {
      setLogs([
        {
          id: "1",
          action: "Uploaded",
          fileName: "confidential_report.pdf",
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: "2",
          action: "Shared",
          fileName: "financials_q4.xlsx",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: "3",
          action: "Downloaded",
          fileName: "project_brief.txt",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header — consistent with My Vault */}
      <div className="border-b border-border bg-background p-4 flex items-center justify-between">
        <span className="text-lg font-semibold">Activity Logs</span>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-6 flex flex-col space-y-6 overflow-auto">
        {loading ? (
          <div className="text-muted-foreground text-sm">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-muted-foreground text-sm">No logs found.</div>
        ) : (
          <div className="border border-border rounded-md divide-y divide-border">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-muted/50 text-sm font-medium text-foreground px-4 py-2">
              <span>File Name</span>
              <span>Action</span>
              <span className="text-right">Timestamp</span>
            </div>

            {/* Table Rows */}
            {logs.map((log) => (
              <div
                key={log.id}
                className="grid grid-cols-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
              >
                <span className="truncate">{log.fileName}</span>
                <span className="text-primary font-medium">{log.action}</span>
                <span className="text-right text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
