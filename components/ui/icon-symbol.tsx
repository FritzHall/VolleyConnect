// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolViewProps, SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
  SymbolViewProps["name"],
  ComponentProps<typeof MaterialIcons>["name"]
>;

type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbol → Material Icon mappings
 * Add new ones here
 */
const MAPPING = {
  // Tabs
  "house.fill": "home",
  "map.fill": "map",
  "paperplane.fill": "send",
  "person.fill": "person",

  // Dev / misc
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",

  // Future VolleyConnect icons
  "plus.circle.fill": "add-circle",
  "location.fill": "location-on",
  "clock.fill": "schedule",
  "person.3.fill": "groups",
  "sportscourt.fill": "sports-volleyball",
} as IconMapping;

/**
 * Cross-platform icon component:
 * iOS → SF Symbols
 * Android/Web → Material Icons
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
