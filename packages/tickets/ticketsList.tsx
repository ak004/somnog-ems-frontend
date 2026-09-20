"use client";

import apiConfig from "@/shared/apiconfig";
import {
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";

type Ticket = {
  id: string;
  status: string;
  ticketCode: string;
  registeredAt: string;
  checkedInAt: string | null;
  event?: {
    id: string;
    title: string;
    slug: string;
    startsAt: string;
    venue: string | null;
  };
  session?: { id: string; title: string; room: string | null } | null;
  eventTitle?: string;
  sessionTitle?: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: "green",
  PENDING: "gold",
  WAITLISTED: "blue",
  CHECKED_IN: "cyan",
  REJECTED: "red",
  CANCELLED: "default",
};

export default function TicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await apiConfig.get("/api/me/registrations");
    setTickets(Array.isArray(data) ? data : data.items ?? []);
  }, []);

  useEffect(() => {
    load()
      .catch(() => message.error("Could not load tickets"))
      .finally(() => setLoading(false));
  }, [load]);

  const cancel = async (id: string) => {
    setCancellingId(id);
    try {
      await apiConfig.patch(`/api/registrations/${id}/cancel`);
      message.success("Registration cancelled");
      await load();
    } catch (error: unknown) {
      const apiError = (
        error as { response?: { data?: { error?: { message?: string } } } }
      )?.response?.data?.error;
      message.error(apiError?.message ?? "Could not cancel");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          My tickets
        </Typography.Title>
        <Typography.Text type="secondary">
          Confirmed tickets are accepted automatically. PENDING means the event
          form requires organiser approval.
        </Typography.Text>
      </div>

      <Spin spinning={loading}>
        {!loading && tickets.length === 0 ? (
          <Empty description="No tickets yet. Enroll from Events." />
        ) : (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            {tickets.map((ticket) => {
              const title = ticket.event?.title ?? ticket.eventTitle ?? "Event";
              const track =
                ticket.session?.title ?? ticket.sessionTitle ?? "Event registration";
              return (
                <Card key={ticket.id}>
                  <Space
                    align="start"
                    style={{ width: "100%", justifyContent: "space-between" }}
                  >
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {track}
                      </Typography.Text>
                      <Typography.Title level={5} style={{ margin: "4px 0 8px" }}>
                        {title}
                      </Typography.Title>
                      <Space wrap>
                        <Tag color={STATUS_COLOR[ticket.status] ?? "default"}>
                          {ticket.status.toLowerCase()}
                        </Tag>
                        <Typography.Text copyable>
                          {ticket.ticketCode}
                        </Typography.Text>
                      </Space>
                      <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
                        {ticket.event?.venue ?? "Venue TBA"}
                        {ticket.event?.startsAt
                          ? ` · ${new Date(ticket.event.startsAt).toLocaleString("en-GB")}`
                          : ""}
                      </Typography.Paragraph>
                    </div>
                    {ticket.status !== "CANCELLED" &&
                    ticket.status !== "CHECKED_IN" ? (
                      <Button
                        danger
                        loading={cancellingId === ticket.id}
                        onClick={() => cancel(ticket.id)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </Space>
                </Card>
              );
            })}
          </Space>
        )}
      </Spin>
    </Space>
  );
}
