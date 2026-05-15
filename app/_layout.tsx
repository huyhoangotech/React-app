import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from '@/navigation/RootNavigator';
import AuthProvider from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationProvider>
            <RootNavigator />
        </NotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
