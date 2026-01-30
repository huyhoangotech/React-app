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

interface ChartPoint {
  time: string;
  avg: number;
  max: number;
  min: number;
  total: number;
}

interface Stats {
  max: number;
  avg: number;
  min: number;
  total: number;
}
interface DeviceSelect {
  id: string;
  name: string;
  location?: string;
}

interface DeviceInfo {
  id: string;
  name: string;
  location?: string; // 👈 THÊM DÒNG NÀY
}


interface MeasurementInfo {
  id: string;
  name: string;
  unit?: string;
  configId: string;
}

interface ChartDataByMeasurement {
  measurement: MeasurementInfo;
  data: ChartPoint[];
  stats: Stats;
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
const MAX_BARS = 35;
const MAX_MEASUREMENTS = 3;

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

    case "day": // 1 giờ
      d.setMinutes(0, 0);
      break;

    case "week":
      d.setHours(0, 0, 0);
      break;

    case "month": // 1 ngày
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
        cur.setHours(cur.getHours() + 1);
        break;
      case "week":
        cur.setDate(cur.getDate() + 1);
        break;
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

  const [chartsData, setChartsData] = useState<ChartDataByMeasurement[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentType, setCurrentType] =
    useState<ApiType>("hour");
  const [clickedDots, setClickedDots] = useState<Record<string, number | null>>(
    {}
  );

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
    setSelectedMeasurements([]); // 🔥 reset khi đổi device
    setChartsData([]);
  } catch (err) {}
};

const [tooltip, setTooltip] = useState<{
  x: number;
  y: number;
  value: number;
  label: string;
} | null>(null);

  /* ================= FETCH HISTORY FOR SELECTED MEASUREMENTS ================= */

  const fetchHistory = async (rangeLabel?: string) => {
    if (selectedMeasurements.length === 0) {
      setChartsData([]);
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const range = buildRange(rangeLabel || selected);
      if (!range) return;

      setCurrentType(range.type);

      // Fetch data for each selected measurement
      const chartsDataTemp: ChartDataByMeasurement[] = [];

      for (const measurementId of selectedMeasurements) {
        const measurement = allMeasurements.find(m => m.id === measurementId);
        if (!measurement) continue;

        const res = await axios.get(
          `${API_BASE}/api/customer/devices/${deviceId}/measurements/${measurementId}/history`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: range,
          }
        );

        const rows = res.data.data || [];

        /* ===== MAP DB DATA ===== */
        const bucketMap = new Map<number, {
          avg: number;
          max: number;
          min: number;
          total: number;
        }>();

        rows.forEach((r: any) => {
          const key = normalizeTimestamp(
            new Date(r.bucket).getTime(),
            range.type
          );
          bucketMap.set(key, {
            avg: Number(r.avg_value || 0),
            max: Number(r.max_value || 0),
            min: Number(r.min_value || 0),
            total: Number(r.total_value || 0),
          });
        });

        /* ===== GENERATE FULL TIMELINE ===== */
        const buckets = generateBuckets(
          range.from,
          range.to,
          range.type
        );

        const points: ChartPoint[] = buckets.map((ts) => {
          const data = bucketMap.get(ts) || {
            avg: 0,
            max: 0,
            min: 0,
            total: 0,
          };
          return {
            time: formatBucketTime(ts, range.type),
            avg: data.avg,
            max: data.max,
            min: data.min,
            total: data.total,
          };
        });

        /* ===== STATS (REAL DATA ONLY) ===== */
     const realValues: Stats[] = rows.map((r: any) => ({
  avg: Number(r.avg_value || 0),
  max: Number(r.max_value || 0),
  min: Number(r.min_value || 0),
  total: Number(r.total_value || 0),
}));

let stats: Stats;

if (realValues.length) {
  const avgs = realValues.map((v: Stats) => v.avg);
  const maxs = realValues.map((v: Stats) => v.max);
  const mins = realValues.map((v: Stats) => v.min);
  const totals = realValues.map((v: Stats) => v.total);

  const sumAvg = avgs.reduce((a: number, b: number) => a + b, 0);
  const sumTotal = totals.reduce((a: number, b: number) => a + b, 0);

  stats = {
    avg: round1(sumAvg / avgs.length),
    max: round1(Math.max(...maxs)),
    min: round1(Math.min(...mins)),
    total: round1(sumTotal),
  };
} else {
  stats = { avg: 0, max: 0, min: 0, total: 0 };
}

        chartsDataTemp.push({
          measurement,
          data: points,
          stats,
        });
      }

      setChartsData(chartsDataTemp);
    } catch (err: any) {
    
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
    fetchHistory(selected);
  }, [selectedMeasurements, selected]);
useEffect(() => {
  fetchDevices();
}, []);
useEffect(() => {
  fetchDeviceAndMeasurements();
}, [currentDeviceId]);

  /* ================= CHART OPT ================= */

  const getDisplayData = (data: ChartPoint[]) => {
    return data.length > MAX_BARS
      ? data.filter(
          (_, i) =>
            i % Math.ceil(data.length / MAX_BARS) === 0
        )
      : data;
  };

  /* ================= RENDER ================= */

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{device?.name}</Text>
        <Text style={styles.sub}>{subtitleMap[currentType]}</Text>
      </View>
  
     {/* SELECT DEVICE */}
<View style={styles.dropdownWrap}>
  <TouchableOpacity
    style={styles.dropdownBtn}
    onPress={() => setOpenDeviceSelect((v) => !v)}
  >
    <Text>
      {device?.name}{" "}
      {device?.location ? `- ${device.location}` : ""}
    </Text>
    <Ionicons name="chevron-down" size={16} />
  </TouchableOpacity>

  {openDeviceSelect && (
    <View style={styles.dropdown}>
      {devices.map((d) => (
        <TouchableOpacity
          key={d.id}
          style={styles.dropdownItem}
          onPress={() => {
            setCurrentDeviceId(d.id);
            setOpenDeviceSelect(false);
          }}
        >
          <Text style={{ fontWeight: "600" }}>{d.name}</Text>
          {d.location && (
            <Text style={{ fontSize: 11, color: "#6b7280" }}>
              {d.location}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )}
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
      ) : chartsData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Vui lòng chọn ít nhất 1 measurement
          </Text>
        </View>
      ) : (
        chartsData.map((chartItem, idx) => (
          <View key={idx} style={styles.chartWrapper}>
            {/* CHART */}
          <View style={styles.chart}>
  <View style={{ position: "relative" }}>
          <View style={styles.chartBody}>
            {/* MEASUREMENT NAME - TOP RIGHT */}
            <Text
              style={{
                position: "absolute",
                top: 8,
                right: 12,
                fontSize: 11,
                fontWeight: "600",
                color: "#6b7280",
                zIndex: 10,
              }}
            >
              {chartItem.measurement.name}
              {chartItem.measurement.unit
                ? ` (${chartItem.measurement.unit})`
                : ""}
            </Text>

            {/* Y AXIS */}
            <View style={styles.yAxis}>
        {[5, 4, 3, 2, 1, 0].map((i) => {
          const displayData = getDisplayData(chartItem.data);
          const maxValue =
            Math.max(
              ...displayData.map((d) => d.max),
              1
            ) * 1.2;
          const v = ((maxValue / 5) * i).toFixed(1);
          return (
            <Text key={i} style={styles.yLabel}>
              {v}
            </Text>
          );
        })}
      </View>

      {/* BARS & LINES */}
      <ScrollView horizontal>
        <View style={{ position: "relative" }}>
          <View style={styles.barRow}>
            {(() => {
              const displayData = getDisplayData(chartItem.data);
              const maxValue =
                Math.max(
                  ...displayData.map((d) => d.max),
                  1
                ) * 1.2;

              return displayData.map((d, i) => (
                <View key={i} style={styles.barItem}>
                  <Text style={styles.barValue}>
                    {d.avg.toFixed(1)}
                  </Text>
                  <View
                    style={[
                      styles.barCurrent,
                      {
                        height:
                          (d.avg / maxValue) * 200,
                      },
                    ]}
                  />
                  <Text style={styles.time}>{d.time}</Text>
                </View>
              ));
            })()}
          </View>
          {/* MAX LINE */}
          <LineOverlay
            data={getDisplayData(chartItem.data)}
            valueKey="max"
            color="#ef4444"
            barWidth={16}
            gap={24}
            chartHeight={200}
            maxValue={
              Math.max(
                ...getDisplayData(chartItem.data).map(
                  (d) => d.max
                ),
                1
              ) * 1.2
            }
            onDotPress={(value, index) => {
              setClickedDots((prev) => ({
                ...prev,
                [`${idx}-max`]: prev[`${idx}-max`] === index ? null : index,
              }));
            }}
            clickedIndex={clickedDots[`${idx}-max`] ?? null}
          />

          {/* MIN LINE */}
          <LineOverlay
            data={getDisplayData(chartItem.data)}
            valueKey="min"
            color="#3b82f6"
            barWidth={16}
            gap={24}
            chartHeight={200}
            maxValue={
              Math.max(
                ...getDisplayData(chartItem.data).map(
                  (d) => d.max
                ),
                1
              ) * 1.2
            }
            onDotPress={(value, index) => {
              setClickedDots((prev) => ({
                ...prev,
                [`${idx}-min`]: prev[`${idx}-min`] === index ? null : index,
              }));
            }}
            clickedIndex={clickedDots[`${idx}-min`] ?? null}
          />
        </View>
      </ScrollView>
    </View>
  </View>

  {/* LEGEND */}
  <View
    style={{
      flexDirection: "row",
      justifyContent: "center",
      gap: 16,
      marginTop: 12,
    }}
  >
    <Legend color="#22c55e" label="AVG" value={chartItem.stats.avg} />
    <Legend color="#ef4444" label="MAX" value={chartItem.stats.max} />
    <Legend color="#3b82f6" label="MIN" value={chartItem.stats.min} />
  </View>
</View>


           
           
          </View>
        ))
      )}
    </ScrollView>
  );
}

/* ================= SUB ================= */

function Stat({ label, value }: any) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {typeof value === 'number' ? value.toFixed(1) : value}
      </Text>
    </View>
  );
}
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
}function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: 10,
          height: 10,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      <Text style={{ fontSize: 11, color: "#374151", fontWeight: "500" }}>
        {label}
      </Text>
      {value !== undefined && (
        <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "600" }}>
          {value.toFixed(1)}
        </Text>
      )}
    </View>
  );
}

function LineOverlay({
  data,
  valueKey,
  color,
  barWidth,
  gap,
  chartHeight,
  maxValue,
  onDotPress,
  clickedIndex,
}: {
  data: ChartPoint[];
  valueKey: "max" | "min";
  color: string;
  barWidth: number;
  gap: number;
  chartHeight: number;
  maxValue: number;
  onDotPress?: (value: number, index: number) => void;
  clickedIndex?: number | null;
}) {
  const points = data.map((d, i) => {
    const x = i * (barWidth + gap) + barWidth / 2;
    const y =
      chartHeight -
      (d[valueKey] / maxValue) * chartHeight;
    return { x, y, value: d[valueKey] };
  });

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 40, // bù trừ trục Y
        bottom: 28,
        height: chartHeight,
        width:
          data.length * (barWidth + gap),
      }}
    >
      {/* DOT */}
      {points.map((p, i) => (
  <TouchableOpacity
    key={`dot-${valueKey}-${i}`}
    onPress={() => onDotPress?.(p.value, i)}

    // ⭐ TĂNG VÙNG CLICK
    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}

    style={{
      position: "absolute",
      left: p.x - 20,   // 40 / 2
      top: p.y - 20,
      width: 40,       // ⭐ VÙNG BẤM TO
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {/* DOT THẬT */}
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: color,
      }}
    />

    {/* INNER DOT */}
  
  </TouchableOpacity>
))}

      {/* VALUE LABELS - ONLY SHOW WHEN CLICKED */}
      {clickedIndex !== null && clickedIndex !== undefined &&  points[clickedIndex] && (
        <Text
          key={`value-${valueKey}-${clickedIndex}`}
          style={{
            position: "absolute",
            left: points[clickedIndex].x - 12,
            top: points[clickedIndex].y - 20,
            fontSize: 10,
            fontWeight: "700",
            color: color,
            minWidth: 44,   
            textAlign: "center",
            backgroundColor: "#fff",
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 3,
          }}
        >
          {points[clickedIndex].value.toFixed(1)}
        </Text>
      )}

      {/* LINE */}
      {points.slice(1).map((p, i) => {
        const prev = points[i];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle =
          (Math.atan2(dy, dx) * 180) / Math.PI;

        return (
          <View
            key={`line-${valueKey}-${i}`}
            style={{
              position: "absolute",
              left: prev.x,
              top: prev.y,
              width: length,
              height: 2,
              backgroundColor: color,
              transform: [{ rotateZ: `${angle}deg` }],
              transformOrigin: "0% 50%",
            }}
            pointerEvents="none"
          />
        );
      })}
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  header: {
    marginBottom: 16,
    paddingTop: 20,
  },
  title: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  /* MEASUREMENTS SECTION */
  measurementsSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  measurementsHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 8,
},

measurementsBody: {
  marginTop: 8,
},

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1f2937",
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: "#374151",
  },

  /* DROPDOWN */
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

  /* CHART */
  chartWrapper: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    color: "#1f2937",
  },
  chart: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
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

  /* STATS */
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
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

  /* LOADING & EMPTY */
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
  },
});
