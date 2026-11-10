import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { gitConfig } from "./shared";
import { BrandWordmark } from "@/components/brand-wordmark";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <BrandWordmark className="h-8" />
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}`,
  };
}
