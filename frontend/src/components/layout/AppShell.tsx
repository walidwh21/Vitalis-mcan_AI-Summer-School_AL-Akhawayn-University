import { Activity, Home, MessagesSquare, Settings, Sparkles } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { cn } from "@/lib/utils";

const NAV: { to: string; icon: typeof Home; label: MessageKey; end?: boolean }[] = [
  { to: "/", icon: Home, label: "nav.dashboard", end: true },
  { to: "/habits", icon: Activity, label: "nav.habits" },
  { to: "/assistant", icon: MessagesSquare, label: "nav.assistant" },
  { to: "/wellness", icon: Sparkles, label: "nav.wellness" },
  { to: "/settings", icon: Settings, label: "nav.settings" },
];

export function AppShell() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e bg-card md:flex">
        <div className="border-b p-5">
          <Logo tagline={t("nav.tagline")} />
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Main">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              <Icon size={19} />
              {t(label)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center border-b bg-card px-4 py-3 md:hidden">
          <Logo />
        </header>
        <main className="container max-w-5xl flex-1 py-6 pb-24 md:py-10 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card md:hidden" aria-label="Main">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", isActive ? "text-primary" : "text-muted-foreground")
            }
          >
            <Icon size={20} />
            {t(label)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
