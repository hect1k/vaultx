"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Replace with real authentication later
    console.log("Form submitted:", { email, password, isSignUp })
    router.push("/dashboard") // Redirect without any check
  }

  return (
    <Card className="w-full border-border shadow-lg">
      <CardHeader className="space-y-4 text-center">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5l4-4 4 4" />
            </svg>
          </div>
          <span className="text-xl font-semibold text-foreground">Vaultx</span>
        </div>
        <div>
          <CardTitle className="text-2xl font-normal text-foreground">
            {isSignUp ? "Create your account" : "Sign in"}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            {isSignUp ? "to get started with Vaultx" : "to continue to Vaultx"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email or phone
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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 border-border focus:border-primary focus:ring-primary"
              required
            />
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 border-border focus:border-primary focus:ring-primary"
                required
              />
            </div>
          )}

          {!isSignUp && (
            <div className="text-left">
              <Link href="#" className="text-sm text-primary hover:text-primary/80 font-medium">
                Forgot password?
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:text-primary/80 hover:bg-primary/5"
            >
              {isSignUp ? "Sign in instead" : "Create account"}
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
              {isSignUp ? "Create" : "Next"}
            </Button>
          </div>
        </form>

        <div className="text-xs text-muted-foreground leading-relaxed">
          Not your computer? Use a private browsing window to sign in.{" "}
          <Link href="#" className="text-primary hover:text-primary/80">
            Learn more about using Guest mode
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
