import { BarChart3, ClipboardCheck, MessagesSquare } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { useAuth } from "@/features/auth/AuthProvider";

export function LandingPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;

  const features = [
    { icon: ClipboardCheck, title: t("landing.f1.title"), body: t("landing.f1.body") },
    { icon: BarChart3, title: t("landing.f2.title"), body: t("landing.f2.body") },
    { icon: MessagesSquare, title: t("landing.f3.title"), body: t("landing.f3.body") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-soft via-background to-background">
      <header className="container flex items-center justify-between py-5">
        <Logo />
        <LanguageSwitcher />
      </header>

      <main className="container py-12 sm:py-20">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{t("landing.title")}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{t("landing.subtitle")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register">{t("landing.cta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">{t("landing.signIn")}</Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon size={22} />
              </div>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </Card>
          ))}
        </section>

        <p className="mx-auto mt-12 max-w-2xl text-center text-xs text-muted-foreground">{t("landing.disclaimer")}</p>
      </main>
    </div>
  );
}
