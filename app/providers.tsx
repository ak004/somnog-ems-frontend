"use client";

import { AuthProvider } from "@/packages/auth/context/context";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
