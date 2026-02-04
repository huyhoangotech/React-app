'use client'

import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import React, { useCallback, useRef, useState, useEffect } from "react"
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native"

import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native"

const API_BASE = "http://192.168.3.232:5000"

/* ================= CONFIG ================= */

const PAGE_SIZE = 14
const LOADING_DELAY = 1200

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

/* ================= TYPES ================= */

type Alarm = {
  id: number
  device_id: string
  event_type?: string
  description?: string
  severity?: "low" | "medium" | "high"
  triggered_at: string
}

type Cursor = {
  cursor_time: string
  cursor_id: number
}

/* ================= SPINNER ================= */

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

/* ================= SCREEN ================= */

export default function DeviceAlarmsScreen() {

  const navigation = useNavigation<any>()
  const route = useRoute<any>()
const { deviceId, deviceName } = route.params
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const [initialLoading, setInitialLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchingRef = useRef(false)

  /* ================= FETCH ================= */

  const fetchMore = async (isInitial = false) => {
    if (fetchingRef.current) return
    if (!hasMore && !isInitial) return

    fetchingRef.current = true
    isInitial ? setInitialLoading(true) : setLoadingMore(true)

    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) return

      if (!isInitial) {
        await sleep(LOADING_DELAY)
      }

      const res = await axios.get(
        `${API_BASE}/api/customer/devices/${deviceId}/alarms`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            limit: PAGE_SIZE,
            cursor_time: cursor?.cursor_time,
            cursor_id: cursor?.cursor_id,
          },
        }
      )

      const newLogs: Alarm[] = res.data.logs || []

      setAlarms(prev =>
        isInitial ? newLogs : [...prev, ...newLogs]
      )

      setCursor(res.data.nextCursor ?? null)
      setHasMore(res.data.hasMore === true)
    } catch (err) {
      console.log("❌ FETCH ALARMS ERROR:", err)
    } finally {
      fetchingRef.current = false
      setInitialLoading(false)
      setLoadingMore(false)
    }
  }

  /* ================= LOAD WHEN OPEN ================= */

  useFocusEffect(
    useCallback(() => {
      setAlarms([])
      setCursor(null)
      setHasMore(true)
      fetchingRef.current = false

      fetchMore(true)
    }, [deviceId])
  )

  /* ================= RENDER ITEM ================= */

  const renderItem = ({ item }: { item: Alarm }) => {

    const dotColor =
      item.severity === "high"
        ? "#EF4444"
        : item.severity === "medium"
        ? "#F59E0B"
        : "#9CA3AF"

    const badgeBg =
      item.severity === "high"
        ? "#FEE2E2"
        : item.severity === "medium"
        ? "#FEF3C7"
        : "#E5E7EB"

    const badgeText =
      item.severity === "high"
        ? "#DC2626"
        : item.severity === "medium"
        ? "#B45309"
        : "#6B7280"

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("NotificationDetail", {
            alarmId: item.id,
          })
        }
      >
        <View style={styles.row}>

          <View style={[styles.dot, { backgroundColor: dotColor }]} />

          <View style={styles.content}>

            <View style={styles.titleRow}>
              <Text style={styles.alarmTitle}>
                {item.event_type || item.description || "Alarm"}
              </Text>

              <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                <Text style={[styles.badgeText, { color: badgeText }]}>
                  {(item.severity || "low").toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.time}>
              {new Date(item.triggered_at).toLocaleString("vi-VN")}
            </Text>

          </View>
        </View>
      </TouchableOpacity>
    )
  }

  /* ================= UI ================= */

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alarm History</Text>

        <View style={styles.deviceBox}>
          <Text style={styles.deviceLabel}>Device</Text>
        <Text style={styles.deviceName}>{deviceName}</Text>

        </View>
      </View>

      <FlatList
        data={alarms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={PAGE_SIZE}
        windowSize={3}
        contentContainerStyle={{ paddingBottom: 80 }}
        removeClippedSubviews={false}
        onEndReached={() => {
          if (!loadingMore && hasMore && !initialLoading) {
            fetchMore(false)
          }
        }}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          <View style={{ minHeight: loadingMore ? 60 : 0 }}>
            {loadingMore && (
              <View style={styles.loadingBox}>
                <Spinner />
                <Text style={styles.loadingText}>
                  Đang tải thêm dữ liệu...
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !initialLoading ? (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 42 }}>✅</Text>
              <Text style={styles.empty}>
                Không có cảnh báo nào
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 32,
    backgroundColor: "#F9FAFB",
  },

  header: {
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },
deviceName: {
  fontSize: 15,
  fontWeight: "800",
  color: "#065F46",
},

  deviceBox: {
    backgroundColor: "#ECFDF5",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },

  deviceLabel: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
  },

  deviceId: {
    fontSize: 13,
    fontWeight: "700",
    color: "#065F46",
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },

  content: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  alarmTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 6,
  },

  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },

  time: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },

  loadingText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },

  emptyWrap: {
    marginTop: 80,
    alignItems: "center",
  },

  empty: {
    marginTop: 8,
    color: "#6B7280",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },

})
