"use client";

import {
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  FolderOutlined,
  FormOutlined,
  IdcardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/packages/auth/context/context";
import { Button, Layout, Menu, Spin, theme } from "antd";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Header, Sider, Content } = Layout;

const NAV_ITEMS = [
  {
    key: "/dashboard",
    icon: <AppstoreOutlined />,
    label: <Link href="/dashboard">Overview</Link>,
  },
  {
    key: "/dashboard/events",
    icon: <CalendarOutlined />,
    label: <Link href="/dashboard/events">Events</Link>,
  },
  {
    key: "/dashboard/tickets",
    icon: <IdcardOutlined />,
    label: <Link href="/dashboard/tickets">My tickets</Link>,
  },
  {
    key: "/dashboard/notifications",
    icon: <BellOutlined />,
    label: <Link href="/dashboard/notifications">Notifications</Link>,
  },
  {
    key: "/dashboard/profile",
    icon: <UserOutlined />,
    label: <Link href="/dashboard/profile">Profile</Link>,
  },
  {
    key: "/dashboard/manage-events",
    icon: <FormOutlined />,
    label: <Link href="/dashboard/manage-events">Manage events</Link>,
    roles: ["ADMIN", "ORGANIZER"],
  },
  {
    key: "/dashboard/users",
    icon: <TeamOutlined />,
    label: <Link href="/dashboard/users">Users</Link>,
    roles: ["ADMIN"],
  },
  {
    key: "/dashboard/categories",
    icon: <FolderOutlined />,
    label: <Link href="/dashboard/categories">Categories</Link>,
    roles: ["ADMIN"],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, loading, user } = useAuth();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/");
    }
  }, [loading, isLoggedIn, router]);

  if (loading || !isLoggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin />
      </div>
    );
  }

  return (
    <Layout>
      <Sider
        theme="light"
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{ minHeight: "100vh", borderRight: "1px solid #f0f0f0" }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: collapsed ? 8 : 16,
          }}
        >
          <Image
            src="/logo.png"
            alt="SomNOG"
            width={collapsed ? 32 : 120}
            height={collapsed ? 32 : 40}
            style={{ objectFit: "contain" }}
          />
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[
            pathname.startsWith("/dashboard/manage-events")
              ? "/dashboard/manage-events"
              : pathname,
          ]}
          items={NAV_ITEMS.filter(
            (item) => !item.roles || (user?.role && item.roles.includes(user.role)),
          ).map(({ roles: _roles, ...item }) => item)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: "0 16px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />
          <span>
            {user?.firstName} {user?.lastName}
          </span>
        </Header>
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
