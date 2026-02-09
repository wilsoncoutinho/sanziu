import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, Modal } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeScreen from "../screens/HomeScreen";
import NewTransactionScreen from "../screens/NewTransactionScreen";
import StatementScreen from "../screens/StatementScreen";
import { theme } from "../ui/theme";
import { FeedbackModal } from "../ui/FeedbackModal";
import { useAuth } from "../contexts/AuthContext";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { supabase } from "../lib/supabase";

const Tab = createBottomTabNavigator();
const AVATAR_KEY = "@meuappfinancas:avatarUri";

export default function MainTabs() {
  const { user, signOut } = useAuth();
  const { workspaceId } = useWorkspace();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [homeTitle, setHomeTitle] = useState("Home");
  const [accountMenuVisible, setAccountMenuVisible] = useState(false);
  const [modal, setModal] = useState<{ visible: boolean; title: string; message?: string }>({
    visible: false,
    title: "",
    message: "",
  });

  function showModal(title: string, message?: string) {
    setModal({ visible: true, title, message });
  }

  function avatarKeyForUser(userId: string) {
    return `${AVATAR_KEY}:${userId}`;
  }

  async function loadAvatarForUser(currentUserId?: string) {
    if (!currentUserId) {
      setAvatarUri(null);
      return;
    }
    const uri = await AsyncStorage.getItem(avatarKeyForUser(currentUserId));
    setAvatarUri(uri || null);
  }

  async function handlePickAvatar() {
    if (!user?.id) {
      showModal("Ação indisponível", "Faça login para escolher uma imagem.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showModal("Permissão necessária", "Autorize o acesso às fotos para escolher uma imagem.");
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

    await AsyncStorage.setItem(avatarKeyForUser(user.id), uri);
    setAvatarUri(uri);
  }

  useEffect(() => {
    loadAvatarForUser(user?.id);
  }, [user?.id]);

  useEffect(() => {
    async function loadHomeTitle() {
      if (!workspaceId || !user?.id) {
        setHomeTitle("Home");
        return;
      }

      const currentUserName =
        (user.user_metadata as any)?.full_name ||
        user.email?.split("@")[0] ||
        "Conta";

      const { data: members, error: membersError } = await supabase
        .from("WorkspaceMember")
        .select("userId")
        .eq("workspaceId", workspaceId);

      if (membersError || !members?.length) {
        setHomeTitle(currentUserName);
        return;
      }

      const memberUserIds = Array.from(
        new Set((members || []).map((m: any) => String(m.userId)).filter(Boolean))
      );

      const { data: usersData, error: usersError } = await supabase
        .from("User")
        .select("id, name, email")
        .in("id", memberUserIds);

      if (usersError || !usersData?.length) {
        setHomeTitle(currentUserName);
        return;
      }

      const byId = new Map(
        usersData.map((u: any) => [
          u.id,
          String(u.name || "").trim() || String(u.email || "").split("@")[0] || "Conta",
        ])
      );

      const current = byId.get(user.id) || currentUserName;
      const others = memberUserIds
        .filter((id) => id !== user.id)
        .map((id) => byId.get(id))
        .filter(Boolean) as string[];

      if (others.length > 0) {
        setHomeTitle(`${current} & ${others[0]}`);
      } else {
        setHomeTitle(current);
      }
    }

    loadHomeTitle().catch(() => setHomeTitle("Home"));
  }, [workspaceId, user?.id, user?.email, (user?.user_metadata as any)?.full_name]);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTitleStyle: { fontWeight: "800", color: "white" },
          headerTintColor: "white",
          headerRight: () => (
            <View style={{ marginRight: theme.space(1.5), flexDirection: "row", alignItems: "center", gap: theme.space(1) }}>
              <TouchableOpacity
                onPress={() => setAccountMenuVisible(true)}
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
                accessibilityLabel="Conta"
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Ionicons name="person" size={16} color={theme.colors.text} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={signOut}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel="Sair"
              >
                <Ionicons name="log-out-outline" size={16} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          ),
          tabBarStyle: {
            backgroundColor: theme.colors.bg,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 64 + Math.max(insets.bottom, 8),
            paddingBottom: Math.max(insets.bottom, 10),
            paddingTop: 8,
          },
          tabBarItemStyle: { paddingVertical: 2 },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: "rgba(234,240,255,0.45)",
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: homeTitle,
            tabBarLabel: "Home",
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
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
                    onPress={(e) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
                      marginTop: -16,
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
      <Modal
        visible={accountMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountMenuVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}>
          <TouchableOpacity
            onPress={() => setAccountMenuVisible(false)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
          <View
            style={{
              marginTop: 64,
              alignSelf: "flex-end",
              marginRight: theme.space(1.5),
              backgroundColor: theme.colors.card,
              borderRadius: theme.radius.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.space(1),
              minWidth: 240,
              shadowColor: "#000",
              shadowOpacity: 0.28,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <Text
              style={{
                color: theme.colors.muted,
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 0.4,
                paddingHorizontal: theme.space(1),
                paddingBottom: theme.space(0.75),
              }}
            >
              Conta
            </Text>
            <MenuItem
              label="Minha conta"
              icon="person-outline"
              onPress={() => {
                setAccountMenuVisible(false);
                navigation.navigate("Account");
              }}
            />
            <MenuItem
              label="Tenho um convite"
              icon="gift-outline"
              onPress={() => {
                setAccountMenuVisible(false);
                navigation.navigate("InviteCode");
              }}
            />
            <MenuItem
              label="Alterar foto"
              icon="image-outline"
              onPress={() => {
                setAccountMenuVisible(false);
                handlePickAvatar();
              }}
            />
          </View>
        </View>
      </Modal>
      <FeedbackModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}

function MenuItem({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space(1),
        paddingVertical: theme.space(1.1),
        paddingHorizontal: theme.space(1.25),
        borderRadius: theme.radius.input,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(124,58,237,0.12)",
        marginBottom: theme.space(0.75),
      }}
    >
      <Ionicons name={icon} size={16} color={theme.colors.text} />
      <Text style={{ color: theme.colors.text, fontWeight: "700", flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
    </TouchableOpacity>
  );
}
