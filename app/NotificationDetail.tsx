"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Animated,
  Easing,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import { ChevronLeft, Clock, Zap, Battery, Thermometer, Sparkles } from "lucide-react-native"
import { useNavigation } from "@react-navigation/native"

//
// -------------------------------
// 🟦 Navigation Param Types
// -------------------------------
export type RootStackParamList = {
  AlarmDetail: { alarmId: string }
  MeasurementDetail: { parentId: string; deviceId: string }
}

type NavType = ReturnType<typeof useNavigation<{
  navigate: (screen: keyof RootStackParamList, params: any) => void
}>>

//
// -------------------------------
// Measurement & Event types
// -------------------------------
type Measurement = {
  id: string
  name: string
  unit?: string
  value?: string | number | null
  threshold?: string | number | null
  type?: string
}

type EventLog = {
  id: string
  device_id: string
  device_name?: string
  device_type_name?: string
  measurement_id?: string | null
  measurement_name?: string | null
  measurement_unit?: string | null
  value?: string | number | null
  status?: string | null
  severity?: string | null
  description?: string | null
  triggered_at?: string | null
  resolved?: boolean | null
  event_type?: string | null
}

const Spinner = () => {
  const rotate = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start()
  }, [])

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  })

  return (
    <Animated.View
      style={{
        width: 24,
        height: 24,
        borderWidth: 3,
        borderColor: "#CBD5E1",
        borderTopColor: "#10B981",
        borderRadius: 12,
        transform: [{ rotate: spin }],
      }}
    />
  )
}

//
// -------------------------------
// Component
// -------------------------------
export default function AlarmDetailScreen({ route, navigation }: any) {
  
  const PAGE_SIZE = 14

  type Cursor = {
    cursor_time: string
    cursor_id: number
  }

  type AlarmItem = {
    id: number
    event_type?: string
    description?: string
    severity?: "low" | "medium" | "high"
    triggered_at: string
  }

  const [alarms, setAlarms] = useState<AlarmItem[]>([])
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchingRef = useRef(false)
  const { alarmId } = route.params
  const nav = useNavigation<NavType>()

  const [alarm, setAlarm] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loadingMeasurements, setLoadingMeasurements] = useState<boolean>(false)

  // Event history state
  const [eventHistory, setEventHistory] = useState<EventLog[]>([])
  const [loadingEvents, setLoadingEvents] = useState<boolean>(false)
  const intervalRef = useRef<number | null>(null)

  const formatDuration = (d: any) => {
    // Đang diễn ra
    if (d === null || d === undefined) {
      return "Đang diễn ra"
    }

    // Backend trả seconds (number)
    if (typeof d === "number") {
      if (d < 60) return `${d} S`
      if (d < 3600) return `${Math.floor(d / 60)} Min`
      return `${Math.floor(d / 3600)} Hours`
    }

    // Postgres interval object
    if (typeof d === "object") {
      const days = d.days ?? 0
      const hours = d.hours ?? 0
      const minutes = d.minutes ?? 0
      const seconds = d.seconds ?? 0

      if (days > 0) return `${days} d ${hours} h`
      if (hours > 0) return `${hours} h ${minutes} p`
      if (minutes > 0) return `${minutes} p`
      return `${seconds} s`
    }

    // String (đã format sẵn)
    return String(d)
  }

  const formatTimestamp = (ts: string | undefined | null) => {
    if (!ts) return "-"
    try {
      const d = new Date(ts)
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${d.getFullYear()} ${d.toLocaleTimeString()}`
    } catch {
      return String(ts)
    }
  }

  useEffect(() => {
    fetchAlarmDetail() // load 1 lần duy nhất
  }, [alarmId])
 
  // ---------------- Fetch Alarm ----------------
  const fetchAlarmDetail = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        setError("No auth token found.")
        setLoading(false)
        return
      }

      const res = await axios.get(
        `http://192.168.3.232:5000/api/customer/alarms/logs/${alarmId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const log = res.data?.log
      if (!log) {
        setError("Alarm not found")
        setLoading(false)
        return
      }

      // Timestamp
      const rawTs = log.timestamp || log.triggered_at || log.created_at || null
      let formattedTs = "-"
      if (rawTs) {
        const t = new Date(rawTs)
        formattedTs = `${t.getDate().toString().padStart(2, "0")}/${(t.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${t.getFullYear()} ${t.toLocaleTimeString()}`
      }

      const mapped = {
        id: log.id,
        device_id: log.device_id ?? "-",
        name: log.event_type || log.name || "Alarm",
        device_name: log.device_name || "Unknown device",
        device_type_name: log.device_type_name || "Unknown type",
        site_name: log.site_name || "Unknown site",

        value: log.value ?? "-",
        status: log.status ?? "-",
        severity: log.severity ?? "-",
        description: log.description ?? "-",

        timestamp: formattedTs,
        rawTimestamp: rawTs,

        start_value: log.start_value ?? null,
        end_value: log.end_value ?? null,
        duration: formatDuration(log.duration),

        phase: log.phase || "-",
      }

      setAlarm(mapped)

      if (mapped.device_id && mapped.device_id !== "-") {
        fetchMeasurements(mapped.device_id, token)
        setAlarms([])
        setCursor(null)
        setHasMore(true)
        fetchingRef.current = false

        fetchMore(mapped.device_id, true)
      } else {
        setMeasurements([])
        setEventHistory([])
      }
    } catch (err: any) {
      console.log("Fetch alarm error:", err)
      setError(err?.response?.data?.message || err.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  // ---------------- Fetch Measurements ----------------
  const fetchMeasurements = async (deviceId: string, token?: string | null) => {
    setLoadingMeasurements(true)
    try {
      const t = token ?? (await AsyncStorage.getItem("token"))
      if (!t) return

      const res = await axios.get(
        `http://192.168.3.232:5000/api/customer/devices/${deviceId}/parent-measurements`,
        { headers: { Authorization: `Bearer ${t}` } }
      )

      setMeasurements(res.data?.measurements ?? [])
    } catch (err) {
      console.log("Error fetching measurements:", err)
    } finally {
      setLoadingMeasurements(false)
    }
  }

  const fetchMore = async (deviceId: string, isInitial = false) => {
    if (fetchingRef.current) return
    if (!hasMore && !isInitial) return

    fetchingRef.current = true
    isInitial ? setInitialLoading(true) : setLoadingMore(true)

    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) return

      const res = await axios.get(
        `http://192.168.3.232:5000/api/customer/devices/${deviceId}/alarms`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            limit: PAGE_SIZE,
            cursor_time: isInitial ? undefined : cursor?.cursor_time,
            cursor_id: isInitial ? undefined : cursor?.cursor_id,
          },
        }
      )

      const newLogs = res.data?.logs ?? []

      setAlarms((prev) => (isInitial ? newLogs : [...prev, ...newLogs]))

      setCursor(res.data?.nextCursor ?? null)
      setHasMore(res.data?.hasMore === true)
    } catch (err) {
      console.log("FETCH MORE ERROR:", err)
    } finally {
      fetchingRef.current = false
      setInitialLoading(false)
      setLoadingMore(false)
    }
  }

  // ---------------- Loading & Errors ----------------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#B91C1C", marginBottom: 8 }}>{error}</Text>

        <LinearGradient
          colors={["#047857", "#059669", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionBtn}
        >
          <TouchableOpacity onPress={fetchAlarmDetail}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    )
  }

  if (!alarm) {
    return (
      <View style={styles.center}>
        <Text>No alarm details found.</Text>
      </View>
    )
  }

  // ---------------- Icons + Colors ----------------
  const renderIconFor = (m: Measurement) => {
    const name = (m.name || "").toLowerCase()
    if (name.includes("current")) return <Zap size={20} />
    if (name.includes("voltage")) return <Battery size={20} />
    if (name.includes("temperature")) return <Thermometer size={20} />
    if (name.includes("power factor")) return <Sparkles size={20} />
    return <Zap size={20} />
  }

  const getAccentColorFor = (m: Measurement) => {
    const name = (m.name || "").toLowerCase()
    if (name.includes("current")) return { accent: "#DC2626", border: "#FEE2E2" }
    if (name.includes("voltage")) return { accent: "#2563EB", border: "#DBEAFE" }
    if (name.includes("temperature")) return { accent: "#F97316", border: "#FFF7ED" }
    if (name.includes("power factor")) return { accent: "#0EA5A4", border: "#ECFEFF" }
    return { accent: "#111827", border: "#F3F4F6" }
  }

  // Helper to format triggered_at
  // Helper to format duration safely

  return (
    <FlatList
      data={alarms}
      keyExtractor={(item) => String(item.id)}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 16 }}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews
      onEndReached={() => {
        if (!loadingMore && hasMore && !initialLoading) {
          fetchMore(alarm.device_id, false)
        }
      }}
      onEndReachedThreshold={0.2}
      ListHeaderComponent={() => (
        <>
          {/* HEADER */}
          <LinearGradient
            colors={["#047857", "#059669", "#10B981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ChevronLeft size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerTextWrapper}>
                <Text style={styles.headerTitle}>Alarm Details</Text>
                <Text style={styles.headerSubtitle}>Real-time monitoring updates</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Main Info Card */}
          {alarm && (
            <LinearGradient
              colors={["#ffffff", "#f0fdf4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.mainCard}
            >
              <View style={styles.mainCardHeader}>
                <View style={styles.alarmNameWrapper}>
                  <Text style={styles.alarmName}>{alarm.name}</Text>
                  <View
                    style={[
                      styles.severityBadge,
                      alarm.severity === "high" ? styles.severityHigh : alarm.severity === "medium" ? styles.severityMedium : styles.severityLow,
                    ]}
                  >
                    <Text style={styles.severityText}>
                      {alarm.severity?.charAt(0).toUpperCase() + alarm.severity?.slice(1)}
                    </Text>
                  </View>
                </View>
               
              </View>

             <View style={styles.infoRowsContainer}>
  {/* Device */}
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>Device</Text>
    <Text style={styles.infoValue}>{alarm.device_name}</Text>
  </View>
  <View style={styles.divider} />

  {/* Device Type */}
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>Type</Text>
    <Text style={styles.infoValue}>{alarm.device_type_name}</Text>
  </View>
  <View style={styles.divider} />

  {/* Location */}
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>Location</Text>
    <Text style={styles.infoValue}>{alarm.site_name}</Text>
  </View>
  <View style={styles.divider} />

  {/* Timestamp */}
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>Timestamp</Text>
    <Text style={styles.infoValue}>{alarm.timestamp}</Text>
  </View>
  <View style={styles.divider} />

  {/* Duration */}
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>Duration</Text>
    <Text style={styles.infoValue}>{alarm.duration}</Text>
  </View>
  <View style={styles.divider} />

  {/* Status */}
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>Status</Text>
    <Text
      style={[
        styles.infoValue,
        {
          color:
            alarm.status === "active"
              ? "#DC2626"
              : alarm.status === "resolved"
              ? "#059669"
              : "#111827",
        },
      ]}
    >
      {alarm.status}
    </Text>
  </View>
</View>


              {alarm.description && (
                <View style={styles.descriptionBox}>
                  <View style={styles.descriptionHeader}>
                    <Sparkles size={16} color="#10B981" />
                    <Text style={styles.descLabel}>Description</Text>
                  </View>
                  <Text style={styles.descText}>{alarm.description}</Text>
                </View>
              )}
            </LinearGradient>
          )}

          {/* Measurement Section */}
          {measurements.length > 0 && (
            <View style={styles.measureSection}>
              <View style={styles.sectionHeader}>
                <Zap size={20} color="#10B981" />
                <Text style={styles.sectionTitle}>Measurements</Text>
              </View>
              <View style={styles.measureGrid}>
                {measurements.map((m) => (
                  <LinearGradient
                    key={m.id}
                    colors={["#ffffff", "#f0fdf4"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.measureCard}
                  >
                    <View style={styles.measureIconWrapper}>
                      <View style={styles.measureIcon}>
                        <Thermometer size={18} color="#10B981" />
                      </View>
                    </View>
                    <Text style={styles.measureLabel}>{m.name}</Text>
                    <Text style={styles.measureValue}>{m.value}</Text>
                    <Text style={styles.measureUnit}>{m.unit}</Text>
                    {m.threshold && <Text style={styles.thresholdText}>Threshold: {m.threshold}</Text>}
                  </LinearGradient>
                ))}
              </View>
            </View>
          )}

          {/* 🔶 EVENT HISTORY TITLE */}
          <View style={styles.eventSection}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>Event History</Text>
            </View>
          </View>

          {initialLoading && (
            <View style={styles.loadingBox}>
              <Spinner />
              <Text style={styles.loadingText}>Loading event history...</Text>
            </View>
          )}
        </>
      )}
      renderItem={({ item }) => {
        const color =
          item.severity === "high"
            ? "#EF4444"
            : item.severity === "medium"
            ? "#FACC15"
            : "#10B981"

     return (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={() =>
      navigation.replace("NotificationDetail", {
        alarmId: String(item.id),
      })
    }
  >
    <View style={styles.eventCardWrapper}>
      <LinearGradient
        colors={["#ffffff", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.eventCard}
      >
        <View style={styles.eventDotLine}>
          <View style={[styles.eventDot, { backgroundColor: color }]} />
          <View style={styles.eventDotLineVertical} />
        </View>

        <View style={styles.eventContent}>
          <Text style={styles.eventName}>
            {item.event_type || item.description || "Alarm"}
          </Text>

          <Text style={styles.eventTime}>
            {new Date(item.triggered_at).toLocaleString("vi-VN")}
          </Text>
        </View>
      </LinearGradient>
    </View>
  </TouchableOpacity>
)

      }}
      ListFooterComponent={() => (
        <View style={{ minHeight: loadingMore ? 60 : 0 }}>
          {loadingMore && (
            <View style={styles.loadingBox}>
              <Spinner />
              <Text style={styles.loadingText}>Đang tải thêm dữ liệu...</Text>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={() =>
        !initialLoading ? (
          <Text style={{ color: "#6B7280", paddingHorizontal: 16 }}>
            No event history available.
          </Text>
        ) : null
      }
    />
  )
}

//
// InfoField Component
//
function InfoField({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: "#4B5563" }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>{String(value)}</Text>
      </View>
    </View>
  )
}

//
// Styles
//
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerGradient: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backBtn: { padding: 8, paddingTop: 0 },
  headerTextWrapper: { flex: 1, paddingTop: 4 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 4 },
  headerSubtitle: { fontSize: 13, fontWeight: "500", color: "#d1fae5" },

  mainCard: { marginHorizontal: 16, marginTop: 20, marginBottom: 24, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1fae5", shadowColor: "#10B981", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  mainCardHeader: { marginBottom: 18 },
  alarmNameWrapper: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  alarmName: { fontSize: 20, fontWeight: "900", color: "#047857", flex: 1 },
  severityBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  severityHigh: { backgroundColor: "#FEE2E2" },
  severityMedium: { backgroundColor: "#FEF3C7" },
  severityLow: { backgroundColor: "#DBEAFE" },
  severityText: { fontSize: 12, fontWeight: "700", color: "#666" },
  statusIndicator: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#ecfdf5", borderRadius: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" },
  statusDotResolved: { backgroundColor: "#10B981" },
  statusText: { fontSize: 12, fontWeight: "600", color: "#047857" },

  infoRowsContainer: { borderTopWidth: 1, borderTopColor: "#d1fae5", paddingTop: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  divider: { height: 1, backgroundColor: "#ecfdf5" },
  infoLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  infoValue: { fontSize: 14, fontWeight: "700", color: "#111827", maxWidth: "60%" },

  descriptionBox: { marginTop: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#ecfdf5", borderRadius: 12, borderLeftWidth: 3, borderLeftColor: "#10B981" },
  descriptionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  descLabel: { fontWeight: "700", fontSize: 12, color: "#047857" },
  descText: { color: "#065f46", fontSize: 13, lineHeight: 18, fontWeight: "500" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#047857" },

  measureSection: { marginHorizontal: 16, marginBottom: 24 },
  measureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  measureCard: { width: "48%", borderRadius: 14, padding: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#d1fae5", shadowColor: "#10B981", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  measureIconWrapper: { marginBottom: 10 },
  measureIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#ecfdf5", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#a7f3d0" },
  measureLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  measureValue: { fontSize: 18, fontWeight: "900", color: "#047857", marginBottom: 2 },
  measureUnit: { fontSize: 11, fontWeight: "600", color: "#10B981" },
  thresholdText: { color: "#9CA3AF", marginTop: 6, fontSize: 11, fontStyle: "italic" },

  eventSection: { marginHorizontal: 16, marginTop: 28, marginBottom: 16 },
  eventCardWrapper: { marginHorizontal: 16, marginBottom: 12 },
  eventCard: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#d1d5db", flexDirection: "row", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  eventDotLine: { justifyContent: "flex-start", alignItems: "center", width: 24 },
  eventDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  eventDotLineVertical: { width: 1, height: 40, backgroundColor: "#d1d5db", marginTop: 6 },
  eventContent: { flex: 1, paddingTop: 2 },
  eventName: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  eventTime: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
actionBtn: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 24, gap: 10 },
  loadingText: { fontSize: 13, color: "#10B981", fontWeight: "600" },
})
