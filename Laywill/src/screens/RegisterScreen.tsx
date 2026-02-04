import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { theme } from "../ui/theme";
import { supabase } from "../lib/supabase";

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password)
      return Alert.alert("Erro", "Preencha todos os campos");
    setLoading(true);

    // CRIA CONTA NO SUPABASE E JÁ MANDA O EMAIL DE CONFIRMAÇÃO
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: name, // Salva o nome nos metadados do usuário
        },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert("Erro no cadastro", error.message);
    } else {
      Alert.alert("Sucesso!", "Enviamos um código para seu email.", [
        {
          text: "OK",
          onPress: () => navigation.navigate("VerifyEmail", { email: email.trim().toLowerCase() }),
        },
      ]);
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
        Criar conta
      </Text>

      <View style={{ marginTop: theme.space(2.5) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={{ ...theme.input }}
        />
      </View>

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ ...theme.input }}
        />
      </View>

      <View style={{ marginTop: theme.space(1.75) }}>
        <Text style={{ fontSize: 12, color: theme.colors.muted }}>Senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={{ ...theme.input }}
        />
      </View>

      <TouchableOpacity
        onPress={handleRegister}
        style={{
          marginTop: theme.space(2),
          padding: theme.space(2),
          borderRadius: theme.radius.input,
          alignItems: "center",
          backgroundColor: theme.colors.primary,
        }}
      >
        <Text style={{ fontWeight: "800", color: "white" }}>
          {loading ? "Criando..." : "Criar conta"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ marginTop: theme.space(1.5), alignItems: "center" }}
      >
        <Text style={{ color: theme.colors.text }}>Já tenho conta</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
