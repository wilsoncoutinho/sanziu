import React from "react";
import { View, ViewProps } from "react-native";
import { theme } from "./theme";

export function Card(props: ViewProps) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.card,
          padding: theme.space(2),
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        props.style,
      ]}
    />
  );
}
