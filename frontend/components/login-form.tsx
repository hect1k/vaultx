"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { api } from "@/lib/api"

export function LoginForm() {
  const [step, setStep] = useState<"email" | "token">("email")
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Step 1: Request login token
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await api.post("/auth/request", { email })
      console.log("Email request response:", res)
      alert("Login token sent to your email!")
      setStep("token")
    } catch (err) {
      console.error("Error requesting token:", err)
      alert("Failed to send token. Check backend or email address.")
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Consume token for access
  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Send both email and token
      const res = await api.post("/auth/consume", { email, token })
      console.log("Consume response:", res)

      const accessToken = res.access_token || res.data?.access_token
      if (!accessToken) throw new Error("No access token returned")

      localStorage.setItem("vaultx_access_token", accessToken)
      alert("Login successful!")
      router.push("/dashboard")
    } catch (err) {
      console.error("Error consuming token:", err)
      alert("Invalid or expired token.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full border-border shadow-lg max-w-md mx-auto">
      <CardHeader className="space-y-4 text-center">
        <div className="flex items-center justify-center space-x-2">
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
          <span className="text-xl font-semibold text-foreground">Vaultx</span>
        </div>
        <div>
          <CardTitle className="text-2xl font-normal text-foreground">
            {step === "email" ? "Sign in" : "Enter token"}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            {step === "email"
              ? "Enter your email to receive a login token"
              : "Check your inbox and paste the token here"}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 border-border focus:border-primary focus:ring-primary"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white h-12"
            >
              {loading ? "Sending..." : "Send Token"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-sm font-medium text-foreground">
                Token
              </Label>
              <Input
                id="token"
                type="text"
                placeholder="Enter the token you received"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="h-12 border-border focus:border-primary focus:ring-primary"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white h-12"
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("email")}
              className="w-full text-primary hover:bg-primary/5 mt-2"
            >
              Back to Email
            </Button>
          </form>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Having trouble?{" "}
          <Link href="#" className="text-primary hover:text-primary/80">
            Contact support
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
