"use client"

import type React from "react"
import { useEffect, useState,useRef } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native"
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

//
// -------------------------------
// Component
// -------------------------------
export default function AlarmDetailScreen({ route, navigation }: any) {
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


  // auto refresh mỗi 5s
  useEffect(() => {
  const interval = setInterval(() => {
    fetchEventHistory(alarm.device_id)
  }, 5000)

  return () => clearInterval(interval)
}, [alarm?.device_id])




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
          .toString().padStart(2, "0")}/${t.getFullYear()} ${t.toLocaleTimeString()}`
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
        fetchEventHistory(mapped.device_id, token)
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

  // ---------------- Fetch Event History (alarm logs for this device) ----------------
  const fetchEventHistory = async (deviceId: string, token?: string | null) => {
    setLoadingEvents(true)
    try {
      const t = token ?? (await AsyncStorage.getItem("token"))
      if (!t) return

      // Call server endpoint that returns alarm logs (the SQL you showed)
      // We call /api/customer/alarms/logs (returns many logs). We'll filter by device_id here.
      const res = await axios.get(`http://192.168.3.232:5000/api/customer/alarms/logs`, {
        headers: { Authorization: `Bearer ${t}` },
      })

      const logs: EventLog[] = res.data?.logs ?? []

      // Filter by device_id and sort desc by triggered_at
      const filtered = logs
        .filter((l) => String(l.device_id) === String(deviceId))
        .sort((a, b) => {
          const ta = a.triggered_at ? new Date(a.triggered_at).getTime() : 0
          const tb = b.triggered_at ? new Date(b.triggered_at).getTime() : 0
          return tb - ta
        })

      setEventHistory(filtered)
    } catch (err) {
      console.log("Error fetching event history:", err)
      setEventHistory([])
    } finally {
      setLoadingEvents(false)
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

        <TouchableOpacity style={[styles.actionBtn]} onPress={fetchAlarmDetail}>
          <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
        </TouchableOpacity>
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
  <ScrollView
    style={styles.container}
    contentContainerStyle={{ paddingBottom: 60 }}   // <-- THÊM Ở ĐÂY
  >
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alarm Details</Text>
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>{alarm.name}</Text>
          </View>
        </View>
        {/* Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
            <InfoField label="Name" value={alarm.name} />
            <InfoField label="Device" value={alarm.device_name} />
            <InfoField label="Device Type" value={alarm.device_type_name} />
            <InfoField label="Location" value={alarm.site_name} />
          </View>

          <View style={styles.infoColumn}>
            <InfoField label="Timestamp" value={alarm.timestamp} icon={<Clock size={16} />} />
            <InfoField label="Duration" value={`${alarm.duration} `} icon={<Clock size={16} />} />
            <InfoField label="Status" value={alarm.status} />
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionBox}>
          <Text style={styles.descLabel}>Description</Text>
          <Text style={styles.descText}>{alarm.description}</Text>
        </View>
      </View>

      {/* 🔷 MEASUREMENT VALUES */}
      <View style={styles.measureSection}>
        <Text style={styles.measureTitle}>Measurement Values</Text>

        {loadingMeasurements ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : measurements.length === 0 ? (
          <Text style={{ color: "#6B7280" }}>No measurements available.</Text>
        ) : (
          <View style={styles.measureGrid}>
            {measurements.map((m) => {
              const c = getAccentColorFor(m)
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.measureCard, { backgroundColor: c.border }]}
                  onPress={() =>
                    nav.navigate("MeasurementDetail", {
                      parentId: m.id,
                      deviceId: alarm.device_id,
                    })
                  }
                >
                  <View style={styles.measureHeader}>
                    <View style={[styles.iconWrapper, { borderColor: c.accent }]}>
                      {renderIconFor(m)}
                    </View>
                    <Text style={[styles.measureLabel, { color: c.accent }]}>{m.name}</Text>
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.measureValue}>
                      {m.value ?? "-"} <Text style={styles.measureUnit}>{m.unit ?? ""}</Text>
                    </Text>
                    {m.threshold && (
                      <Text style={styles.thresholdText}>Threshold: {m.threshold} {m.unit ?? ""}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>

      {/* 🔶 EVENT HISTORY */}
      <View style={styles.eventSection}>
        <Text style={styles.eventTitle}>Event History</Text>

        {loadingEvents ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : eventHistory.length === 0 ? (
          <View style={{ paddingVertical: 8 }}>
            <Text style={{ color: "#6B7280" }}>No event history available.</Text>
          </View>
        ) : (
          <View style={styles.eventCard}>
            {eventHistory.map((ev, idx) => {
              const isLatest = idx === 0
              return (
                <View
                  key={ev.id ?? idx}
                  style={[
                    styles.eventRow,
                    { borderBottomWidth: idx === eventHistory.length - 1 ? 0 : 1, borderBottomColor: "#E5E7EB" },
                    isLatest ? styles.eventRowLatest : undefined,
                  ]}
                >
                  <View style={[styles.eventDot, isLatest ? styles.eventDotLatest : undefined]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventName, isLatest && { fontWeight: "800" }]}>
                      {ev.event_type ?? ev.measurement_name ?? "Alarm"}
                    </Text>
                    <Text style={styles.eventTime}>{formatTimestamp(ev.triggered_at ?? ev.triggered_at)}</Text>
                  </View>
                </View>
              )
            })}

           <View style={styles.totalRow}>
  <Text style={styles.totalText}>
    Total Occurrences: {eventHistory.length}
  </Text>
</View>

          </View>
        )}
      </View>
    </ScrollView>
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
  container: { flex: 1, backgroundColor: "#F9FAFB", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: { padding: 6, marginRight: 12 },
  headerTitle: { fontSize: 24, fontWeight: "700" },

  card: { borderRadius: 12, padding: 16, marginBottom: 16, backgroundColor: "#fadee2ff" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: "700" },

  infoGrid: { flexDirection: "row", justifyContent: "space-between" },
  infoColumn: { flex: 1 },

  descriptionBox: { backgroundColor: "#F3F4F6", padding: 12, borderRadius: 8 },
  descLabel: { fontWeight: "600", marginBottom: 8 },
  descText: { color: "#111827" },

  actionBtn: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 8,
  },

  // 📌 Measurement (giảm kích thước)
  measureSection: { marginTop: 8 },
  measureTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },

  measureGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },

  measureCard: { 
    width: "47%",
    padding: 10,          // nhỏ hơn
    borderRadius: 10,
    marginBottom: 10,
  },

  measureHeader: { flexDirection: "row", alignItems: "center" },
  iconWrapper: {
    width: 30,            // nhỏ hơn
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginRight: 8,
  },

  measureLabel: { fontSize: 13, fontWeight: "700" },     // nhỏ hơn
  measureValue: { fontSize: 17, fontWeight: "800" },     // nhỏ hơn
  measureUnit: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  thresholdText: { color: "#6B7280", marginTop: 4, fontSize: 11 },

  // 📌 Event history (nhỏ hơn)
  eventSection: { marginTop: 16 },
  eventTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },

  eventCard: { 
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,             // nhỏ hơn
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },

  eventRow: { 
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8       // nhỏ hơn
  },

  eventRowLatest: { 
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    paddingVertical: 10,     // nhỏ hơn
    paddingHorizontal: 8 
  },

  eventDot: { width: 7, height: 7, borderRadius: 8, backgroundColor: "#9CA3AF", marginRight: 12 },
  eventDotLatest: { backgroundColor: "#2563EB" },

  eventName: { fontSize: 14, fontWeight: "700", color: "#111827" },   // nhỏ hơn
  eventTime: { fontSize: 12, color: "#6B7280", marginTop: 2 },        // nhỏ hơn

  // 📌 Total row (đưa lên cao + nằm trái)
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
  },
  totalText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "left",
  },
})

