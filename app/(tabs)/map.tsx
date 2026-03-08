// Expo + React imports
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
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
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800" }}>
          Map is mobile-only
        </Text>
        <Text style={{ marginTop: 8, color: "#555", textAlign: "center" }}>
          Use Expo Go on iOS/Android to view the map.
        </Text>
      </View>
    );
  }

  // Only require native maps on iOS/Android
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

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  //////////////////////////////////////////////////////
  // FETCH GAMES FROM SUPABASE BASED ON MAP VIEW
  //////////////////////////////////////////////////////

  async function fetchGamesInRegion(r: Region) {
    setLoadingGames(true);
    setSelected(null);
    setPlayerCount(null);

    const { minLat, maxLat, minLng, maxLng } = regionToBounds(r);

    // Only show active games; only future-ish games
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("games")
      .select("id,title,starts_at,location_name,lat,lng,max_players,status")
      .eq("status", "active")
      .gte("starts_at", oneHourAgo)
      .gte("lat", minLat)
      .lte("lat", maxLat)
      .gte("lng", minLng)
      .lte("lng", maxLng)
      .order("starts_at", { ascending: true })
      .limit(200);

    setLoadingGames(false);

    if (error) {
      console.log("fetch games error", error);
      Alert.alert("Supabase error", error.message);
      setGames([]);
      return;
    }

    setGames((data ?? []) as Game[]);
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

  function scheduleFetch(r: Region) {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => {
      fetchGamesInRegion(r).catch((e) => console.log(e));
    }, 450);
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
    const { count, error } = await supabase
      .from("game_players")
      .select("user_id", { count: "exact", head: true })
      .eq("game_id", g.id);

    setLoadingCount(false);

    if (error) {
      console.log("count error", error);
      setPlayerCount(null);
      return;
    }
    setPlayerCount(count ?? 0);
  }

  //////////////////////////////////////////////////////
  // JOIN GAME
  //////////////////////////////////////////////////////

  async function joinSelectedGame() {
    if (!selected) return;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    const current = playerCount ?? 0;
    // Prevent joining full games
    if (current >= selected.max_players) {
      Alert.alert(
        "Game full",
        "This game already has the maximum number of players.",
      );
      return;
    }

    setJoining(true);

    const { error } = await supabase.from("game_players").insert({
      game_id: selected.id,
      user_id: userId,
    });

    setJoining(false);

    if (error) {
      // If user already joined, Supabase will throw duplicate PK error; treat as joined
      console.log("join error", error);
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
    if (!userId) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    setJoining(true);

    const { error } = await supabase
      .from("game_players")
      .delete()
      .eq("game_id", selected.id)
      .eq("user_id", userId);

    setJoining(false);

    if (error) {
      console.log("leave error", error);
      Alert.alert("Leave failed", error.message);
      return;
    }

    setIsJoined(false);
    setPlayerCount(Math.max(0, (playerCount ?? 1) - 1));
  }

  //////////////////////////////////////////////////////
  // UI RENDER
  //////////////////////////////////////////////////////

  const headerText = useMemo(() => {
    if (loadingLocation) return "Getting your location…";
    if (loadingGames) return "Loading games…";
    return `${games.length} game(s) in view`;
  }, [loadingLocation, loadingGames, games.length]);

  if (loadingLocation || !region) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10 }}>{headerText}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Top status bar */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: 60,
          paddingHorizontal: 12,
        }}
      >
        <View
          style={{
            backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: 12,
            padding: 10,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {headerText}
          </Text>
        </View>
      </View>

      <MapView
        ref={(r: any) => {
          mapRef.current = r;
        }}
        style={{ flex: 1 }}
        initialRegion={region}
        onRegionChangeComplete={(r: any) => {
          const next: Region = {
            latitude: r.latitude,
            longitude: r.longitude,
            latitudeDelta: r.latitudeDelta,
            longitudeDelta: r.longitudeDelta,
          };
          setRegion(next);
          scheduleFetch(next);
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {games.map((g) => (
          <Marker
            key={g.id}
            coordinate={{ latitude: g.lat, longitude: g.lng }}
            title={g.title}
            description={g.location_name ?? undefined}
            onPress={() => onSelectGame(g)}
          />
        ))}
      </MapView>

      {/* Bottom preview card */}
      {selected && (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 18 }}>
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: 14,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800" }}>
              {selected.title}
            </Text>
            <Text style={{ marginTop: 4 }}>
              {selected.location_name ?? "Pinned location"}
            </Text>
            <Text style={{ marginTop: 4 }}>
              {formatStartsAt(selected.starts_at)}
            </Text>

            <Text style={{ marginTop: 10, fontWeight: "700" }}>
              Players:{" "}
              {loadingCount
                ? "…"
                : playerCount !== null
                  ? `${playerCount}/${selected.max_players}`
                  : "—"}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => setSelected(null)}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#eee",
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontWeight: "700" }}>Close</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (isJoined) leaveSelectedGame();
                  else joinSelectedGame();
                }}
                disabled={joining || loadingCount || isJoined === null}
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#111",
                  flex: 1,
                  alignItems: "center",
                  opacity:
                    joining || loadingCount || isJoined === null ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "white", fontWeight: "800" }}>
                  {joining ? "Working…" : isJoined ? "Leave" : "Join"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      <Pressable
        onPress={() => router.push("../create")}
        style={{
          position: "absolute",
          right: 18,
          bottom: 90,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#111",
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
        }}
      >
        <Text style={{ color: "white", fontSize: 28, fontWeight: "900" }}>
          +
        </Text>
      </Pressable>
    </View>
  );
}
