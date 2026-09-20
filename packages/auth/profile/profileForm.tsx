"use client";

import apiConfig from "@/shared/apiconfig";
import { useAuth, type AuthUser } from "@/packages/auth/context/context";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfileForm() {
  const { user, setUser, logout } = useAuth();
  const router = useRouter();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    if (!user) return;
    profileForm.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      affiliation: user.affiliation,
      country: user.country,
      phone: user.phone,
    });
  }, [user, profileForm]);

  const saveProfile = async (values: {
    firstName: string;
    lastName: string;
    affiliation?: string;
    country?: string;
    phone?: string;
  }) => {
    try {
      const { data } = await apiConfig.patch<AuthUser>("/api/auth/me", values);
      setUser(data);
      message.success("Profile updated");
    } catch (error: unknown) {
      const apiError = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error;
      message.error(apiError?.message ?? "Could not update profile");
    }
  };

  const changePassword = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    try {
      await apiConfig.post("/api/auth/me/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success("Password changed. Please sign in again.");
      logout();
      router.replace("/");
    } catch (error: unknown) {
      const apiError = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error;
      message.error(apiError?.message ?? "Could not change password");
    }
  };

  if (!user) return null;

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Profile
        </Typography.Title>
        <Typography.Text type="secondary">
          Your account from auth-service
        </Typography.Text>
      </div>

      <Card>
        <Space wrap size={12}>
          <Typography.Text strong>
            {user.firstName} {user.lastName}
          </Typography.Text>
          <Tag>{user.role.toLowerCase()}</Tag>
          <Tag color={user.emailVerified ? "green" : "orange"}>
            {user.emailVerified ? "email verified" : "email not verified"}
          </Tag>
          <Tag color={user.isActive ? "green" : "red"}>
            {user.isActive ? "active" : "disabled"}
          </Tag>
        </Space>
        <Typography.Paragraph type="secondary" style={{ margin: "12px 0 0" }}>
          {user.email} · joined {new Date(user.createdAt).toLocaleDateString("en-GB")}
        </Typography.Paragraph>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Personal details">
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={saveProfile}
            >
              <Form.Item label="Email">
                <Input value={user.email} disabled />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="firstName"
                    label="First name"
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <Input maxLength={80} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="lastName"
                    label="Last name"
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <Input maxLength={80} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="affiliation" label="Affiliation">
                <Input maxLength={160} placeholder="University or organisation" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="country" label="Country">
                    <Input maxLength={80} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="phone" label="Phone">
                    <Input maxLength={32} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit">
                Save profile
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Change password">
            <Typography.Paragraph type="secondary">
              This signs out every session. You will need to log in again.
            </Typography.Paragraph>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={changePassword}
            >
              <Form.Item
                name="currentPassword"
                label="Current password"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label="New password"
                rules={[
                  { required: true, message: "Required" },
                  { min: 8, message: "At least 8 characters" },
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="Confirm new password"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "Required" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Passwords do not match"));
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Update password
                </Button>
                <Button
                  onClick={() => {
                    logout();
                    router.replace("/");
                  }}
                >
                  Sign out
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
