'use client';

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

/* ================= NAV ================= */

type RootStackParamList = {
  HistoryDetail: {
    deviceId: string;
    measurementId: string;
  };
};

type Props = NativeStackScreenProps<
  RootStackParamList,
  "HistoryDetail"
>;

/* ================= TYPES ================= */

interface ChartPoint {
  time: string;
  current: number;
}

interface Stats {
  max: number;
  avg: number;
  min: number;
  total: number;
}

interface DeviceInfo {
  id: string;
  name: string;
}

interface MeasurementInfo {
  id: string;
  name: string;
  unit?: string;
}

type ApiType = "hour" | "day" | "week" | "month" | "year";

/* ================= CONST ================= */

const timeframes = [
  "Last hour",
  "Last 24h",
  "Last 7 days",
  "This month",
  "This year",
];

const API_BASE = "http://192.168.3.232:5000";
const MAX_BARS = 20;
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
/* ================= TIME RANGE ================= */
function normalizeTimestamp(ts: number, type: ApiType) {
  const d = new Date(ts);

  switch (type) {
    case "hour":
      d.setSeconds(0, 0);
      d.setMinutes(Math.floor(d.getMinutes() / 15) * 15);
      break;

    case "day":
      d.setMinutes(0, 0);
      d.setHours(Math.floor(d.getHours() / 4) * 4);
      break;

    case "week":
      d.setHours(0, 0, 0);
      break;

    case "month":
      d.setHours(0, 0, 0);
      break;

    case "year":
      d.setHours(0, 0, 0);
      d.setDate(1);
      break;
  }

  return d.getTime();
}

function buildRange(label: string): {
  from: number;
  to: number;
  type: ApiType;
} | null {
  const now = new Date();

  switch (label) {
    case "Last hour":
      return {
        from: Date.now() - 3600_000,
        to: Date.now(),
        type: "hour",
      };

    case "Last 24h": {
      const from = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        1, 0, 0, 0
      );
      return {
        from: from.getTime(),
        to: now.getTime(),
        type: "day",
      };
    }

    case "Last 7 days": {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      return {
        from: start.getTime(),
        to: now.getTime(),
        type: "week",
      };
    }

    case "This month": {
      const from = new Date(
        now.getFullYear(),
        now.getMonth(),
        1, 0, 0, 0
      );
      return {
        from: from.getTime(),
        to: now.getTime(),
        type: "month",
      };
    }

    case "This year": {
      const from = new Date(
        now.getFullYear(),
        0, 1, 0, 0, 0
      );
      return {
        from: from.getTime(),
        to: now.getTime(),
        type: "year",
      };
    }

    default:
      return null;
  }
}

/* ================= BUCKET GENERATOR ================= */

function generateBuckets(
  from: number,
  to: number,
  type: ApiType
): number[] {
  const buckets: number[] = [];
  const cur = new Date(from);

  while (cur.getTime() <= to) {
   buckets.push(
  normalizeTimestamp(cur.getTime(), type)
);


    switch (type) {
      case "hour":
        cur.setMinutes(cur.getMinutes() + 15);
        break;
      case "day":
        cur.setHours(cur.getHours() + 4);
        break;
      case "week":
        cur.setDate(cur.getDate() + 1);
        break;
      case "month":
        cur.setDate(cur.getDate() + 2);
        break;
      case "year":
        cur.setMonth(cur.getMonth() + 1);
        break;
    }
  }

  return buckets;
}

/* ================= TIME FORMAT ================= */

function formatBucketTime(ts: number, type: ApiType) {
  const d = new Date(ts);

  switch (type) {
    case "hour":
      return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });

    case "day":
      return d.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
      });

    case "week":
      return d.toLocaleDateString("vi-VN", {
        weekday: "short",
      });

    case "month":
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      });

    case "year":
      return `T${d.getMonth() + 1}`;

    default:
      return "";
  }
}

const subtitleMap: Record<ApiType, string> = {
  hour: "Avg / 15 min",
  day: "Avg / 4 hours",
  week: "Avg / day",
  month: "Avg / 2 days",
  year: "Avg / month",
};

/* ================= SCREEN ================= */

export default function HistoryDetail({ route }: Props) {
  const { deviceId, measurementId } = route.params;

  const [selected, setSelected] = useState(timeframes[0]);
  const [open, setOpen] = useState(false);

  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [measurement, setMeasurement] =
    useState<MeasurementInfo | null>(null);

  const [loading, setLoading] = useState(false);
  const [currentType, setCurrentType] =
    useState<ApiType>("hour");

  /* ================= FETCH META ================= */

  const fetchMeta = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const res = await axios.get(
      `${API_BASE}/api/customer/devices/${deviceId}/measurements/${measurementId}/infor`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setDevice(res.data.device);
    setMeasurement(res.data.measurement);
  };

  /* ================= FETCH HISTORY ================= */

  const fetchHistory = async (rangeLabel?: string) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const range = buildRange(rangeLabel || selected);
      if (!range) return;

      setCurrentType(range.type);

      const res = await axios.get(
        `${API_BASE}/api/customer/devices/${deviceId}/measurements/${measurementId}/history`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: range,
        }
      );

      const rows = res.data.data || [];

      /* ===== MAP DB DATA ===== */
      const bucketMap = new Map<number, number>();
      rows.forEach((r: any) => {
       bucketMap.set(
  normalizeTimestamp(
    new Date(r.bucket).getTime(),
    range.type
  ),
  Number(r.avg_value)
);

      });

      /* ===== GENERATE FULL TIMELINE ===== */
      const buckets = generateBuckets(
        range.from,
        range.to,
        range.type
      );

      const points: ChartPoint[] = buckets.map((ts) => ({
        time: formatBucketTime(ts, range.type),
        current: bucketMap.get(ts) ?? 0,
      }));

      setChartData(points);

      /* ===== STATS (REAL DATA ONLY) ===== */
      const realValues: number[] = rows.map(
  (r: any) => Number(r.avg_value)
);

if (realValues.length) {
  const sum = realValues.reduce(
    (a: number, b: number) => a + b,
    0
  );

  setStats({
    max: round1(Math.max(...realValues)),
    min: round1(Math.min(...realValues)),
    avg: round1(sum / realValues.length),
    total: round1(sum),
  });
} else {
  setStats({
    max: 0,
    min: 0,
    avg: 0,
    total: 0,
  });
}

    } catch (err: any) {
      console.log("[HistoryDetail]", err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= EFFECT ================= */

  useEffect(() => {
    fetchMeta();
    fetchHistory(selected);
  }, [deviceId, measurementId]);

  /* ================= CHART OPT ================= */

  const displayData =
    chartData.length > MAX_BARS
      ? chartData.filter(
          (_, i) =>
            i %
              Math.ceil(chartData.length / MAX_BARS) ===
            0
        )
      : chartData;

  const maxValue =
    Math.max(...displayData.map((d) => d.current), 1) * 1.2;

  /* ================= RENDER ================= */

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{device?.name}</Text>
          <Text style={styles.sub}>
            {measurement?.name}
            {measurement?.unit ? ` (${measurement.unit})` : ""}
            {" • "}
            {subtitleMap[currentType]}
          </Text>
        </View>
        <Ionicons name="menu" size={22} />
      </View>

      {/* TIMEFRAME */}
      <View style={styles.dropdownWrap}>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => setOpen(!open)}
        >
          <Text>{selected}</Text>
          <Ionicons name="chevron-down" size={16} />
        </TouchableOpacity>

        {open && (
          <View style={styles.dropdown}>
            {timeframes.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelected(t);
                  setOpen(false);
                  fetchHistory(t);
                }}
              >
                <Text>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* CHART */}
      <View style={styles.chart}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <View style={styles.chartBody}>
            <View style={styles.yAxis}>
              {[5, 4, 3, 2, 1, 0].map((i) => {
                const v = ((maxValue / 5) * i).toFixed(1);
                return (
                  <Text key={i} style={styles.yLabel}>
                    {v}
                  </Text>
                );
              })}
            </View>

            <ScrollView horizontal>
              <View style={styles.barRow}>
                {displayData.map((d, i) => (
                  <View key={i} style={styles.barItem}>
                    <Text style={styles.barValue}>
                      {d.current.toFixed(1)}
                    </Text>
                    <View
                      style={[
                        styles.barCurrent,
                        { height: (d.current / maxValue) * 200 },
                      ]}
                    />
                    <Text style={styles.time}>{d.time}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {stats && (
        <View style={styles.stats}>
          <Stat label="AVG" value={stats.avg} />
          <Stat label="MAX" value={stats.max} />
          <Stat label="MIN" value={stats.min} />
          <Stat label="TOTAL" value={stats.total} />
        </View>
      )}
    </ScrollView>
  );
}

/* ================= SUB ================= */

function Stat({ label, value }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingTop: 20,
  },
  title: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  dropdownWrap: { marginBottom: 16 },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#e5e7eb",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginTop: 4,
  },
  dropdownItem: { padding: 12 },
  chart: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 16,
  },
  chartBody: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  yAxis: {
    height: 240,
    justifyContent: "space-between",
    marginRight: 8,
    width: 40,
  },
  yLabel: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "right",
    fontWeight: "500",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 240,
  },
  barItem: {
    alignItems: "center",
    width: 36,
    marginHorizontal: 4,
  },
  barCurrent: {
    width: 16,
    backgroundColor: "#22c55e",
    borderRadius: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 4,
  },
  time: {
    fontSize: 9,
    marginTop: 6,
    color: "#6b7280",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  },
  statLabel: { fontSize: 10, color: "#6b7280" },
  statValue: { fontSize: 14, fontWeight: "700", marginTop: 4 },
});
