"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createCategoryAction,
  createTagAction,
  deleteCategoryAction,
  deleteTagAction,
  updateCategoryAction,
  updateTagAction,
} from "@/actions/categories-tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uk } from "@/lib/i18n/uk";

type Row = { id: string; name: string };

export function CategoriesTagsPanel({
  categories,
  tags,
}: {
  categories: Row[];
  tags: Row[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#001f3f]">
          {uk.settings.categoriesManageTitle}
        </h2>
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <Input
                key={c.name}
                defaultValue={c.name}
                disabled={pending}
                className="h-12 flex-1 text-base"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v || v === c.name) return;
                  start(async () => {
                    try {
                      await updateCategoryAction(c.id, v);
                      toast.success(uk.common.saved);
                      router.refresh();
                    } catch {
                      toast.error(uk.common.saveFailed);
                      router.refresh();
                    }
                  });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                className="size-12 shrink-0 touch-manipulation"
                aria-label={uk.common.delete}
                onClick={() => {
                  start(async () => {
                    try {
                      await deleteCategoryAction(c.id);
                      toast.success(uk.common.saved);
                      router.refresh();
                    } catch {
                      toast.error(uk.common.saveFailed);
                    }
                  });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = newCategory.trim();
            if (!v) return;
            start(async () => {
              try {
                await createCategoryAction(v);
                setNewCategory("");
                toast.success(uk.common.saved);
                router.refresh();
              } catch {
                toast.error(uk.common.saveFailed);
              }
            });
          }}
        >
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder={uk.settings.newCategoryPlaceholder}
            disabled={pending}
            className="h-12 flex-1 text-base"
          />
          <Button
            type="submit"
            disabled={pending}
            className="h-12 min-w-12 shrink-0 touch-manipulation px-3"
            aria-label={uk.common.add}
          >
            <Plus className="size-5" />
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[#001f3f]">
          {uk.settings.tagsManageTitle}
        </h2>
        <ul className="space-y-2">
          {tags.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <Input
                key={t.name}
                defaultValue={t.name}
                disabled={pending}
                className="h-12 flex-1 text-base"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v || v === t.name) return;
                  start(async () => {
                    try {
                      await updateTagAction(t.id, v);
                      toast.success(uk.common.saved);
                      router.refresh();
                    } catch {
                      toast.error(uk.common.saveFailed);
                      router.refresh();
                    }
                  });
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                className="size-12 shrink-0 touch-manipulation"
                aria-label={uk.common.delete}
                onClick={() => {
                  start(async () => {
                    try {
                      await deleteTagAction(t.id);
                      toast.success(uk.common.saved);
                      router.refresh();
                    } catch {
                      toast.error(uk.common.saveFailed);
                    }
                  });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = newTag.trim();
            if (!v) return;
            start(async () => {
              try {
                await createTagAction(v);
                setNewTag("");
                toast.success(uk.common.saved);
                router.refresh();
              } catch {
                toast.error(uk.common.saveFailed);
              }
            });
          }}
        >
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder={uk.settings.newTagPlaceholder}
            disabled={pending}
            className="h-12 flex-1 text-base"
          />
          <Button
            type="submit"
            disabled={pending}
            className="h-12 min-w-12 shrink-0 touch-manipulation px-3"
            aria-label={uk.common.add}
          >
            <Plus className="size-5" />
          </Button>
        </form>
      </section>
    </div>
  );
}
