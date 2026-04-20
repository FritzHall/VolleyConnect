//////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////

// Expo Router navigation
import { router } from "expo-router";

// React core + hooks
import React, { useCallback, useMemo, useState } from "react";

// React Native UI components
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

// React Navigation focus hook
import { useFocusEffect } from "@react-navigation/native";

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
  // STATE VARIABLES
  //////////////////////////////////////////////////////

  // Loading state while profile data is fetched
  const [loading, setLoading] = useState(true);

  // Stores current user email
  const [email, setEmail] = useState<string | null>(null);

  // Stores current user display name
  const [displayName, setDisplayName] = useState("Player");

  // Stores current user skill level
  const [skillLevel, setSkillLevel] = useState<number | null>(null);

  // Stores preferred volleyball position
  const [preferredPosition, setPreferredPosition] = useState<string | null>(
    null,
  );

  // Stores short user bio
  const [bio, setBio] = useState<string | null>(null);

  // Stores avatar image URL
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Stores number of games the user hosted
  const [hostedCount, setHostedCount] = useState(0);

  // Stores number of games the user joined
  const [joinedCount, setJoinedCount] = useState(0);

  //////////////////////////////////////////////////////
  // HELPER VALUES
  //////////////////////////////////////////////////////

  // Create simple initials fallback if no avatar image exists
  const initials = useMemo(() => {
    const trimmed = displayName.trim();
    if (!trimmed) return "P";

    const parts = trimmed.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [displayName]);

  // Convert numeric skill level into friendlier label
  function getSkillLabel(level: number | null) {
    switch (level) {
      case 1:
        return "Beginner";
      case 2:
        return "Casual";
      case 3:
        return "Intermediate";
      case 4:
        return "Advanced";
      case 5:
        return "Competitive";
      default:
        return "Not set";
    }
  }

  //////////////////////////////////////////////////////
  // LOAD PROFILE DATA (AUTO REFRESH ON SCREEN FOCUS)
  //////////////////////////////////////////////////////

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        setLoading(true);

        // Get current signed-in user
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData.user) {
          setLoading(false);
          return;
        }

        const user = userData.user;

        // Save user email from auth
        setEmail(user.email ?? null);

        //////////////////////////////////////////////////////
        // FETCH PROFILE TABLE DATA
        //////////////////////////////////////////////////////

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select(
            "display_name, skill_level, preferred_position, bio, avatar_url",
          )
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError && profileData) {
          setDisplayName(profileData.display_name ?? "Player");
          setSkillLevel(profileData.skill_level ?? null);
          setPreferredPosition(profileData.preferred_position ?? null);
          setBio(profileData.bio ?? null);
          setAvatarUrl(profileData.avatar_url ?? null);
        }

        //////////////////////////////////////////////////////
        // FETCH HOSTED GAME COUNT
        //////////////////////////////////////////////////////

        const { count: hosted, error: hostedError } = await supabase
          .from("games")
          .select("id", { count: "exact", head: true })
          .eq("host_id", user.id);

        if (!hostedError) {
          setHostedCount(hosted ?? 0);
        }

        //////////////////////////////////////////////////////
        // FETCH JOINED GAME COUNT
        //////////////////////////////////////////////////////

        const { count: joined, error: joinedError } = await supabase
          .from("game_players")
          .select("user_id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (!joinedError) {
          setJoinedCount(joined ?? 0);
        }

        setLoading(false);
      };

      loadProfile();
    }, []),
  );

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
  // LOADING UI
  //////////////////////////////////////////////////////

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          padding: 18,
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
    <View
      style={{
        flex: 1,
        padding: 18,
        backgroundColor: theme.background,
      }}
    >
      {/* SCREEN TITLE */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: "800",
          color: theme.text,
        }}
      >
        Profile
      </Text>

      {/* DESCRIPTION */}
      <Text
        style={{
          marginTop: 6,
          color: theme.muted,
        }}
      >
        Manage your account and settings.
      </Text>

      {
        //////////////////////////////////////////////////////
        // PROFILE CARD
        //////////////////////////////////////////////////////
      }
      <View
        style={{
          marginTop: 20,
          backgroundColor: theme.card,
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        {/* AVATAR / PROFILE IMAGE */}
        <View
          style={{
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: 86,
                height: 86,
                borderRadius: 43,
                borderWidth: 2,
                borderColor: theme.border,
              }}
            />
          ) : (
            <View
              style={{
                width: 86,
                height: 86,
                borderRadius: 43,
                backgroundColor: theme.tint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 28,
                  fontWeight: "800",
                }}
              >
                {initials}
              </Text>
            </View>
          )}
        </View>

        {/* DISPLAY NAME */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: theme.text,
            textAlign: "center",
          }}
        >
          {displayName}
        </Text>

        {/* EMAIL */}
        <Text
          style={{
            marginTop: 4,
            color: theme.muted,
            textAlign: "center",
          }}
        >
          {email ?? "No email available"}
        </Text>

        {/* SKILL LEVEL */}
        <Text
          style={{
            marginTop: 14,
            fontWeight: "700",
            color: theme.text,
          }}
        >
          Skill Level: {skillLevel ?? "Not set"}{" "}
          <Text style={{ color: theme.muted, fontWeight: "500" }}>
            ({getSkillLabel(skillLevel)})
          </Text>
        </Text>

        {/* PREFERRED POSITION */}
        <Text
          style={{
            marginTop: 8,
            fontWeight: "700",
            color: theme.text,
          }}
        >
          Preferred Position:{" "}
          <Text style={{ color: theme.muted, fontWeight: "500" }}>
            {preferredPosition ?? "Not set"}
          </Text>
        </Text>

        {/* BIO */}
        <Text
          style={{
            marginTop: 14,
            fontWeight: "700",
            color: theme.text,
          }}
        >
          Bio
        </Text>
        <Text
          style={{
            marginTop: 6,
            color: theme.muted,
            lineHeight: 20,
          }}
        >
          {bio && bio.trim().length > 0 ? bio : "No bio added yet."}
        </Text>
      </View>

      {
        //////////////////////////////////////////////////////
        // STATS SECTION
        //////////////////////////////////////////////////////
      }
      <View
        style={{
          marginTop: 16,
          flexDirection: "row",
          gap: 12,
        }}
      >
        {/* HOSTED GAMES CARD */}
        <View
          style={{
            flex: 1,
            backgroundColor: theme.card,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.muted, fontSize: 12 }}>Hosted Games</Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 24,
              fontWeight: "800",
              color: theme.text,
            }}
          >
            {hostedCount}
          </Text>
        </View>

        {/* JOINED GAMES CARD */}
        <View
          style={{
            flex: 1,
            backgroundColor: theme.card,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.muted, fontSize: 12 }}>Joined Games</Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 24,
              fontWeight: "800",
              color: theme.text,
            }}
          >
            {joinedCount}
          </Text>
        </View>
      </View>

      {
        //////////////////////////////////////////////////////
        // EDIT PROFILE BUTTON
        //////////////////////////////////////////////////////
      }
      <Pressable
        onPress={() => router.push("/edit-profile" as any)}
        style={{
          marginTop: 20,
          backgroundColor: theme.card,
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: "center",
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontWeight: "800",
          }}
        >
          Edit Profile
        </Text>
      </Pressable>

      {
        //////////////////////////////////////////////////////
        // LOG OUT BUTTON
        //////////////////////////////////////////////////////
      }
      <Pressable
        onPress={signOut}
        style={{
          marginTop: 12,
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
