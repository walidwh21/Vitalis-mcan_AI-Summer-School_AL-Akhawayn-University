import { Loader2 } from "lucide-react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { LoginPage, RegisterPage } from "@/features/auth/AuthPages";
import { useAuth } from "@/features/auth/AuthProvider";
import { AssistantPage } from "@/features/assistant/AssistantPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { HabitsPage } from "@/features/habits/HabitsPage";
import { LandingPage } from "@/features/landing/LandingPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { WellnessPage } from "@/features/wellness/WellnessPage";

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }
  return user ? <AppShell /> : <Navigate to="/welcome" replace />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <Button asChild>
        <Link to="/">Home</Link>
      </Button>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="wellness" element={<WellnessPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
