// Expo Router is used for navigation between screens
import { router } from "expo-router";

// React hooks
import React, { useEffect, useState } from "react";

// React Native UI components
import { ActivityIndicator, Pressable, Text, View } from "react-native";

// Theme imports
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Supabase client for database + authentication
import { supabase } from "../../src/lib/supabase";

export default function HomeScreen() {
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

  // Controls loading spinner while we fetch data
  const [loading, setLoading] = useState(true);

  // Number of upcoming games from Supabase
  // null = not logged in OR data not available
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);

  //////////////////////////////////////////////////////
  // LOAD UPCOMING GAME COUNT WHEN SCREEN OPENS
  //////////////////////////////////////////////////////

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Check if user is logged in
      // If not authenticated, RLS may block reading games
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        // If user isn't logged in, don't fetch games
        setUpcomingCount(null);
        setLoading(false);
        return;
      }

      // Current time — we only want future games
      const nowIso = new Date().toISOString();

      //////////////////////////////////////////////////////
      // FETCH UPCOMING GAME COUNT FROM SUPABASE
      //////////////////////////////////////////////////////

      const { count, error } = await supabase
        .from("games")
        .select("id", { count: "exact", head: true }) // only count rows
        .eq("status", "active") // only active games
        .gte("starts_at", nowIso); // future games only

      // If no error, update UI count
      if (!error) setUpcomingCount(count ?? 0);

      setLoading(false);
    })();
  }, []);

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
      <Text style={{ fontSize: 34, fontWeight: "800", color: theme.text }}>
        VolleyConnect
      </Text>

      {/* TAGLINE */}
      <Text style={{ marginTop: 10, fontSize: 16, color: theme.muted }}>
        Find nearby pickup volleyball games, join fast, and play.
      </Text>
      {
        //////////////////////////////////////////////////////
        // UPCOMING GAME COUNT DISPLAY
        //////////////////////////////////////////////////////
      }
      <View style={{ marginTop: 20 }}>
        {loading ? (
          // Show spinner while loading Supabase data
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator color={theme.tint} />
            <Text style={{ color: theme.muted }}>Loading…</Text>
          </View>
        ) : (
          // Show game count OR login message
          <Text style={{ color: theme.muted }}>
            {upcomingCount === null
              ? "Log in to see nearby games."
              : `Upcoming games: ${upcomingCount}`}
          </Text>
        )}
      </View>

      {
        //////////////////////////////////////////////////////
        // NAVIGATION BUTTONS
        //////////////////////////////////////////////////////
      }
      <View style={{ marginTop: 26, gap: 12 }}>
        {/* LOGIN BUTTON */}
        <Pressable
          onPress={() => router.push("../auth")}
          style={{
            backgroundColor: theme.tint,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
            Log In
          </Text>
        </Pressable>

        {/* OPEN MAP BUTTON */}
        <Pressable
          onPress={() => router.push("../(tabs)/map")}
          style={{
            backgroundColor: theme.tint,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
            Open Map
          </Text>
        </Pressable>

        {/* CREATE GAME BUTTON */}
        <Pressable
          onPress={() => router.push("/create" as any)}
          style={{
            backgroundColor: theme.card,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "800", fontSize: 16 }}>
            Create a Game
          </Text>
        </Pressable>
      </View>
      {
        //////////////////////////////////////////////////////
        // USER TIP TEXT
        //////////////////////////////////////////////////////
      }
      <Text style={{ marginTop: 22, color: theme.muted, fontSize: 13 }}>
        Tip: Use the map to pan/zoom. Games refresh automatically based on
        what’s on-screen.
      </Text>
    </View>
  );
}
