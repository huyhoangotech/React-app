import React, { createContext, useState, useContext } from "react";

type NotificationContextType = {
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used inside provider");
  return ctx;
};

export const NotificationProvider = ({ children }: any) => {
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};
