"use client";

import { Button } from "@/components/ui/button";
import { UploadModal } from "@/components/upload-modal";
import { useState } from "react";

interface SidebarProps {
  onNavigate?: (section: string) => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("My Vault");

  const sidebarItems = [
    { icon: "drive", label: "My Vault" },
    { icon: "logs", label: "Logs" },
    { icon: "recent", label: "Recents" },
    { icon: "trash", label: "Trash" },
  ];

  const handleNavigation = (section: string) => {
    setActiveSection(section);
    onNavigate?.(section);
  };

  return (
    <div className="w-64 border-r border-border bg-sidebar p-4 flex flex-col">
      <Button
        className="w-full mb-6 bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={() => setUploadModalOpen(true)}
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Upload File
      </Button>

      <nav className="space-y-1 flex-1">
        {sidebarItems.map((item) => (
          <Button
            key={item.label}
            variant={activeSection === item.label ? "secondary" : "ghost"}
            className="w-full justify-start h-10"
            onClick={() => handleNavigation(item.label)}
          >
            <SidebarIcon type={item.icon} className="w-5 h-5 mr-3" />
            {item.label}
          </Button>
        ))}
      </nav>

      <UploadModal open={uploadModalOpen} onOpenChange={setUploadModalOpen} />
    </div>
  );
}

function SidebarIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const icons = {
    drive: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
      />
    ),
    logs: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4h16v16H4V4zm4 4h8m-8 4h8m-8 4h5"
      />
    ),
    recent: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    trash: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    ),
  };

  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {icons[type as keyof typeof icons]}
    </svg>
  );
}
