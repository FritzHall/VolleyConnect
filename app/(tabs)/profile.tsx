//////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////

// Expo Router navigation
import { router } from "expo-router";

// React core
import React from "react";

// React Native UI components
import { Alert, Pressable, Text, View } from "react-native";

// Theme utilities
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Supabase client for authentication
import { supabase } from "../../src/lib/supabase";

//////////////////////////////////////////////////////
// PROFILE SCREEN COMPONENT
//////////////////////////////////////////////////////

export default function ProfileScreen() {
  //////////////////////////////////////////////////////
  // THEME SETUP
  //////////////////////////////////////////////////////

  // Detect device theme (light or dark)
  const colorScheme = useColorScheme();

  // Load correct colors from theme file
  const theme = Colors[colorScheme ?? "light"];

  //////////////////////////////////////////////////////
  // SIGN OUT FUNCTION
  //////////////////////////////////////////////////////

  // Logs the user out of Supabase
  async function signOut() {
    // Call Supabase sign-out method
    const { error } = await supabase.auth.signOut();

    // If an error occurs, show alert
    if (error) return Alert.alert("Error", error.message);

    // Redirect user back to login screen
    router.replace("../auth");
  }

  //////////////////////////////////////////////////////
  // UI RENDER
  //////////////////////////////////////////////////////

  return (
    <View
      style={{
        flex: 1,
        padding: 18,

        // Use themed background color
        backgroundColor: theme.background,
      }}
    >
      {/* SCREEN TITLE */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: "800",

          // Use themed text color
          color: theme.text,
        }}
      >
        Profile
      </Text>

      {/* DESCRIPTION */}
      <Text
        style={{
          marginTop: 6,

          // Secondary text color
          color: theme.muted,
        }}
      >
        Manage your account and settings.
      </Text>
      {
        //////////////////////////////////////////////////////
        // LOG OUT BUTTON
        //////////////////////////////////////////////////////
      }
      <Pressable
        onPress={signOut}
        style={{
          marginTop: 24,

          // Primary action color
          backgroundColor: theme.tint,

          paddingVertical: 14,
          borderRadius: 14,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "800",
          }}
        >
          Log Out
        </Text>
      </Pressable>
    </View>
  );
}
