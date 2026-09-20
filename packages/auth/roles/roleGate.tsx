"use client";

import { useAuth } from "@/packages/auth/context/context";
import { Result } from "antd";
import type { ReactNode } from "react";

export default function RoleGate({
  roles,
  children,
}: {
  roles: string[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return (
      <Result
        status="403"
        title="Not allowed"
        subTitle="Your account cannot open this page."
      />
    );
  }
  return children;
}
