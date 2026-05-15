'use client';

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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

type Props = {};

/* ================= TYPES ================= */

interface ChartPoint {
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

interface ChartData {
  measurement: MeasurementInfo;
  data: ChartPoint[];
  stats: Stats;
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

const API_BASE = "https://be.otech.vn";
const MAX_BARS = 35;
const MAX_MEASUREMENTS = 3;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const formatNumber = (v: number) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(v);

const CustomDot = (props: any) => {
  const { x, y, style, events } = props;

  return (
    <G>
      {/* HIT AREA */}
      <Circle
        cx={x}
        cy={y}
        r={30}
        fill="transparent"
        {...events}
      />

      {/* DOT THẬT */}
      <Circle
        cx={x}
        cy={y}
        r={5}
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

export default function HistoryDetail1() {

const [quota, setQuota] = useState({
  total: 0,
  saved: 0,
  remaining: 0,
});
  const [selected, setSelected] = useState(timeframes[0]);
  const [open, setOpen] = useState(false);
const [openMeasurements, setOpenMeasurements] = useState(true);

  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [allMeasurements, setAllMeasurements] = useState<MeasurementInfo[]>([]);
  const [selectedMeasurements, setSelectedMeasurements] = useState<string[]>([]);

const [devices, setDevices] = useState<DeviceSelect[]>([]);
const [openDeviceSelect, setOpenDeviceSelect] = useState(false);
const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
const [selectedByDevice, setSelectedByDevice] = React.useState<
  Record<string, string[]>
>({});

const totalSelectedCount = React.useMemo(() => {
  return Object.values(selectedByDevice).reduce(
    (sum, measurements) => sum + measurements.length,
    0
  );
}, [selectedByDevice]);

  const [chartsData, setChartsData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentType, setCurrentType] =
    useState<ApiType>("hour");
  const [clickedDots, setClickedDots] = useState<Record<string, number | null>>(
    {}
  );
const fetchStorageQuota = async () => {
   console.log("🚀 fetchStorageQuota called");

  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const res = await axios.get(
      `${API_BASE}/api/customer/storage-quota`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setQuota({
      total: res.data.total_quota,
      saved: res.data.saved_measurements,
      remaining: res.data.remaining_slots,
    });
  } catch (err) {
    console.log("❌ fetchStorageQuota error", err);
  }
};
  /* ================= FETCH DEVICE & MEASUREMENTS ================= */
const fetchDevices = async () => {
 try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    const res = await axios.get(
      `${API_BASE}/api/customer/history-config`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    /**
     * measurements: [
     *  {
     *    id,
     *    device_id,
     *    device_name,
     *    measurement_id,
     *    measurement_name
     *  }
     * ]
     */

    const deviceMap: Record<string, DeviceSelect> = {};
    const grouped: Record<string, string[]> = {};

    for (const row of res.data.measurements ?? []) {
      // DEVICE
      if (!deviceMap[row.device_id]) {
        deviceMap[row.device_id] = {
          id: row.device_id,
          name: row.device_name,
        };
      }

      // MEASUREMENT
      if (!grouped[row.device_id]) {
        grouped[row.device_id] = [];
      }

      grouped[row.device_id].push(row.measurement_id);
    }

    const deviceList = Object.values(deviceMap);

    setDevices(deviceList);
    setSelectedByDevice(grouped);

    // ⭐ auto chọn device đầu
    if (deviceList[0]) {
      setCurrentDeviceId(deviceList[0].id);
    }
  } catch (err) {
    console.log("[HistoryDetail] fetch error", err);
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

  /* ================= FILL MISSING BUCKETS ================= */

  const fillMissingBuckets = (
    rawData: any[],
    range: { from: number; to: number; type: ApiType }
  ): any[] => {
    if (range.type === "hour") {
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

      setCurrentType(range.type);

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
          avg: round1(
            filledData.length > 0
              ? filledData.reduce(
                  (sum: number, r: any) =>
                    sum + Number(r.avg_value || 0),
                  0
                ) / filledData.length
              : 0
          ),
          max: round1(
            filledData.length > 0
              ? Math.max(...filledData.map((r: any) => Number(r.max_value || 0)))
              : 0
          ),
          min: round1(
            filledData.length > 0
              ? Math.min(...filledData.map((r: any) => Number(r.min_value || 0)))
              : 0
          ),
          total: 0,
        };

        return {
          measurement,
          data,
          stats,
        };
      });

      setChartsData(formatted);
    } catch (err: any) {
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
    fetchDevices();
     fetchStorageQuota(); 
  }, []);

  useEffect(() => {
    if (currentDeviceId) {
      fetchDeviceAndMeasurements();
    }
  }, [currentDeviceId]);

  useEffect(() => {
    if (selectedMeasurements.length > 0) {
      fetchChartData();
    }
  }, [selectedMeasurements, selected]);


  /* ================= RENDER ================= */

  return (
   <ScrollView style={styles.container} 
   contentContainerStyle={{ paddingBottom: 50 }}>
  {/* TOP HEADER */}
   <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subTitle}>
            Measurements history by device
          </Text>
        </View>
      </LinearGradient>
<View style={styles.usageWrap}>
  <Text style={styles.usageText}>
    You used{" "}
   <Text style={styles.usageStrong}>
  {quota.saved}/{quota.total}
</Text>
   {" "}measurements to save data
  </Text>
</View>

     {/* SELECT DEVICE */}
 <View style={styles.section}>
        <View style={styles.dropdownWrap}>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setOpenDeviceSelect(v => !v)}
          >
            <View style={styles.dropdownBtnContent}>
              <Ionicons name="tablet-landscape" size={20} color="#059669" />
              <Text style={styles.dropdownBtnText}>
                {devices.find(d => d.id === currentDeviceId)?.name}
              </Text>
            </View>
            <Ionicons
              name={openDeviceSelect ? "chevron-up" : "chevron-down"}
              size={20}
              color="#059669"
            />
          </TouchableOpacity>

          {openDeviceSelect && (
            <View style={styles.dropdown}>
              {devices.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.dropdownItem,
                    currentDeviceId === d.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setCurrentDeviceId(d.id);
                    setOpenDeviceSelect(false);
                  }}
                >
                  <Ionicons name="tablet-landscape" size={18} color="#059669" />
                  <Text
                    style={[
                      styles.dropdownItemText,
                      currentDeviceId === d.id &&
                      styles.dropdownItemTextActive,
                    ]}
                  >
                    {d.name}
                  </Text>
                  {currentDeviceId === d.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#059669"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
   {/* TIMEFRAME */}
<View style={styles.dropdownWrapSmall}>

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
    {/* MEASUREMENTS SELECTION */}
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <Ionicons name="analytics" size={20} color="#059669" />
      <Text style={styles.sectionTitle}>
        Measurements ({selectedMeasurements.length}/{MAX_MEASUREMENTS})
      </Text>
    </View>
  </View>

  <View style={styles.measurementsBody}>
    <ScrollView
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true} // ⭐ Android rất cần
    >
      {allMeasurements.map((m) => {
        const isSelected = selectedMeasurements.includes(m.id);
        const isDisabled =
          !isSelected &&
          selectedMeasurements.length >= MAX_MEASUREMENTS;

        return (
          <TouchableOpacity
            key={m.id}
            style={[
              styles.checkboxItem,
              isSelected && styles.checkboxItemActive,
              isDisabled && { opacity: 0.4 },
            ]}
            onPress={() => toggleMeasurement(m.id)}
            disabled={isDisabled}
          >
            <View style={styles.checkbox}>
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="#059669" />
              )}
            </View>

            <Text style={styles.checkboxLabel}>
              {m.name} {m.unit ? `(${m.unit})` : ""}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
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
              ...chart.data.map((d) =>
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

              const magnitude = Math.pow(
                10,
                Math.floor(Math.log10(value))
              );
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
              <View
                key={chart.measurement.id}
                style={styles.chartCard}
              >
                <Text style={styles.chartTitle}>
                  {chart.measurement.name}
                  {chart.measurement.unit &&
                    ` (${chart.measurement.unit})`}
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
                    padding={{
                      top: 30,
                      bottom: 50,
                      left: 60,
                      right: 20,
                    }}
                    domain={{
                      x: [0, chart.data.length],
                      y: [0, maxY],
                    }}
                  >
                    {/* Y AXIS */}
                    <VictoryAxis
                      dependentAxis
                      tickFormat={formatNumber}
                      tickCount={5}
                      style={{
                        tickLabels: {
                          fontSize: 10,
                          fill: "#6b7280",
                        },
                        grid: {
                          stroke: "#e5e7eb",
                          strokeWidth: 1,
                          opacity: 1,
                        },
                      }}
                    />

                    {/* X AXIS */}
                    <VictoryAxis
                      tickValues={chart.data.map((d) => d.x)}
                      tickFormat={(x) => {
                        const found = chart.data.find(
                          (d) => d.x === x
                        );
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
                      labels={(props) =>
                        `${props.datum.avg_value.toFixed(1)}`
                      }
                      labelComponent={<VictoryLabel dy={-10} />}
                      style={{
                        data: {
                          fill: "#22c55e",
                          opacity: 0.85,
                        },
                        labels: {
                          fontSize: 9,
                          fill: "#1f2937",
                        },
                      }}
                    />

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
                      size={6}
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
                              setClickedDots((prev) => ({
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
                          opacity: 0.7,
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
                          dy={-14}
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
                              setClickedDots((prev) => ({
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

                {/* STATS DISPLAY */}
             <View style={styles.statsRow}>
  <Stat
    label="AVG"
    value={chart.stats.avg}
    color="#3B82F6"   // xanh dương
  />
  <Stat
    label="MAX"
    value={chart.stats.max}
    color="#EF4444"   // đỏ
  />
  <Stat
    label="MIN"
    value={chart.stats.min}
    color="#10B981"   // xanh lá
  />
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

function Stat({ label, value }: any) {
  const getColor = () => {
    switch (label) {
      case "MAX":
        return "#ef4444"; // đỏ
      case "MIN":
        return "#3b82f6"; // xanh dương
      case "AVG":
      default:
        return "#22c55e"; // xanh lá
    }
  };

  const color = getColor();

  return (
    <View style={styles.statBox}>
      <View style={[styles.statDot, { backgroundColor: color }]} />

      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>
          {typeof value === "number" ? value.toFixed(1) : value}
        </Text>
      </View>
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
        borderColor: disabled ? "#d1d5db" : "#10B981",
        backgroundColor: checked ? "#10B981" : "#fff",
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
  container: { flex: 1, backgroundColor: "#f8fafb", padding: 16 },
  header: {
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#fff" },
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
  paddingLeft: 12,
},
dropdownBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  dropdownBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
checkboxItem: {
  height: 52,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 12,
},

measurementsBody: {
  height: 52 * 6, // ⭐ chuẩn 6 item
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 12,
  backgroundColor: "white",
  overflow: "hidden",
},

topHeader: {
  marginBottom: 8,
  paddingTop: 12,
},

subTitle: {
  fontSize: 13,
  color: "#d1fae5",
  marginTop: 2,
},

usageWrap: {
  marginHorizontal: 16,
  marginBottom: 12,
  padding: 12,
  borderRadius: 8,
  backgroundColor: "#ECFDF5",
  borderWidth: 1,
  borderColor: "#A7F3D0",
},

usageText: {
  fontSize: 13,
  color: "#065F46",
},

usageStrong: {
  fontWeight: "700",
},

  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    
  },
  
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#FFF",
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: "#E5E7EB",
    },

    sectionHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
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
    borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6",
  },
  dropdownWrapSmall: {
  width: 320, 
  alignSelf: "center",
}
,
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
     width: "100%",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    marginTop: 4,
  },
  dropdownItem: { padding: 12 },
checkboxItemActive: {
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

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
    width: 32,
    marginHorizontal: 4,
  },
  barCurrent: {
    width: 16,
    backgroundColor: "#10B981",
    borderRadius: 4,
  },
   dropdownItemActive: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },

  dropdownItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    flex: 1,
  },

  dropdownItemTextActive: {
    color: "#059669",
    fontWeight: "600",
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
statDot: {
  width: 12,
  height: 12,
  borderRadius: 2, // vuông nhẹ bo góc
  marginRight: 8,
},  
  /* CHARTS CONTAINER */
  chartsContainer: {
    paddingBottom: 20,
  },

  chartCard: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    gap: 8,
  },
});
