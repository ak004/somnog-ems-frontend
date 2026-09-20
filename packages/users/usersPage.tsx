"use client";

import apiConfig from "@/shared/apiconfig";
import { apiMessage } from "@/shared/apiError";
import { ADMIN_ROLES } from "@/packages/auth/roles/roles";
import { Input, Select, Space, Table, Tag, Typography, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import RoleGate from "@/packages/auth/roles/roleGate";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  affiliation: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
};

const ROLE_OPTIONS = ["ADMIN", "ORGANIZER", "SPEAKER", "ATTENDEE"].map((role) => ({
  value: role,
  label: role.toLowerCase(),
}));

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await apiConfig.get("/api/auth/users", {
      params: { page, limit: 20, q: q || undefined },
    });
    setItems(data.items ?? []);
    setTotal(data.meta?.total ?? 0);
  }, [page, q]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((error) => message.error(apiMessage(error, "Could not load users")))
      .finally(() => setLoading(false));
  }, [load]);

  const setRole = async (userId: string, role: string) => {
    setSavingId(userId);
    try {
      await apiConfig.patch(`/api/auth/users/${userId}/role`, { role });
      message.success("Role updated");
      await load();
    } catch (error) {
      message.error(apiMessage(error, "Could not update role"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <RoleGate roles={[...ADMIN_ROLES]}>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Users
          </Typography.Title>
          <Typography.Text type="secondary">
            Admin directory and role changes
          </Typography.Text>
        </div>
        <Input.Search
          allowClear
          placeholder="Search name, email, affiliation"
          onSearch={(value) => {
            setPage(1);
            setQ(value);
          }}
          style={{ maxWidth: 360 }}
        />
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
          }}
          columns={[
            {
              title: "Name",
              render: (_, row) => `${row.firstName} ${row.lastName}`,
            },
            { title: "Email", dataIndex: "email" },
            { title: "Affiliation", dataIndex: "affiliation" },
            {
              title: "Status",
              render: (_, row) => (
                <Space>
                  <Tag color={row.isActive ? "green" : "red"}>
                    {row.isActive ? "active" : "disabled"}
                  </Tag>
                  {row.emailVerified ? <Tag>verified</Tag> : <Tag>unverified</Tag>}
                </Space>
              ),
            },
            {
              title: "Role",
              dataIndex: "role",
              render: (role: string, row) => (
                <Select
                  value={role}
                  options={ROLE_OPTIONS}
                  style={{ width: 140 }}
                  loading={savingId === row.id}
                  onChange={(value) => setRole(row.id, value)}
                />
              ),
            },
          ]}
        />
      </Space>
    </RoleGate>
  );
}
