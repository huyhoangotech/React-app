import React, { createContext, useEffect, useState, useContext, ReactNode } from "react";
import { registerForPushNotificationsAsync } from "../notification";
import * as Notifications from "expo-notifications";

type NotificationContextType = {
  token: string | null;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used inside NotificationProvider");
  return ctx;
};

type Props = { children: ReactNode };

export const NotificationProvider = ({ children }: Props) => {
  const [token, setToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Lấy token push khi mount
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(t => {
        if (t) setToken(t);
      })
      .catch(err => console.log("Push notification error:", err));
  }, []);

  // Lắng nghe notification khi app foreground
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => {
      setUnreadCount(prev => prev + 1);
    });
    return () => subscription.remove();
  }, []);

  return (
    <NotificationContext.Provider value={{ token, unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};