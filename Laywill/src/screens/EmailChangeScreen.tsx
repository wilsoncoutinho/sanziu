import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function EmailChangeScreen({ navigation, route }: any) {
  const [email, setEmail] = useState(route?.params?.email || "");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shouldGoBack, setShouldGoBack] = useState(false);
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>(
    {
      visible: false,
      title: "",
      message: "",
    }
  );

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleConfirm() {
    try {
      if (!email.trim()) return showModal("Erro", "Digite seu email");
      if (!code.trim()) return showModal("Erro", "Digite o código recebido");
      setLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: "email_change",
      });
      if (error) throw error;
      setShouldGoBack(true);
      showModal("Email atualizado", "Seu novo email foi confirmado.");
    } catch (e: any) {
      showModal("Falha", e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      if (!email.trim()) return showModal("Erro", "Digite seu email");
      setLoading(true);
      const { error } = await supabase.auth.resend({
        type: "email_change",
        email: email.trim().toLowerCase(),
      });
      if (error) throw error;
      showModal("Código enviado", "Verifique sua caixa de entrada.");
      setCooldown(30);
    } catch (e: any) {
      showModal("Falha", e?.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        padding: theme.space(2.5),
        justifyContent: "center",
        backgroundColor: theme.colors.bg,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "800", color: theme.colors.text }}>
        Confirmar novo email
      </Text>
      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>
        Digite o email novo e o código recebido.
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
          style={{ marginTop: theme.space(0.75), ...theme.input }}
        />
      </View>

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Código</Text>
        <TextInput
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="000000"
          placeholderTextColor={theme.colors.muted}
          maxLength={6}
          style={{
            marginTop: theme.space(0.75),
            ...theme.input,
            letterSpacing: 4,
          }}
        />
      </View>

      <TouchableOpacity
        onPress={handleConfirm}
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
        <Text style={{ fontWeight: "800", color: "white" }}>
          {loading ? "Confirmando..." : "Confirmar email"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleResend}
        disabled={loading || cooldown > 0}
        style={{
          marginTop: theme.space(1.25),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
          opacity: loading || cooldown > 0 ? 0.6 : 1,
        }}
      >
        <Text style={{ fontWeight: "800", color: "white" }}>
          {cooldown > 0 ? `Reenviar (${cooldown}s)` : "Reenviar código"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: theme.space(1.5), alignItems: "center" }}
      >
        <Text style={{ color: theme.colors.text, opacity: 0.85 }}>Voltar</Text>
      </TouchableOpacity>

      <FeedbackModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => {
          setModal((prev) => ({ ...prev, visible: false }));
          if (shouldGoBack) {
            setShouldGoBack(false);
            navigation.goBack();
          }
        }}
      />
    </SafeAreaView>
  );
}
