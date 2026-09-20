"use client";

import apiConfig from "@/shared/apiconfig";
import { apiMessage } from "@/shared/apiError";
import { flattenCategories, type CategoryNode } from "@/shared/categories";
import { formatWhen, toIso } from "@/shared/datetime";
import { STAFF_ROLES } from "@/packages/auth/roles/roles";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import RoleGate from "@/packages/auth/roles/roleGate";

type ManagedEvent = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  visibility: string;
  startsAt: string;
  venue: string | null;
  category?: { name: string };
  _count?: { sessions: number; registrations: number };
};

type EventForm = {
  categoryId: string;
  title: string;
  type: string;
  description?: string;
  venue?: string;
  timezone?: string;
  startsAt: string;
  endsAt: string;
  capacity?: number | null;
  visibility?: string;
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  PUBLISHED: "green",
  CANCELLED: "red",
  ARCHIVED: "gold",
};

export default function ManageEventsList() {
  const router = useRouter();
  const [form] = Form.useForm<EventForm>();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ManagedEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryNode[]>([]);

  const load = useCallback(async () => {
    const { data } = await apiConfig.get("/api/manage/events", {
      params: { page, limit: 20, status, q: q || undefined },
    });
    setItems(data.items ?? []);
    setTotal(data.meta?.total ?? 0);
  }, [page, status, q]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((error) => message.error(apiMessage(error, "Could not load events")))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    apiConfig
      .get("/api/categories")
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, []);

  const createEvent = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const { data } = await apiConfig.post("/api/events", {
        ...values,
        startsAt: toIso(values.startsAt),
        endsAt: toIso(values.endsAt),
        timezone: values.timezone || "Africa/Mogadishu",
        capacity: values.capacity || undefined,
      });
      message.success("Draft created. Publish it when the programme is ready.");
      setOpen(false);
      router.push(`/dashboard/manage-events/${data.slug}`);
    } catch (error) {
      message.error(apiMessage(error, "Could not create event"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGate roles={[...STAFF_ROLES]}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Manage events
            </Typography.Title>
            <Typography.Text type="secondary">
              Drafts, published events, forms, roster, and door check-in
            </Typography.Text>
          </div>
          <Button
            type="primary"
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({
                type: "CONFERENCE",
                visibility: "PUBLIC",
                timezone: "Africa/Mogadishu",
              });
              setOpen(true);
            }}
          >
            Create event
          </Button>
        </div>

        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search title or venue"
            onSearch={(value) => {
              setPage(1);
              setQ(value);
            }}
            style={{ width: 280 }}
          />
          <Select
            allowClear
            placeholder="All statuses"
            style={{ width: 180 }}
            value={status}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
            options={["DRAFT", "PUBLISHED", "CANCELLED", "ARCHIVED"].map((value) => ({
              value,
              label: value.toLowerCase(),
            }))}
          />
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
          columns={[
            { title: "Title", dataIndex: "title" },
            {
              title: "Status",
              dataIndex: "status",
              render: (value: string) => (
                <Tag color={STATUS_COLOR[value] ?? "default"}>{value.toLowerCase()}</Tag>
              ),
            },
            { title: "Type", dataIndex: "type" },
            {
              title: "When",
              dataIndex: "startsAt",
              render: (value: string) => formatWhen(value),
            },
            {
              title: "Category",
              render: (_, row) => row.category?.name ?? "—",
            },
            {
              title: "Registrations",
              render: (_, row) => row._count?.registrations ?? 0,
            },
            {
              title: "",
              render: (_, row) => (
                <Button
                  type="link"
                  onClick={() => router.push(`/dashboard/manage-events/${row.slug}`)}
                >
                  Open
                </Button>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        title="Create event"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={createEvent}
        confirmLoading={saving}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
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
            <Input.TextArea rows={3} />
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
        </Form>
      </Modal>
    </RoleGate>
  );
}
