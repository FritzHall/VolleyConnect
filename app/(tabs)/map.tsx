// Expo + React imports
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

// React Navigation focus hook
import { useFocusEffect } from "@react-navigation/native";

// Theme imports
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Supabase client
import { supabase } from "../../src/lib/supabase";

//////////////////////////////////////////////////////
// TYPES
//////////////////////////////////////////////////////

// Represents a game row from Supabase "games" table
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

// Map region structure used by react-native-maps
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

//////////////////////////////////////////////////////
// HELPER FUNCTIONS
//////////////////////////////////////////////////////

// Convert a map region into a bounding box (min/max lat/lng)
// Used to fetch games only inside the visible map area
function regionToBounds(r: Region) {
  const minLat = r.latitude - r.latitudeDelta / 2;
  const maxLat = r.latitude + r.latitudeDelta / 2;
  const minLng = r.longitude - r.longitudeDelta / 2;
  const maxLng = r.longitude + r.longitudeDelta / 2;
  return { minLat, maxLat, minLng, maxLng };
}

// Convert ISO date into readable format for UI
function formatStartsAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

//////////////////////////////////////////////////////
// MAIN MAP SCREEN COMPONENT
//////////////////////////////////////////////////////

export default function MapScreen() {
  //////////////////////////////////////////////////////
  // THEME SETUP
  //////////////////////////////////////////////////////

  // Detect device theme (light or dark)
  const colorScheme = useColorScheme();

  // Load correct colors from theme file
  const theme = Colors[colorScheme ?? "light"];

  //////////////////////////////////////////////////////
  // WEB SAFETY FALLBACK
  //////////////////////////////////////////////////////
  // react-native-maps cannot run on web.
  // If someone opens web version, show message instead of crashing.
  if (Platform.OS === "web") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800", color: theme.text }}>
          Map is mobile-only
        </Text>
      </View>
    );
  }

  // Load native map only on iOS/Android
  const MapView = require("react-native-maps").default;
  const { Marker } = require("react-native-maps");

  //////////////////////////////////////////////////////
  // STATE VARIABLES
  //////////////////////////////////////////////////////

  const mapRef = useRef<any>(null);

  // Location + region
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [region, setRegion] = useState<Region | null>(null);

  // Games loaded from Supabase
  const [loadingGames, setLoadingGames] = useState(false);
  const [games, setGames] = useState<Game[]>([]);

  // Selected game (when user taps a pin)
  const [selected, setSelected] = useState<Game | null>(null);

  // Player count for selected game
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Join/Leave state
  const [isJoined, setIsJoined] = useState<boolean | null>(null);
  const [joining, setJoining] = useState(false);

  // Timer to debounce map movement fetches
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  //////////////////////////////////////////////////////
  // GET USER LOCATION ON LOAD
  //////////////////////////////////////////////////////

  useFocusEffect(
    useCallback(() => {
      const loadInitialMap = async () => {
        // If we already have a region, just refresh the games
        if (region) {
          await fetchGamesInRegion(region);
          return;
        }

        setLoadingLocation(true);

        // Ask permission for location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLoadingLocation(false);
          Alert.alert(
            "Location required",
            "Enable location to find games near you.",
          );
          return;
        }

        // Get user's GPS coordinates
        const loc = await Location.getCurrentPositionAsync({});
        const initial: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        };

        setRegion(initial);
        setLoadingLocation(false);

        // Load games around user
        await fetchGamesInRegion(initial);
      };

      loadInitialMap();
    }, [region]),
  );

  //////////////////////////////////////////////////////
  // FETCH GAMES FROM SUPABASE BASED ON MAP VIEW
  //////////////////////////////////////////////////////

  async function fetchGamesInRegion(r: Region) {
    setLoadingGames(true);
    setSelected(null);
    setPlayerCount(null);

    const { minLat, maxLat, minLng, maxLng } = regionToBounds(r);

    const { data, error } = await supabase
      .from("games")
      .select("id,title,starts_at,location_name,lat,lng,max_players,status")
      .eq("status", "active")
      .gte("lat", minLat)
      .lte("lat", maxLat)
      .gte("lng", minLng)
      .lte("lng", maxLng);

    setLoadingGames(false);

    if (error) {
      Alert.alert("Supabase error", error.message);
      return;
    }

    setGames(data ?? []);
  }

  //////////////////////////////////////////////////////
  // CHECK IF CURRENT USER ALREADY JOINED THIS GAME
  //////////////////////////////////////////////////////

  async function checkIfJoined(gameId: string) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setIsJoined(null);
      return;
    }

    const { data, error } = await supabase
      .from("game_players")
      .select("user_id")
      .eq("game_id", gameId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.log("check join error", error);
      setIsJoined(null);
      return;
    }

    // if row exists → user joined
    setIsJoined(!!data);
  }

  //////////////////////////////////////////////////////
  // WHEN USER TAPS A PIN
  //////////////////////////////////////////////////////

  async function onSelectGame(g: Game) {
    setSelected(g);
    setPlayerCount(null);
    setLoadingCount(true);

    // Check join status
    setIsJoined(null);
    await checkIfJoined(g.id);

    // Get total player count
    const { count } = await supabase
      .from("game_players")
      .select("user_id", { count: "exact", head: true })
      .eq("game_id", g.id);

    setLoadingCount(false);
    setPlayerCount(count ?? 0);
  }

  //////////////////////////////////////////////////////
  // JOIN GAME
  //////////////////////////////////////////////////////

  async function joinSelectedGame() {
    if (!selected) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    const current = playerCount ?? 0;

    // Prevent joining full games
    if (current >= selected.max_players) {
      Alert.alert("Game full", "Max players reached.");
      return;
    }

    setJoining(true);

    const { error } = await supabase.from("game_players").insert({
      game_id: selected.id,
      user_id: userId,
    });

    setJoining(false);

    if (error) {
      Alert.alert("Join failed", error.message);
      return;
    }

    setIsJoined(true);
    setPlayerCount(current + 1);
  }

  //////////////////////////////////////////////////////
  // LEAVE GAME
  //////////////////////////////////////////////////////

  async function leaveSelectedGame() {
    if (!selected) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    setJoining(true);

    const { error } = await supabase
      .from("game_players")
      .delete()
      .eq("game_id", selected.id)
      .eq("user_id", userId);

    setJoining(false);

    if (error) {
      Alert.alert("Leave failed", error.message);
      return;
    }

    setIsJoined(false);
    setPlayerCount(Math.max(0, (playerCount ?? 1) - 1));
  }

  //////////////////////////////////////////////////////
  // REFRESH GAMES WHEN MAP MOVES
  //////////////////////////////////////////////////////

  function scheduleFetch(r: Region) {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);

    fetchTimer.current = setTimeout(() => {
      fetchGamesInRegion(r);
    }, 350);
  }

  //////////////////////////////////////////////////////
  // HEADER TEXT
  //////////////////////////////////////////////////////

  const headerText = useMemo(() => {
    if (loadingLocation) return "Getting your location…";
    if (loadingGames) return "Refreshing games…";
    return `${games.length} game(s) in view`;
  }, [loadingLocation, loadingGames, games.length]);

  //////////////////////////////////////////////////////
  // LOADING UI
  //////////////////////////////////////////////////////

  if (loadingLocation || !region) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.tint} />
        <Text style={{ color: theme.text, marginTop: 8 }}>
          Getting location…
        </Text>
      </View>
    );
  }

  //////////////////////////////////////////////////////
  // UI RENDER
  //////////////////////////////////////////////////////

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* TOP STATUS BAR */}
      <View
        style={{
          position: "absolute",
          top: 14,
          left: 14,
          right: 14,
          zIndex: 10,
        }}
      >
        <View
          style={{
            backgroundColor: "rgba(37,99,235,0.9)",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {headerText}
          </Text>
        </View>
      </View>

      {/* MAP */}
      <MapView
        ref={(r: any) => (mapRef.current = r)}
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation
        onRegionChangeComplete={(r: Region) => {
          setRegion(r);
          scheduleFetch(r);
        }}
      >
        {games.map((g) => (
          <Marker
            key={g.id}
            coordinate={{ latitude: g.lat, longitude: g.lng }}
            title={g.title}
            onPress={() => onSelectGame(g)}
          />
        ))}
      </MapView>

      {/* BOTTOM CARD */}
      {selected && (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 18 }}>
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontWeight: "800", color: theme.text }}>
              {selected.title}
            </Text>

            <Text style={{ color: theme.muted, marginTop: 4 }}>
              {formatStartsAt(selected.starts_at)}
            </Text>

            <Text style={{ marginTop: 10, color: theme.text }}>
              Players: {loadingCount ? "…" : playerCount}/{selected.max_players}
            </Text>

            <Pressable
              onPress={() =>
                isJoined ? leaveSelectedGame() : joinSelectedGame()
              }
              disabled={joining || loadingCount || isJoined === null}
              style={{
                marginTop: 12,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: theme.tint,
                alignItems: "center",
                opacity: joining || loadingCount || isJoined === null ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>
                {joining ? "Working…" : isJoined ? "Leave" : "Join"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* CREATE GAME BUTTON */}
      <Pressable
        onPress={() => router.push("/create" as any)}
        style={{
          position: "absolute",
          right: 18,
          bottom: 90,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.tint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 28 }}>+</Text>
      </Pressable>
    </View>
  );
}
