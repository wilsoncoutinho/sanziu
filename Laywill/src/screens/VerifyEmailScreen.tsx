import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api, setToken } from "../lib/api";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function VerifyEmailScreen({ navigation, route }: any) {
  const [email, setEmail] = useState(route?.params?.email || "");
  const [password, setPassword] = useState(route?.params?.password || "");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(600);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
    message: "",
  });

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const t = setTimeout(() => setExpiresIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [expiresIn]);

  function formatMMSS(total: number) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  async function handleVerify() {
    try {
      if (!email.trim()) return showModal("Erro", "Digite seu email");
      if (!code.trim()) return showModal("Erro", "Digite o codigo");

      setLoading(true);
      const res = await api("/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });

      if (res?.token) {
        await setToken(res.token);
        navigation.replace("Main");
        return;
      }

      if (password) {
        const login = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        });
        if (!login.token) throw new Error("Token nao veio no login.");
        await setToken(login.token);
        navigation.replace("Main");
        return;
      }

      showModal("Email confirmado", "Voce ja pode fazer login.");
      navigation.goBack();
    } catch (e: any) {
      const msg = e?.message || "Erro";
      const lower = String(msg).toLowerCase();
      if (lower.includes("expirado") || lower.includes("410")) {
        showModal("Codigo expirado", "Reenvie o codigo e tente novamente.");
        return;
      }
      if (lower.includes("nao confirmado") || lower.includes("403")) {
        showModal("Email nao confirmado", "Confira o codigo e tente novamente.");
        return;
      }
      if (lower.includes("muitas") || lower.includes("429")) {
        showModal("Muitas tentativas", "Aguarde alguns minutos e tente novamente.");
        return;
      }
      showModal("Falha ao confirmar", msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      if (!email.trim()) return showModal("Erro", "Digite seu email");
      await api("/api/auth/resend-code", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      showModal("Codigo enviado", "Verifique seu email.");
      setCooldown(30);
      setExpiresIn(600);
    } catch (e: any) {
      showModal("Falha", e?.message || "Erro");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: theme.space(2.5), justifyContent: "center", backgroundColor: theme.colors.bg }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color: theme.colors.text }}>Confirmar email</Text>
      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>
        Digite o codigo enviado para seu email
      </Text>

      <View style={{ marginTop: theme.space(2.5) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="email@exemplo.com"
          placeholderTextColor={theme.colors.muted}
          style={{
            marginTop: theme.space(0.75),
            padding: theme.space(1.75),
            borderRadius: theme.radius.input,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
            color: theme.colors.text,
          }}
        />
      </View>

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Codigo</Text>
        <TextInput
          value={code}
          onChangeText={(text) => {
            const next = text.replace(/\D/g, "").slice(0, 6);
            setCode(next);
            if (next.length === 6 && !loading) {
              handleVerify();
            }
          }}
          autoFocus
          maxLength={6}
          keyboardType="number-pad"
          placeholder="6 digitos"
          placeholderTextColor={theme.colors.muted}
          style={{
            marginTop: theme.space(0.75),
            padding: theme.space(1.75),
            borderRadius: theme.radius.input,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
            color: theme.colors.text,
          }}
        />
      </View>

      <TouchableOpacity
        onPress={handleVerify}
        disabled={loading}
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ fontWeight: "800", color: "white" }}>{loading ? "Verificando..." : "Confirmar"}</Text>
      </TouchableOpacity>

      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted, textAlign: "center" }}>
        {expiresIn > 0 ? `Expira em ${formatMMSS(expiresIn)}` : "Codigo expirado"}
      </Text>

      <TouchableOpacity
        onPress={handleResend}
        disabled={cooldown > 0}
        style={{ marginTop: theme.space(1.5), alignItems: "center", opacity: cooldown > 0 ? 0.6 : 1 }}
      >
        <Text style={{ color: theme.colors.text, opacity: 0.85 }}>
          {cooldown > 0 ? `Reenviar codigo (${cooldown}s)` : "Reenviar codigo"}
        </Text>
      </TouchableOpacity>

      <FeedbackModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}
