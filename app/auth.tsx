import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../src/lib/supabase";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function onSignUp() {
    if (!email || !password)
      return Alert.alert("Missing info", "Enter email and password.");
    if (!displayName)
      return Alert.alert("Missing info", "Enter a display name.");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) return Alert.alert("Sign up failed", error.message);

    const userId = data.user?.id;
    if (!userId)
      return Alert.alert("Sign up", "Created account. Try signing in.");

    await ensureProfile(userId, displayName);

    // Go to tabs/home
    router.replace("/(tabs)");
  }

  async function onSignIn() {
    if (!email || !password)
      return Alert.alert("Missing info", "Enter email and password.");

    setLoading(true);
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

    router.replace("/(tabs)");
  }

  return (
    <View style={{ flex: 1, padding: 18, justifyContent: "center" }}>
      <Text style={{ fontSize: 30, fontWeight: "800" }}>VolleyConnect</Text>
      <Text style={{ marginTop: 6, color: "#555" }}>
        Sign in to create & join games.
      </Text>

      <Text style={{ marginTop: 18, fontWeight: "700" }}>
        Display name (for sign up)
      </Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Friedrich"
        autoCapitalize="words"
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
        }}
      />

      <Text style={{ marginTop: 14, fontWeight: "700" }}>Email</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
        }}
      />

      <Text style={{ marginTop: 14, fontWeight: "700" }}>Password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          padding: 12,
        }}
      />

      <View style={{ marginTop: 18, gap: 12 }}>
        <Pressable
          onPress={onSignIn}
          disabled={loading}
          style={{
            backgroundColor: "#111",
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {loading ? "Working…" : "Sign In"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onSignUp}
          disabled={loading}
          style={{
            backgroundColor: "#eee",
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#111", fontWeight: "800" }}>
            {loading ? "Working…" : "Create Account"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
