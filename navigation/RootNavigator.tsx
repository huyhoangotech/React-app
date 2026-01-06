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
import { AuthContext } from "@/contexts/AuthContext"

// 🔥 KHAI BÁO ROUTE PARAM TYPES --------------  
export type RootStackParamList = {
  Login: undefined
  HomeTabs: undefined

  Measurement: undefined
  MeasurementDetail: { parentId: string; deviceId: string }   // ⭐ FIX TẠI ĐÂY  
  NotificationDetail: { id: string }
  DeviceDetail: { deviceId: string }
  AutoControl: { deviceId: string }
   ChangePassword: undefined
   EditProfile: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()   // ⭐ THÊM TYPE CHO STACK

export default function RootNavigator() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("AuthContext must be used within an AuthProvider")

  const { isLoggedIn } = context

  return (
  
      <Stack.Navigator screenOptions={{ headerShown: false }}>
  <Stack.Screen name="Login" component={LoginScreen} />

  {/* các màn khác vẫn giữ */}
  <Stack.Screen name="HomeTabs" component={TabNavigator} />
      <Stack.Screen name="Measurement" component={MeasurementScreen} />
      <Stack.Screen name="MeasurementDetail" component={MeasurementDetailScreen} />
      <Stack.Screen name="NotificationDetail" component={NotificationDetail} />
      <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} />
      <Stack.Screen name="AutoControl" component={AutoControlScreen} />
       <Stack.Screen name ="ChangePassword" component={ChangePasswordScreen}/>
       <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  )
}
