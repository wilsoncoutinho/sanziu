import React, { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";

export default function WorkspaceInviteScreen({ navigation }: any) {
  const [code, setCode] = useState("");
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
    if (!code.trim()) return showModal("Erro", "Digite o codigo recebido");
    if (code.trim().length < 6) return showModal("Erro", "Codigo invalido");
    const url = Linking.createURL(`invite/${code.trim()}`);
    await Linking.openURL(url);
    navigation.goBack();
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
        Convite do workspace
      </Text>
      <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>
        Digite o codigo enviado para entrar no workspace.
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
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
        }}
      >
        <Text style={{ fontWeight: "800", color: "white" }}>Confirmar convite</Text>
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
