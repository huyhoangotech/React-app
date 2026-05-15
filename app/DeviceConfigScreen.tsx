'use client';

import { RootStackParamList } from "@/navigation/RootNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Cpu,
  MapPin,
  Network,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/* ================= TYPES ================= */

type ConfigDevice = {
  deviceId: string;
  name: string;
  type?: string;
  location: string;
  path?: string;
  is_visible: boolean;
};

type ConfigTreeNode = {
  id: string;
  name: string;
  nodeType: "site" | "station" | "cluster" | "device";
  children?: ConfigTreeNode[];
  device?: ConfigDevice;
  level: number;
};

/* ================= CHECKBOX ================= */

const Checkbox = ({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) => (
  <TouchableOpacity
    onPress={onToggle}
    style={{
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: checked ? "#10B981" : "#D1D5DB",
      backgroundColor: checked ? "#10B981" : "#ffffff",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {checked && <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>✓</Text>}
  </TouchableOpacity>
);

/* ================= ICON HELPERS ================= */

const getNodeIcon = (nodeType: ConfigTreeNode["nodeType"], size = 18, color = "#10B981") => {
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

/* ================= TREE NODE COMPONENT ================= */

const ConfigTreeNode = ({
  node,
  isExpanded,
  onToggle,
  onDeviceToggle,
  level = 0,
}: {
  node: ConfigTreeNode;
  isExpanded: boolean;
  onToggle: () => void;
  onDeviceToggle: (deviceId: string) => void;
  level?: number;
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isVisible = node.device?.is_visible ?? true;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.treeNode,
          {
            paddingLeft: 12 + level * 16,
            backgroundColor:
              node.nodeType === "device"
                ? "rgba(16, 185, 129, 0.03)"
                : "rgba(255, 255, 255, 0.5)",
            borderLeftWidth: node.nodeType === "device" ? 3 : 0,
            borderLeftColor: isVisible ? "#10B981" : "#9CA3AF",
          },
        ]}
        onPress={() => {
          if (hasChildren) {
            onToggle();
          }
        }}
        activeOpacity={0.6}
      >
        {/* Expand/Collapse Icon */}
        <View style={styles.treeNodeIcon}>
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown width={20} height={20} color="#10B981" />
            ) : (
              <ChevronRight width={20} height={20} color="#10B981" />
            )
          ) : (
            <View style={{ width: 20 }} />
          )}
        </View>

        {/* Node Type Icon */}
        <View style={styles.treeNodeTypeIcon}>
          {getNodeIcon(node.nodeType, 16, "#10B981")}
        </View>

        {/* Node Name */}
        <Text
          style={[
            styles.treeNodeName,
            {
              fontWeight:
                node.nodeType === "site" ? "700" : node.nodeType === "station" ? "600" : "500",
              fontSize: node.nodeType === "site" ? 14 : 13,
              color: !isVisible && node.nodeType === "device" ? "#9CA3AF" : "#1F2937",
            },
          ]}
          numberOfLines={1}
        >
          {node.name}
        </Text>

        {/* Device Actions - Checkbox & Count Badge */}
        {node.nodeType === "device" && node.device ? (
          <Checkbox
            checked={node.device.is_visible}
            onToggle={() => onDeviceToggle(node.device!.deviceId)}
          />
        ) : hasChildren ? (
          <View style={styles.treeCountBadge}>
            <Text style={styles.treeCountText}>{node.children?.length}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <View>
          {node.children?.map((child) => (
            <ConfigTreeNode
              key={child.id}
              node={child}
              isExpanded={expandedNodes[child.id] !== false}
              onToggle={() => toggleNode(child.id)}
              onDeviceToggle={onDeviceToggle}
              level={level + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
};

/* ================= SCREEN ================= */

let expandedNodes: Record<string, boolean> = {};

const toggleNode = (nodeId: string) => {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  expandedNodes = {
    ...expandedNodes,
    [nodeId]: !expandedNodes[nodeId],
  };
};

export default function DeviceConfigScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [devices, setDevices] = useState<ConfigDevice[]>([]);
  const [treeData, setTreeData] = useState<ConfigTreeNode[]>([]);
  const [expandedNodesState, setExpandedNodesState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");

  useEffect(() => {
    fetchDevicesWithConfig();
  }, []);

  /* ================= TREE BUILDER ================= */

  const buildConfigTree = (deviceList: ConfigDevice[]): ConfigTreeNode[] => {
    const siteMap = new Map<string, ConfigTreeNode>();
    const stationMap = new Map<string, ConfigTreeNode>();
    const clusterMap = new Map<string, ConfigTreeNode>();

    deviceList.forEach((device) => {
      const pathParts = device.path ? device.path.split(" > ") : [];
      if (pathParts.length === 0) return;

      const rootSiteName = pathParts[0];
      const stationName = pathParts[1] || null;
      const clusterName = pathParts[2] || null;

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
          const stationNode: ConfigTreeNode = {
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
            const clusterNode: ConfigTreeNode = {
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
            id: device.deviceId,
            name: device.name,
            nodeType: "device",
            device,
            level: 3,
          });
        } else {
          stationNode.children?.push({
            id: device.deviceId,
            name: device.name,
            nodeType: "device",
            device,
            level: 2,
          });
        }
      } else {
        siteNode.children?.push({
          id: device.deviceId,
          name: device.name,
          nodeType: "device",
          device,
          level: 1,
        });
      }
    });

    return Array.from(siteMap.values());
  };

  /* ================= FETCH ALL + CONFIG ================= */

  const fetchDevicesWithConfig = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const [allRes, configRes] = await Promise.all([
        axios.get(
          "https://be.otech.vn/api/customer/all-devices-tree",
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(
          "https://be.otech.vn/api/customer/user-devices",
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      const configMap = new Map<string, boolean>();

      configRes.data?.data?.forEach((c: any) => {
        configMap.set(c.device_id, c.is_visible === 1);
      });

      const merged: ConfigDevice[] = allRes.data.devices.map((d: any) => ({
        deviceId: d.id,
        name: d.name,
        type: d.type,
        location: d.location,
        path: d.path || null,
        is_visible: configMap.has(d.id) ? configMap.get(d.id)! : true,
      }));

      setDevices(merged);

      // Build tree structure
      const tree = buildConfigTree(merged);
      setTreeData(tree);

      // Initialize expanded nodes
      const initialExpanded: Record<string, boolean> = {};
      tree.forEach((site) => {
        initialExpanded[site.id] = true;
      });
      setExpandedNodesState(initialExpanded);
      expandedNodes = initialExpanded;
    } catch (err) {
      console.error("❌ fetchDevicesWithConfig error:", err);
    } finally {
      setLoading(false);
    }
  };
  /* ================= TOGGLE DEVICE ================= */

  const toggleDevice = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.deviceId === deviceId ? { ...d, is_visible: !d.is_visible } : d
      )
    );

    setTreeData((prev) =>
      prev.map((site) => toggleDeviceInTree(site, deviceId))
    );
  };

  const toggleDeviceInTree = (
    node: ConfigTreeNode,
    deviceId: string
  ): ConfigTreeNode => {
    if (node.id === deviceId && node.device) {
      return {
        ...node,
        device: { ...node.device, is_visible: !node.device.is_visible },
      };
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map((child) => toggleDeviceInTree(child, deviceId)),
      };
    }

    return node;
  };

  /* ================= SAVE ================= */

  const saveConfig = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await Promise.all(
        devices.map((d) =>
          axios.post(
            "https://be.otech.vn/api/customer/config",
            {
              deviceId: d.deviceId,
              is_visible: d.is_visible ? 1 : 0,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        )
      );

      Alert.alert("✅ Success", "Config saved successfully", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      console.error("❌ saveConfig error:", err);
      Alert.alert("❌ Error", "Save failed");
    } finally {
      setSaving(false);
    }
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#047857", "#059669", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.title}>Show Devices On Home</Text>
        <Text style={styles.subtitle}>Choose devices to display on your home screen</Text>
      </LinearGradient>

      {/* View Mode Toggle */}
      <View style={styles.viewModeToggle}>
        <TouchableOpacity
          style={[
            styles.viewModeButton,
            viewMode === "list" && styles.viewModeButtonActive,
          ]}
          onPress={() => setViewMode("list")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.viewModeButtonText,
              viewMode === "list" && styles.viewModeButtonTextActive,
            ]}
          >
            List View
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

      {/* List View */}
      {viewMode === "list" ? (
        <FlatList
          data={devices}
          keyExtractor={(i) => i.deviceId}
          contentContainerStyle={{ paddingBottom: 140 }}
          scrollEnabled={true}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.type} · {item.location}
                </Text>
              </View>

              <Checkbox
                checked={item.is_visible}
                onToggle={() => toggleDevice(item.deviceId)}
              />
            </View>
          )}
        />
      ) : (
        /* Tree View */
        <FlatList
          data={treeData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConfigTreeNode
              node={item}
              isExpanded={expandedNodesState[item.id] !== false}
              onToggle={() => {
                toggleNode(item.id);
                setExpandedNodesState((prev) => ({
                  ...prev,
                  [item.id]: !prev[item.id],
                }));
              }}
              onDeviceToggle={toggleDevice}
            />
          )}
          contentContainerStyle={styles.treeListContent}
          scrollEnabled={true}
        />
      )}

      <View style={styles.saveBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={saveConfig}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving..." : "Save changes"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafb" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerGradient: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },

  // View Mode Toggle
  viewModeToggle: {
    flexDirection: "row",
    paddingHorizontal: 16,
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
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },

  viewModeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  viewModeButtonTextActive: {
    color: "#ffffff",
  },

  // List View
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
  },

  rowContent: {
    flex: 1,
  },

  name: { fontWeight: "700", fontSize: 14, color: "#1F2937" },
  meta: { fontSize: 11, color: "#6B7280", marginTop: 2 },

  // Tree View
  treeListContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingBottom: 140,
  },

  treeNode: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
    marginHorizontal: 4,
    borderRadius: 12,
  },

  treeNodeIcon: {
    width: 24,
    alignItems: "center",
  },

  treeNodeTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },

  treeNodeName: {
    flex: 1,
    color: "#1F2937",
  },

  treeCountBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },

  treeCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#10B981",
  },

  // Save Bar
  saveBar: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#F9FAFB",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },

  saveBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },

  saveText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
