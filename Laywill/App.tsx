import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";

import HomeScreen from "./src/screens/HomeScreen";
import NewTransactionScreen from "./src/screens/NewTransactionScreen";
import StatementScreen from "./src/screens/StatementScreen";
import { theme } from "./src/ui/theme";

import { api, setToken, getToken, clearToken } from "./src/lib/api";

type User = { id: string; name: string | null; email: string };

const Tab = createBottomTabNavigator();
const PENDING_INVITE_KEY = "@meuappfinancas:pendingInvite";
const AVATAR_KEY = "@meuappfinancas:avatarUri";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [email, setEmail] = useState("wilson@email.com");
  const [password, setPassword] = useState("123456");

  async function bootstrap() {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const data = await api("/api/auth/me", { method: "GET" });
      setUser(data.user ?? null);
    } catch {
      await clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadAvatar() {
    const uri = await AsyncStorage.getItem(AVATAR_KEY);
    setAvatarUri(uri || null);
  }

  async function handleInviteToken(token: string) {
    if (!token) return;
    if (!user) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, token);
      Alert.alert("Convite recebido", "Faça login para aceitar o convite.");
      return;
    }

    try {
      await api("/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      Alert.alert("Convite aceito", "Você entrou no workspace.");
    } catch (e: any) {
      Alert.alert("Falha ao aceitar convite", e?.message || "Erro");
    }
  }

  useEffect(() => {
    bootstrap();
    loadAvatar();
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const path = parsed?.path || "";
      const [first, second] = path.split("/");
      if (first === "invite" && second) {
        await handleInviteToken(second);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });

    return () => sub.remove();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem(PENDING_INVITE_KEY).then((pending) => {
      if (pending) {
        handleInviteToken(pending);
      }
    });
  }, [user]);

  async function handleLogin() {
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!data.token) throw new Error("Token não veio no login.");
      await setToken(data.token);

      const me = await api("/api/auth/me", { method: "GET" });
      setUser(me.user ?? null);
    } catch (e: any) {
      Alert.alert("Falha no login", e?.message || "Erro");
    }
  }

  async function handleLogout() {
    await clearToken();
    setUser(null);
  }

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Autorize o acesso às fotos para escolher uma imagem.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;
    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    await AsyncStorage.setItem(AVATAR_KEY, uri);
    setAvatarUri(uri);
  }

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.colors.bg,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.primary,
    },
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={{ marginTop: theme.space(1), color: theme.colors.text }}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, padding: theme.space(2.5), justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: theme.colors.text }}>Entrar</Text>
        <Text style={{ marginTop: theme.space(1), color: theme.colors.muted }}>Acesse as finanças do casal</Text>

        <View style={{ marginTop: theme.space(2.5) }}>
          <Text style={{ fontSize: 12, color: theme.colors.muted }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
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
          <Text style={{ fontSize: 12, color: theme.colors.muted }}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
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
          onPress={handleLogin}
          style={{
            marginTop: theme.space(2),
            padding: theme.space(2),
            borderRadius: theme.radius.input,
            alignItems: "center",
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ fontWeight: "700", color: "white" }}>Entrar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTitleStyle: { fontWeight: "800", color: "white" },
          headerTintColor: "white",
          headerRight: () => (
            <View style={{ marginRight: theme.space(1.5), flexDirection: "row", alignItems: "center", gap: theme.space(1) }}>
              <TouchableOpacity
                onPress={handlePickAvatar}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
                accessibilityRole="button"
                accessibilityLabel="Escolher foto"
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Ionicons name="person" size={16} color={theme.colors.text} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                style={{
                  paddingHorizontal: theme.space(1.5),
                  paddingVertical: theme.space(0.75),
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                accessibilityRole="button"
                accessibilityLabel="Sair"
              >
                <Text style={{ fontWeight: "800", color: theme.colors.text }}>Sair</Text>
              </TouchableOpacity>
            </View>
          ),
          tabBarStyle: {
            backgroundColor: theme.colors.bg,
            borderTopColor: theme.colors.border,
            height: 64,
            paddingBottom: 10,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: "rgba(234,240,255,0.45)",
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
        />
        <Tab.Screen
          name="Lançar"
          component={NewTransactionScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
            tabBarLabel: "",
            tabBarButton: (props) => {
              const { delayLongPress, disabled, ...rest } = props as any;
              return (
                <View style={{ flex: 1, alignItems: "center" }}>
                  <TouchableOpacity
                    {...(rest as any)}
                    onPress={async (e) => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      (rest as any).onPress?.(e);
                    }}
                    delayLongPress={delayLongPress ?? undefined}
                    disabled={disabled ?? undefined}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: theme.colors.primary,
                      marginTop: -22,
                      shadowColor: "#000",
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 6,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Lançar"
                  >
                    <Text style={{ color: "white", fontSize: 32, fontWeight: "800", marginTop: -2 }}>+</Text>
                  </TouchableOpacity>
                </View>
              );
            },
          }}
        />
        <Tab.Screen
          name="Extrato"
          component={StatementScreen}
          options={{ tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

