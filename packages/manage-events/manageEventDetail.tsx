"use client";

import apiConfig from "@/shared/apiconfig";
import { apiMessage, apiStatus } from "@/shared/apiError";
import { flattenCategories, type CategoryNode } from "@/shared/categories";
import { formatWhen, toIso, toLocalInput } from "@/shared/datetime";
import { STAFF_ROLES } from "@/packages/auth/roles/roles";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import RoleGate from "@/packages/auth/roles/roleGate";

type EventDetail = {
  id: string;
  slug: string;
  title: string;
  type: string;
  description: string | null;
  venue: string | null;
  timezone: string;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  status: string;
  visibility: string;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  form?: {
    isOpen: boolean;
    requiresApproval: boolean;
    maxPerUser: number;
    fields?: FormField[];
  } | null;
};

type FormField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  order?: number;
};

type SessionRow = {
  id: string;
  title: string;
  track: string | null;
  room: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number | null;
  form?: { fields?: FormField[] } | null;
};

type RegistrationRow = {
  id: string;
  userId: string;
  status: string;
  ticketCode: string;
  registeredAt: string;
  answers?: Record<string, unknown>;
  session?: { id?: string; title: string } | null;
};

const FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "SELECT",
  "MULTISELECT",
  "CHECKBOX",
  "DATE",
];

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PUBLISHED: "green",
  CANCELLED: "red",
  ARCHIVED: "gold",
  PENDING: "gold",
  CONFIRMED: "green",
  WAITLISTED: "blue",
  CHECKED_IN: "cyan",
  REJECTED: "red",
};

export default function ManageEventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [detailsForm] = Form.useForm();
  const [regForm] = Form.useForm();
  const [sessionForm] = Form.useForm();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [roster, setRoster] = useState<RegistrationRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionRow | null>(null);
  const [ticketCode, setTicketCode] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [rosterStatus, setRosterStatus] = useState<string | undefined>();
  const [answersRow, setAnswersRow] = useState<RegistrationRow | null>(null);

  const loadEvent = useCallback(async () => {
    const { data } = await apiConfig.get(`/api/events/${slug}`);
    setEvent(data);
    detailsForm.setFieldsValue({
      title: data.title,
      categoryId: data.categoryId ?? data.category?.id,
      type: data.type,
      description: data.description,
      venue: data.venue,
      timezone: data.timezone,
      startsAt: toLocalInput(data.startsAt),
      endsAt: toLocalInput(data.endsAt),
      capacity: data.capacity,
      visibility: data.visibility,
    });
    try {
      const formRes = await apiConfig.get(`/api/events/${data.id}/registration-form`);
      const form = formRes.data;
      setEvent((current) => (current ? { ...current, form } : current));
      regForm.setFieldsValue({
        isOpen: form.isOpen,
        requiresApproval: form.requiresApproval,
        maxPerUser: form.maxPerUser,
        fields: (form.fields ?? []).map((field: FormField) => ({
          ...field,
          optionsText: (field.options ?? []).join(", "),
        })),
      });
    } catch (error) {
      if (apiStatus(error) === 404) {
        regForm.setFieldsValue({
          isOpen: true,
          requiresApproval: false,
          maxPerUser: 1,
          fields: [],
        });
      }
    }
  }, [slug, detailsForm, regForm]);

  const loadSessions = useCallback(async () => {
    if (!event?.id && !slug) return;
    const { data } = await apiConfig.get(`/api/events/${slug}/sessions`);
    setSessions(Array.isArray(data) ? data : data.items ?? []);
  }, [event?.id, slug]);

  const loadRoster = useCallback(async () => {
    if (!event?.id) return;
    const [{ data: list }, { data: countData }] = await Promise.all([
      apiConfig.get(`/api/events/${event.id}/registrations`, {
        params: { limit: 100, status: rosterStatus },
      }),
      apiConfig.get(`/api/events/${event.id}/registrations/counts`),
    ]);
    setRoster(list.items ?? []);
    setCounts(countData ?? {});
  }, [event?.id, rosterStatus]);

  useEffect(() => {
    Promise.all([
      loadEvent(),
      apiConfig.get("/api/categories").then(({ data }) => {
        setCategories(Array.isArray(data) ? data : []);
      }),
    ])
      .catch((error) => message.error(apiMessage(error, "Could not load event")))
      .finally(() => setLoading(false));
  }, [loadEvent]);

  useEffect(() => {
    if (!event) return;
    loadSessions().catch(() => setSessions([]));
  }, [event, loadSessions]);

  useEffect(() => {
    if (!event) return;
    loadRoster().catch(() => setRoster([]));
  }, [event, loadRoster]);

  const saveDetails = async () => {
    if (!event) return;
    const values = await detailsForm.validateFields();
    setSaving(true);
    try {
      await apiConfig.patch(`/api/events/${event.id}`, {
        ...values,
        startsAt: toIso(values.startsAt),
        endsAt: toIso(values.endsAt),
        capacity: values.capacity ?? undefined,
      });
      message.success("Event updated");
      await loadEvent();
    } catch (error) {
      message.error(apiMessage(error, "Could not update event"));
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!event) return;
    try {
      await apiConfig.post(`/api/events/${event.id}/publish`);
      message.success("Event published. People can enroll now.");
      await loadEvent();
    } catch (error) {
      message.error(apiMessage(error, "Could not publish"));
    }
  };

  const cancelEvent = async () => {
    if (!event) return;
    try {
      await apiConfig.post(`/api/events/${event.id}/cancel`, {
        reason: "Cancelled by organiser",
      });
      message.success("Event cancelled");
      await loadEvent();
    } catch (error) {
      message.error(apiMessage(error, "Could not cancel"));
    }
  };

  const saveForm = async () => {
    if (!event) return;
    const values = await regForm.validateFields();
    setSaving(true);
    try {
      await apiConfig.put(`/api/events/${event.id}/registration-form`, {
        isOpen: values.isOpen,
        requiresApproval: values.requiresApproval,
        maxPerUser: values.maxPerUser,
        fields: (values.fields ?? []).map(
          (
            field: FormField & { optionsText?: string },
            index: number,
          ) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            required: field.required ?? false,
            options: field.optionsText
              ? field.optionsText.split(",").map((item) => item.trim()).filter(Boolean)
              : field.options ?? [],
            order: index,
          }),
        ),
      });
      message.success("Registration form saved");
      await loadEvent();
    } catch (error) {
      message.error(apiMessage(error, "Could not save form"));
    } finally {
      setSaving(false);
    }
  };

  const saveSession = async () => {
    if (!event) return;
    const values = await sessionForm.validateFields();
    setSaving(true);
    try {
      const payload = {
        ...values,
        startsAt: toIso(values.startsAt),
        endsAt: toIso(values.endsAt),
        capacity: values.capacity || undefined,
      };
      if (editingSession) {
        await apiConfig.patch(`/api/sessions/${editingSession.id}`, payload);
        message.success("Track updated");
      } else {
        await apiConfig.post(`/api/events/${event.id}/sessions`, payload);
        message.success("Track added");
      }
      setSessionOpen(false);
      await loadSessions();
    } catch (error) {
      message.error(apiMessage(error, "Could not save track"));
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await apiConfig.delete(`/api/sessions/${id}`);
      message.success("Track deleted");
      await loadSessions();
    } catch (error) {
      message.error(apiMessage(error, "Could not delete track"));
    }
  };

  const approve = async (id: string) => {
    try {
      await apiConfig.patch(`/api/registrations/${id}/approve`);
      message.success("Registration approved");
      await loadRoster();
    } catch (error) {
      message.error(apiMessage(error, "Could not approve"));
    }
  };

  const reject = async (id: string) => {
    try {
      await apiConfig.patch(`/api/registrations/${id}/reject`, {
        reason: "Rejected by organiser",
      });
      message.success("Registration rejected");
      await loadRoster();
    } catch (error) {
      message.error(apiMessage(error, "Could not reject"));
    }
  };

  const checkIn = async () => {
    if (!ticketCode.trim()) return;
    setCheckingIn(true);
    try {
      await apiConfig.post(`/api/registrations/${ticketCode.trim()}/check-in`);
      message.success("Checked in");
      setTicketCode("");
      await loadRoster();
    } catch (error) {
      message.error(apiMessage(error, "Could not check in"));
    } finally {
      setCheckingIn(false);
    }
  };

  const answerLabel = (key: string) => {
    const fields = [
      ...(event?.form?.fields ?? []),
      ...sessions.flatMap((session) => session.form?.fields ?? []),
    ];
    return fields.find((field) => field.key === key)?.label ?? key;
  };

  const formatAnswer = (value: unknown) => {
    if (value == null || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  if (loading || !event) {
    return (
      <RoleGate roles={[...STAFF_ROLES]}>
        <Typography.Text type="secondary">Loading event…</Typography.Text>
      </RoleGate>
    );
  }

  return (
    <RoleGate roles={[...STAFF_ROLES]}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <Button type="link" style={{ padding: 0 }} onClick={() => router.push("/dashboard/manage-events")}>
              Back to list
            </Button>
            <Typography.Title level={4} style={{ margin: "4px 0" }}>
              {event.title}
            </Typography.Title>
            <Space>
              <Tag color={STATUS_COLOR[event.status]}>{event.status.toLowerCase()}</Tag>
              <Tag>{event.visibility.toLowerCase()}</Tag>
            </Space>
          </div>
          <Space>
            {event.status === "DRAFT" ? (
              <Button type="primary" onClick={publish}>
                Publish
              </Button>
            ) : null}
            {event.status !== "CANCELLED" ? (
              <Popconfirm title="Cancel this event?" onConfirm={cancelEvent}>
                <Button danger>Cancel event</Button>
              </Popconfirm>
            ) : null}
          </Space>
        </div>

        <Tabs
          items={[
            {
              key: "details",
              label: "Details",
              children: (
                <Form form={detailsForm} layout="vertical" style={{ maxWidth: 640 }}>
                  <Form.Item name="title" label="Title" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
                    <Select options={flattenCategories(categories)} />
                  </Form.Item>
                  <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                    <Select
                      options={["LECTURE", "MEETING", "CONFERENCE"].map((value) => ({
                        value,
                        label: value.toLowerCase(),
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="description" label="Description">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                  <Form.Item name="venue" label="Venue">
                    <Input />
                  </Form.Item>
                  <Form.Item name="timezone" label="Timezone">
                    <Input />
                  </Form.Item>
                  <Form.Item name="startsAt" label="Starts" rules={[{ required: true }]}>
                    <Input type="datetime-local" />
                  </Form.Item>
                  <Form.Item name="endsAt" label="Ends" rules={[{ required: true }]}>
                    <Input type="datetime-local" />
                  </Form.Item>
                  <Form.Item name="capacity" label="Capacity">
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="visibility" label="Visibility">
                    <Select
                      options={["PUBLIC", "UNLISTED", "PRIVATE"].map((value) => ({
                        value,
                        label: value.toLowerCase(),
                      }))}
                    />
                  </Form.Item>
                  <Button type="primary" loading={saving} onClick={saveDetails}>
                    Save details
                  </Button>
                </Form>
              ),
            },
            {
              key: "sessions",
              label: "Tracks",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    onClick={() => {
                      setEditingSession(null);
                      sessionForm.resetFields();
                      sessionForm.setFieldsValue({
                        startsAt: toLocalInput(event.startsAt),
                        endsAt: toLocalInput(event.endsAt),
                      });
                      setSessionOpen(true);
                    }}
                  >
                    Add track
                  </Button>
                  <Table
                    rowKey="id"
                    dataSource={sessions}
                    pagination={false}
                    columns={[
                      { title: "Title", dataIndex: "title" },
                      { title: "Track", dataIndex: "track" },
                      { title: "Room", dataIndex: "room" },
                      {
                        title: "When",
                        render: (_, row) => `${formatWhen(row.startsAt)} – ${formatWhen(row.endsAt)}`,
                      },
                      { title: "Capacity", dataIndex: "capacity" },
                      {
                        title: "",
                        render: (_, row) => (
                          <Space>
                            <Button
                              size="small"
                              onClick={() => {
                                setEditingSession(row);
                                sessionForm.setFieldsValue({
                                  title: row.title,
                                  track: row.track,
                                  room: row.room,
                                  startsAt: toLocalInput(row.startsAt),
                                  endsAt: toLocalInput(row.endsAt),
                                  capacity: row.capacity,
                                });
                                setSessionOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Popconfirm title="Delete this track?" onConfirm={() => deleteSession(row.id)}>
                              <Button size="small" danger>
                                Delete
                              </Button>
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: "form",
              label: "Registration form",
              children: (
                <Form form={regForm} layout="vertical">
                  <Typography.Paragraph type="secondary">
                    Tickets are confirmed immediately unless you turn on approval.
                    Pending tickets are accepted from the Roster tab with
                    PATCH /api/registrations/:id/approve.
                  </Typography.Paragraph>
                  <Form.Item name="isOpen" label="Registration open" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name="requiresApproval"
                    label="Organiser must accept each ticket"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item name="maxPerUser" label="Max registrations per user">
                    <InputNumber min={1} />
                  </Form.Item>
                  <Form.List name="fields">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" style={{ width: "100%" }}>
                        {fields.map((field) => (
                          <Card
                            key={field.key}
                            size="small"
                            extra={
                              <Button type="link" danger onClick={() => remove(field.name)}>
                                Remove
                              </Button>
                            }
                          >
                            <Space wrap>
                              <Form.Item
                                name={[field.name, "key"]}
                                label="Key"
                                rules={[{ required: true }]}
                              >
                                <Input placeholder="dietary" />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "label"]}
                                label="Label"
                                rules={[{ required: true }]}
                              >
                                <Input placeholder="Dietary requirements" />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "type"]}
                                label="Type"
                                rules={[{ required: true }]}
                              >
                                <Select
                                  style={{ width: 160 }}
                                  options={FIELD_TYPES.map((value) => ({
                                    value,
                                    label: value.toLowerCase(),
                                  }))}
                                />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "required"]}
                                label="Required"
                                valuePropName="checked"
                              >
                                <Switch />
                              </Form.Item>
                              <Form.Item
                                name={[field.name, "optionsText"]}
                                label="Options (comma-separated)"
                              >
                                <Input placeholder="Vegetarian, Halal" style={{ width: 240 }} />
                              </Form.Item>
                            </Space>
                          </Card>
                        ))}
                        <Button onClick={() => add({ type: "TEXT", required: false })}>
                          Add question
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                  <Button type="primary" loading={saving} onClick={saveForm} style={{ marginTop: 16 }}>
                    Save form
                  </Button>
                </Form>
              ),
            },
            {
              key: "roster",
              label: "Roster",
              children: (
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Space wrap>
                    <Tag>pending {counts.pending ?? 0}</Tag>
                    <Tag color="green">confirmed {counts.confirmed ?? 0}</Tag>
                    <Tag color="blue">waitlisted {counts.waitlisted ?? 0}</Tag>
                    <Tag color="cyan">checked in {counts.checkedIn ?? 0}</Tag>
                    <Select
                      allowClear
                      placeholder="All statuses"
                      style={{ width: 180 }}
                      value={rosterStatus}
                      onChange={setRosterStatus}
                      options={[
                        "PENDING",
                        "CONFIRMED",
                        "WAITLISTED",
                        "REJECTED",
                        "CANCELLED",
                        "CHECKED_IN",
                      ].map((value) => ({ value, label: value.toLowerCase() }))}
                    />
                  </Space>
                  <Table
                    rowKey="id"
                    dataSource={roster}
                    pagination={false}
                    columns={[
                      { title: "User", dataIndex: "userId" },
                      {
                        title: "Status",
                        dataIndex: "status",
                        render: (value: string) => (
                          <Tag color={STATUS_COLOR[value] ?? "default"}>
                            {value.toLowerCase()}
                          </Tag>
                        ),
                      },
                      { title: "Ticket", dataIndex: "ticketCode" },
                      {
                        title: "Track",
                        render: (_, row) => row.session?.title ?? "Event",
                      },
                      {
                        title: "Registered",
                        dataIndex: "registeredAt",
                        render: (value: string) => formatWhen(value),
                      },
                      {
                        title: "",
                        render: (_, row) => (
                          <Space>
                            <Button size="small" onClick={() => setAnswersRow(row)}>
                              View answers
                            </Button>
                            {row.status === "PENDING" ? (
                              <>
                                <Button size="small" type="primary" onClick={() => approve(row.id)}>
                                  Accept
                                </Button>
                                <Button size="small" danger onClick={() => reject(row.id)}>
                                  Reject
                                </Button>
                              </>
                            ) : null}
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Space>
              ),
            },
            {
              key: "checkin",
              label: "Check-in",
              children: (
                <Space direction="vertical">
                  <Typography.Paragraph type="secondary">
                    Scan or type the ticket code from My tickets.
                  </Typography.Paragraph>
                  <Space>
                    <Input
                      value={ticketCode}
                      onChange={(event) => setTicketCode(event.target.value)}
                      placeholder="Ticket code"
                      style={{ width: 280 }}
                    />
                    <Button type="primary" loading={checkingIn} onClick={checkIn}>
                      Check in
                    </Button>
                  </Space>
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <Drawer
        title="Registration answers"
        width={420}
        open={Boolean(answersRow)}
        onClose={() => setAnswersRow(null)}
      >
        {answersRow ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <Typography.Text type="secondary">Ticket</Typography.Text>
              <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
                {answersRow.ticketCode}
              </Typography.Paragraph>
              <Typography.Text type="secondary">
                {answersRow.session?.title ?? "Event registration"}
              </Typography.Text>
            </div>
            {Object.keys(answersRow.answers ?? {}).length === 0 ? (
              <Empty description="This attendee submitted no answers" />
            ) : (
              <Descriptions column={1} bordered size="small">
                {Object.entries(answersRow.answers ?? {}).map(([key, value]) => (
                  <Descriptions.Item key={key} label={answerLabel(key)}>
                    {formatAnswer(value)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            )}
          </Space>
        ) : null}
      </Drawer>

      <Modal
        title={editingSession ? "Edit track" : "Add track"}
        open={sessionOpen}
        onCancel={() => setSessionOpen(false)}
        onOk={saveSession}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={sessionForm} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="track" label="Track name">
            <Input />
          </Form.Item>
          <Form.Item name="room" label="Room">
            <Input />
          </Form.Item>
          <Form.Item name="startsAt" label="Starts" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="endsAt" label="Ends" rules={[{ required: true }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="capacity" label="Capacity">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </RoleGate>
  );
}
