//////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////

// Expo Router is used for navigation between screens
import { router } from "expo-router";

// React hooks
import React, { useCallback, useState } from "react";

// React Native UI components
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

// React Navigation focus hook
import { useFocusEffect } from "@react-navigation/native";

// Theme imports
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Supabase client for database + authentication
import { supabase } from "../../src/lib/supabase";

//////////////////////////////////////////////////////
// TYPE DEFINITIONS
//////////////////////////////////////////////////////

// Represents a single upcoming game preview
type Game = {
  id: string;
  title: string;
  starts_at: string;
  location_name: string | null;
};

//////////////////////////////////////////////////////
// HOME SCREEN COMPONENT
//////////////////////////////////////////////////////

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
  const [upcomingCount, setUpcomingCount] = useState(0);

  // Number of games the current user has joined
  const [joinedCount, setJoinedCount] = useState(0);

  // Current user's display name
  const [displayName, setDisplayName] = useState("Player");

  // Stores the next upcoming game
  const [nextGame, setNextGame] = useState<Game | null>(null);

  //////////////////////////////////////////////////////
  // LOAD HOME SCREEN DATA (AUTO REFRESH ON SCREEN FOCUS)
  //////////////////////////////////////////////////////

  useFocusEffect(
    useCallback(() => {
      const loadHomeData = async () => {
        setLoading(true);

        // Get currently signed-in user
        const { data: userData } = await supabase.auth.getUser();

        // If no user is signed in, stop loading
        if (!userData.user) {
          setLoading(false);
          return;
        }

        const userId = userData.user.id;

        //////////////////////////////////////////////////////
        // LOAD PROFILE NAME
        //////////////////////////////////////////////////////

        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();

        if (profileData?.display_name) {
          setDisplayName(profileData.display_name);
        } else {
          setDisplayName("Player");
        }

        // Current time — we only want future games
        const nowIso = new Date().toISOString();

        //////////////////////////////////////////////////////
        // FETCH UPCOMING GAME COUNT
        //////////////////////////////////////////////////////

        const { count: upcoming } = await supabase
          .from("games")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .gte("starts_at", nowIso);

        setUpcomingCount(upcoming ?? 0);

        //////////////////////////////////////////////////////
        // FETCH JOINED GAME COUNT
        //////////////////////////////////////////////////////

        const { count: joined } = await supabase
          .from("game_players")
          .select("user_id", { count: "exact", head: true })
          .eq("user_id", userId);

        setJoinedCount(joined ?? 0);

        //////////////////////////////////////////////////////
        // FETCH NEXT UPCOMING GAME
        //////////////////////////////////////////////////////

        const { data: next } = await supabase
          .from("games")
          .select("id,title,starts_at,location_name")
          .eq("status", "active")
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (next) {
          setNextGame(next);
        } else {
          setNextGame(null);
        }

        setLoading(false);
      };

      loadHomeData();
    }, []),
  );

  //////////////////////////////////////////////////////
  // UI RENDER
  //////////////////////////////////////////////////////

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: theme.background,
      }}
      contentContainerStyle={{
        padding: 18,
        paddingBottom: 32,
      }}
      showsVerticalScrollIndicator={false}
    >
      {
        //////////////////////////////////////////////////////
        // WELCOME HEADER
        //////////////////////////////////////////////////////
      }
      <Text
        style={{
          fontSize: 28,
          fontWeight: "800",
          color: theme.text,
        }}
      >
        Welcome back,
      </Text>

      <Text
        style={{
          marginTop: 4,
          fontSize: 32,
          fontWeight: "900",
          color: theme.tint,
        }}
      >
        {displayName} 👋
      </Text>

      <Text
        style={{
          marginTop: 10,
          fontSize: 16,
          color: theme.muted,
        }}
      >
        Find nearby pickup volleyball games, join fast, and play.
      </Text>
      {
        //////////////////////////////////////////////////////
        // LOADING STATE
        //////////////////////////////////////////////////////
      }
      {loading && (
        <View
          style={{
            marginTop: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ActivityIndicator color={theme.tint} />
          <Text style={{ color: theme.muted }}>Loading your dashboard…</Text>
        </View>
      )}
      {
        //////////////////////////////////////////////////////
        // STATS SECTION
        //////////////////////////////////////////////////////
      }
      {!loading && (
        <View
          style={{
            flexDirection: "row",
            marginTop: 22,
            gap: 12,
          }}
        >
          {/* UPCOMING GAMES CARD */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.card,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              Upcoming Games
            </Text>

            <Text
              style={{
                marginTop: 8,
                fontSize: 24,
                fontWeight: "800",
                color: theme.text,
              }}
            >
              {upcomingCount}
            </Text>
          </View>

          {/* JOINED GAMES CARD */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.card,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ color: theme.muted, fontSize: 12 }}>
              Joined Games
            </Text>

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
      )}
      {
        //////////////////////////////////////////////////////
        // NEXT GAME CARD
        //////////////////////////////////////////////////////
      }
      {!loading && (
        <View
          style={{
            marginTop: 20,
            backgroundColor: theme.card,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: theme.text,
            }}
          >
            Next Game
          </Text>

          {nextGame ? (
            <>
              <Text
                style={{
                  marginTop: 10,
                  fontWeight: "700",
                  color: theme.text,
                }}
              >
                {nextGame.title}
              </Text>

              <Text style={{ marginTop: 4, color: theme.muted }}>
                {new Date(nextGame.starts_at).toLocaleString()}
              </Text>

              <Text style={{ marginTop: 2, color: theme.muted }}>
                {nextGame.location_name ?? "Pinned location"}
              </Text>
            </>
          ) : (
            <Text
              style={{
                marginTop: 10,
                color: theme.muted,
              }}
            >
              No upcoming games yet.
            </Text>
          )}
        </View>
      )}
      {
        //////////////////////////////////////////////////////
        // ACTION BUTTONS
        //////////////////////////////////////////////////////
      }
      <View style={{ marginTop: 24, gap: 12 }}>
        {/* OPEN MAP BUTTON */}
        <Pressable
          onPress={() => router.push("../(tabs)/map")}
          style={{
            backgroundColor: theme.tint,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "white",
              fontWeight: "900",
              fontSize: 16,
            }}
          >
            Find Games Near Me
          </Text>
        </Pressable>

        {/* CREATE GAME BUTTON */}
        <Pressable
          onPress={() => router.push("/create" as any)}
          style={{
            backgroundColor: theme.card,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontWeight: "800",
              fontSize: 16,
            }}
          >
            Create a Game
          </Text>
        </Pressable>
      </View>
      {
        //////////////////////////////////////////////////////
        // USER TIP TEXT
        //////////////////////////////////////////////////////
      }
      <Text
        style={{
          marginTop: 22,
          color: theme.muted,
          fontSize: 13,
        }}
      >
        Tip: Use the map to pan and zoom. Games refresh automatically based on
        what’s on-screen.
      </Text>
    </ScrollView>
  );
}
