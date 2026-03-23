//////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////

// Expo location for GPS access
import * as Location from "expo-location";

// Expo Router navigation
import { router } from "expo-router";

// React core + hooks
import React, { useEffect, useState } from "react";

// React Native UI components
import {
  Alert,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

// Theme utilities
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Supabase client for database access
import { supabase } from "../src/lib/supabase";

//////////////////////////////////////////////////////
// TYPE DEFINITIONS
//////////////////////////////////////////////////////

// Represents the visible map region
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

//////////////////////////////////////////////////////
// MAIN CREATE GAME SCREEN COMPONENT
//////////////////////////////////////////////////////

export default function CreateGameScreen() {
  //////////////////////////////////////////////////////
  // THEME SETUP
  //////////////////////////////////////////////////////

  // Detect device theme (light or dark)
  const colorScheme = useColorScheme();

  // Load correct colors from theme file
  const theme = Colors[colorScheme ?? "light"];

  //////////////////////////////////////////////////////
  // WEB FALLBACK
  //////////////////////////////////////////////////////

  // react-native-maps does not run on web
  // If user opens the web version, show a fallback message
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
          Create Game is mobile-only
        </Text>
      </View>
    );
  }

  // Load native maps only on iOS / Android
  const MapView = require("react-native-maps").default;
  const { Marker } = require("react-native-maps");

  //////////////////////////////////////////////////////
  // STATE VARIABLES
  //////////////////////////////////////////////////////

  // Controls loading state while location data is being fetched
  const [loading, setLoading] = useState(true);

  // Controls loading state while game is being created
  const [saving, setSaving] = useState(false);

  // Stores current map region
  const [region, setRegion] = useState<Region | null>(null);

  // Stores pin location for the new game
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);

  // Form fields
  const [title, setTitle] = useState("Pickup Volleyball");
  const [locationName, setLocationName] = useState("");
  const [startsAt, setStartsAt] = useState(""); // keep simple for MVP
  const [maxPlayers, setMaxPlayers] = useState("12");

  //////////////////////////////////////////////////////
  // GET LOCATION ON LOAD
  //////////////////////////////////////////////////////

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Ask permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        Alert.alert("Location required", "Enable location to create a game.");
        return;
      }

      // Get user's current location
      const loc = await Location.getCurrentPositionAsync({});
      const initialRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };

      // Set map region + initial game pin
      setRegion(initialRegion);
      setPin({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      // Default game start time = 2 hours from now
      const twoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);
      setStartsAt(twoHours.toISOString());

      setLoading(false);
    })();
  }, []);

  //////////////////////////////////////////////////////
  // HELPER: PARSE MAX PLAYERS INPUT
  //////////////////////////////////////////////////////

  function parseMaxPlayers() {
    const n = parseInt(maxPlayers, 10);
    if (Number.isNaN(n)) return null;
    return n;
  }

  //////////////////////////////////////////////////////
  // CREATE GAME
  //////////////////////////////////////////////////////

  async function onCreate() {
    if (!pin || !region) return;

    // Check if a user is signed in
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      Alert.alert("Not signed in", "Please sign in again.");
      router.replace("/auth");
      return;
    }

    // Validate max players
    const mp = parseMaxPlayers();
    if (!mp || mp < 2 || mp > 30) {
      Alert.alert("Max players", "Enter a number between 2 and 30.");
      return;
    }

    // StartsAt: must be a valid date
    const dt = new Date(startsAt);
    if (Number.isNaN(dt.getTime())) {
      Alert.alert(
        "Start time",
        "Enter a valid date/time. Tip: use ISO like 2026-02-20T18:00:00.000Z",
      );
      return;
    }

    setSaving(true);

    // Insert game into Supabase
    const { error } = await supabase.from("games").insert({
      host_id: userData.user.id,
      title: title.trim() || "Pickup Volleyball",
      starts_at: dt.toISOString(),
      location_name: locationName.trim() || null,
      lat: pin.lat,
      lng: pin.lng,
      max_players: mp,
      skill_min: 1,
      skill_max: 5,
      status: "active",
    });

    setSaving(false);

    if (error) {
      console.log("create game error", error);
      Alert.alert("Create failed", error.message);
      return;
    }

    // Success message + go back to map
    Alert.alert("Created!", "Your game is live on the map.");
    router.back();
  }

  //////////////////////////////////////////////////////
  // LOADING UI
  //////////////////////////////////////////////////////

  if (loading || !region || !pin) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <Text style={{ color: theme.text }}>Loading…</Text>
      </View>
    );
  }

  //////////////////////////////////////////////////////
  // UI RENDER
  //////////////////////////////////////////////////////

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* MAP SECTION */}
      <View style={{ height: "55%" }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={region}
          onLongPress={(e: any) => {
            // Move pin to new location when user long-presses map
            const c = e.nativeEvent.coordinate;
            setPin({ lat: c.latitude, lng: c.longitude });
          }}
        >
          <Marker
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            draggable
            onDragEnd={(e: any) => {
              // Update pin location when marker is dragged
              const c = e.nativeEvent.coordinate;
              setPin({ lat: c.latitude, lng: c.longitude });
            }}
            title="Game location"
          />
        </MapView>

        {/* MAP INSTRUCTION BANNER */}
        <View style={{ position: "absolute", top: 14, left: 14, right: 14 }}>
          <View
            style={{
              backgroundColor: "rgba(37,99,235,0.9)",
              padding: 10,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              Long-press the map to move the pin
            </Text>
          </View>
        </View>
      </View>

      {/* FORM SECTION */}
      <View style={{ flex: 1, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: theme.text }}>
          Create Game
        </Text>

        {/* TITLE INPUT */}
        <Text style={{ fontWeight: "700", color: theme.text }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 12,
            color: theme.text,
            backgroundColor: theme.card,
          }}
          placeholderTextColor={theme.muted}
        />

        {/* LOCATION NAME INPUT */}
        <Text style={{ fontWeight: "700", color: theme.text }}>
          Location name (optional)
        </Text>
        <TextInput
          value={locationName}
          onChangeText={setLocationName}
          placeholder="Cary Park Courts"
          placeholderTextColor={theme.muted}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 12,
            color: theme.text,
            backgroundColor: theme.card,
          }}
        />

        {/* START TIME INPUT */}
        <Text style={{ fontWeight: "700", color: theme.text }}>
          Starts at (ISO for now)
        </Text>
        <TextInput
          value={startsAt}
          onChangeText={setStartsAt}
          placeholder="2026-02-20T18:00:00.000Z"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 12,
            color: theme.text,
            backgroundColor: theme.card,
          }}
        />

        {/* MAX PLAYERS INPUT */}
        <Text style={{ fontWeight: "700", color: theme.text }}>
          Max players
        </Text>
        <TextInput
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          keyboardType="number-pad"
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 12,
            color: theme.text,
            backgroundColor: theme.card,
          }}
        />

        {/* CREATE BUTTON */}
        <Pressable
          onPress={onCreate}
          disabled={saving}
          style={{
            marginTop: 6,
            backgroundColor: theme.tint,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            opacity: saving ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            {saving ? "Creating…" : "Create Game"}
          </Text>
        </Pressable>

        {/* CANCEL BUTTON */}
        <Pressable
          onPress={() => router.back()}
          style={{
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
      </View>
    </View>
  );
}
