// React core + hooks
import React, { useEffect, useState } from "react";

// React Native UI components
import { ActivityIndicator, FlatList, Text, View } from "react-native";

// Supabase client for database access
import { supabase } from "../../src/lib/supabase";

//////////////////////////////////////////////////////
// TYPE DEFINITIONS
//////////////////////////////////////////////////////

// Represents one game record from Supabase "games" table
type Game = {
  id: string;
  title: string;
  starts_at: string;
  location_name: string | null;
};

//////////////////////////////////////////////////////
// MAIN EXPLORE SCREEN COMPONENT
//////////////////////////////////////////////////////

export default function ExploreScreen() {
  //////////////////////////////////////////////////////
  // STATE VARIABLES
  //////////////////////////////////////////////////////

  // List of games fetched from Supabase
  const [games, setGames] = useState<Game[]>([]);

  // Controls loading spinner while data is being fetched
  const [loading, setLoading] = useState(true);

  // Stores any error message returned from Supabase
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  //////////////////////////////////////////////////////
  // FETCH GAMES WHEN SCREEN LOADS
  //////////////////////////////////////////////////////

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMsg(null);

      //////////////////////////////////////////////////////
      // QUERY SUPABASE DATABASE
      //////////////////////////////////////////////////////
      // Pull up to 20 games ordered by start time
      // This is mainly used as a connection test / preview
      const { data, error } = await supabase
        .from("games")
        .select("id,title,starts_at,location_name")
        .order("starts_at", { ascending: true })
        .limit(20);

      //////////////////////////////////////////////////////
      // HANDLE RESULT
      //////////////////////////////////////////////////////

      if (error) {
        // If Supabase returns an error, store message + clear games
        setErrorMsg(error.message);
        setGames([]);
      } else {
        // Otherwise, store returned games into state
        setGames((data ?? []) as Game[]);
      }

      setLoading(false);
    };

    // Run the fetch function once when component mounts
    run();
  }, []);

  //////////////////////////////////////////////////////
  // UI RENDER
  //////////////////////////////////////////////////////

  return (
    <View style={{ flex: 1, padding: 18 }}>
      {/* Screen Title */}
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Supabase Test</Text>
      {/* Description */}
      <Text style={{ marginTop: 6, color: "#555" }}>
        Pulling up to 20 games from your database.
      </Text>

      {/*LOADING STATE*/}
      {loading && (
        <View
          style={{
            marginTop: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ActivityIndicator />
          <Text>Loading…</Text>
        </View>
      )}
      {/*ERROR STATE*/}
      {errorMsg && (
        <Text style={{ marginTop: 14, color: "crimson" }}>
          Error: {errorMsg}
        </Text>
      )}
      {/*GAME LIST*/}
      <FlatList
        style={{ marginTop: 14 }}
        // Data source
        data={games}
        // Unique key for each item
        keyExtractor={(item) => item.id}
        // How each game item is rendered
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            {/* Game title */}
            <Text style={{ fontWeight: "700" }}>{item.title}</Text>

            {/* Location + time */}
            <Text style={{ color: "#555" }}>
              {item.location_name ?? "Pinned location"} •{" "}
              {new Date(item.starts_at).toLocaleString()}
            </Text>
          </View>
        )}
        //////////////////////////////////////////////////////
        // EMPTY STATE
        //////////////////////////////////////////////////////
        // Shown if no games exist and not loading
        ListEmptyComponent={
          !loading ? (
            <Text style={{ marginTop: 14, color: "#666" }}>
              No games found yet. Insert one in Supabase to test.
            </Text>
          ) : null
        }
      />
    </View>
  );
}
