'use client'

import React, { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { LinearGradient } from "expo-linear-gradient"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { ChevronLeft, Settings } from "lucide-react-native"

import { RootStackParamList } from "@/navigation/RootNavigator"

import DeviceInfoCard from "./DeviceInfoCard"
import DeviceMeasurements from "./DeviceMeasurements"
import AutoControlTab from "./AutoControlTab"


/* ================= TYPES ================= */

type Props = NativeStackScreenProps<
  RootStackParamList,
  "DeviceDetail"
>

type TabKey = "info" | "measurements" | "autocontrol"

/* ================= SCREEN ================= */

export default function DeviceDetailScreen({ route, navigation }: Props) {
  const { deviceId } = route.params
  const [activeTab, setActiveTab] = useState<TabKey>("info")

 const renderContent = () => {
  if (activeTab === "autocontrol") {
    return <AutoControlTab deviceId={deviceId} />
  }

  return (
   <View style={styles.content}>
  {activeTab === "measurements" ? (
    <DeviceMeasurements deviceId={deviceId} />
  ) : (
    <FlatList
      data={[{ key: "device-info" }]} // fake data để render 1 item
      keyExtractor={(item) => item.key}
      renderItem={() => (
        <DeviceInfoCard
          deviceId={deviceId}
          navigation={navigation}
        />
      )}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    />
  )}
</View>

  )
}


  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER GRADIENT */}
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Details</Text>
       
      </LinearGradient>

      <View style={styles.container}>
        {/* ===== TAB BAR ===== */}
        <View style={styles.tabBar}>
          <TabButton
            label="Config"
            active={activeTab === "info"}
            onPress={() => setActiveTab("info")}
          />
        
        <TabButton
  label="Auto Control"
  active={activeTab === "autocontrol"}
  onPress={() => setActiveTab("autocontrol")}
/>

        </View>

        {/* ===== CONTENT ===== */}
        {renderContent()}
      </View>
    </SafeAreaView>
  )
}

/* ================= TAB BUTTON ================= */

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabBtn, active && styles.tabBtnActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
      {active && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  )
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafb",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  backBtn: {
    padding: 8,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    flex: 1,
    marginLeft: 8,
  },

  settingsBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  container: {
    flex: 1,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#d1fae5",
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  tabBtnActive: {
    backgroundColor: "#f0fdf4",
  },

  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#10B981",
  },

  tabText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },

  tabTextActive: {
    color: "#047857",
  },

  content: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
})
