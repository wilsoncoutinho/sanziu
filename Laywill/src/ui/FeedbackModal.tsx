import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { theme } from "./theme";

export function FeedbackModal({
  visible,
  title,
  message,
  onClose,
  actionLabel,
  onAction,
}: {
  visible: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          alignItems: "center",
          justifyContent: "center",
          padding: theme.space(2.5),
        }}
      >
        <TouchableOpacity
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: theme.space(1.75), backgroundColor: theme.colors.primary }}>
            <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>{title}</Text>
          </View>
          {message ? (
            <View style={{ padding: theme.space(2) }}>
              <Text style={{ color: theme.colors.text, lineHeight: 20 }}>{message}</Text>
            </View>
          ) : null}
          <View style={{ padding: theme.space(2), paddingTop: 0, flexDirection: "row", gap: theme.space(1) }}>
            {actionLabel && onAction ? (
              <TouchableOpacity
                onPress={onAction}
                style={{
                  flex: 1,
                  marginTop: theme.space(1),
                  padding: theme.space(1.5),
                  borderRadius: theme.radius.input,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel={actionLabel}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "800" }}>{actionLabel}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={onClose}
              style={{
                flex: 1,
                marginTop: theme.space(1),
                padding: theme.space(1.5),
                borderRadius: theme.radius.input,
                backgroundColor: theme.colors.primary,
                alignItems: "center",
              }}
              accessibilityRole="button"
              accessibilityLabel="OK"
            >
              <Text style={{ color: "white", fontWeight: "800" }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
