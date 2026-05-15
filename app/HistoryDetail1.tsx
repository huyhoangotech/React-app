'use client';

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Circle, G } from "react-native-svg";
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLabel,
  VictoryLine,
  VictoryScatter,
} from "victory-native";

type RootStackParamList = {
  HistoryDetail1: {
    deviceId: string;
  };
};

type Props = NativeStackScreenProps<
  RootStackParamList,
  "HistoryDetail1"
>;

/* ================= TYPES ================= */

interface Stats {
  max: number;
  avg: number;
  min: number;
  total: number;
}

interface ChartDataPoint {
  bucket: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  x: number;
}

interface Stats {
  max: number;
  avg: number;
  min: number;
}

interface ChartData {
  measurement: MeasurementInfo;
  data: ChartDataPoint[];
  stats: Stats;
}

interface DeviceSelect {
  id: string;
  name: string;
  location?: string;
}

interface DeviceInfo {
  id: string;
  name: string;
  location?: string;
}

interface MeasurementInfo {
  id: string;
  name: string;
  unit?: string;
  configId: string;
}

type ApiType = "hour" | "day" | "week" | "month" | "year";

/* ================= CONST ================= */

const timeframes = [
  "Last hour",
  "Today",
  "Last 7 days",
  "This month",
  "This year",
];
const formatNumber = (v: number) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(v);
  
const round1 = (n: number): number => {
  return Math.round(n * 10) / 10;
};
const API_BASE = "https://be.otech.vn";
const MAX_MEASUREMENTS = 3;


const CustomDot = (props: any) => {
  const { x, y, style, events } = props;

  return (
    <G>
      {/* HIT AREA */}
      <Circle
        cx={x}
        cy={y}
        r={15}                 // 👈 vùng click lớn
        fill="transparent"
        {...events}
      />

      {/* DOT THẬT */}
      <Circle
        cx={x}
        cy={y}
        r={5}                  // 👈 dot nhỏ giữ nguyên
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
    </G>
  );
};
/* ================= TIME RANGE ================= */

function normalizeTimestamp(ts: number, type: ApiType) {
  const d = new Date(ts);

  switch (type) {
    case "hour": {
  d.setSeconds(0, 0);

  const minutes = d.getMinutes();
  const floored = Math.floor(minutes / 15) * 15;

  d.setMinutes(floored);
  break;
}

    case "day":
      d.setMinutes(0, 0);
      break;

    case "week":
      d.setHours(0, 0, 0);
      break;

    case "month":
      d.setHours(0, 0, 0, 0);
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

    case "Today": {
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

function generateBuckets(from: number, to: number, type: ApiType): number[] {
  const buckets: number[] = [];

  const now = new Date();
if (type === "hour") {
  const buckets: number[] = [];
  const now = Date.now();

  // Mốc 15 phút gần nhất không vượt hiện tại
  let end = normalizeTimestamp(now, "hour");

  // Nếu interval này chưa kết thúc thì bỏ nó
  if (end + 15 * 60 * 1000 > now) {
    end -= 15 * 60 * 1000;
  }

  // Lấy đủ 4 interval (1 giờ)
  const start = end - 3 * 15 * 60 * 1000;

  const cur = new Date(start);

  while (cur.getTime() <= end) {
    buckets.push(cur.getTime());
    cur.setMinutes(cur.getMinutes() + 15);
  }

  return buckets;
}

  // các type khác giữ nguyên
  const start = normalizeTimestamp(from, type);
  const cur = new Date(start);

  while (cur.getTime() <= to) {
    buckets.push(cur.getTime());

    switch (type) {
      case "day":
        cur.setHours(cur.getHours() + 1);
        break;
      case "week":
      case "month":
        cur.setDate(cur.getDate() + 1);
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
   case "hour": {
  const end = new Date(ts);
  end.setMinutes(end.getMinutes() + 15);

  return end.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
    case "day":
      return d.toLocaleString("vi-VN", {
      
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
  day: "Avg / 1 hours",
  week: "Avg / day",
  month: "Avg / 1 days",
  year: "Avg / month",
};

/* ================= SCREEN ================= */

export default function HistoryDetail1({ route }: Props) {
  const { deviceId } = route.params;

  const [selected, setSelected] = useState(timeframes[0]);
  const [open, setOpen] = useState(false);
  const [openMeasurements, setOpenMeasurements] = useState(true);

  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [allMeasurements, setAllMeasurements] = useState<MeasurementInfo[]>([]);
  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([]);
  const initialDeviceId = route.params.deviceId;

  const [currentDeviceId, setCurrentDeviceId] = useState(initialDeviceId);

  const [devices, setDevices] = useState<DeviceSelect[]>([]);
  const [openDeviceSelect, setOpenDeviceSelect] = useState(false);

  const [loading, setLoading] = useState(false);
  const [chartsData, setChartsData] = useState<ChartData[]>([]);
  const [clickedDots, setClickedDots] = useState<Record<string, number | null>>({});

  /* ================= FETCH DEVICE & MEASUREMENTS ================= */
  const fetchDevices = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        `${API_BASE}/api/customer/all-devices`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const mapped: DeviceSelect[] = res.data.devices.map((d: any) => ({
        id: d.id,
        name: d.name,
        location: d.location,
      }));

      setDevices(mapped);
    } catch (err) {
      console.error("❌ Error fetching devices:", err);
    }
  };

  const fetchDeviceAndMeasurements = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const deviceRes = await axios.get(
        `${API_BASE}/api/customer/devices/${currentDeviceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDevice(deviceRes.data);

      const historyRes = await axios.get(
        `${API_BASE}/api/customer/history-config`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const list = historyRes.data?.measurements || [];

      const filtered = list
        .filter((hc: any) => hc.device_id === currentDeviceId)
        .map((hc: any) => ({
          id: hc.measurement_id,
          name: hc.measurement_name,
          unit: hc.unit,
          configId: hc.id,
        }));

      setAllMeasurements(filtered);
      setSelectedMeasurements([]);
    } catch (err) {
      console.error("❌ Error fetching device and measurements:", err);
    }
  };

  /* ================= FILL MISSING BUCKETS ================= */

  const fillMissingBuckets = (
  rawData: any[],
  range: { from: number; to: number; type: ApiType }
): any[] => {

  if (range.type === "hour") {
    // Không tự generate nữa
    return rawData;
  }

  const buckets = generateBuckets(range.from, range.to, range.type);

  const dataMap: Record<number, any> = {};
  rawData.forEach((d: any) => {
    const ts = new Date(d.bucket).getTime();
    dataMap[ts] = d;
  });

  return buckets.map((bucketTs) => {
    if (dataMap[bucketTs]) {
      return dataMap[bucketTs];
    }
    return {
      bucket: bucketTs,
      avg_value: 0,
      max_value: 0,
      min_value: 0,
    };
  });
};

  /* ================= FETCH CHART DATA ================= */

  const fetchChartData = async () => {
    if (selectedMeasurements.length === 0) {
      setChartsData([]);
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const range = buildRange(selected);
      if (!range) return;

      const responses = await Promise.all(
        selectedMeasurements.map((measurementId) =>
          axios.get(
            `${API_BASE}/api/customer/devices/${currentDeviceId}/measurements/${measurementId}/history`,
            {
              params: {
                from: range.from,
                to: range.to,
                type: range.type,
              },
              headers: { Authorization: `Bearer ${token}` },
            }
          )
        )
      );

      const formatted: ChartData[] = responses.map((res, i) => {
        const measurementId = selectedMeasurements[i];
        const measurement = allMeasurements.find(
          (m) => m.id === measurementId
        )!;

        const rawData = res.data?.data ?? [];
        
        // Fill missing buckets with zero values
        const filledData = fillMissingBuckets(rawData, range);
        
        const data = filledData.map(
          (d: any, index: number) => ({
            ...d,
            bucket: formatBucketTime(new Date(d.bucket).getTime(), range.type),
            x: index + 0.5,
          })
        );

        // Calculate stats
        const stats: Stats = {
          avg: round1(filledData.length > 0
            ? filledData.reduce((sum: number, r: any) => sum + Number(r.avg_value || 0), 0) / filledData.length
            : 0),
          max: round1(filledData.length > 0
            ? Math.max(...filledData.map((r: any) => Number(r.max_value || 0)))
            : 0),
          min: round1(filledData.length > 0
            ? Math.min(...filledData.map((r: any) => Number(r.min_value || 0)))
            : 0),
          total: 0
        };

        return {
          measurement,
          data,
          stats,
        };
      });

      setChartsData(formatted);
    } catch (err) {
      console.error("❌ Error fetching chart data:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= TOGGLE MEASUREMENT ================= */

  const toggleMeasurement = (measurementId: string) => {
    setSelectedMeasurements((prev) => {
      const isSelected = prev.includes(measurementId);
      if (isSelected) {
        return prev.filter(id => id !== measurementId);
      } else {
        if (prev.length < MAX_MEASUREMENTS) {
          return [...prev, measurementId];
        }
        return prev;
      }
    });
  };

  /* ================= EFFECT ================= */

  useEffect(() => {
    fetchDeviceAndMeasurements();
  }, [deviceId]);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    fetchDeviceAndMeasurements();
  }, [currentDeviceId]);

  useEffect(() => {
    if (selectedMeasurements.length > 0) {
      fetchChartData();
    }
  }, [selectedMeasurements, selected]);

  /* ================= RENDER ================= */

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{device?.name}</Text>
        <Text style={styles.sub}>Device Information</Text>
      </View>

      {/* MEASUREMENTS SELECTION */}
      <View style={styles.measurementsSection}>
        {/* HEADER */}
        <TouchableOpacity
          style={styles.measurementsHeader}
          onPress={() => setOpenMeasurements((v) => !v)}
        >
          <Text style={styles.sectionTitle}>
            Chọn Measurements ({selectedMeasurements.length}/{MAX_MEASUREMENTS})
          </Text>

          <Ionicons
            name={openMeasurements ? "chevron-up" : "chevron-down"}
            size={18}
            color="#374151"
          />
        </TouchableOpacity>

        {/* BODY */}
        {openMeasurements && (
          <View style={styles.measurementsBody}>
            {allMeasurements.map((m) => (
              <View key={m.id} style={styles.checkboxItem}>
                <SimpleCheckbox
                  checked={selectedMeasurements.includes(m.id)}
                  onChange={() => toggleMeasurement(m.id)}
                  disabled={
                    !selectedMeasurements.includes(m.id) &&
                    selectedMeasurements.length >= MAX_MEASUREMENTS
                  }
                />
                <Text style={styles.checkboxLabel}>
                  {m.name} {m.unit ? `(${m.unit})` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}
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
                }}
              >
                <Text>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* CHARTS */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      ) : selectedMeasurements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Vui lòng chọn ít nhất 1 measurement
          </Text>
        </View>
      ) : (
        <View style={styles.chartsContainer}>
        {chartsData.map((chart, idx) => {

  // 🔥 1. TÍNH GIÁ TRỊ LỚN NHẤT TRONG DATA
  const rawMax = Math.max(
    ...chart.data.map(d =>
      Math.max(
        Number(d.avg_value || 0),
        Number(d.max_value || 0),
        Number(d.min_value || 0)
      )
    ),
    0
  );
const getNiceMax = (value: number) => {
  if (value === 0) return 10;

  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;

  let niceNormalized;

  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;

  return niceNormalized * magnitude;
};

const maxY = getNiceMax(rawMax);
  // 🔥 2. LUÔN LUÔN LỚN HƠN MAX DATA
 
  return (
    <View key={chart.measurement.id} style={styles.chartCard}>
      <Text style={styles.chartTitle}>
        {chart.measurement.name}
        {chart.measurement.unit && ` (${chart.measurement.unit})`}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        scrollEnabled={chart.data.length > 6}
      >
        <VictoryChart
          width={Math.max(
            Dimensions.get("window").width - 32,
            chart.data.length * 60
          )}
          height={320}
          padding={{ top: 30, bottom: 50, left: 60, right: 20 }}
          domain={{
            x: [0, chart.data.length],
            y: [0, maxY],   // ✅ Y luôn lớn hơn điểm max
          }}
        >
          {/* Y AXIS */}
         <VictoryAxis
  dependentAxis
  tickFormat={formatNumber}
  tickCount={5} // 👈 số đường ngang (có thể chỉnh 4–6 tùy bạn)
  style={{
    // ẩn đường trục dọc
 
    tickLabels: {
      fontSize: 10,
      fill: "#6b7280",
    },
    grid: {
      stroke: "#e5e7eb",     // màu đường ngang
      strokeWidth: 1,
      opacity: 1,          // 👈 độ mờ
    },
  }}
/>

          {/* X AXIS */}
          <VictoryAxis
            tickValues={chart.data.map((d) => d.x)}
            tickFormat={(x) => {
              const found = chart.data.find(d => d.x === x);
              return found?.bucket ?? "";
            }}
            style={{
              tickLabels: { fontSize: 9 },
            }}
          />

          {/* BARS - AVG */}
          <VictoryBar
            data={chart.data}
            x="x"
            y="avg_value"
            barWidth={15}
            labels={(props) => `${props.datum.avg_value.toFixed(1)}`}
            labelComponent={<VictoryLabel dy={-10} />}
            style={{
              data: { fill: "#22c55e", opacity: 0.85 },
              labels: { fontSize: 9, fill: "#1f2937" },
            }}
          />

          {/* MAX LINE */}
         {/* MAX LINE */}
<VictoryLine
  data={chart.data}
  x="x"
  y="max_value"
  style={{
    data: {
      stroke: "#ef4444",
      strokeWidth: 2,
    },
  }}
/>

{/* MAX DOT */}
<VictoryScatter
  data={chart.data}
  x="x"
  y="max_value"
  size={6} // 👈 dot vẫn nhỏ
  dataComponent={<CustomDot />}
  style={{
    data: {
      fill: "#ef4444",
      stroke: "#ffffff",
      strokeWidth: 1.5,
    },
  }}
  labels={({ datum, index }) =>
    clickedDots[`${idx}-max`] === index
      ? datum.max_value.toFixed(1)
      : ""
  }
  labelComponent={
    <VictoryLabel
      dy={-14}
      style={{
        fill: "#ef4444",
        fontSize: 10,
        fontWeight: "bold",
      }}
    />
  }
  events={[
    {
      target: "data",
      eventHandlers: {
        onPress: (_, props) => {
          const key = `${idx}-max`;
          setClickedDots(prev => ({
            ...prev,
            [key]:
              prev[key] === props.index
                ? null
                : props.index,
          }));
          return [];
        },
      },
    },
  ]}
/>
        {/* MIN LINE */}
<VictoryLine
  data={chart.data}
  x="x"
  y="min_value"
  style={{
    data: {
      stroke: "#3b82f6",
      strokeWidth: 2,
      opacity: 0.7, // làm mờ nhẹ để không đè max
    },
  }}
/>

{/* MIN DOT */}
<VictoryScatter
  data={chart.data}
  x="x"
  y="min_value"
  size={4}
  dataComponent={<CustomDot />}
  style={{
    data: {
      fill: "#3b82f6",
      stroke: "#ffffff",
      strokeWidth: 1.5,
    },
  }}
  labels={({ datum, index }) =>
    clickedDots[`${idx}-min`] === index
      ? datum.min_value.toFixed(1)
      : ""
  }
  labelComponent={
    <VictoryLabel
      dy={-12}
      style={{
        fill: "#3b82f6",
        fontSize: 10,
        fontWeight: "bold",
      }}
    />
  }
  events={[
    {
      target: "data",
      eventHandlers: {
        onPress: (_, props) => {
          const key = `${idx}-min`;
          setClickedDots(prev => ({
            ...prev,
            [key]:
              prev[key] === props.index
                ? null
                : props.index,
          }));
          return [];
        },
      },
    },
  ]}
/>
        </VictoryChart>
      </ScrollView>

      {/* LEGEND */}
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#22c55e" }]} />
          <View>
            <Text style={styles.legendLabel}>Average</Text>
            <Text style={styles.legendValue}>
              {formatNumber(chart.stats.avg)}
            </Text>
          </View>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#ef4444" }]} />
          <View>
            <Text style={styles.legendLabel}>Max</Text>
            <Text style={styles.legendValue}>
              {formatNumber(chart.stats.max)}
            </Text>
          </View>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#3b82f6" }]} />
          <View>
            <Text style={styles.legendLabel}>Min</Text>
            <Text style={styles.legendValue}>
              {formatNumber(chart.stats.min)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
})}
        </View>
      )}
    </ScrollView>
  );
}

/* ================= SUB ================= */

function SimpleCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onChange}
      disabled={disabled}
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: disabled ? "#d1d5db" : "#22c55e",
        backgroundColor: checked ? "#22c55e" : "#fff",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {checked && (
        <Ionicons name="checkmark" size={14} color="#fff" />
      )}
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  measurementsSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  measurementsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  measurementsBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#f9fafb",
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  dropdownWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  dropdownBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  resultContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#f0fdf4",
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#22c55e",
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#15803d",
    marginBottom: 8,
  },
  resultItem: {
    fontSize: 13,
    color: "#15803d",
    marginVertical: 4,
  },
  chartsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  chartCard: {
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  legendValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 2,
  },
});
