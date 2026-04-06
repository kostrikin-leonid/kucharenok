"use client";

import { Check, ChevronDown, MoreVertical, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addManualShoppingItemAction,
  deleteShoppingItemAction,
  getShoppingListItemsAction,
  toggleShoppingItemCheckedAction,
  updateShoppingItemAction,
  type ShoppingListItemDTO,
} from "@/actions/shopping";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { HouseholdRole } from "@/generated/prisma";
import { uk } from "@/lib/i18n/uk";
import type { SourceBreakdownEntry } from "@/lib/shopping/types";
import { cn } from "@/lib/utils";

function roleCanManageShopping(role: HouseholdRole) {
  return role === "owner" || role === "admin";
}

type Item = ShoppingListItemDTO;

function itemLabel(it: Item) {
  return it.ingredient?.name ?? it.customName ?? uk.shopping.itemFallback;
}

function sortPartition(items: Item[]): { unchecked: Item[]; checked: Item[] } {
  const cmp = (a: Item, b: Item) =>
    itemLabel(a).localeCompare(itemLabel(b), "uk", { sensitivity: "base" });
  const unchecked = items.filter((i) => !i.isChecked).sort(cmp);
  const checked = items.filter((i) => i.isChecked).sort(cmp);
  return { unchecked, checked };
}

export function ShoppingView({
  listId,
  items: initialItems,
  itemsRevision,
  role,
}: {
  listId: string;
  items: Item[];
  itemsRevision: string;
  role: HouseholdRole;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const togglingRef = useRef(false);
  const [items, setItems] = useState<Item[]>(() => [...initialItems]);

  useEffect(() => {
    setItems([...initialItems]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- синхронізація лише при зміні ревізії з RSC
  }, [itemsRevision, listId]);

  const { unchecked, checked } = useMemo(() => sortPartition(items), [items]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      if (togglingRef.current || pending) return;
      const next = await getShoppingListItemsAction(listId);
      if (next) setItems(next);
    }, 4000);
    return () => window.clearInterval(id);
  }, [listId, pending]);

  const mergeToggle = (id: string, isChecked: boolean) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isChecked } : it)),
    );
  };

  const refreshFromServer = () => {
    void getShoppingListItemsAction(listId).then((next) => {
      if (next) setItems(next);
    });
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="space-y-2 md:space-y-2.5">
        <ul className="space-y-2 md:space-y-2.5">
          {unchecked.map((it) => (
            <ShoppingRow
              key={it.id}
              item={it}
              manage={roleCanManageShopping(role)}
              pending={pending}
              start={start}
              router={router}
              onToggleOptimistic={(nextChecked) => {
                togglingRef.current = true;
                mergeToggle(it.id, nextChecked);
                void (async () => {
                  try {
                    await toggleShoppingItemCheckedAction(it.id, nextChecked);
                  } catch {
                    toast.error(uk.common.saveFailed);
                    mergeToggle(it.id, !nextChecked);
                  } finally {
                    togglingRef.current = false;
                  }
                })();
              }}
              onAfterMutate={refreshFromServer}
            />
          ))}
        </ul>

        {checked.length > 0 ? (
          <ul className="space-y-2 md:space-y-2.5 motion-safe:transition-[margin,padding] motion-safe:duration-300 motion-safe:ease-out">
            {checked.map((it) => (
              <ShoppingRow
                key={it.id}
                item={it}
                manage={roleCanManageShopping(role)}
                pending={pending}
                start={start}
                router={router}
                onToggleOptimistic={(nextChecked) => {
                  togglingRef.current = true;
                  mergeToggle(it.id, nextChecked);
                  void (async () => {
                    try {
                      await toggleShoppingItemCheckedAction(it.id, nextChecked);
                    } catch {
                      toast.error(uk.common.saveFailed);
                      mergeToggle(it.id, !nextChecked);
                    } finally {
                      togglingRef.current = false;
                    }
                  })();
                }}
                onAfterMutate={refreshFromServer}
                checkedSection
              />
            ))}
          </ul>
        ) : null}
      </div>

      {unchecked.length === 0 && checked.length === 0 ? (
        <div className="surface-card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="max-w-xs text-[15px] leading-snug text-[#64748b]">
            {uk.shopping.empty}
          </p>
        </div>
      ) : null}

      {roleCanManageShopping(role) ? (
        <ManualAddForm listId={listId} />
      ) : null}
    </div>
  );
}

function ShoppingRow({
  item: it,
  manage,
  pending,
  start,
  router,
  onToggleOptimistic,
  onAfterMutate,
  checkedSection,
}: {
  item: Item;
  manage: boolean;
  pending: boolean;
  start: (fn: () => void) => void;
  router: ReturnType<typeof useRouter>;
  onToggleOptimistic: (nextChecked: boolean) => void;
  onAfterMutate: () => void;
  checkedSection?: boolean;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const name = itemLabel(it);
  const breakdown = Array.isArray(it.sourceBreakdownJson)
    ? (it.sourceBreakdownJson as SourceBreakdownEntry[])
    : [];
  const recipeTitles = [...new Set(breakdown.map((b) => b.recipeTitle))];
  const shortSources =
    recipeTitles.length <= 2
      ? recipeTitles.join(" · ")
      : `${recipeTitles.slice(0, 2).join(" · ")} +${recipeTitles.length - 2}`;

  const qtyLabel =
    it.quantity != null
      ? `${it.quantity % 1 === 0 ? it.quantity : it.quantity.toFixed(1)} ${it.unit ?? ""}`.trim()
      : null;

  const toggle = () => {
    if (pending) return;
    onToggleOptimistic(!it.isChecked);
  };

  return (
    <li
      className={cn(
        "motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-out",
        checkedSection &&
          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2",
      )}
    >
      <div
        className={cn(
          "surface-card overflow-hidden transition-shadow duration-150 md:hover:shadow-md",
          it.isChecked && "bg-[#fafbfc]",
        )}
      >
        <div className="flex min-h-[60px]">
          <button
            type="button"
            disabled={pending}
            onClick={toggle}
            className={cn(
              "flex min-h-[60px] min-w-0 flex-1 touch-manipulation items-center gap-3 px-3 py-3 text-left transition-transform duration-150 active:scale-[0.99] active:bg-[#f1f5f9] md:min-h-0 md:px-4 md:py-4 md:active:scale-100 md:active:bg-transparent",
              it.isChecked && "active:bg-[#f0f4f8]",
            )}
            aria-label={
              it.isChecked ? uk.shopping.markUnchecked : uk.shopping.markChecked
            }
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
                it.isChecked
                  ? "border-[var(--interactive)] bg-[var(--interactive)]"
                  : "border-[#e2e8f0] bg-white",
              )}
              aria-hidden
            >
              {it.isChecked ? (
                <Check className="size-4 text-white" strokeWidth={3} />
              ) : null}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[17px] font-semibold leading-snug text-[#1e293b] md:text-base",
                  it.isChecked &&
                    "text-muted-foreground line-through opacity-75",
                )}
              >
                {name}
              </p>
              {recipeTitles.length > 0 ? (
                <p
                  className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-[#94a3b8] md:text-xs"
                  title={recipeTitles.join(", ")}
                >
                  {shortSources}
                </p>
              ) : null}
            </div>
            {qtyLabel ? (
              <span className="shrink-0 self-center rounded-lg bg-[#f1f5f9] px-2.5 py-1.5 text-sm font-semibold tabular-nums text-[#475569]">
                {qtyLabel}
              </span>
            ) : null}
          </button>
          {manage ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="flex min-h-[60px] w-[52px] shrink-0 touch-manipulation items-center justify-center border-l border-[#f1f5f9] bg-white text-[#94a3b8] transition-colors duration-150 active:bg-[#f1f5f9] md:min-h-0 md:w-14 md:hover:bg-[#fafafa] md:hover:text-[#001f3f]"
                aria-label={uk.shopping.moreActions}
              >
                <MoreVertical className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <div className="px-2 py-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {uk.shopping.manualQty}
                  </label>
                  <Input
                    className="mt-1 h-11"
                    defaultValue={it.quantity ?? ""}
                    inputMode="decimal"
                    onBlur={(e) => {
                      const n = parseFloat(e.target.value);
                      if (Number.isNaN(n)) return;
                      start(async () => {
                        await updateShoppingItemAction(it.id, {
                          quantity: n,
                        });
                        onAfterMutate();
                        router.refresh();
                      });
                    }}
                  />
                </div>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    start(async () => {
                      await deleteShoppingItemAction(it.id);
                      toast.success(uk.shopping.removed);
                      onAfterMutate();
                      router.refresh();
                    });
                  }}
                >
                  <Trash2 className="size-4" />
                  {uk.shopping.delete}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        {breakdown.length > 0 ? (
          <>
            <button
              type="button"
              className="flex w-full touch-manipulation items-center justify-between gap-2 border-t border-[#f1f5f9] px-4 py-2 text-left text-[11px] font-medium text-[#64748b] transition-colors active:bg-[#f8fafc] md:text-xs"
              onClick={() => setSourcesOpen((o) => !o)}
              aria-expanded={sourcesOpen}
            >
              <span>
                {sourcesOpen
                  ? uk.shopping.recipeSourcesHide
                  : uk.shopping.recipeSourcesShow}
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 transition-transform duration-200",
                  sourcesOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {sourcesOpen ? (
              <ul className="space-y-1 border-t border-[#f1f5f9] bg-[#fafbfc] px-4 py-2.5 text-[11px] leading-snug text-[#64748b] md:text-xs">
                {breakdown.map((b, i) => (
                  <li key={`${b.recipeId}-${i}`}>
                    <span className="font-medium text-[#475569]">
                      {b.recipeTitle}
                    </span>
                    <span className="text-[#94a3b8]">
                      {" "}
                      · {b.quantity % 1 === 0 ? b.quantity : b.quantity.toFixed(1)}{" "}
                      {b.unit}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </li>
  );
}

function ManualAddForm({ listId }: { listId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <form
      className="surface-card space-y-3 border-dashed p-4 md:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get("name") ?? "");
        const qty = parseFloat(String(fd.get("qty") ?? "1"));
        const unit = String(fd.get("unit") ?? "шт");
        if (!name.trim()) return;
        start(async () => {
          await addManualShoppingItemAction(listId, name, qty, unit);
          toast.success(uk.shopping.addedItem);
          (e.target as HTMLFormElement).reset();
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-1">
          <label className="sr-only" htmlFor="manual-name">
            {uk.shopping.manualName}
          </label>
          <Input
            id="manual-name"
            name="name"
            required
            placeholder={uk.shopping.manualName}
            className="h-12 text-base md:text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="sr-only" htmlFor="manual-qty">
            {uk.shopping.manualQty}
          </label>
          <Input
            id="manual-qty"
            name="qty"
            type="number"
            step="0.1"
            defaultValue="1"
            placeholder={uk.shopping.manualQty}
            className="h-12 text-base md:text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="sr-only" htmlFor="manual-unit">
            {uk.shopping.manualUnit}
          </label>
          <Input
            id="manual-unit"
            name="unit"
            defaultValue="шт"
            placeholder={uk.shopping.manualUnit}
            className="h-12 text-base md:text-sm"
          />
        </div>
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full touch-manipulation sm:w-auto"
      >
        {uk.common.add}
      </Button>
    </form>
  );
}
