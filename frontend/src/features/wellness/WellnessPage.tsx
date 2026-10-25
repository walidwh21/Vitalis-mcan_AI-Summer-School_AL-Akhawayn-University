import { Lightbulb } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { CATEGORIES, PRACTICES } from "./practices";
import type { Category } from "./practices";

export function WellnessPage() {
  const { t } = useI18n();
  const [category, setCategory] = useState<Category>("stress");
  const items = PRACTICES.filter((p) => p.category === category);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">{t("wellness.title")}</h1>
        <p className="text-muted-foreground">{t("wellness.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="h-fit p-5 lg:col-span-1">
          <h2 className="mb-3 font-semibold">{t("wellness.whatHelp")}</h2>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1" role="tablist">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={category === c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-md px-3 py-2.5 text-start text-sm font-medium transition-colors",
                  category === c.id ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                {t(c.label)}
              </button>
            ))}
          </div>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {items.map((p) => (
            <Card key={p.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-accent p-2.5 text-accent-foreground">
                  <Lightbulb size={20} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{t(p.title)}</h3>
                  <p className="text-sm text-muted-foreground">{t(p.body)}</p>
                  <div className="rounded-lg bg-primary-soft p-3 text-sm">
                    <span className="font-medium text-primary">{t("wellness.tryThis")}: </span>
                    {t(p.how)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">{t("wellness.disclaimer")}</p>
        </div>
      </div>
    </div>
  );
}
