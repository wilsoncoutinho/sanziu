import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.0.5:3000";
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

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || `API error ${res.status}`;
    throw new Error(message);
  }

  return data;
}
