"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, MessageSquare, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Notification, NotificationAction, NotificationService } from "@task/core";

const POLL_INTERVAL_MS = 30_000;

const ActionIcon = ({ action }: { action: NotificationAction }) => {
  if (action === NotificationAction.COMMENT_ADDED)
    return <MessageSquare size={13} className="text-indigo-500 flex-shrink-0 mt-0.5" />;
  return <RefreshCw size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />;
};

export const NotificationBell = () => {
  const { t } = useTranslation("ui");
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await NotificationService.getNotifications();
      setNotifications(data);
    } catch {
      // silent — polling failure should not surface as error
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchNotifications().finally(() => setLoading(false));
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = async (notif: Notification) => {
    setOpen(false);
    if (!notif.isRead) {
      try {
        await NotificationService.markNotificationRead(notif.notificationId);
        setNotifications((prev) =>
          prev.map((n) => (n.notificationId === notif.notificationId ? { ...n, isRead: true } : n)),
        );
      } catch {
        // silent
      }
    }
    router.push(`/dashboard/cases/${notif.caseId}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label={t("Notifications")}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700">{t("Notifications")}</span>
            {loading && (
              <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-slate-400">
              {t("No notifications.")}
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.map((notif) => (
                <li key={notif.notificationId}>
                  <button
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-2.5 ${
                      notif.isRead ? "opacity-60" : ""
                    }`}
                  >
                    <ActionIcon action={notif.action} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{notif.caseTitle}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{notif.detail}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
