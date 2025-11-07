import { clearVaultXContext } from "./crypto/context";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  post: async (endpoint: string, data?: any, token?: string, json = true) => {
    const headers: any = token ? { Authorization: `Bearer ${token}` } : {};
    if (json) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: json ? JSON.stringify(data) : data,
    });

    const data_ = await res.json();

    if (res.status === 401 && data_.detail == "Invalid or expired token") {
      clearVaultXContext();
      alert("Please log in again.");
      window.location.href = "/";
    }

    if (!res.ok) throw new Error(data_.detail || "Something went wrong.");
    return data_;
  },

  get: async (endpoint: string, token?: string) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data_ = await res.json();

    if (!res.ok) throw new Error(data_.detail || "Something went wrong.");
    return data_;
  },
};
