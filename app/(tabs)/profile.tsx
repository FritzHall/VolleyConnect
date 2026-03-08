import { router } from "expo-router";
import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { supabase } from "../../src/lib/supabase";

export default function ProfileScreen() {
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) return Alert.alert("Error", error.message);
    router.replace("../auth");
  }

  return (
    <View style={{ flex: 1, padding: 18 }}>
      <Text style={{ fontSize: 28, fontWeight: "800" }}>Profile</Text>
      <Text style={{ marginTop: 6, color: "#555" }}>
        Manage your account and settings.
      </Text>

      <Pressable
        onPress={signOut}
        style={{
          marginTop: 24,
          backgroundColor: "#111",
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "800" }}>Log Out</Text>
      </Pressable>
    </View>
  );
}
