"use client";

import { useAuth } from "@/hooks/useAuth";
import { FileManager } from "@/components/file-manager";

export default function DashboardPage() {
  const { token, loading } = useAuth();

  // if (loading)
  // return <div className="p-10 text-center">Checking session...</div>;

  // if (!token) return null;

  return <FileManager />;
}
