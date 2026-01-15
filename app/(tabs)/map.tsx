import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { supabase } from "../../src/lib/supabase";

type Game = {
  id: string;
  title: string;
  starts_at: string;
  location_name: string | null;
  lat: number;
  lng: number;
  max_players: number;
  skill_min: number | null;
  skill_max: number | null;
  status: "active" | "cancelled" | "completed";
};

function regionToBounds(r: Region) {
  const minLat = r.latitude - r.latitudeDelta / 2;
  const maxLat = r.latitude + r.latitudeDelta / 2;
  const minLng = r.longitude - r.longitudeDelta / 2;
  const maxLng = r.longitude + r.longitudeDelta / 2;
  return { minLat, maxLat, minLng, maxLng };
}

function formatStartsAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);

  const [loadingLocation, setLoadingLocation] = useState(true);
  const [region, setRegion] = useState<Region | null>(null);

  const [loadingGames, setLoadingGames] = useState(false);
  const [games, setGames] = useState<Game[]>([]);

  const [selected, setSelected] = useState<Game | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Basic debounce so we don’t spam Supabase while panning
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingLocation(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLoadingLocation(false);
        Alert.alert("Location needed", "Enable location permission to find games near you.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const initial: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.06,   // zoom level (smaller = more zoom)
        longitudeDelta: 0.06,
      };
      setRegion(initial);
      setLoadingLocation(false);

      // initial fetch
      await fetchGamesInRegion(initial);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function ensureAuthedOrWarn() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      Alert.alert(
        "Not logged in",
        "Your database policies currently require login to view games. Add Auth next, or temporarily allow public read for games."
      );
      return false;
    }
    return true;
  }

  async function fetchGamesInRegion(r: Region) {
    const ok = await ensureAuthedOrWarn();
    if (!ok) return;

    const { minLat, maxLat, minLng, maxLng } = regionToBounds(r);

    setLoadingGames(true);
    setSelected(null);
    setPlayerCount(null);

    // Only show active future-ish games
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("games")
      .select("id,title,starts_at,location_name,lat,lng,max_players,skill_min,skill_max,status")
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
      Alert.alert("Error", error.message);
      return;
    }

    setGames((data ?? []) as Game[]);
  }

  function scheduleFetch(r: Region) {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => {
      fetchGamesInRegion(r).catch((e) => console.log(e));
    }, 450);
  }

  async function onSelectGame(g: Game) {
    setSelected(g);
    setPlayerCount(null);
    setLoadingCount(true);

    // Count players joined
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
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingTop: Platform.OS === "ios" ? 60 : 20, paddingHorizontal: 12 }}>
        <View style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 12, padding: 10 }}>
          <Text style={{ color: "white", fontWeight: "600" }}>{headerText}</Text>
        </View>
      </View>

      <MapView
        ref={(r) => {mapRef.current = r}}
        style={{ flex: 1 }}
        initialRegion={region}
        onRegionChangeComplete={(r) => {
          setRegion(r);
          scheduleFetch(r);
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

      {/* Bottom “selected game” card */}
      {selected && (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: 18 }}>
          <View style={{ backgroundColor: "white", borderRadius: 16, padding: 14, elevation: 4 }}>
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{selected.title}</Text>
            <Text style={{ marginTop: 4 }}>
              {selected.location_name ? selected.location_name : "Pinned location"}
            </Text>
            <Text style={{ marginTop: 4 }}>{formatStartsAt(selected.starts_at)}</Text>

            <Text style={{ marginTop: 8, fontWeight: "600" }}>
              Players:{" "}
              {loadingCount ? "…" : playerCount !== null ? `${playerCount}/${selected.max_players}` : "—"}
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => setSelected(null)}
                style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#eee", flex: 1, alignItems: "center" }}
              >
                <Text style={{ fontWeight: "600" }}>Close</Text>
              </Pressable>

              <Pressable
                onPress={() => Alert.alert("Next step", "We’ll wire Join/Leave next.")}
                style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#111", flex: 1, alignItems: "center" }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Join</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
