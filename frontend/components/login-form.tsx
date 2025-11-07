"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import Link from "next/link"
import { api } from "@/lib/api"
import { deriveMasterKey } from "@/lib/crypto/keys"
import { aesDecryptArrayBuffer, decryptStringWithAes } from "@/lib/crypto/aes"
import { prepareUserKeyBundle } from "@/lib/crypto/setupUserKeys"

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === "register") {
        if (password !== confirmPassword) {
          alert("Passwords do not match.")
          setLoading(false)
          return
        }

        // 1. Prepare the full encrypted key bundle
        const bundle = await prepareUserKeyBundle(password)

        const payload = {
          email,
          password,
          ...bundle,
        }

        // 2. Register user with encrypted key data
        const res = await api.post("/auth/register", payload)

        const data = res.data || res
        const accessToken = data.access_token
        const keys = data.keys

        if (!accessToken) throw new Error("No access token returned")

        // 1. Derive password-based key
        const { key: pwKey } = await deriveMasterKey(password, keys.password_salt_b64)

        // 2. Decrypt master key
        const masterRaw = await aesDecryptArrayBuffer(
          keys.enc_master_key_b64,
          keys.enc_master_key_iv,
          pwKey
        )
        const masterKey_b64 = btoa(String.fromCharCode(...new Uint8Array(masterRaw)))

        // 3. Decrypt search key
        const searchRaw = await aesDecryptArrayBuffer(
          keys.enc_search_key_b64,
          keys.enc_search_key_iv,
          pwKey
        )
        const searchKey_b64 = btoa(String.fromCharCode(...new Uint8Array(searchRaw)))

        // 4. Decrypt private RSA key
        const privRaw = await aesDecryptArrayBuffer(
          keys.enc_private_key_b64,
          keys.enc_private_key_iv,
          pwKey
        )
        const privateKey_b64 = btoa(String.fromCharCode(...new Uint8Array(privRaw)))

        localStorage.setItem("vaultx_access_token", accessToken)
        sessionStorage.setItem("vaultx_master_key", masterKey_b64)
        sessionStorage.setItem("vaultx_search_key", searchKey_b64)
        sessionStorage.setItem("vaultx_private_key", privateKey_b64)
        sessionStorage.setItem("vaultx_public_key", keys.public_key_b64)

        const chainData = await api.get("/user/index_state", accessToken);
        if (chainData?.index_state_ciphertext) {
          const chainJson = await decryptStringWithAes(
            chainData.index_state_ciphertext,
            chainData.index_state_iv,
            masterKey_b64
          );
          sessionStorage.setItem("vaultx_keyword_chain", chainJson);
        }

        router.push("/dashboard")
      } else {
        // LOGIN
        const res = await api.post("/auth/login", { email, password })
        const data = res.data || res
        const accessToken = data.access_token
        const keys = data.keys

        if (!accessToken || !keys) throw new Error("Invalid login response")

        // 1. Derive password-based key
        const { key: pwKey } = await deriveMasterKey(password, keys.password_salt_b64)

        // 2. Decrypt master key
        const masterRaw = await aesDecryptArrayBuffer(
          keys.enc_master_key_b64,
          keys.enc_master_key_iv,
          pwKey
        )
        const masterKey_b64 = btoa(String.fromCharCode(...new Uint8Array(masterRaw)))

        // 3. Decrypt search key
        const searchRaw = await aesDecryptArrayBuffer(
          keys.enc_search_key_b64,
          keys.enc_search_key_iv,
          pwKey
        )
        const searchKey_b64 = btoa(String.fromCharCode(...new Uint8Array(searchRaw)))

        // 4. Decrypt private RSA key
        const privRaw = await aesDecryptArrayBuffer(
          keys.enc_private_key_b64,
          keys.enc_private_key_iv,
          pwKey
        )
        const privateKey_b64 = btoa(String.fromCharCode(...new Uint8Array(privRaw)))

        localStorage.setItem("vaultx_access_token", accessToken)
        sessionStorage.setItem("vaultx_master_key", masterKey_b64)
        sessionStorage.setItem("vaultx_search_key", searchKey_b64)
        sessionStorage.setItem("vaultx_private_key", privateKey_b64)
        sessionStorage.setItem("vaultx_public_key", keys.public_key_b64)

        const chainData = await api.get("/user/index_state", accessToken);
        if (chainData?.index_state_ciphertext) {
          const chainJson = await decryptStringWithAes(
            chainData.index_state_ciphertext,
            chainData.index_state_iv,
            masterKey_b64
          );
          sessionStorage.setItem("vaultx_keyword_chain", chainJson);
        }

        router.push("/dashboard")
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      )
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
          <span className="text-xl font-semibold text-foreground">VaultX</span>
        </div>
        <div>
          <CardTitle className="text-2xl font-normal text-foreground">
            {mode === "login" ? "Sign in" : "Create account"}
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            {mode === "login"
              ? "Welcome back! Enter your credentials to continue."
              : "Join VaultX — secure your data, your way."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium text-foreground">
                Confirm Password
              </Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 border-border focus:border-primary focus:ring-primary"
                required
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white h-12"
          >
            {loading
              ? mode === "login"
                ? "Signing in..."
                : "Registering..."
              : mode === "login"
                ? "Sign In"
                : "Register"}
          </Button>
        </form>

        <div className="text-sm text-center text-muted-foreground">
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:text-primary/80 font-medium"
              >
                Login
              </button>
            </>
          )}
        </div>

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
