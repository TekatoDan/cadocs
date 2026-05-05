"use client";

import dynamic from "next/dynamic";
import { AuthCodeRedirect } from "@/components/auth/AuthCodeRedirect";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

const Dashboard = dynamic(
  () => import("@/components/dashboard/Dashboard"),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <AuthCodeRedirect />
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    </>
  );
}
