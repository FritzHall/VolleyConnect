//////////////////////////////////////////////////////
// IMPORTS
//////////////////////////////////////////////////////

// Expo Router tabs + navigation redirect
import { Tabs, router } from "expo-router";

// React core + hooks
import React, { useEffect, useState } from "react";

// Custom UI components
import { HapticTab } from "@/components/haptic-tab"; // Adds haptic feedback when tapping tabs
import { IconSymbol } from "@/components/ui/icon-symbol"; // Cross-platform icon system

// Theme utilities
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Supabase client for authentication checks
import { supabase } from "../../src/lib/supabase";

//////////////////////////////////////////////////////
// TAB LAYOUT COMPONENT
//////////////////////////////////////////////////////

export default function TabLayout() {
  //////////////////////////////////////////////////////
  // THEME DETECTION (LIGHT / DARK MODE)
  //////////////////////////////////////////////////////

  const colorScheme = useColorScheme();

  // Load correct colors from theme file
  const theme = Colors[colorScheme ?? "light"];

  //////////////////////////////////////////////////////
  // AUTH CHECK STATE
  //////////////////////////////////////////////////////

  // Prevents tabs from rendering before we confirm login state
  const [checkedAuth, setCheckedAuth] = useState(false);

  //////////////////////////////////////////////////////
  // AUTH GUARD (VERY IMPORTANT)
  //////////////////////////////////////////////////////

  useEffect(() => {
    //////////////////////////////////////////////////////
    // 1) CHECK CURRENT SESSION ON LOAD
    //////////////////////////////////////////////////////

    supabase.auth.getSession().then(({ data }) => {
      // If user is NOT logged in → redirect to auth screen
      if (!data.session) router.replace("../auth");

      // Mark that we've completed the auth check
      setCheckedAuth(true);
    });

    //////////////////////////////////////////////////////
    // 2) LISTEN FOR LOGIN / LOGOUT EVENTS
    //////////////////////////////////////////////////////

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // If session becomes null (logout), redirect to auth
      if (!session) router.replace("../auth");

      // We don't need to re-check auth flag here
      // because initial load already handled it
    });

    //////////////////////////////////////////////////////
    // CLEANUP LISTENER ON UNMOUNT
    //////////////////////////////////////////////////////

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  //////////////////////////////////////////////////////
  // PREVENT FLICKER BEFORE AUTH CHECK FINISHES
  //////////////////////////////////////////////////////

  if (!checkedAuth) return null;

  //////////////////////////////////////////////////////
  // TAB NAVIGATION CONFIGURATION
  //////////////////////////////////////////////////////

  return (
    <Tabs
      screenOptions={{
        // Active tab color (changes based on light/dark theme)
        tabBarActiveTintColor: theme.tint,

        // Optional: set tab bar background to match app theme
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
        },

        // Optional: inactive tab color for cleaner contrast
        tabBarInactiveTintColor: theme.muted,

        // Hide top header (we use custom UI instead)
        headerShown: false,

        // Custom tab button with haptic feedback
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",

          // Tab icon
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="map.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
