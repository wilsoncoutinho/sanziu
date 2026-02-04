import { AppState } from "react-native";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// SUBSTITUA PELOS SEUS DADOS DO DASHBOARD DO SUPABASE
const SUPABASE_URL = "https://duiaoahiuaurreglqclk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JUvMgUgTxII0mn8GnSJjfA_hKeqYmvK";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Otimização para o App não ficar conectado em segundo plano gastando bateria
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
