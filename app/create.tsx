import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../src/lib/supabase";

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export default function CreateGameScreen() {
  // Web fallback
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
          Create Game is mobile-only
        </Text>
      </View>
    );
  }

  const MapView = require("react-native-maps").default;
  const { Marker } = require("react-native-maps");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [region, setRegion] = useState<Region | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);

  const [title, setTitle] = useState("Pickup Volleyball");
  const [locationName, setLocationName] = useState("");
  const [startsAt, setStartsAt] = useState(""); // keep simple for MVP
  const [maxPlayers, setMaxPlayers] = useState("12");

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoading(false);
        Alert.alert("Location required", "Enable location to create a game.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const initialRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };

      setRegion(initialRegion);
      setPin({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      // default starts_at: 2 hours from now (ISO)
      const twoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);
      setStartsAt(twoHours.toISOString());

      setLoading(false);
    })();
  }, []);

  function parseMaxPlayers() {
    const n = parseInt(maxPlayers, 10);
    if (Number.isNaN(n)) return null;
    return n;
  }

  async function onCreate() {
    if (!pin || !region) return;

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      Alert.alert("Not signed in", "Please sign in again.");
      router.replace("/auth");
      return;
    }

    const mp = parseMaxPlayers();
    if (!mp || mp < 2 || mp > 30) {
      Alert.alert("Max players", "Enter a number between 2 and 30.");
      return;
    }

    // StartsAt: must be to a valid date
    const dt = new Date(startsAt);
    if (Number.isNaN(dt.getTime())) {
      Alert.alert(
        "Start time",
        "Enter a valid date/time. Tip: use ISO like 2026-02-20T18:00:00.000Z",
      );
      return;
    }

    setSaving(true);

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

    Alert.alert("Created!", "Your game is live on the map.");
    router.back(); // goes back to Map tab
  }

  if (loading || !region || !pin) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: "55%" }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={region}
          onLongPress={(e: any) => {
            const c = e.nativeEvent.coordinate;
            setPin({ lat: c.latitude, lng: c.longitude });
          }}
        >
          <Marker
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            draggable
            onDragEnd={(e: any) => {
              const c = e.nativeEvent.coordinate;
              setPin({ lat: c.latitude, lng: c.longitude });
            }}
            title="Game location"
          />
        </MapView>

        <View style={{ position: "absolute", top: 14, left: 14, right: 14 }}>
          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.7)",
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

      <View style={{ flex: 1, padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: "800" }}>Create Game</Text>

        <Text style={{ fontWeight: "700" }}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 12,
            padding: 12,
          }}
        />

        <Text style={{ fontWeight: "700" }}>Location name (optional)</Text>
        <TextInput
          value={locationName}
          onChangeText={setLocationName}
          placeholder="Cary Park Courts"
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 12,
            padding: 12,
          }}
        />

        <Text style={{ fontWeight: "700" }}>Starts at (ISO for now)</Text>
        <TextInput
          value={startsAt}
          onChangeText={setStartsAt}
          placeholder="2026-02-20T18:00:00.000Z"
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 12,
            padding: 12,
          }}
        />

        <Text style={{ fontWeight: "700" }}>Max players</Text>
        <TextInput
          value={maxPlayers}
          onChangeText={setMaxPlayers}
          keyboardType="number-pad"
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 12,
            padding: 12,
          }}
        />

        <Pressable
          onPress={onCreate}
          disabled={saving}
          style={{
            marginTop: 6,
            backgroundColor: "#111",
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

        <Pressable
          onPress={() => router.back()}
          style={{
            backgroundColor: "#eee",
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "800" }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
