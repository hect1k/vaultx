"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  children: React.ReactNode;
  onSearch?: (query: string) => void;
}

export function DashboardLayout({ children, onSearch }: DashboardLayoutProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const { theme, setTheme } = useTheme();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    inputRef.current?.blur();
    onSearch?.(searchQuery.trim());
    setSearchQuery(searchQuery.trim());
  };

  const clearSearch = () => {
    inputRef.current?.blur();
    setSearchQuery("");
    onSearch?.("");
  };

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("vaultx_user_email");
    if (storedEmail) setEmail(storedEmail);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6 w-full">
          {/* Left Section (Logo) */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5l4-4 4 4"
                />
              </svg>
            </div>
            <span className="text-xl font-semibold text-foreground">
              VaultX
            </span>
          </div>

          <div className="flex-1 max-w-2xl mx-8 flex items-center space-x-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              {/* Search icon */}
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              {/* Input field */}
              <Input
                ref={inputRef}
                placeholder="Search Vault"
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-10 h-10 bg-muted/50 border-border focus:bg-background"
              />

              {/* Clear button (shows only when there’s text) */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 cursor-pointer top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </form>
          </div>

          {/* Right Section (Actions) */}
          <div className="flex items-center space-x-3">
            <p className="text-sm text-muted-foreground">
              Logged in as{" "}
              <span className="font-medium text-foreground">
                {email || "user@example.com"}
              </span>
            </p>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  aria-label="Menu"
                >
                  <svg
                    className="w-5 h-5 text-foreground"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() =>
                    setTheme(theme === "dark" ? "light" : "dark")
                  }
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span>Toggle Theme</span>
                  {theme === "dark" ? (
                    <svg
                      className="h-4 w-4 text-yellow-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = "/";
                  }}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
