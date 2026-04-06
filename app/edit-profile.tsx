//////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////

// Expo Router navigation
import { router } from "expo-router";

// React core + hooks
import React, { useEffect, useState } from "react";

// React Native UI components
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

// Theme utilities
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Supabase client
import { supabase } from "../src/lib/supabase";

//////////////////////////////////////////////////////
// EDIT PROFILE SCREEN COMPONENT
//////////////////////////////////////////////////////

export default function EditProfileScreen() {
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

  // Loading state while existing profile is fetched
  const [loading, setLoading] = useState(true);

  // Saving state while updates are sent to Supabase
  const [saving, setSaving] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [skillLevel, setSkillLevel] = useState("3");
  const [preferredPosition, setPreferredPosition] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  //////////////////////////////////////////////////////
  // LOAD EXISTING PROFILE
  //////////////////////////////////////////////////////

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Get current signed-in user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        setLoading(false);
        Alert.alert("Error", "Could not load your profile.");
        return;
      }

      const userId = userData.user.id;

      // Fetch current profile values
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "display_name, skill_level, preferred_position, bio, avatar_url",
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setLoading(false);
        Alert.alert("Error", error.message);
        return;
      }

      if (data) {
        setDisplayName(data.display_name ?? "");
        setSkillLevel(String(data.skill_level ?? 3));
        setPreferredPosition(data.preferred_position ?? "");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }

      setLoading(false);
    })();
  }, []);

  //////////////////////////////////////////////////////
  // SAVE PROFILE
  //////////////////////////////////////////////////////

  async function saveProfile() {
    // Basic validation
    if (!displayName.trim()) {
      return Alert.alert("Missing info", "Please enter a display name.");
    }

    const parsedSkill = parseInt(skillLevel, 10);
    if (Number.isNaN(parsedSkill) || parsedSkill < 1 || parsedSkill > 5) {
      return Alert.alert("Skill level", "Enter a skill level between 1 and 5.");
    }

    setSaving(true);

    // Get current signed-in user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setSaving(false);
      return Alert.alert("Error", "Please sign in again.");
    }

    const userId = userData.user.id;

    // Update profile row
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        skill_level: parsedSkill,
        preferred_position: preferredPosition.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      return Alert.alert("Save failed", error.message);
    }

    Alert.alert("Saved", "Your profile has been updated.");
    router.back();
  }

  //////////////////////////////////////////////////////
  // LOADING UI
  //////////////////////////////////////////////////////

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.tint} />
        <Text style={{ marginTop: 10, color: theme.text }}>
          Loading profile…
        </Text>
      </View>
    );
  }

  //////////////////////////////////////////////////////
  // UI RENDER
  //////////////////////////////////////////////////////

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* SCREEN TITLE */}
        <Text style={{ fontSize: 28, fontWeight: "800", color: theme.text }}>
          Edit Profile
        </Text>

        {/* DESCRIPTION */}
        <Text style={{ marginTop: 6, color: theme.muted }}>
          Update your player information.
        </Text>

        {/* DISPLAY NAME */}
        <Text style={{ marginTop: 20, fontWeight: "700", color: theme.text }}>
          Display Name
        </Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={theme.muted}
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

        {/* SKILL LEVEL */}
        <Text style={{ marginTop: 14, fontWeight: "700", color: theme.text }}>
          Skill Level (1-5)
        </Text>
        <TextInput
          value={skillLevel}
          onChangeText={setSkillLevel}
          keyboardType="number-pad"
          placeholder="3"
          placeholderTextColor={theme.muted}
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

        {/* PREFERRED POSITION */}
        <Text style={{ marginTop: 14, fontWeight: "700", color: theme.text }}>
          Preferred Position
        </Text>
        <TextInput
          value={preferredPosition}
          onChangeText={setPreferredPosition}
          placeholder="Setter, Libero, Outside Hitter..."
          placeholderTextColor={theme.muted}
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

        {/* BIO */}
        <Text style={{ marginTop: 14, fontWeight: "700", color: theme.text }}>
          Bio
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people a little about how you play."
          placeholderTextColor={theme.muted}
          multiline
          textAlignVertical="top"
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 12,
            minHeight: 110,
            color: theme.text,
            backgroundColor: theme.card,
          }}
        />

        {/* AVATAR URL */}
        <Text style={{ marginTop: 14, fontWeight: "700", color: theme.text }}>
          Avatar URL
        </Text>
        <TextInput
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://..."
          placeholderTextColor={theme.muted}
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

        {/* SAVE BUTTON */}
        <Pressable
          onPress={saveProfile}
          disabled={saving}
          style={{
            marginTop: 20,
            backgroundColor: theme.tint,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {saving ? "Saving…" : "Save Changes"}
          </Text>
        </Pressable>

        {/* CANCEL BUTTON */}
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 10,
            backgroundColor: theme.card,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "800" }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
