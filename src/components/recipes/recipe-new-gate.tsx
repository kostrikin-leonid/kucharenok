"use client";

import dynamic from "next/dynamic";

import { uk } from "@/lib/i18n/uk";

const RecipeNewClient = dynamic(
  () =>
    import("@/components/recipes/recipe-new-client").then(
      (m) => m.RecipeNewClient,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">{uk.common.loading}</p>
    ),
  },
);

type Opt = { id: string; name: string; slug: string };

export function RecipeNewGate(props: {
  categories: Opt[];
  tags: { id: string; name: string }[];
  catalog: { id: string; name: string }[];
  preparations: { id: string; title: string }[];
}) {
  return <RecipeNewClient {...props} />;
}
