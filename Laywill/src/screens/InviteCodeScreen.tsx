import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";
import { useAuth } from "../contexts/AuthContext";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { getCurrentUserId, setCurrentWorkspaceId } from "../lib/supabaseHelpers";

export default function InviteCodeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { refreshWorkspace } = useWorkspace();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
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

  async function handleConfirm() {
    try {
      if (!code.trim()) return showModal("Erro", "Digite o codigo recebido");
      if (!user) return showModal("Acesso", "Faca login para aceitar o convite.");
      setLoading(true);

      const token = code.trim();
      const userId = user?.id || (await getCurrentUserId());
      if (!userId) throw new Error("Usuario nao autenticado");

      const { data: invite, error } = await supabase
        .from("WorkspaceInvite")
        .select("id, workspaceId, expiresAt, usedAt")
        .eq("token", token)
        .maybeSingle();

      if (error || !invite) throw new Error("Convite invalido");
      if (invite.usedAt) throw new Error("Convite ja usado");
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        throw new Error("Convite expirado");
      }

      const { data: exists, error: existsErr } = await supabase
        .from("WorkspaceMember")
        .select("id")
        .eq("workspaceId", invite.workspaceId)
        .eq("userId", userId)
        .maybeSingle();
      if (existsErr) throw existsErr;

      if (!exists) {
        const { error: insertErr } = await supabase.from("WorkspaceMember").insert({
          workspaceId: invite.workspaceId,
          userId,
          role: "EDITOR",
        });
        if (insertErr) throw insertErr;
      }

      const { error: updateErr } = await supabase
        .from("WorkspaceInvite")
        .update({ usedAt: new Date().toISOString() })
        .eq("id", invite.id);
      if (updateErr) throw updateErr;

      await setCurrentWorkspaceId(invite.workspaceId);
      await refreshWorkspace();

      showModal("Convite aceito", "Voce entrou no workspace.");
    } catch (e: any) {
      console.log("[invite.confirm]", e?.message || e);
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
        Confirmar convite
      </Text>
      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>
        Digite o codigo recebido para entrar no workspace.
      </Text>

      <View style={{ marginTop: theme.space(2.5) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Codigo</Text>
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
          {loading ? "Confirmando..." : "Confirmar convite"}
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
        }}
      />
    </SafeAreaView>
  );
}
