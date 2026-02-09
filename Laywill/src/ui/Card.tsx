import React from "react";
import { View, ViewProps } from "react-native";
import { theme } from "./theme";

export function Card(props: ViewProps) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: "rgba(124,58,237,0.18)",
          borderRadius: theme.radius.card,
          padding: theme.space(2),
          borderWidth: 1,
          borderColor: "rgba(124,58,237,0.45)",
        },
        props.style,
      ]}
    />
  );
}
