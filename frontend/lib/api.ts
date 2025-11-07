import { clearVaultXContext } from "./crypto/context";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export const api = {
  post: async (endpoint: string, data?: any, token?: string, json = true) => {
    try {
      const headers: any = token ? { Authorization: `Bearer ${token}` } : {};
      if (json) headers["Content-Type"] = "application/json";

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: json ? JSON.stringify(data) : data,
      });

      const data_ = await res.json().catch(() => ({}));

      if (res.status === 401 && data_.detail == "Invalid or expired token") {
        clearVaultXContext();
        alert("Please log in again.");
        window.location.href = "/";
      }

      if (!res.ok) throw new Error(data_.detail || "Something went wrong.");
      return data_;
    } catch (error) {
      if (
        error instanceof TypeError ||
        (error as Error).message === "Failed to fetch"
      ) {
        throw new NetworkError("Server unreachable. Please try again later.");
      }
      throw error;
    }
  },

  get: async (endpoint: string, token?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data_ = await res.json().catch(() => ({}));

      if (res.status === 401 && data_.detail == "Invalid or expired token") {
        clearVaultXContext();
        alert("Please log in again.");
        window.location.href = "/";
      }

      if (!res.ok) throw new Error(data_.detail || "Something went wrong.");
      return data_;
    } catch (error) {
      if (
        error instanceof TypeError ||
        (error as Error).message === "Failed to fetch"
      ) {
        throw new NetworkError("Server unreachable. Please try again later.");
      }
      throw error;
    }
  },

  getRaw: async (endpoint: string, token?: string): Promise<Response> => {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Try to read the body if unauthorized (FastAPI detail response)
      if (res.status === 401) {
        try {
          const data_ = await res.json();
          if (data_.detail === "Invalid or expired token") {
            clearVaultXContext();
            alert("Please log in again.");
            window.location.href = "/";
          }
        } catch {
          /* ignore non-JSON errors */
        }
      }

      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      return res;
    } catch (error) {
      if (
        error instanceof TypeError ||
        (error as Error).message === "Failed to fetch"
      ) {
        throw new NetworkError("Server unreachable. Please try again later.");
      }
      throw error;
    }
  },
    
  delete: async (endpoint: string, token?: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      // Attempt to parse error JSON if available
      const data_ = await res.json().catch(() => ({}));

      if (res.status === 401 && data_.detail === "Invalid or expired token") {
        clearVaultXContext();
        alert("Please log in again.");
        window.location.href = "/";
      }

      if (!res.ok) {
        throw new Error(data_.detail || `Delete failed with status ${res.status}`);
      }

      return data_;
    } catch (error) {
      if (
        error instanceof TypeError ||
        (error as Error).message === "Failed to fetch"
      ) {
        throw new NetworkError("Server unreachable. Please try again later.");
      }
      throw error;
    }
  },

};
