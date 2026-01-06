import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import HomeScreen from '@/app/HomeScreen';
import AlarmsScreen from '@/app/AlarmsScreen';
import DevicesScreen from '@/app/DevicesScreen';
import ProfileScreen from '@/app/ProfileScreen';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
  screenOptions={({ route }) => ({
    tabBarShowLabel: true,
    tabBarIcon: ({ focused, size }) => {
      let iconElement = null;

      if (route.name === 'Home') {
        iconElement = (
          <Ionicons
            name={focused ? 'home' : 'home-outline'}
            size={size}
            color={focused ? 'black' : '#8c8c8c'}
          />
        );
      } else if (route.name === 'Notifications') { // đổi tên tab
        iconElement = (
          <Ionicons
            name={focused ? 'notifications' : 'notifications-outline'} // icon mới
            size={size}
            color={focused ? 'black' : '#8c8c8c'}
          />
        );
      } else if (route.name === 'Devices') {
        iconElement = (
          <Ionicons
            name={focused ? 'tv' : 'tv-outline'}
            size={size}
            color={focused ? 'black' : '#8c8c8c'}
          />
        );
      } else if (route.name === 'Profile') {
        iconElement = (
          <Ionicons
            name={focused ? 'person' : 'person-outline'}
            size={size}
            color={focused ? 'black' : '#8c8c8c'}
          />
        );
      }

      return iconElement;
    },

    tabBarLabelStyle: {
      fontFamily: 'NunitoBold',
      fontSize: 10,
      marginTop: 4,
      textAlign: 'center',
    },
    tabBarActiveTintColor: 'blue',
    tabBarInactiveTintColor: 'black',
    tabBarStyle: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      height: 90,
      borderTopWidth: 0,
      alignItems: 'center',
    },
    headerShown: false,
  })}
>
  <Tab.Screen name="Home" component={HomeScreen} />
  <Tab.Screen name="Notifications" component={AlarmsScreen} /> 
  <Tab.Screen name="Devices" component={DevicesScreen} />
  <Tab.Screen name="Profile" component={ProfileScreen} />
</Tab.Navigator>

  );
}
