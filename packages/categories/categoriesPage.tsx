"use client";

import apiConfig from "@/shared/apiconfig";
import { apiMessage } from "@/shared/apiError";
import {
  flattenCategories,
  flattenCategoryRows,
  type CategoryNode,
} from "@/shared/categories";
import { ADMIN_ROLES } from "@/packages/auth/roles/roles";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import RoleGate from "@/packages/auth/roles/roleGate";

type CategoryForm = {
  name: string;
  description?: string;
  parentId?: string;
  isPublic?: boolean;
  order?: number;
};

export default function CategoriesPage() {
  const [form] = Form.useForm<CategoryForm>();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await apiConfig.get("/api/admin/categories");
    setTree(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load()
      .catch((error) => message.error(apiMessage(error, "Could not load categories")))
      .finally(() => setLoading(false));
  }, [load]);

  const rows = useMemo(() => flattenCategoryRows(tree), [tree]);
  const parentOptions = flattenCategories(tree);

  const openCreate = (parentId?: string) => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ isPublic: true, order: 0, parentId });
    setOpen(true);
  };

  const openEdit = (node: CategoryNode) => {
    setEditing(node);
    form.setFieldsValue({
      name: node.name,
      description: node.description ?? undefined,
      parentId: node.parentId ?? undefined,
      isPublic: node.isPublic,
      order: node.order,
    });
    setOpen(true);
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing) {
        await apiConfig.patch(`/api/categories/${editing.id}`, values);
        message.success("Category updated");
      } else {
        await apiConfig.post("/api/categories", values);
        message.success("Category created");
      }
      setOpen(false);
      await load();
    } catch (error) {
      message.error(apiMessage(error, "Could not save category"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGate roles={[...ADMIN_ROLES]}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Categories
            </Typography.Title>
            <Typography.Text type="secondary">
              Tree used when creating events
            </Typography.Text>
          </div>
          <Button type="primary" onClick={() => openCreate()}>
            New category
          </Button>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={false}
          columns={[
            {
              title: "Name",
              dataIndex: "name",
              render: (name: string, row) => (
                <span style={{ paddingLeft: row.depth * 16 }}>{name}</span>
              ),
            },
            { title: "Slug", dataIndex: "slug" },
            {
              title: "Visibility",
              dataIndex: "isPublic",
              render: (isPublic: boolean) => (
                <Tag color={isPublic ? "green" : "default"}>
                  {isPublic ? "public" : "private"}
                </Tag>
              ),
            },
            { title: "Events", dataIndex: "eventCount" },
            {
              title: "",
              render: (_, row) => (
                <Space>
                  <Button size="small" onClick={() => openCreate(row.id)}>
                    Add child
                  </Button>
                  <Button size="small" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        title={editing ? "Edit category" : "New category"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="parentId" label="Parent">
            <Select
              allowClear
              options={parentOptions.filter((option) => option.value !== editing?.id)}
              placeholder="Root category"
            />
          </Form.Item>
          <Form.Item name="order" label="Order">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="isPublic" label="Public" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </RoleGate>
  );
}
