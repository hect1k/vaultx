// /lib/api.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  post: async (endpoint: string, data?: any, token?: string) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  get: async (endpoint: string, token?: string) => {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
