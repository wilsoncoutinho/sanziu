import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function ResetPasswordScreen({ navigation, route }: any) {
  const accessToken = route?.params?.accessToken || "";
  const refreshToken = route?.params?.refreshToken || "";
  const initialEmail = route?.params?.email || "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
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

  const hasLinkTokens = Boolean(accessToken && refreshToken);

  useEffect(() => {
    let cancelled = false;
    async function initSession() {
      if (!hasLinkTokens) return;
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (cancelled) return;
      if (error) {
        showModal("Erro", error.message || "Link inválido ou expirado");
        return;
      }
      setSessionReady(true);
    }

    initSession();
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken, hasLinkTokens]);

  async function handleReset() {
    try {
      if (!hasLinkTokens && !email.trim()) {
        return showModal("Erro", "Digite seu email.");
      }
      if (!hasLinkTokens && !code.trim()) {
        return showModal("Erro", "Digite o código recebido.");
      }
      if (password.length < 6) return showModal("Erro", "Senha precisa ter pelo menos 6 caracteres");
      if (password !== password2) return showModal("Erro", "As senhas nao conferem");

      if (!sessionReady) {
        if (hasLinkTokens) {
          return showModal("Erro", "Sessão ainda não pronta. Tente novamente.");
        }
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: code.trim(),
          type: "recovery",
        });
        if (error) throw error;
        if (data?.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        }
        setSessionReady(true);
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      showModal("Senha alterada", "Agora voce pode fazer login.");
      navigation.goBack();
    } catch (e: any) {
      showModal("Falha", e?.message || "Erro");
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
        Nova senha
      </Text>
      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>
        Crie uma nova senha para sua conta
      </Text>

      {!hasLinkTokens ? (
        <View style={{ marginTop: theme.space(2.5) }}>
          <Text style={{ color: theme.colors.muted }}>Digite o email e o código recebido.</Text>
        </View>
      ) : null}

      {!hasLinkTokens ? (
        <>
          <View style={{ marginTop: theme.space(1.75) }}>
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
        </>
      ) : null}

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Nova senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="minimo 6 caracteres"
          placeholderTextColor={theme.colors.muted}
          style={{ marginTop: theme.space(0.75), ...theme.input }}
        />
      </View>

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Confirmar senha</Text>
        <TextInput
          value={password2}
          onChangeText={setPassword2}
          secureTextEntry
          placeholder="repita a senha"
          placeholderTextColor={theme.colors.muted}
          style={{ marginTop: theme.space(0.75), ...theme.input }}
        />
      </View>

      <TouchableOpacity
        onPress={handleReset}
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
          opacity: hasLinkTokens && !sessionReady ? 0.6 : 1,
        }}
      >
        <Text style={{ fontWeight: "800", color: "white" }}>Salvar nova senha</Text>
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
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}
