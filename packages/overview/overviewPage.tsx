"use client";

import apiConfig from "@/shared/apiconfig";
import { formatWhen } from "@/shared/datetime";
import { isStaff } from "@/packages/auth/roles/roles";
import { useAuth } from "@/packages/auth/context/context";
import {
  BellOutlined,
  CalendarOutlined,
  FormOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Space, Spin, Tag, Typography } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";

type Ticket = { id: string; status: string };
type EventItem = { id: string; title: string; startsAt: string; venue: string | null };
type Note = { id: string; subject: string | null; readAt: string | null; createdAt: string };

export default function OverviewPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    Promise.all([
      apiConfig.get("/api/me/registrations").then(({ data }) =>
        setTickets(Array.isArray(data) ? data : data.items ?? []),
      ),
      apiConfig
        .get("/api/events", { params: { limit: 5, status: "PUBLISHED" } })
        .then(({ data }) => setEvents(data.items ?? [])),
      apiConfig
        .get("/api/me/notifications", { params: { limit: 5, channel: "IN_APP" } })
        .then(({ data }) => setNotes(data.items ?? []))
        .catch(() => setNotes([])),
    ]).finally(() => setLoading(false));
  }, []);

  const pending = tickets.filter((ticket) => ticket.status === "PENDING").length;
  const unread = notes.filter((note) => !note.readAt).length;

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Welcome{user?.firstName ? `, ${user.firstName}` : ""}
        </Typography.Title>
        <Typography.Text type="secondary">
          {user?.role?.toLowerCase()} · {user?.email}
        </Typography.Text>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Link href="/dashboard/tickets">
              <Card hoverable>
                <Space>
                  <IdcardOutlined />
                  <div>
                    <Typography.Text type="secondary">My tickets</Typography.Text>
                    <Typography.Title level={3} style={{ margin: 0 }}>
                      {tickets.length}
                    </Typography.Title>
                    {pending ? (
                      <Tag color="gold">{pending} waiting for approval</Tag>
                    ) : null}
                  </div>
                </Space>
              </Card>
            </Link>
          </Col>
          <Col xs={24} md={8}>
            <Link href="/dashboard/events">
              <Card hoverable>
                <Space>
                  <CalendarOutlined />
                  <div>
                    <Typography.Text type="secondary">Published events</Typography.Text>
                    <Typography.Title level={3} style={{ margin: 0 }}>
                      {events.length}
                    </Typography.Title>
                  </div>
                </Space>
              </Card>
            </Link>
          </Col>
          <Col xs={24} md={8}>
            <Link href="/dashboard/notifications">
              <Card hoverable>
                <Space>
                  <BellOutlined />
                  <div>
                    <Typography.Text type="secondary">Inbox</Typography.Text>
                    <Typography.Title level={3} style={{ margin: 0 }}>
                      {unread}
                    </Typography.Title>
                    <Typography.Text type="secondary">unread in-app</Typography.Text>
                  </div>
                </Space>
              </Card>
            </Link>
          </Col>
        </Row>
      </Spin>

      {isStaff(user?.role) ? (
        <Link href="/dashboard/manage-events">
          <Card hoverable>
            <Space>
              <FormOutlined />
              <div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Manage events
                </Typography.Title>
                <Typography.Text type="secondary">
                  Create, publish, review registrations, and check in tickets
                </Typography.Text>
              </div>
            </Space>
          </Card>
        </Link>
      ) : null}

      <Card title="Upcoming events">
        {events.length === 0 ? (
          <Typography.Text type="secondary">No published events yet</Typography.Text>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            {events.map((event) => (
              <div key={event.id}>
                <Typography.Text strong>{event.title}</Typography.Text>
                <br />
                <Typography.Text type="secondary">
                  {event.venue ?? "Venue TBA"} · {formatWhen(event.startsAt)}
                </Typography.Text>
              </div>
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );
}
