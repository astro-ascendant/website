import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { ChatGptIcon } from "@/components/chart/chatgpt-icon";

/**
 * The birth the form's placeholders describe, which these chats are about.
 * `hero-conversation.test.ts` casts it and checks every fact the replies use.
 */
export const EXAMPLE_BIRTH = {
  name: "Harini",
  date: "2003-07-23",
  time: "09:45",
  place: "Satyamangalam, Tamil Nadu, India",
  latitude: 11.5048,
  longitude: 77.2384,
} as const;

/**
 * Five example chats about Harini's chart, as the site casts it: Leo
 * ascendant; Moon in Bharani in Aries (9th house); Rahu in Taurus (10th);
 * Sun, Mercury and an exalted Jupiter in Cancer (12th); Venus, the
 * Atmakaraka, with Saturn in Gemini (11th); Upapada in Cancer. Rahu
 * Mahadasha began 19 Oct 2026, with Rahu Antardasha until Jul 2029 and
 * Saturn Antardasha from Nov 2031 to Oct 2034. Reply words wrapped in ** are
 * emphasised.
 */
const CONVERSATIONS = [
  {
    question: "Is this a good time to change jobs?",
    reply:
      "You have just entered **Rahu Mahadasha**, which began on 19 October 2026, with **Rahu Antardasha** until July 2029. Rahu sits in your 10th house of career, so this is a restless, ambitious stretch for work, and a change fits it well.",
  },
  {
    question: "What kind of career suits me?",
    reply:
      "Your 10th house is **Taurus**, ruled by Venus, and Venus is also your **Atmakaraka**, placed in your 11th house of gains. That points to design, finance, beauty and the arts, with Rahu in the 10th adding a pull towards technology.",
  },
  {
    question: "When is a good time to marry?",
    reply:
      "Your 7th house is **Aquarius**, ruled by Saturn, so marriage tends to come with maturity. **Saturn Antardasha**, from November 2031 to October 2034, is the classic window. Your Upapada is **Cancer**, home to an exalted Jupiter, a sign of a supportive partner.",
  },
  {
    question: "Will I travel abroad?",
    reply:
      "Very likely. **Rahu**, the planet of foreign lands, runs your Mahadasha from October 2026, and your 12th house of distant places holds the Sun, Mercury and an **exalted Jupiter**. The next few years favour study or work abroad.",
  },
  {
    question: "What does my Moon in Bharani say about me?",
    reply:
      "Your Moon is in **Bharani**, in Aries, in your 9th house. Bharani, ruled by Venus, is the star of birth and restraint: you feel deeply, act with courage, and find meaning through **learning, faith and travel**.",
  },
].map(({ question, reply }) => ({
  question,
  reply: parseReply(reply),
}));

/** One streamed word; a word like `**Scorpio**,` has an emphasised part and a plain comma. */
type Word = { text: string; strong: boolean }[];

function parseReply(text: string): Word[] {
  let strong = false;
  return text.split(" ").map((token) => {
    const parts: Word = [];
    token.split("**").forEach((segment, index) => {
      if (index > 0) {
        strong = !strong;
      }
      if (segment !== "") {
        parts.push({ text: segment, strong });
      }
    });
    return parts;
  });
}

/**
 * Where a chat is: nothing yet, the question, ChatGPT typing, the reply
 * streaming, the finished reply on show, then fading before the next chat.
 */
type Phase = "empty" | "question" | "typing" | "streaming" | "holding" | "leaving";

/** How long each phase lasts before the next one begins. */
const PHASE_MS: Record<Exclude<Phase, "streaming">, number> = {
  empty: 300,
  question: 700,
  typing: 1200,
  holding: 3500,
  leaving: 400,
};
const NEXT: Record<Phase, Phase> = {
  empty: "question",
  question: "typing",
  typing: "streaming",
  streaming: "holding",
  holding: "leaving",
  leaving: "empty",
};
const WORD_MS = 45;

/** Plays the chats in a loop while on screen and the tab is visible. */
function usePlayback(onScreen: boolean) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("empty");
  const [words, setWords] = useState(0);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const update = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  // Less motion: the first chat, finished and still.
  useEffect(() => {
    if (reduce) {
      setIndex(0);
      setPhase("holding");
      setWords(CONVERSATIONS[0].reply.length);
    }
  }, [reduce]);

  useEffect(() => {
    if (reduce || !onScreen || !tabVisible) {
      return;
    }
    if (phase === "streaming") {
      if (words < CONVERSATIONS[index].reply.length) {
        const timer = setTimeout(() => setWords((count) => count + 1), WORD_MS);
        return () => clearTimeout(timer);
      }
    }
    const delay = phase === "streaming" ? 0 : PHASE_MS[phase];
    const timer = setTimeout(() => {
      if (phase === "leaving") {
        setIndex((current) => (current + 1) % CONVERSATIONS.length);
        setWords(0);
      }
      setPhase(NEXT[phase]);
    }, delay);
    return () => clearTimeout(timer);
  }, [reduce, onScreen, tabVisible, phase, words, index]);

  return { index, phase, words };
}

const PHASE_ORDER: Phase[] = ["empty", "question", "typing", "streaming", "holding", "leaving"];
const reached = (phase: Phase, target: Phase) =>
  PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);

/** Fades in and lifts a little; holds its space while hidden. */
const reveal = (shown: boolean) =>
  cn(
    "transition-[opacity,translate] duration-300 ease-out",
    shown ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0",
  );

/** Three dots that rise in turn; still when the reader prefers less motion. */
function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-5 items-center gap-1", className)}>
      {["0ms", "160ms", "320ms"].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: delay }}
          className="bg-muted-foreground/70 size-1.5 rounded-full motion-safe:animate-[typing-dot_1.2s_ease-in-out_infinite]"
        />
      ))}
    </span>
  );
}

function Chat({
  conversation,
  active,
  phase,
  words,
}: {
  conversation: (typeof CONVERSATIONS)[number];
  active: boolean;
  phase: Phase;
  words: number;
}) {
  // Inactive chats render hidden but laid out, so the card is as tall as
  // the longest one and never resizes between chats.
  const at = (target: Phase) => active && reached(phase, target);
  return (
    <div
      aria-hidden={active ? undefined : true}
      className={cn(
        "flex flex-col gap-5 [grid-area:1/1] transition-opacity duration-300 ease-out",
        active && phase !== "leaving" ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        className={cn(
          "bg-muted text-foreground max-w-[85%] self-end rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed text-pretty",
          reveal(at("question")),
        )}
      >
        <code className="bg-background rounded-[0.3rem] px-[0.3rem] py-[0.1rem] font-mono text-[0.9em]">
          /ascendant
        </code>{" "}
        {conversation.question}
      </div>

      <div className={cn("flex max-w-[92%] gap-3 self-start", reveal(at("typing")))}>
        <span className="border-border bg-background text-foreground grid size-10 shrink-0 place-items-center rounded-full border">
          <ChatGptIcon aria-hidden="true" className="size-8" />
        </span>
        <div className="relative pt-2">
          <TypingDots
            className={cn(
              "absolute top-2.5 left-0 transition-opacity duration-200",
              active && phase === "typing" ? "opacity-100" : "opacity-0",
            )}
          />
          <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
            {conversation.reply.map((parts, index) => (
              <span
                key={index}
                className={cn(
                  "transition-opacity duration-200",
                  active && index < words ? "opacity-100" : "opacity-0",
                )}
              >
                {parts.map((part, partIndex) => (
                  <span
                    key={partIndex}
                    className={cn(part.strong && "text-foreground font-medium")}
                  >
                    {part.text}
                  </span>
                ))}{" "}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Example chats with ChatGPT about a chart, using the /ascendant skill, beside
 * the empty /chart hero. Each question plays as a new chat, in a loop.
 * Illustrative only: nothing here is computed.
 */
export function HeroConversation() {
  const ref = useRef<HTMLElement>(null);
  const onScreen = useInView(ref, { amount: 0.5 });
  const { index, phase, words } = usePlayback(onScreen);

  return (
    <figure
      ref={ref}
      aria-label="Example conversations with ChatGPT about a birth chart"
      className="flex w-full max-w-md flex-col gap-3"
    >
      <div className="border-border/70 bg-card/40 flex flex-col overflow-hidden rounded-2xl border shadow-sm">
        <div className="border-border/70 flex items-center justify-between border-b px-4 py-3">
          <span className="text-foreground flex items-center gap-2 text-sm font-medium">
            <ChatGptIcon aria-hidden="true" className="-my-1.5 size-8" />
            ChatGPT
          </span>
          <span className="text-muted-foreground border-border/70 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] uppercase">
            Example
          </span>
        </div>

        <div className="grid px-4 py-5 sm:px-5">
          {CONVERSATIONS.map((conversation, i) => (
            <Chat
              key={conversation.question}
              conversation={conversation}
              active={i === index}
              phase={phase}
              words={words}
            />
          ))}
        </div>

        <div aria-hidden="true" className="px-4 pb-4 sm:px-5">
          <div className="border-border/70 bg-background flex items-center justify-between rounded-full border py-1.5 ps-4 pe-1.5">
            <span className="text-muted-foreground text-sm">
              Ask about your chart
            </span>
            <span className="bg-foreground text-background grid size-7 place-items-center rounded-full">
              <ArrowUpIcon weight="bold" className="size-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Which of the five chats is playing, in the site's dotted motif. */}
      <div aria-hidden="true" className="flex justify-center gap-1.5">
        {CONVERSATIONS.map((conversation, i) => (
          <span
            key={conversation.question}
            className={cn(
              "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
              i === index ? "bg-foreground/70 w-4" : "bg-muted-foreground/30 w-1.5",
            )}
          />
        ))}
      </div>
      <figcaption className="text-muted-foreground text-center text-xs text-pretty">
        Once your chart is ready, Ask ChatGPT sends it over.
      </figcaption>
    </figure>
  );
}
