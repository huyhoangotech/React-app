import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {

  // 🔔 Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  // 🔐 Permission
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  // 📱 Push token
  const pushToken = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('📱 Push Token:', pushToken);

  // 🔐 JWT (nếu backend cần)
  const jwt = await AsyncStorage.getItem("token");

  try {
    await axios.post(
      "https://be.otech.vn/api/customer/save-token",
      { token: pushToken },
      jwt
        ? {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        : undefined
    );

    console.log('✅Saved push token');

  } catch (err) {
    console.log('❌ Save token error:', err);
  }

  return pushToken;
}