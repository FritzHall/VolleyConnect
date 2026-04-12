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
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

// Expo image picker for selecting images from phone
import * as ImagePicker from "expo-image-picker";

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

  // Uploading state while avatar image is sent to Storage
  const [uploadingImage, setUploadingImage] = useState(false);

  // Current signed-in user id
  const [userId, setUserId] = useState<string | null>(null);

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

      const uid = userData.user.id;
      setUserId(uid);

      // Fetch current profile values
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "display_name, skill_level, preferred_position, bio, avatar_url",
        )
        .eq("id", uid)
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
  // PICK + UPLOAD AVATAR IMAGE
  //////////////////////////////////////////////////////

  async function pickAndUploadImage() {
    if (!userId) {
      Alert.alert("Error", "Please sign in again.");
      return;
    }

    // Ask for media library permission
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    // Open image library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      setUploadingImage(true);

      const asset = result.assets[0];
      const imageUri = asset.uri;

      // Convert local image URI into binary data for upload
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();

      // Use a predictable path: avatars/{userId}/avatar.jpg
      const filePath = `${userId}/avatar.jpg`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: asset.mimeType ?? "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL from uploaded file
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Save URL locally so preview updates immediately
      setAvatarUrl(publicUrl);

      Alert.alert("Success", "Profile image uploaded.");
    } catch (err: any) {
      Alert.alert("Upload failed", err.message ?? "Could not upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

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

    const uid = userData.user.id;

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
      .eq("id", uid);

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

        {/* AVATAR PREVIEW */}
        <View style={{ alignItems: "center", marginTop: 20 }}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                borderWidth: 2,
                borderColor: theme.border,
              }}
            />
          ) : (
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: theme.muted }}>No Photo</Text>
            </View>
          )}
        </View>

        {/* UPLOAD PHOTO BUTTON */}
        <Pressable
          onPress={pickAndUploadImage}
          disabled={uploadingImage}
          style={{
            marginTop: 14,
            backgroundColor: theme.card,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            opacity: uploadingImage ? 0.7 : 1,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "800" }}>
            {uploadingImage ? "Uploading Photo…" : "Upload Photo"}
          </Text>
        </Pressable>

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
