  import React, { useContext } from "react"
  import { createNativeStackNavigator } from "@react-navigation/native-stack"
  import TabNavigator from "./TabNavigator"
  import EditProfileScreen from "@/app/EditProfileScreen"
  import MeasurementScreen from "../app/MeasurementScreen"
  import MeasurementDetailScreen from "../app/MeasurementDetailScreen"
  import NotificationDetail from "../app/NotificationDetail"
  import DeviceDetailScreen from "../app/DeviceDetailScreen"
  import AutoControlScreen from "../app/AutoControlScreen"
  import LoginScreen from "../app/LoginScreen"
  import ChangePasswordScreen from "@/app/ChangePasswordScreen"
  import ChangePasswordScreens from "@/app/ChangePassword"
  import DeviceHistoryChart from "@/app/HistoriesDetail"
  import AddHistory from "@/app/AddHistory"
  import { AuthContext } from "@/contexts/AuthContext"
  import HistoryDetail from "@/app/HistoryDetail1"
  import DeviceConfigScreen from "@/app/DeviceConfigScreen"
  // 🔥 ROUTE PARAM TYPES
  export type RootStackParamList = {
    Login: undefined
    HomeTabs: undefined

    Measurement: undefined
    MeasurementDetail: { parentId: string; deviceId: string }
    NotificationDetail: { id: string }
    DeviceDetail: { deviceId: string }
    AutoControl: { deviceId: string }

    // 🔐 2 màn hình đổi mật khẩu
    ChangePassword: undefined              // first login
    ChangePasswordProfile: undefined       // từ profile
    EditProfile: undefined
    AddHistory: undefined
    HistoryDetail: {
    deviceId: string;
    measurementId: string;
  };
    HistoryDetail1: {
    deviceId: string
  };
  DeviceConfig: undefined;
  }

  const Stack = createNativeStackNavigator<RootStackParamList>()

  export default function RootNavigator() {
    const context = useContext(AuthContext)
    if (!context) {
      throw new Error("AuthContext must be used within an AuthProvider")
    }

    const { isLoggedIn, mustChangePassword } = context

    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : mustChangePassword ? (
          // 🔥 FIRST LOGIN – BẮT BUỘC ĐỔI MK
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
          />
        ) : (
          <>
            <Stack.Screen name="HomeTabs" component={TabNavigator} />
            <Stack.Screen name="Measurement" component={MeasurementScreen} />
            <Stack.Screen
              name="MeasurementDetail"
              component={MeasurementDetailScreen}
            />
            <Stack.Screen
              name="NotificationDetail"
              component={NotificationDetail}
            />
            <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
            <Stack.Screen name="AutoControl" component={AutoControlScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="AddHistory" component={AddHistory} />
            <Stack.Screen name="HistoryDetail" component={DeviceHistoryChart} />
             <Stack.Screen name="HistoryDetail1" component={HistoryDetail} />
             <Stack.Screen name="DeviceConfig" component={DeviceConfigScreen} />
           

            {/* 🔥 ĐỔI MẬT KHẨU TỪ PROFILE – LUÔN TỒN TẠI */}
            <Stack.Screen
              name="ChangePasswordProfile"
              component={ChangePasswordScreens}
            />
          </>
        )}
      </Stack.Navigator>
    )
  }
