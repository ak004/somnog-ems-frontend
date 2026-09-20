"use client";

import apiConfig from "@/shared/apiconfig";
import { apiMessage } from "@/shared/apiError";
import { formatWhen } from "@/shared/datetime";
import { Button, Card, Empty, Space, Spin, Switch, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  channel: string;
  templateKey: string;
  subject: string | null;
  status: string;
  readAt: string | null;
  createdAt: string;
};

type Preference = {
  id: string;
  channel: string;
  category: string;
  enabled: boolean;
};

const PREF_OPTIONS = [
  { channel: "EMAIL", category: "registration_ticket", label: "Email tickets" },
  { channel: "EMAIL", category: "event_reminder", label: "Email reminders" },
  { channel: "IN_APP", category: "event_announcement", label: "In-app announcements" },
  { channel: "SMS", category: "event_reminder", label: "SMS reminders" },
];

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [inbox, preferences] = await Promise.all([
      apiConfig.get("/api/me/notifications", { params: { limit: 50 } }),
      apiConfig.get("/api/me/notification-preferences"),
    ]);
    setItems(inbox.data.items ?? []);
    setPrefs(Array.isArray(preferences.data) ? preferences.data : []);
  }, []);

  useEffect(() => {
    load()
      .catch((error) => message.error(apiMessage(error, "Could not load notifications")))
      .finally(() => setLoading(false));
  }, [load]);

  const enabled = (channel: string, category: string) => {
    const row = prefs.find((pref) => pref.channel === channel && pref.category === category);
    return row?.enabled ?? true;
  };

  const togglePref = async (channel: string, category: string, value: boolean) => {
    const key = `${channel}:${category}`;
    setSavingKey(key);
    try {
      await apiConfig.put("/api/me/notification-preferences", {
        channel,
        category,
        enabled: value,
      });
      message.success("Preference saved");
      await load();
    } catch (error) {
      message.error(apiMessage(error, "Could not save preference"));
    } finally {
      setSavingKey(null);
    }
  };

  const markRead = async (id: string) => {
    try {
      await apiConfig.patch(`/api/me/notifications/${id}/read`);
      await load();
    } catch (error) {
      message.error(apiMessage(error, "Could not mark as read"));
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Notifications
        </Typography.Title>
        <Typography.Text type="secondary">
          In-app inbox and channel preferences
        </Typography.Text>
      </div>

      <Card title="Preferences">
        <Space direction="vertical" style={{ width: "100%" }}>
          {PREF_OPTIONS.map((option) => {
            const key = `${option.channel}:${option.category}`;
            return (
              <div
                key={key}
                style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
              >
                <Typography.Text>{option.label}</Typography.Text>
                <Switch
                  checked={enabled(option.channel, option.category)}
                  loading={savingKey === key}
                  onChange={(value) => togglePref(option.channel, option.category, value)}
                />
              </div>
            );
          })}
        </Space>
      </Card>

      <Spin spinning={loading}>
        {!loading && items.length === 0 ? (
          <Empty description="No notifications yet" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {items.map((item) => (
              <Card key={item.id} size="small">
                <Space style={{ width: "100%", justifyContent: "space-between" }} align="start">
                  <div>
                    <Space wrap>
                      <Tag>{item.channel.toLowerCase()}</Tag>
                      <Tag color={item.readAt ? "default" : "blue"}>
                        {item.readAt ? "read" : "unread"}
                      </Tag>
                      <Tag>{item.status.toLowerCase()}</Tag>
                    </Space>
                    <Typography.Title level={5} style={{ margin: "8px 0 4px" }}>
                      {item.subject || item.templateKey}
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      {formatWhen(item.createdAt)}
                    </Typography.Text>
                  </div>
                  {!item.readAt ? (
                    <Button onClick={() => markRead(item.id)}>Mark read</Button>
                  ) : null}
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </Spin>
    </Space>
  );
}
