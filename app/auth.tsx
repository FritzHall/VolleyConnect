//////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////

// Expo Router navigation
import { router } from "expo-router";

// React core + hooks
import React, { useState } from "react";

// React Native UI components
import { Alert, Pressable, Text, TextInput, View } from "react-native";

// Theme utilities
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Supabase client
import { supabase } from "../src/lib/supabase";

//////////////////////////////////////////////////////
// AUTH SCREEN COMPONENT
//////////////////////////////////////////////////////

export default function AuthScreen() {
  //////////////////////////////////////////////////////
  // THEME SETUP
  //////////////////////////////////////////////////////

  // Detect device theme (light or dark)
  const colorScheme = useColorScheme();

  // Load correct colors from theme file
  const theme = Colors[colorScheme ?? "light"];

  //////////////////////////////////////////////////////
  // STATE VARIABLES
  //////////////////////////////////////////////////////

  // Stores email input
  const [email, setEmail] = useState("");

  // Stores password input
  const [password, setPassword] = useState("");

  // Stores display name input for sign-up
  const [displayName, setDisplayName] = useState("");

  // Controls button loading state
  const [loading, setLoading] = useState(false);

  //////////////////////////////////////////////////////
  // ENSURE USER PROFILE EXISTS
  //////////////////////////////////////////////////////

  async function ensureProfile(userId: string, name: string) {
    // Your RLS allows inserting your own profile row
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      display_name: name || "Player",
      skill_level: 3,
    });

    if (error) {
      console.log("profile upsert error", error);
      // not fatal for sign-in, but you'll want it working
      Alert.alert("Profile error", error.message);
    }
  }

  //////////////////////////////////////////////////////
  // SIGN UP
  //////////////////////////////////////////////////////

  async function onSignUp() {
    // Basic validation
    if (!email || !password)
      return Alert.alert("Missing info", "Enter email and password.");
    if (!displayName)
      return Alert.alert("Missing info", "Enter a display name.");

    setLoading(true);

    // Create account with Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) return Alert.alert("Sign up failed", error.message);

    const userId = data.user?.id;
    if (!userId)
      return Alert.alert("Sign up", "Created account. Try signing in.");

    // Create profile row for the new user
    await ensureProfile(userId, displayName);

    // Go to tabs/home
    router.replace("/(tabs)");
  }

  //////////////////////////////////////////////////////
  // SIGN IN
  //////////////////////////////////////////////////////

  async function onSignIn() {
    // Basic validation
    if (!email || !password)
      return Alert.alert("Missing info", "Enter email and password.");

    setLoading(true);

    // Attempt login with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) return Alert.alert("Sign in failed", error.message);

    const userId = data.user?.id;
    if (userId) {
      // ensure profile exists even for older accounts
      await ensureProfile(userId, displayName || "Player");
    }

    // Go to tabs/home
    router.replace("/(tabs)");
  }

  //////////////////////////////////////////////////////
  // UI RENDER
  //////////////////////////////////////////////////////

  return (
    <View
      style={{
        flex: 1,
        padding: 18,
        justifyContent: "center",
        backgroundColor: theme.background,
      }}
    >
      {/* APP TITLE */}
      <Text style={{ fontSize: 30, fontWeight: "800", color: theme.text }}>
        VolleyConnect
      </Text>

      {/* SUBTITLE */}
      <Text style={{ marginTop: 6, color: theme.muted }}>
        Sign in to create and join games.
      </Text>

      {/* DISPLAY NAME INPUT */}
      <Text style={{ marginTop: 18, fontWeight: "700", color: theme.text }}>
        Display name (for sign up)
      </Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Friedrich"
        placeholderTextColor={theme.muted}
        autoCapitalize="words"
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 12,
          color: theme.text,
          backgroundColor: theme.card,
        }}
      />

      {/* EMAIL INPUT */}
      <Text style={{ marginTop: 14, fontWeight: "700", color: theme.text }}>
        Email
      </Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        placeholderTextColor={theme.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 12,
          color: theme.text,
          backgroundColor: theme.card,
        }}
      />

      {/* PASSWORD INPUT */}
      <Text style={{ marginTop: 14, fontWeight: "700", color: theme.text }}>
        Password
      </Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        placeholderTextColor={theme.muted}
        secureTextEntry
        autoCapitalize="none"
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 12,
          color: theme.text,
          backgroundColor: theme.card,
        }}
      />

      {/* ACTION BUTTONS */}
      <View style={{ marginTop: 18, gap: 12 }}>
        {/* SIGN IN BUTTON */}
        <Pressable
          onPress={onSignIn}
          disabled={loading}
          style={{
            backgroundColor: theme.tint,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {loading ? "Working…" : "Sign In"}
          </Text>
        </Pressable>

        {/* CREATE ACCOUNT BUTTON */}
        <Pressable
          onPress={onSignUp}
          disabled={loading}
          style={{
            backgroundColor: theme.card,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "800" }}>
            {loading ? "Working…" : "Create Account"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
