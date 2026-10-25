import type { MessageKey } from "@/i18n";

export type Category = "stress" | "anxiety" | "lowMood" | "lowEnergy";

export interface Practice {
  id: string;
  category: Category;
  title: MessageKey;
  body: MessageKey;
  how: MessageKey;
}

const practice = (id: string, category: Category): Practice => ({
  id,
  category,
  title: `practice.${id}.title` as MessageKey,
  body: `practice.${id}.body` as MessageKey,
  how: `practice.${id}.how` as MessageKey,
});

export const CATEGORIES: { id: Category; label: MessageKey }[] = [
  { id: "stress", label: "wellness.cat.stress" },
  { id: "anxiety", label: "wellness.cat.anxiety" },
  { id: "lowMood", label: "wellness.cat.lowMood" },
  { id: "lowEnergy", label: "wellness.cat.lowEnergy" },
];

export const PRACTICES: Practice[] = [
  practice("breathing478", "stress"),
  practice("walk", "stress"),
  practice("grounding", "anxiety"),
  practice("boxBreathing", "anxiety"),
  practice("reachOut", "lowMood"),
  practice("gratitude", "lowMood"),
  practice("hydrate", "lowEnergy"),
  practice("stretch", "lowEnergy"),
];
