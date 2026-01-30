'use client'

import React, { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

import { RootStackParamList } from "@/navigation/RootNavigator"

import DeviceInfoCard from "./DeviceInfoCard"
import DeviceMeasurements from "./DeviceMeasurements"
import DeviceAlarms from "./DeviceAlarms"

/* ================= TYPES ================= */

type Props = NativeStackScreenProps<
  RootStackParamList,
  "DeviceDetail"
>

type TabKey = "info" | "measurements" | "alarms"

/* ================= SCREEN ================= */

export default function DeviceDetailScreen({ route, navigation }: Props) {
  const { deviceId } = route.params
  const [activeTab, setActiveTab] = useState<TabKey>("info")

  const renderContent = () => {
    // ❗ TAB CÓ FLATLIST → KHÔNG BỌC SCROLLVIEW
    if (activeTab === "alarms") {
      return <DeviceAlarms deviceId={deviceId} />
    }

    // ❗ TAB THƯỜNG → DÙNG SCROLLVIEW
    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "measurements" ? (
          <DeviceMeasurements deviceId={deviceId} />
        ) : (
          <DeviceInfoCard
            deviceId={deviceId}
            navigation={navigation}
          />
        )}
      </ScrollView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* ===== TAB BAR ===== */}
        <View style={styles.tabBar}>
          <TabButton
            label="Config"
            active={activeTab === "info"}
            onPress={() => setActiveTab("info")}
          />
          <TabButton
            label="Live"
            active={activeTab === "measurements"}
            onPress={() => setActiveTab("measurements")}
          />
          <TabButton
            label="Alarms"
            active={activeTab === "alarms"}
            onPress={() => setActiveTab("alarms")}
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
    </TouchableOpacity>
  )
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  container: {
    flex: 1,
    paddingTop: 38,
  },

  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  tabBtnActive: {
    borderBottomColor: "#2563EB",
  },

  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },

  tabTextActive: {
    color: "#2563EB",
  },

  content: {
    paddingHorizontal: 12,
    marginTop: 18,
  },
})
