import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";
import { useI18n } from "@/i18n";
import { ApiError } from "@/lib/api";
import { useAuth } from "./AuthProvider";

function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-soft to-background p-4">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Link to="/welcome">
          <Logo />
        </Link>
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">{footer}</p>
    </div>
  );
}

function useSubmit(action: () => Promise<void>) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await action();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setPending(false);
    }
  };
  return { error, pending, onSubmit };
}

function FormError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function LoginPage() {
  const { t } = useI18n();
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { error, pending, onSubmit } = useSubmit(() => signIn(email, password));

  if (user) return <Navigate to="/" replace />;
  return (
    <AuthFrame
      title={t("auth.signIn.title")}
      subtitle={t("auth.signIn.subtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            {t("auth.createLink")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("auth.email")}>
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t("auth.password")}>
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("common.loading") : t("auth.submitSignIn")}
        </Button>
      </form>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const { t, locale } = useI18n();
  const { user, register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { error, pending, onSubmit } = useSubmit(() => register({ fullName, email, password, locale }));

  if (user) return <Navigate to="/" replace />;
  return (
    <AuthFrame
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("auth.signInLink")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t("auth.fullName")}>
          <Input autoComplete="name" required maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label={t("auth.email")}>
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t("auth.password")} hint={t("auth.passwordHint")}>
          <Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <FormError message={error} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("common.loading") : t("auth.submitRegister")}
        </Button>
      </form>
    </AuthFrame>
  );
}
