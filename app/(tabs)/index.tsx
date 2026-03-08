// Expo Router navigation helper
import { router } from "expo-router";

// React + hooks
import React, { useEffect, useState } from "react";

// React Native UI components
import { ActivityIndicator, Pressable, Text, View } from "react-native";

// Supabase client for database access
import { supabase } from "../../src/lib/supabase";

//////////////////////////////////////////////////////
// HOME SCREEN
//////////////////////////////////////////////////////

export default function HomeScreen() {
  //////////////////////////////////////////////////////
  // STATE
  //////////////////////////////////////////////////////

  // Whether the app is currently loading data
  const [loading, setLoading] = useState(true);

  // Number of upcoming games (null = not logged in)
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);

  //////////////////////////////////////////////////////
  // LOAD UPCOMING GAME COUNT ON MOUNT
  //////////////////////////////////////////////////////

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Check if user is authenticated
      // If not logged in, we skip fetching games
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setUpcomingCount(null);
        setLoading(false);
        return;
      }

      // Current time in ISO format
      // Used to filter out past games
      const nowIso = new Date().toISOString();

      // Count how many future active games exist
      const { count, error } = await supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gte("starts_at", nowIso);

      // If query succeeds, store the count
      if (!error) {
        setUpcomingCount(count ?? 0);
      }

      setLoading(false);
    })();
  }, []);

  //////////////////////////////////////////////////////
  // UI RENDER
  //////////////////////////////////////////////////////

  return (
    <View style={{ flex: 1, padding: 18, justifyContent: "center" }}>
      {/* App title */}
      <Text style={{ fontSize: 34, fontWeight: "800" }}>VolleyConnect</Text>

      {/* Short app description */}
      <Text style={{ marginTop: 10, fontSize: 16, color: "#444" }}>
        Find nearby pickup volleyball games, join fast, and play.
      </Text>

      {/* Upcoming games status */}
      <View style={{ marginTop: 20 }}>
        {loading ? (
          // Loading indicator while fetching data
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ color: "#444" }}>Loading…</Text>
          </View>
        ) : (
          // Show count if logged in, otherwise prompt login
          <Text style={{ color: "#444" }}>
            {upcomingCount === null
              ? "Log in to see nearby games."
              : `Upcoming games: ${upcomingCount}`}
          </Text>
        )}
      </View>

      {/* Main action buttons */}
      <View style={{ marginTop: 26, gap: 12 }}>
        {/* Navigate to Auth screen */}
        <Pressable
          onPress={() => router.push("../auth")}
          style={{
            backgroundColor: "#111",
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
            Log In
          </Text>
        </Pressable>

        {/* Open Map tab */}
        <Pressable
          onPress={() => router.push("../(tabs)/map")}
          style={{
            backgroundColor: "#111",
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
            Open Map
          </Text>
        </Pressable>

        {/* Navigate to Create Game screen */}
        <Pressable
          onPress={() => router.push("../(tabs)/create")}
          style={{
            backgroundColor: "#eee",
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#111", fontWeight: "800", fontSize: 16 }}>
            Create a Game
          </Text>
        </Pressable>
      </View>

      {/* Helpful usage tip */}
      <Text style={{ marginTop: 22, color: "#666", fontSize: 13 }}>
        Tip: Use the map to pan/zoom. Games refresh automatically based on
        what’s on-screen.
      </Text>
    </View>
  );
}
