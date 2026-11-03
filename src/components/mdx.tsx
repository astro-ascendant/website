import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Mermaid } from "@/components/mermaid";

const DefaultLink = defaultMdxComponents.a;

// `/llms.txt`, `/llms-full.txt` and `/docs/*.md` are server routes with no page
// component, so the client router cannot render them. Navigate to them natively.
const rawFile = /^\/(?:[^#?]*\.(?:txt|md))(?:[#?].*)?$/;

function DocLink(props: ComponentProps<"a">) {
  if (props.href && rawFile.test(props.href)) return <a {...props} />;
  return <DefaultLink {...props} />;
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    a: DocLink,
    Mermaid,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
