"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChefHat,
  ChevronLeft,
  Home,
  Settings,
  ShoppingCart,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { buttonVariants } from "@/components/ui/button-variants";
import { uk } from "@/lib/i18n/uk";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/dashboard", label: uk.nav.dashboard, Icon: Home },
  { href: "/recipes", label: uk.nav.recipes, Icon: UtensilsCrossed },
  { href: "/plan", label: uk.nav.plan, Icon: CalendarDays },
  { href: "/shopping", label: uk.nav.shopping, Icon: ShoppingCart },
  { href: "/family", label: uk.nav.family, Icon: Users },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function mobileBackHref(pathname: string): string | null {
  if (pathname.startsWith("/recipes/") && pathname !== "/recipes") {
    return "/recipes";
  }
  if (pathname === "/settings") return "/dashboard";
  if (pathname.startsWith("/join/")) return "/dashboard";
  return null;
}

function mobileTitle(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/") return uk.nav.dashboard;
  if (pathname.startsWith("/recipes/import")) return uk.recipes.newAi;
  if (pathname.startsWith("/recipes/new")) return uk.recipes.new;
  if (pathname.startsWith("/recipes/") && pathname !== "/recipes") {
    return uk.plan.openRecipe;
  }
  if (pathname.startsWith("/recipes")) return uk.nav.recipes;
  if (pathname.startsWith("/plan")) return uk.plan.title;
  if (pathname.startsWith("/shopping")) return uk.shopping.title;
  if (pathname.startsWith("/family")) return uk.nav.family;
  if (pathname.startsWith("/settings")) return uk.nav.settings;
  if (pathname.startsWith("/join/")) return uk.family.joinTitle;
  return uk.appName;
}

export function AppShell({
  children,
  displayName,
  roleLabel,
  manager,
}: {
  children: React.ReactNode;
  displayName: string;
  roleLabel: string | null;
  manager: boolean;
}) {
  const pathname = usePathname();
  const back = mobileBackHref(pathname);
  const title = mobileTitle(pathname);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[280px] shrink-0 flex-col border-r border-[#f3f4f6] bg-card md:flex">
        <div className="border-b border-[#f9fafb] px-6 py-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#001f3f] text-white shadow-md">
              <ChefHat className="size-5" aria-hidden />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#001f3f]">
              {uk.appName}
            </span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-6">
          {mainNav.map(({ href, label, Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-4 rounded-[14px] px-4 py-3.5 text-base transition-colors duration-150",
                  active
                    ? "bg-[#f0f4f8] font-semibold text-[#001f3f]"
                    : "font-medium text-[#6b7280] hover:bg-muted/80 hover:text-[#001f3f]",
                )}
              >
                <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#f9fafb] px-4 py-4">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-4 rounded-[14px] px-4 py-3.5 text-base transition-colors",
              pathname.startsWith("/settings")
                ? "bg-[#f0f4f8] font-semibold text-[#001f3f]"
                : "font-medium text-[#6b7280] hover:bg-muted/80 hover:text-[#001f3f]",
            )}
          >
            <Settings className="size-5 shrink-0 opacity-90" aria-hidden />
            {uk.nav.settings}
          </Link>
          <div className="mt-4 space-y-2 border-t border-[#f9fafb] pt-4">
            <p className="truncate px-1 text-xs text-muted-foreground">
              {displayName}
            </p>
            {roleLabel ? (
              <span
                className={cn(
                  "ml-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  manager
                    ? "bg-[#eff6ff] text-[#001f3f]"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {roleLabel}
              </span>
            ) : null}
            <SignOutButton className="mt-2 w-full justify-center border-[#e2e8f0] bg-white text-[#001f3f] hover:bg-[#f8fafc]" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="shrink-0 bg-[var(--surface-header)] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)] md:hidden rounded-b-3xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex w-10 justify-start">
              {back ? (
                <Link
                  href={back}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "size-10 rounded-full text-white hover:bg-white/10 hover:text-white",
                  )}
                  aria-label={uk.common.back}
                >
                  <ChevronLeft className="size-5" />
                </Link>
              ) : (
                <span className="size-10" aria-hidden />
              )}
            </div>
            <h1 className="flex-1 text-center text-lg font-semibold tracking-wide">
              {title}
            </h1>
            <div className="flex w-10 justify-end">
              <Link
                href="/settings"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "size-10 rounded-full text-white hover:bg-white/10 hover:text-white",
                )}
                aria-label={uk.nav.settings}
              >
                <Settings className="size-5" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 md:px-8 md:py-8 md:pb-10 md:pt-6">
          {children}
        </main>

        <p className="mx-auto max-w-[1400px] px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-0 text-center text-[11px] text-muted-foreground md:px-8 md:pb-6">
          {uk.footerNutrition}
        </p>

        {/* Mobile bottom navigation */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-transparent bg-card pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[var(--shadow-nav)] md:hidden rounded-t-3xl"
          aria-label="Основна навігація"
        >
          <div className="flex items-start justify-between gap-1 px-6">
            {mainNav.map(({ href, label, Icon }) => {
              const active = navActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5 touch-manipulation rounded-xl py-0.5 transition-opacity duration-150 active:opacity-60"
                >
                  <span className="relative flex size-10 items-center justify-center md:size-9">
                    {active ? (
                      <span className="absolute inset-0 rounded-full bg-[#3b82f6]/15" />
                    ) : null}
                    <Icon
                      className={cn(
                        "relative z-[1] size-[1.15rem]",
                        active
                          ? "text-[#0a192f]"
                          : "text-[#94a3b8]",
                      )}
                      strokeWidth={active ? 2.5 : 2}
                    />
                  </span>
                  <span
                    className={cn(
                      "max-w-full truncate text-center text-[11px] leading-tight",
                      active
                        ? "font-bold text-[#0a192f]"
                        : "font-medium text-[#94a3b8]",
                    )}
                  >
                    {label === uk.nav.shopping
                      ? uk.navShort.shopping
                      : label === uk.nav.plan
                        ? uk.navShort.plan
                        : label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
