"use client";

import apiConfig from "@/shared/apiconfig";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Pagination,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type EventItem = {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string | null;
  venue: string | null;
  timezone: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  status: string;
  visibility: string;
  bannerUrl: string | null;
  cancelReason: string | null;
  publishedAt: string | null;
  category?: { id: string; name: string; slug: string };
  form?: {
    isOpen: boolean;
    requiresApproval: boolean;
    fields?: Array<{
      key: string;
      label: string;
      type: string;
      required?: boolean;
      options?: string[];
    }>;
  } | null;
  sessions?: Array<{
    id: string;
    title: string;
    track: string | null;
    room: string | null;
    startsAt: string;
    endsAt: string;
    capacity: number | null;
    form?: {
      fields?: Array<{
        key: string;
        label: string;
        type: string;
        required?: boolean;
        options?: string[];
      }>;
    } | null;
  }>;
  _count?: { sessions?: number; registrations?: number };
};

function formatWhen(iso: string, timezone: string) {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone || "Africa/Mogadishu",
  });
}

function formatDay(iso: string, timezone: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone || "Africa/Mogadishu",
  });
}

function takenSeats(event: EventItem) {
  return event._count?.registrations ?? 0;
}

function seatLabel(event: EventItem) {
  const taken = takenSeats(event);
  if (!event.capacity) return `${taken} registered · unlimited`;
  return `${taken} / ${event.capacity} seats`;
}

function seatPercent(event: EventItem) {
  if (!event.capacity) return 0;
  return Math.min(100, Math.round((takenSeats(event) / event.capacity) * 100));
}

function seatStatus(event: EventItem): "success" | "normal" | "exception" {
  const percent = seatPercent(event);
  if (!event.capacity) return "normal";
  if (percent >= 100) return "exception";
  return "success";
}

function clamp(lines: number): CSSProperties {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

function EventCard({
  event,
  onView,
}: {
  event: EventItem;
  onView: (event: EventItem) => void;
}) {
  const { token } = theme.useToken();
  const tracks = event._count?.sessions ?? event.sessions?.length ?? 0;

  return (
    <Card
      hoverable
      styles={{ body: { padding: 0 } }}
      style={{ height: "100%", overflow: "hidden" }}
      onClick={() => onView(event)}
    >
      <div
        style={{
          height: 112,
          background: token.colorFillSecondary,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: 16,
          backgroundImage: `url(${event.bannerUrl || "/logo.png"})`,
          backgroundSize: event.bannerUrl ? "cover" : "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        <Badge
          color={token.colorPrimary}
          text={
            <span style={{ color: token.colorText, textTransform: "capitalize" }}>
              {event.type.toLowerCase()}
            </span>
          }
        />
        <Tag style={{ margin: 0 }}>{event.status.toLowerCase()}</Tag>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {event.category?.name ?? "Uncategorised"}
          </Typography.Text>
          <Typography.Title level={5} style={{ ...clamp(2), margin: "4px 0 0" }}>
            {event.title}
          </Typography.Title>
        </div>

        <Typography.Paragraph
          type="secondary"
          style={{ ...clamp(2), marginBottom: 0, minHeight: 44 }}
        >
          {event.description || "No description"}
        </Typography.Paragraph>

        <Space direction="vertical" size={6} style={{ width: "100%" }}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            {formatDay(event.startsAt, event.timezone)}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            <EnvironmentOutlined style={{ marginRight: 8 }} />
            {event.venue ?? "Venue TBA"}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            {tracks} track{tracks === 1 ? "" : "s"}
          </Typography.Text>
        </Space>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              marginBottom: 6,
              color: token.colorTextSecondary,
            }}
          >
            <span>Capacity</span>
            <span>{seatLabel(event)}</span>
          </div>
          <Progress
            percent={event.capacity ? seatPercent(event) : 100}
            status={seatStatus(event)}
            size="small"
            showInfo={false}
          />
        </div>

        <Button
          type="primary"
          block
          onClick={(e) => {
            e.stopPropagation();
            onView(event);
          }}
        >
          View details
        </Button>
      </div>
    </Card>
  );
}

type FormField = NonNullable<NonNullable<EventItem["form"]>["fields"]>[number];

function FieldInput({
  field,
  ...control
}: { field: FormField } & Record<string, unknown>) {
  if (field.type === "TEXTAREA") {
    return <Input.TextArea rows={3} {...control} />;
  }
  if (field.type === "NUMBER") {
    return <InputNumber style={{ width: "100%" }} {...control} />;
  }
  if (field.type === "SELECT") {
    return (
      <Select
        options={(field.options ?? []).map((option) => ({
          label: option,
          value: option,
        }))}
        {...control}
      />
    );
  }
  if (field.type === "MULTISELECT") {
    return (
      <Select
        mode="multiple"
        options={(field.options ?? []).map((option) => ({
          label: option,
          value: option,
        }))}
        {...control}
      />
    );
  }
  if (field.type === "CHECKBOX") {
    return <Checkbox {...control}>Yes</Checkbox>;
  }
  if (field.type === "DATE") {
    return <Input type="date" {...control} />;
  }
  return <Input {...control} />;
}

export default function EventsList() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const selectedSessionId = Form.useWatch("sessionId", form);

  useEffect(() => {
    apiConfig
      .get("/api/events")
      .then(({ data }) => setEvents(data.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return events.slice(start, start + pageSize);
  }, [events, page]);

  const openEvent = async (event: EventItem) => {
    form.resetFields();
    setQuestionsOpen(false);
    setSelected(event);
    setOpen(true);
    setDetailLoading(true);
    try {
      const { data } = await apiConfig.get(`/api/events/${event.slug}`);
      setSelected(data);
    } finally {
      setDetailLoading(false);
    }
  };

  const enrollFields = [
    ...(selected?.form?.fields ?? []),
    ...(selected?.sessions?.find((session) => session.id === selectedSessionId)
      ?.form?.fields ?? []),
  ];

  const enroll = async () => {
    if (!selected) return;
    try {
      const values = await form.validateFields();
      const { sessionId, ...answers } = values;
      setEnrolling(true);
      const { data } = await apiConfig.post(
        `/api/events/${selected.id}/registrations`,
        {
          ...(sessionId ? { sessionId } : {}),
          answers,
        },
      );
      message.success(
        data.status === "WAITLISTED"
          ? "You are on the waitlist. See My tickets."
          : data.status === "PENDING"
            ? "Submitted. An organiser must accept this ticket."
            : `Enrolled. Ticket ${data.ticketCode}`,
      );
      setQuestionsOpen(false);
      setOpen(false);
      router.push("/dashboard/tickets");
    } catch (error: unknown) {
      const apiError = (
        error as { response?: { data?: { error?: { message?: string } } } }
      )?.response?.data?.error;
      if (apiError?.message) {
        message.error(apiError.message);
      }
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div>
      <Drawer
        title={selected?.title ?? "Event"}
        width={560}
        onClose={() => {
          setQuestionsOpen(false);
          setOpen(false);
          setSelected(null);
        }}
        open={open}
      >
        {!selected ? null : (
          <Spin spinning={detailLoading}>
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Space align="start">
                <Avatar size={56} src={selected.bannerUrl ?? undefined}>
                  {selected.title.charAt(0)}
                </Avatar>
                <div>
                  <Space wrap>
                    <Badge color="blue" text={selected.type.toLowerCase()} />
                    <Tag color="green">{selected.status.toLowerCase()}</Tag>
                    <Tag>{selected.visibility.toLowerCase()}</Tag>
                  </Space>
                  <Typography.Paragraph type="secondary" style={{ margin: "8px 0 0" }}>
                    {selected.category?.name}
                  </Typography.Paragraph>
                </div>
              </Space>

              <Typography.Paragraph style={{ marginBottom: 0 }}>
                {selected.description}
              </Typography.Paragraph>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                    fontSize: 13,
                  }}
                >
                  <span>Capacity</span>
                  <span>{seatLabel(selected)}</span>
                </div>
                <Progress
                  percent={selected.capacity ? seatPercent(selected) : 100}
                  status={seatStatus(selected)}
                  showInfo={Boolean(selected.capacity)}
                />
              </div>

              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Venue">
                  {selected.venue ?? "TBA"}
                </Descriptions.Item>
                <Descriptions.Item label="Timezone">
                  {selected.timezone}
                </Descriptions.Item>
                <Descriptions.Item label="Starts">
                  {formatWhen(selected.startsAt, selected.timezone)}
                </Descriptions.Item>
                <Descriptions.Item label="Ends">
                  {formatWhen(selected.endsAt, selected.timezone)}
                </Descriptions.Item>
                <Descriptions.Item label="Tracks">
                  {selected.sessions?.length ?? selected._count?.sessions ?? 0}
                </Descriptions.Item>
                <Descriptions.Item label="Slug">{selected.slug}</Descriptions.Item>
              </Descriptions>

              {selected.sessions?.length ? (
                <>
                  <Divider plain>Workshop tracks</Divider>
                  <List
                    size="small"
                    dataSource={selected.sessions}
                    renderItem={(session) => (
                      <List.Item>
                        <List.Item.Meta
                          title={session.title}
                          description={`${session.room ?? "Room TBA"} · ${formatWhen(session.startsAt, selected.timezone)}`}
                        />
                        <Typography.Text type="secondary">
                          {session.capacity
                            ? `${session.capacity} seats`
                            : "unlimited"}
                        </Typography.Text>
                      </List.Item>
                    )}
                  />
                </>
              ) : null}

              <Divider plain>Enroll</Divider>
              {selected.form?.requiresApproval ? (
                <Typography.Paragraph type="secondary">
                  This event requires organiser approval. Your ticket stays
                  PENDING until they accept it.
                </Typography.Paragraph>
              ) : (
                <Typography.Paragraph type="secondary">
                  Enrollment is confirmed immediately unless the event is full.
                </Typography.Paragraph>
              )}
              <Button
                type="primary"
                size="large"
                block
                onClick={() => {
                  form.resetFields();
                  setQuestionsOpen(true);
                }}
              >
                Enroll
              </Button>
            </Space>
          </Spin>
        )}
      </Drawer>

      <Drawer
        title="Registration questions"
        width={480}
        open={questionsOpen}
        onClose={() => setQuestionsOpen(false)}
        destroyOnHidden
      >
        {!selected ? null : (
          <Form form={form} layout="vertical">
            <Typography.Paragraph type="secondary">
              Answer the questions from this event&apos;s registration form.
              Required fields must be filled before the ticket is created.
            </Typography.Paragraph>
            {selected.sessions?.length ? (
              <Form.Item name="sessionId" label="Workshop track">
                <Select
                  allowClear
                  placeholder="Event only (no track)"
                  options={selected.sessions.map((session) => ({
                    value: session.id,
                    label: session.title,
                  }))}
                />
              </Form.Item>
            ) : null}
            {enrollFields.length === 0 ? (
              <Typography.Paragraph type="secondary">
                No extra questions for this selection.
              </Typography.Paragraph>
            ) : (
              enrollFields.map((field) => (
                <Form.Item
                  key={field.key}
                  name={field.key}
                  label={field.label}
                  valuePropName={field.type === "CHECKBOX" ? "checked" : "value"}
                  rules={
                    field.required
                      ? [{ required: true, message: `${field.label} is required` }]
                      : undefined
                  }
                >
                  <FieldInput field={field} />
                </Form.Item>
              ))
            )}
            <Button type="primary" size="large" block loading={enrolling} onClick={enroll}>
              Submit registration
            </Button>
          </Form>
        )}
      </Drawer>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 20,
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Events
          </Typography.Title>
          <Typography.Text type="secondary">
            {events.length} published event{events.length === 1 ? "" : "s"}
          </Typography.Text>
        </div>
      </div>

      <Spin spinning={loading}>
        {!loading && events.length === 0 ? (
          <Empty description="No events yet" />
        ) : (
          <Row gutter={[16, 16]}>
            {paged.map((event) => (
              <Col key={event.id} xs={24} lg={12}>
                <EventCard event={event} onView={openEvent} />
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      {events.length > pageSize ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={events.length}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      ) : null}
    </div>
  );
}
