import type { AiProvider, Locale, StreamRequest } from "./types.ts";

const REPLIES: Record<Locale, { low: string; high: string; neutral: string }> = {
  en: {
    low: "I'm sorry today feels heavy. You don't have to fix everything at once. Try one slow breath cycle: in for 4, hold for 7, out for 8. Then, if you can, send a short message to someone you trust. How are you feeling right now?",
    high: "That's great to hear! Notice what helped today so you can repeat it. A short walk or a glass of water keeps the momentum going. What do you want to focus on next?",
    neutral:
      "Thanks for sharing. A small step can help: take a glass of water, stretch your shoulders, and take five slow breaths. If you tell me a bit more about your day, I can suggest something that fits.",
  },
  fr: {
    low: "Je suis désolé que la journée soit difficile. Inutile de tout régler d'un coup. Essayez un cycle de respiration lente : inspirez 4 secondes, retenez 7, expirez 8. Si possible, écrivez un petit message à une personne de confiance. Comment vous sentez-vous maintenant ?",
    high: "Super nouvelle ! Repérez ce qui a aidé aujourd'hui pour le refaire. Une courte marche ou un verre d'eau entretient l'élan. Sur quoi voulez-vous vous concentrer ensuite ?",
    neutral:
      "Merci de partager cela. Un petit pas peut aider : buvez un verre d'eau, étirez les épaules et respirez lentement cinq fois. Racontez-moi un peu votre journée et je vous proposerai quelque chose d'adapté.",
  },
  ar: {
    low: "يؤسفني أن يومك ثقيل. لا يلزمك حلّ كل شيء دفعة واحدة. جرّب دورة تنفس بطيئة: شهيق 4 ثوانٍ، احبس 7، زفير 8. وإن استطعت أرسل رسالة قصيرة لشخص تثق به. كيف تشعر الآن؟",
    high: "هذا رائع! لاحظ ما ساعدك اليوم لتكرره. مشي قصير أو كوب ماء يحافظان على الزخم. على ماذا تريد التركيز بعد ذلك؟",
    neutral:
      "شكرًا لمشاركتك. خطوة صغيرة قد تفيد: اشرب كوب ماء، حرّك كتفيك، وخذ خمسة أنفاس بطيئة. أخبرني أكثر عن يومك لأقترح ما يناسبك.",
  },
};

const LOW = /\b(sad|tired|anxious|stress\w*|overwhelm\w*|lonely|down|bad)\b|triste|fatigu|anxi|stress|متعب|حزين|قلق|ضغط/i;
const HIGH = /\b(great|good|happy|excited|proud)\b|content|heureux|super|bien|سعيد|رائع|جيد/i;

/** Offline provider so the whole stack runs without an API key. Not an AI. */
export class MockProvider implements AiProvider {
  readonly name = "mock";
  private readonly chunkDelayMs: number;

  constructor(chunkDelayMs = 15) {
    this.chunkDelayMs = chunkDelayMs;
  }

  async *stream({ messages, locale, signal }: StreamRequest): AsyncGenerator<string> {
    const last = messages[messages.length - 1]?.content ?? "";
    const set = REPLIES[locale];
    const reply = LOW.test(last) ? set.low : HIGH.test(last) ? set.high : set.neutral;
    for (const word of reply.split(/(?<=\s)/)) {
      if (signal?.aborted) return;
      if (this.chunkDelayMs > 0) await new Promise((r) => setTimeout(r, this.chunkDelayMs));
      yield word;
    }
  }
}
