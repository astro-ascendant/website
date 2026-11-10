import { createFileRoute } from "@tanstack/react-router";
import { SkyPage } from "@/components/sky/page";

const description =
  "Current sidereal planetary positions: where the Sun, Moon and planets stand right now, with nakshatra, the Rashi and Navamsha charts, and KP lords.";

export const Route = createFileRoute("/sky")({
  component: SkyPage,
  head: () => ({
    meta: [
      { title: "Ascendant - Current Sidereal Planetary Position" },
      { name: "description", content: description },
      { property: "og:title", content: "Ascendant - Current Sidereal Planetary Position" },
      { property: "og:description", content: description },
    ],
  }),
});
