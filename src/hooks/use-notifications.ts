"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/utils/supabase/client";
import type { NotificationRow } from "@/src/lib/notifications";

export function useNotifications(userId: string | null, initial: NotificationRow[]) {
  const [notifications, setNotifications] = useState<NotificationRow[]>(initial);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setNotifications((prev) => [payload.new as NotificationRow, ...prev].slice(0, 30))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAsRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    const supabase = createClient();
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    const supabase = createClient();
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
