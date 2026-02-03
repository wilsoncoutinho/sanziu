import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { theme } from "./src/ui/theme";
import { FeedbackModal } from "./src/ui/FeedbackModal";
import { api } from "./src/lib/api";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import VerifyEmailScreen from "./src/screens/VerifyEmailScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import MainTabs from "./src/navigation/MainTabs";

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<any>();
const PENDING_INVITE_KEY = "@meuappfinancas:pendingInvite";

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

function Routes() {
  const { user, loading, refreshUser } = useAuth();
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
    message: "",
  });
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  async function handleInviteToken(token: string) {
    if (!token) return;
    if (!user) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, token);
      showModal("Convite recebido", "Faça login para aceitar o convite.");
      return;
    }

    try {
      await api("/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      await refreshUser();
      showModal("Convite aceito", "Você entrou no workspace.");
    } catch (e: any) {
      showModal("Falha ao aceitar convite", e?.message || "Erro");
    }
  }

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      if (!navigationRef.isReady()) {
        setPendingUrl(url);
        return;
      }

      const parsed = Linking.parse(url);
      const path = parsed?.path || "";
      const queryParams = parsed?.queryParams || {};
      const [first, second] = path.split("/");
      if (first === "invite" && second) {
        await handleInviteToken(second);
        return;
      }
      if (first === "reset-password") {
        const token = typeof queryParams.token === "string" ? queryParams.token : "";
        navigationRef.navigate("ResetPassword", { token });
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

  useEffect(() => {
    if (!pendingUrl || !navigationRef.isReady()) return;
    const url = pendingUrl;
    setPendingUrl(null);
    const parsed = Linking.parse(url);
    const path = parsed?.path || "";
    const queryParams = parsed?.queryParams || {};
    const [first, second] = path.split("/");
    if (first === "invite" && second) {
      handleInviteToken(second);
      return;
    }
    if (first === "reset-password") {
      const token = typeof queryParams.token === "string" ? queryParams.token : "";
      navigationRef.navigate("ResetPassword", { token });
    }
  }, [pendingUrl]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer
        theme={navigationTheme}
        ref={navigationRef}
        onReady={() => {
          if (pendingUrl && navigationRef.isReady()) {
            const url = pendingUrl;
            setPendingUrl(null);
            const parsed = Linking.parse(url);
            const path = parsed?.path || "";
            const queryParams = parsed?.queryParams || {};
            const [first, second] = path.split("/");
            if (first === "invite" && second) {
              handleInviteToken(second);
              return;
            }
            if (first === "reset-password") {
              const token = typeof queryParams.token === "string" ? queryParams.token : "";
              navigationRef.navigate("ResetPassword", { token });
            }
          }
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <FeedbackModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}
