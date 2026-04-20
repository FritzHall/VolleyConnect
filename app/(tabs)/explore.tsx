//////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////

// React core + hooks
import React, { useCallback, useState } from "react";

// React Native UI components
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

// Expo location for current user coordinates
import * as Location from "expo-location";

// React Navigation focus hook
import { useFocusEffect } from "@react-navigation/native";

// Theme imports
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Supabase client for database access
import { supabase } from "../../src/lib/supabase";

//////////////////////////////////////////////////////
// TYPE DEFINITIONS
//////////////////////////////////////////////////////

// Represents one nearby game record from Supabase "games" table
type Game = {
  id: string;
  title: string;
  starts_at: string;
  location_name: string | null;
  lat: number;
  lng: number;
  max_players: number;
  status: "active" | "cancelled" | "completed";
};

//////////////////////////////////////////////////////
// HELPER FUNCTION
//////////////////////////////////////////////////////

// Create a simple bounding box around the user's location
// This is used to fetch games in the nearby area
function getBounds(latitude: number, longitude: number, delta = 0.2) {
  return {
    minLat: latitude - delta,
    maxLat: latitude + delta,
    minLng: longitude - delta,
    maxLng: longitude + delta,
  };
}

//////////////////////////////////////////////////////
// MAIN EXPLORE SCREEN COMPONENT
//////////////////////////////////////////////////////

export default function ExploreScreen() {
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

  // List of nearby games
  const [games, setGames] = useState<Game[]>([]);

  // Loading state while data is fetched
  const [loading, setLoading] = useState(true);

  // Stores player counts by game id
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Stores whether the current user joined each game
  const [joinedMap, setJoinedMap] = useState<Record<string, boolean>>({});

  // Tracks which game is currently processing a join/leave action
  const [busyGameId, setBusyGameId] = useState<string | null>(null);

  //////////////////////////////////////////////////////
  // LOAD NEARBY GAMES ON SCREEN FOCUS
  //////////////////////////////////////////////////////

  useFocusEffect(
    useCallback(() => {
      const loadNearbyGames = async () => {
        setLoading(true);

        // Get currently signed-in user
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
          setLoading(false);
          return;
        }

        // Ask permission for location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLoading(false);
          Alert.alert(
            "Location required",
            "Enable location to find nearby games.",
          );
          return;
        }

        // Get current user coordinates
        const loc = await Location.getCurrentPositionAsync({});
        const { minLat, maxLat, minLng, maxLng } = getBounds(
          loc.coords.latitude,
          loc.coords.longitude,
          0.2,
        );

        // Only show future active games
        const nowIso = new Date().toISOString();

        //////////////////////////////////////////////////////
        // FETCH NEARBY GAMES
        //////////////////////////////////////////////////////

        const { data, error } = await supabase
          .from("games")
          .select("id,title,starts_at,location_name,lat,lng,max_players,status")
          .eq("status", "active")
          .gte("starts_at", nowIso)
          .gte("lat", minLat)
          .lte("lat", maxLat)
          .gte("lng", minLng)
          .lte("lng", maxLng)
          .order("starts_at", { ascending: true });

        if (error) {
          setLoading(false);
          Alert.alert("Error", error.message);
          return;
        }

        const fetchedGames = (data ?? []) as Game[];
        setGames(fetchedGames);

        //////////////////////////////////////////////////////
        // FETCH PLAYER COUNTS + JOINED STATUS
        //////////////////////////////////////////////////////

        const nextCounts: Record<string, number> = {};
        const nextJoinedMap: Record<string, boolean> = {};

        for (const game of fetchedGames) {
          // Count players in this game
          const { count } = await supabase
            .from("game_players")
            .select("user_id", { count: "exact", head: true })
            .eq("game_id", game.id);

          nextCounts[game.id] = count ?? 0;

          // Check whether current user joined this game
          const { data: joinedData } = await supabase
            .from("game_players")
            .select("user_id")
            .eq("game_id", game.id)
            .eq("user_id", userId)
            .maybeSingle();

          nextJoinedMap[game.id] = !!joinedData;
        }

        setCounts(nextCounts);
        setJoinedMap(nextJoinedMap);
        setLoading(false);
      };

      loadNearbyGames();
    }, []),
  );

  //////////////////////////////////////////////////////
  // JOIN GAME
  //////////////////////////////////////////////////////

  async function joinGame(game: Game) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const currentCount = counts[game.id] ?? 0;

    // Prevent joining games that are already full
    if (currentCount >= game.max_players) {
      Alert.alert("Game full", "This game already reached max players.");
      return;
    }

    setBusyGameId(game.id);

    const { error } = await supabase.from("game_players").insert({
      game_id: game.id,
      user_id: userId,
    });

    setBusyGameId(null);

    if (error) {
      Alert.alert("Join failed", error.message);
      return;
    }

    // Update UI immediately
    setJoinedMap((prev) => ({ ...prev, [game.id]: true }));
    setCounts((prev) => ({ ...prev, [game.id]: currentCount + 1 }));
  }

  //////////////////////////////////////////////////////
  // LEAVE GAME
  //////////////////////////////////////////////////////

  async function leaveGame(game: Game) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    setBusyGameId(game.id);

    const { error } = await supabase
      .from("game_players")
      .delete()
      .eq("game_id", game.id)
      .eq("user_id", userId);

    setBusyGameId(null);

    if (error) {
      Alert.alert("Leave failed", error.message);
      return;
    }

    // Update UI immediately
    setJoinedMap((prev) => ({ ...prev, [game.id]: false }));
    setCounts((prev) => ({
      ...prev,
      [game.id]: Math.max(0, (prev[game.id] ?? 1) - 1),
    }));
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
      <Text style={{ fontSize: 22, fontWeight: "800", color: theme.text }}>
        Explore Games
      </Text>

      {/* DESCRIPTION */}
      <Text style={{ marginTop: 6, color: theme.muted }}>
        Browse nearby pickup volleyball games without using the map.
      </Text>

      {/* LOADING STATE */}
      {loading && (
        <View
          style={{
            marginTop: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ActivityIndicator color={theme.tint} />
          <Text style={{ color: theme.text }}>Loading nearby games…</Text>
        </View>
      )}

      {/* GAME LIST */}
      <FlatList
        style={{ marginTop: 16 }}
        data={games}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20, gap: 12 }}
        renderItem={({ item }) => {
          const joined = joinedMap[item.id] ?? false;
          const count = counts[item.id] ?? 0;
          const busy = busyGameId === item.id;

          return (
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              {/* GAME TITLE */}
              <Text
                style={{
                  fontWeight: "800",
                  fontSize: 16,
                  color: theme.text,
                }}
              >
                {item.title}
              </Text>

              {/* GAME DETAILS */}
              <Text style={{ marginTop: 6, color: theme.muted }}>
                {new Date(item.starts_at).toLocaleString()}
              </Text>

              <Text style={{ marginTop: 2, color: theme.muted }}>
                {item.location_name ?? "Pinned location"}
              </Text>

              <Text style={{ marginTop: 10, color: theme.text }}>
                Players: {count}/{item.max_players}
              </Text>

              {/* ACTION BUTTON */}
              <Pressable
                onPress={() => {
                  if (busy) return;
                  if (joined) leaveGame(item);
                  else joinGame(item);
                }}
                disabled={busy}
                style={{
                  marginTop: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: joined ? theme.card : theme.tint,
                  borderWidth: joined ? 1 : 0,
                  borderColor: joined ? theme.border : "transparent",
                  alignItems: "center",
                  opacity: busy ? 0.7 : 1,
                }}
              >
                <Text
                  style={{
                    color: joined ? theme.text : "white",
                    fontWeight: "800",
                  }}
                >
                  {busy ? "Working…" : joined ? "Leave Game" : "Join Game"}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ marginTop: 14, color: theme.muted }}>
              No nearby games found right now.
            </Text>
          ) : null
        }
      />
    </View>
  );
}
