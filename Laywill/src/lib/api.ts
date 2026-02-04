import AsyncStorage from "@react-native-async-storage/async-storage";

// [IMPORTANTE] URL do backend em producao (Vercel) — sem barra no final
const PROD_URL = "https://sanziu-nao6a698s-wilsons-projects-26df9973.vercel.app";
const DEV_URL = PROD_URL;
const BASE_URL = __DEV__ ? DEV_URL : PROD_URL;
const TOKEN_KEY = "@meuappfinancas:token";

let token: string | null = null;

export async function setToken(value: string) {
  token = value;
  await AsyncStorage.setItem(TOKEN_KEY, value);
}

export async function getToken() {
  if (token) return token;
  const stored = await AsyncStorage.getItem(TOKEN_KEY);
  token = stored;
  return stored;
}

export async function clearToken() {
  token = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function api(path: string, options: RequestInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  } as Record<string, string>;

  const currentToken = await getToken();
  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  async function fetchWithTimeout(url: string) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    try {
      return await fetch(url, { ...options, headers, signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
  }

  async function requestOnce(url: string) {
    const res = await fetchWithTimeout(url);
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message =
        data?.message ||
        data?.error ||
        (text ? `Erro na API: ${res.status} - ${text.slice(0, 120)}` : `Erro na API: ${res.status}`);
      throw new Error(message);
    }
    return data;
  }

  try {
    return await requestOnce(`${BASE_URL}${path}`);
  } catch (error: any) {
    if (__DEV__ && DEV_URL !== PROD_URL) {
      try {
        return await requestOnce(`${PROD_URL}${path}`);
      } catch {
        // fall through to original error
      }
    }
    throw new Error(error?.message || "Falha na conexao com o servidor");
  }
}
