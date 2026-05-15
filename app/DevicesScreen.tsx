'use client';

// DeviceManagerScreen.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Gauge,
  MapPin,
   Plug,
  Network,
  Plus,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Zap
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  LayoutAnimation,
  StyleSheet,
  Text,
  
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// ---------------- TYPES ----------------
interface Device {
  id: string;
  name: string;
  type: string;

  site: string | null;
  station: string | null;
  cluster: string | null;

  status: "Connected" | "Disconnected";
}

interface TreeNode {
  id: string;
  name: string;
  nodeType: "site" | "station" | "cluster" | "device";
  children?: TreeNode[];
  device?: Device;
  level: number;
}

// ---------------- ICON HELPER ----------------
const getDeviceIcon = (type: Device["type"], size = 24, color = "#059669") => {
  switch (type) {
    case "Recloser":
    case "Relay":
      return <Zap width={size} height={size} color={color} />;
    case "Meter":
      return <Gauge width={size} height={size} color={color} />;
    case "Transformer":
      return <Plug width={size} height={size} color={color} />;
    default:
      return <Cpu width={size} height={size} color={color} />;
  }
};

const getNodeIcon = (nodeType: TreeNode["nodeType"], size = 18, color = "#059669") => {
  switch (nodeType) {
    case "site":
      return <MapPin width={size} height={size} color={color} />;
    case "station":
      return <Building2 width={size} height={size} color={color} />;
    case "cluster":
      return <Network width={size} height={size} color={color} />;
    case "device":
      return <Cpu width={size} height={size} color={color} />;
    default:
      return <Cpu width={size} height={size} color={color} />;
  }
};

// Tree Node Component
const TreeNodeComponent = ({
  node,
  isExpanded,
  onToggle,
  onSelectDevice,
  expandedNodes,
  toggleNode,
  level = 0,
}: {
  node: TreeNode;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectDevice: (device: Device) => void;
  expandedNodes: Record<string, boolean>;
  toggleNode: (nodeId: string) => void;
  level?: number;
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isConnected = node.device?.status === "Connected";

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.treeNode,
          {
            paddingLeft: 16 + level * 24,
            backgroundColor:
              node.nodeType === "device"
                ? "rgba(5, 150, 105, 0.03)"
                : "transparent",
            borderLeftWidth: node.nodeType === "device" ? 3 : 0,
            borderLeftColor: isConnected ? "#22C55E" : "#EF4444",
          },
        ]}
        onPress={() => {
          if (hasChildren) {
            onToggle();
          } else if (node.device) {
            onSelectDevice(node.device);
          }
        }}
        activeOpacity={0.6}
      >
        {/* Icon & Arrow */}
        <View style={styles.treeNodeIcon}>
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown width={20} height={20} color="#059669" />
            ) : (
              <ChevronRight width={20} height={20} color="#059669" />
            )
          ) : (
            <View style={{ width: 20 }} />
          )}
        </View>

        {/* Node Icon */}
        <View style={styles.treeNodeTypeIcon}>
          {getNodeIcon(node.nodeType, 16, "#059669")}
        </View>

        {/* Node Name */}
        <Text
          style={[
            styles.treeNodeName,
            {
              fontWeight:
                node.nodeType === "site" ? "700" : node.nodeType === "station" ? "600" : "500",
              fontSize: node.nodeType === "site" ? 15 : 14,
              color: node.nodeType === "device" && !isConnected ? "#EF4444" : "#1F2937",
            },
          ]}
          numberOfLines={1}
        >
          {node.name}
        </Text>

        {/* Status Badge for Devices */}
        {node.nodeType === "device" && node.device && (
          <View
            style={[
              styles.treeDeviceStatus,
              {
                backgroundColor: isConnected ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? "#22C55E" : "#EF4444" },
              ]}
            />
            <Text
              style={[
                styles.treeDeviceStatusText,
                { color: isConnected ? "#22C55E" : "#EF4444" },
              ]}
            >
              {node.device.status}
            </Text>
          </View>
        )}

        {/* Count Badge */}
        {hasChildren && (
          <View style={styles.treeCountBadge}>
            <Text style={styles.treeCountText}>{node.children?.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Children */}
      {hasChildren && isExpanded && (
        <View>
          {node.children?.map((child) => (
            <TreeNodeComponent
  key={child.id}
  node={child}
  isExpanded={expandedNodes[child.id] ?? true}
  onToggle={() => toggleNode(child.id)}
  onSelectDevice={onSelectDevice}
  expandedNodes={expandedNodes}
  toggleNode={toggleNode}
  level={level + 1}
/>
          ))}
        </View>
      )}
    </View>
  );
};

// ---------------- MAIN SCREEN ----------------
export default function DeviceManagerScreen() {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Connected" | "Disconnected" | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [siteFilter, setSiteFilter] = useState<string | null>(null);
  const [sites, setSites] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"tree" | "grid">("grid");

  const toggleNode = (nodeId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };
  const getRootSiteName = (path: string | null): string | null => {
    if (!path) return null;
    const parts = path.split(" > ");
    return parts[0];
  };

  // Tree Builder
  const buildTreeStructure = (deviceList: Device[]): TreeNode[] => {
    const siteMap = new Map<string, TreeNode>();
    const stationMap = new Map<string, TreeNode>();
    const clusterMap = new Map<string, TreeNode>();

    // Create device nodes
    deviceList.forEach((device) => {
      const pathParts = device.site ? device.site.split(" > ") : [];
      if (pathParts.length === 0) return;

      const rootSiteName = pathParts[0];
      const stationName = pathParts[1] || null;
      const clusterName = pathParts[2] || null;

      // Ensure site exists
      if (!siteMap.has(rootSiteName)) {
        siteMap.set(rootSiteName, {
          id: `site-${rootSiteName}`,
          name: rootSiteName,
          nodeType: "site",
          children: [],
          level: 0,
        });
      }

      const siteNode = siteMap.get(rootSiteName)!;

      if (stationName) {
        const stationKey = `${rootSiteName}>${stationName}`;
        if (!stationMap.has(stationKey)) {
          const stationNode: TreeNode = {
            id: `station-${stationKey}`,
            name: stationName,
            nodeType: "station",
            children: [],
            level: 1,
          };
          stationMap.set(stationKey, stationNode);
          siteNode.children?.push(stationNode);
        }

        const stationNode = stationMap.get(stationKey)!;

        if (clusterName) {
          const clusterKey = `${stationKey}>${clusterName}`;
          if (!clusterMap.has(clusterKey)) {
            const clusterNode: TreeNode = {
              id: `cluster-${clusterKey}`,
              name: clusterName,
              nodeType: "cluster",
              children: [],
              level: 2,
            };
            clusterMap.set(clusterKey, clusterNode);
            stationNode.children?.push(clusterNode);
          }

          const clusterNode = clusterMap.get(clusterKey)!;
          clusterNode.children?.push({
            id: device.id,
            name: device.name,
            nodeType: "device",
            device,
            level: 3,
          });
        } else {
          stationNode.children?.push({
            id: device.id,
            name: device.name,
            nodeType: "device",
            device,
            level: 2,
          });
        }
      } else {
        siteNode.children?.push({
          id: device.id,
          name: device.name,
          nodeType: "device",
          device,
          level: 1,
        });
      }
    });

    return Array.from(siteMap.values());
  };

  // ------------ Fetch devices from API ------------
  const fetchDevices = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        "https://be.otech.vn/api/customer/all-devices-tree",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const mapped: Device[] = res.data.devices.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type ?? "Unknown",
        site: d.path || null,
        station: null,
        cluster: null,
        status: d.status === 1 ? "Connected" : "Disconnected",
      }));

      setDevices(mapped);

      // Build tree structure
      const tree = buildTreeStructure(mapped);
      setTreeData(tree);

      // Initialize expanded nodes (all sites expanded by default)
      const initialExpanded: Record<string, boolean> = {};
      tree.forEach((site) => {
        initialExpanded[site.id] = true;
      });
      setExpandedNodes(initialExpanded);

      // Extract unique sites
       const uniqueRootSites = [
        ...new Set(
          mapped
            .map((d) => getRootSiteName(d.site))
            .filter((s): s is string => s !== null)
        ),
      ];
      setSites(uniqueRootSites);
    } catch (err) {
      console.error("Error fetching devices:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(search);
  }, 250);

  return () => clearTimeout(timer);
}, [search]);



 const [showSiteModal, setShowSiteModal] = useState(false);
  const connectedCount = devices.filter((d) => d.status === "Connected").length;
  const disconnectedCount = devices.filter((d) => d.status === "Disconnected").length;

  // Filter devices: search, status, AND root site (includes all children devices)
  const filteredDevices = devices.filter((device) => {
    const keyword = debouncedSearch.toLowerCase();

    const matchesSearch =
      device.name.toLowerCase().includes(keyword) ||
      device.site?.toLowerCase().includes(keyword) ||
      device.station?.toLowerCase().includes(keyword) ||
      device.cluster?.toLowerCase().includes(keyword) ||
      device.type?.toLowerCase().includes(keyword);

    const matchesStatus =
      !statusFilter || device.status === statusFilter;

    // Match root site: compare root site names
    const deviceRootSite = getRootSiteName(device.site);
    const matchesSite = !siteFilter || deviceRootSite === siteFilter;

    return matchesSearch && matchesStatus && matchesSite;
  });



  // ------------ Loading Screen ------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={["#047857", "#059669", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </LinearGradient>
      </View>
    );
  }

  // ---------------- Render Item ----------------
  const renderItem = ({ item }: { item: Device }) => {
    const isConnected = item.status === "Connected";

    return (
  <TouchableOpacity
    style={styles.card}
    activeOpacity={0.7}
    onPress={() =>
      navigation.navigate("Measurement", {
        deviceId: item.id,
        deviceName: item.name,
        deviceType: item.type || "Unknown",
        canControl: true, // ✅ DEVICE -> được quyền điều khiển
      })
    }
  >
    {/* Status Indicator */}
    <View
      style={[
        styles.statusIndicator,
        { backgroundColor: isConnected ? "#22C55E" : "#EF4444" },
      ]}
    />

    {/* Icon */}
    <View style={styles.iconWrapper}>
      {getDeviceIcon(item.type, 28, "#059669")}
    </View>

    {/* Device Name */}
    <Text style={styles.deviceName} numberOfLines={1}>
      {item.name}
    </Text>

    {/* Device Type Badge */}
    <View style={styles.typeBadge}>
      <Text style={styles.typeBadgeText}>{item.type}</Text>
    </View>

    {/* Location */}
    <View style={styles.locationRow}>
      <MapPin width={12} height={12} color="#6B7280" />
    <Text style={styles.locationText} numberOfLines={2}>
  {[item.site, item.station, item.cluster]
    .filter(Boolean)
    .join(" / ")}
</Text>
    </View>

    {/* Status Row */}
    <View style={styles.statusRow}>
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor: isConnected
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
          },
        ]}
      >
        {isConnected ? (
          <Wifi width={14} height={14} color="#22C55E" />
        ) : (
          <WifiOff width={14} height={14} color="#EF4444" />
        )}
        <Text
          style={[
            styles.statusText,
            { color: isConnected ? "#22C55E" : "#EF4444" },
          ]}
        >
          {item.status}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

  };

  // ---------------- Render ----------------
  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Device Manager</Text>
            <Text style={styles.headerSubtitle}>Manage all your devices</Text>
          </View>
       <TouchableOpacity
  style={styles.addButton}
  activeOpacity={0.8}
  onPress={() => navigation.navigate("AddDevice")}
>
  <Plus width={20} height={20} color="#059669" />
</TouchableOpacity>
        </View>

        {/* Stats Cards */}
     <View style={styles.statsContainer}>
  {/* TOTAL */}
  <TouchableOpacity
    style={[
      styles.statCard,
      statusFilter === null && { borderWidth: 2, borderColor: "#fff" },
    ]}
    activeOpacity={0.8}
    onPress={() => setStatusFilter(null)}
  >
    <Text style={styles.statValue}>{devices.length}</Text>
    <Text style={styles.statLabel}>Total</Text>
  </TouchableOpacity>

  {/* CONNECTED */}
  <TouchableOpacity
    style={[
      styles.statCard,
      statusFilter === "Connected" && {
        borderWidth: 2,
        borderColor: "#22C55E",
        backgroundColor: "rgba(34,197,94,0.25)",
      },
    ]}
    activeOpacity={0.8}
    onPress={() =>
      setStatusFilter((prev) =>
        prev === "Connected" ? null : "Connected"
      )
    }
  >
    <View style={styles.statIconRow}>
      <View style={[styles.statDot, { backgroundColor: "#22C55E" }]} />
      <Text style={styles.statValue}>{connectedCount}</Text>
    </View>
    <Text style={styles.statLabel}>Connected</Text>
  </TouchableOpacity>

  {/* OFFLINE */}
  <TouchableOpacity
    style={[
      styles.statCard,
      statusFilter === "Disconnected" && {
        borderWidth: 2,
        borderColor: "#EF4444",
        backgroundColor: "rgba(239,68,68,0.25)",
      },
    ]}
    activeOpacity={0.8}
    onPress={() =>
      setStatusFilter((prev) =>
        prev === "Disconnected" ? null : "Disconnected"
      )
    }
  >
    <View style={styles.statIconRow}>
      <View style={[styles.statDot, { backgroundColor: "#EF4444" }]} />
      <Text style={styles.statValue}>{disconnectedCount}</Text>
    </View>
    <Text style={styles.statLabel}>Offline</Text>
  </TouchableOpacity>
</View>

      </LinearGradient>

   <View style={styles.searchBar}>

  {/* SEARCH */}
  <View style={styles.searchInput}>
    <Search width={18} height={18} color="#9CA3AF" />

    <TextInput
      placeholder="Search..."
      placeholderTextColor="#9CA3AF"
      value={search}
      onChangeText={setSearch}
      style={{ flex: 1, fontSize: 14 }}
    />
  </View>

  {/* SITE FILTER */}
  <TouchableOpacity
    style={styles.siteFilter}
   onPress={() => {
  if (sites.length === 0) return;

  if (!siteFilter) {
    setSiteFilter(sites[0]);
  } else {
    const index = sites.indexOf(siteFilter);
    const nextIndex = index + 1;

    if (nextIndex >= sites.length) {
      setSiteFilter(null);
    } else {
      setSiteFilter(sites[nextIndex]);
    }
  }
}}
  >
    <MapPin width={16} height={16} color="#059669" />
    <Text style={styles.siteFilterText} numberOfLines={1}>
      {siteFilter ?? "Site"}
    </Text>
  </TouchableOpacity>

</View>



      {/* View Mode Toggle */}
      <View style={styles.viewModeToggle}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === "grid" && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode("grid")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === "grid" && styles.viewModeButtonTextActive,
            ]}
          >
            Grid View
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === "tree" && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode("tree")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === "tree" && styles.viewModeButtonTextActive,
            ]}
          >
            Tree View
          </Text>
        </TouchableOpacity>
      </View>

      {/* Device List - Grid Mode */}
      {viewMode === "grid" ? (
       <FlatList
  key="grid"
  data={filteredDevices}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  numColumns={2}
  columnWrapperStyle={styles.columnWrapper}
  contentContainerStyle={styles.listContent}
  showsVerticalScrollIndicator={false}
  refreshing={refreshing}
  onRefresh={() => fetchDevices(true)}
/>
      ) : (
        /* Tree Mode */
     <FlatList
          data={
            siteFilter
              ? treeData.filter((site) => site.name === siteFilter)
              : treeData
          }
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TreeNodeComponent
      node={item}
      isExpanded={expandedNodes[item.id] !== false}
      onToggle={() => toggleNode(item.id)}
      onSelectDevice={(device) =>
        navigation.navigate("Measurement", {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type || "Unknown",
          canControl: true,
        })
      }
      expandedNodes={expandedNodes}
      toggleNode={toggleNode}
    />
  )}
  contentContainerStyle={styles.treeListContent}
  showsVerticalScrollIndicator={false}
  refreshing={refreshing}
  onRefresh={() => fetchDevices(true)}
/>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => fetchDevices(true)}
      >
        <LinearGradient
          colors={["#047857", "#059669"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <RefreshCw
            width={22}
            height={22}
            color="#ffffff"
            style={refreshing ? { opacity: 0.5 } : {}}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
searchBar: {
  flexDirection: "row",
  paddingHorizontal: 20,
  paddingVertical: 16,
  gap: 10,
},

searchInput: {
  flex: 3,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#ffffff",
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  gap: 8,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},

siteFilter: {
  flex: 1.3,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#ffffff",
  borderRadius: 12,
  paddingHorizontal: 10,
  gap: 6,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 4,
  elevation: 2,
},

siteFilterText: {
  fontSize: 13,
  color: "#374151",
  fontWeight: "500",
},
  // Header
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    fontWeight: "500",
  },

  // Search Bar
  
  searchPlaceholder: {
    fontSize: 15,
    color: "#9CA3AF",
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // List
  columnWrapper: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 100,
    gap: 16,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    position: "relative",
  },
  statusIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(5, 150, 105, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(5, 150, 105, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  statusRow: {
    marginTop: "auto",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // View Mode Toggle
  viewModeToggle: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  viewModeButtonActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  viewModeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  viewModeButtonTextActive: {
    color: "#ffffff",
  },

  // Tree View
  treeListContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 100,
  },
  treeNode: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: "#ffffff",
  },
  treeNodeIcon: {
    width: 24,
    alignItems: "center",
  },
  treeNodeTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(5, 150, 105, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  treeNodeName: {
    flex: 1,
    color: "#1F2937",
  },
  treeDeviceStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  treeDeviceStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  treeCountBadge: {
    backgroundColor: "rgba(5, 150, 105, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  treeCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
