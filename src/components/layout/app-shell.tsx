"use client";

import { ChevronsLeft, Home, Menu, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { MODULES } from "@/lib/modules";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "nk-sidebar-collapsed";
const COLLAPSE_EVENT = "nk-sidebar-change";

function subscribeCollapsed(callback: () => void): () => void {
  window.addEventListener(COLLAPSE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** État "replié" persistant, lu depuis localStorage sans casser l'hydratation. */
function useCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    () => localStorage.getItem(STORAGE_KEY) === "1",
    () => false,
  );
  const toggle = () => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  };
  return [collapsed, toggle];
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroups {
  home: NavItem;
  /** Rail client + rail lot : les étapes séquentielles d'un dossier, dans l'ordre métier. */
  flow: NavItem[];
  /** Modules transverses (portail, dashboard, copilot, alertes) : outils toujours disponibles, hors séquence. */
  tools: NavItem[];
}

function useNavGroups(): NavGroups {
  const t = useTranslations();
  const home: NavItem = { href: "/", label: t("nav.home"), icon: Home };
  const flow: NavItem[] = [];
  const tools: NavItem[] = [];
  for (const m of MODULES) {
    if (!m.href || !isFeatureEnabled(m.flag)) continue;
    const item: NavItem = {
      href: m.href,
      label: m.navLabelKey ? t(m.navLabelKey) : t(`module.${m.key}.title`),
      icon: m.icon,
    };
    (m.strate === "transverse" ? tools : flow).push(item);
  }
  return { home, flow, tools };
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Espacement vertical entre deux items (h-10 + gap-1), pour caler le fil de flux sur les icônes. */
const NAV_ITEM_STRIDE_PX = 44;

function NavList({
  items,
  pathname,
  collapsed,
  onNavigate,
  sectionLabel,
  flow = false,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
  /** Titre de section (masqué en mode replié). */
  sectionLabel?: string;
  /** Trace un fil continu derrière les icônes, signifiant un enchaînement séquentiel. */
  flow?: boolean;
}) {
  if (items.length === 0) return null;

  const showThread = flow && items.length > 1 && !collapsed;
  const threadHeight = (items.length - 1) * NAV_ITEM_STRIDE_PX;

  return (
    <div className="px-3 py-2">
      {sectionLabel && !collapsed && (
        <p className="text-muted-foreground/70 mb-1.5 px-3 text-[0.65rem] font-semibold tracking-[0.08em] uppercase">
          {sectionLabel}
        </p>
      )}
      <nav className="relative flex flex-col gap-1">
        {showThread && (
          <span
            aria-hidden
            className="bg-primary/55 absolute top-5 left-5 w-[2px] rounded-full"
            style={{ height: threadHeight }}
          />
        )}
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed ? "h-10 w-10 justify-center" : "h-10 gap-3 px-3",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {active && (
                <span className="bg-primary absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full" />
              )}
              <Icon
                className={cn(
                  "relative size-[1.15rem] shrink-0",
                  flow && "bg-sidebar rounded-full",
                )}
                strokeWidth={active ? 2 : 1.75}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Rend la navigation complète : accueil, parcours séquentiel du dossier, puis outils transverses. */
function SidebarNav({
  groups,
  pathname,
  collapsed,
  onNavigate,
}: {
  groups: NavGroups;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations();
  return (
    <>
      <NavList
        items={[groups.home]}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      <div className="border-border/70 mx-3 my-1 border-t" />
      <NavList
        items={groups.flow}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
        sectionLabel={t("nav.section.flow")}
        flow
      />
      <NavList
        items={groups.tools}
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
        sectionLabel={t("nav.section.tools")}
      />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const groups = useNavGroups();

  const [collapsed, toggleCollapsed] = useCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Le portail client (T1) et les routes d'auth ont leur propre chrome (cf.
  // src/app/portail/layout.tsx) — pas de navigation interne.
  if (
    pathname.startsWith("/portail") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/nouvelle-demande")
  ) {
    return (
      <div className="min-h-full px-5 py-6 sm:px-8 sm:py-8 lg:px-10">{children}</div>
    );
  }

  return (
    <div className="flex min-h-full">
      {/* ── Sidebar desktop (repliable) ──────────────────────────────── */}
      <aside
        className={cn(
          "border-border/70 bg-sidebar sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.5rem]" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center",
            collapsed ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          <Link href="/" aria-label={t("app.name")}>
            <Logo withWordmark={!collapsed} />
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleCollapsed}
              aria-label={t("nav.collapse")}
            >
              <ChevronsLeft className="size-4" />
            </Button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleCollapsed}
              aria-label={t("nav.expand")}
            >
              <Menu className="size-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav groups={groups} pathname={pathname} collapsed={collapsed} />
        </div>

        <div
          className={cn(
            "border-border/70 flex items-center border-t py-3",
            collapsed ? "flex-col gap-1 px-2" : "gap-1 px-4",
          )}
        >
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </aside>

      {/* ── Tiroir mobile ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("nav.close")}
            className="bg-foreground/40 absolute inset-0 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="bg-sidebar border-border/70 absolute inset-y-0 left-0 flex w-64 flex-col border-r shadow-xl">
            <div className="flex h-16 items-center justify-between px-4">
              <Logo />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileOpen(false)}
                aria-label={t("nav.close")}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <SidebarNav
                groups={groups}
                pathname={pathname}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
            <div className="border-border/70 flex items-center gap-1 border-t px-4 py-3">
              <LocaleToggle />
              <ThemeToggle />
            </div>
          </aside>
        </div>
      )}

      {/* ── Colonne de contenu ───────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre du haut — mobile uniquement. */}
        <header className="border-border/70 bg-background/90 sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b px-4 backdrop-blur-sm lg:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              aria-label={t("nav.open")}
            >
              <Menu className="size-5" />
            </Button>
            <Logo />
          </div>
          <div className="flex items-center gap-0.5">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="w-full flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
          {children}
        </main>

        <footer className="border-border/70 border-t">
          <div className="text-muted-foreground flex w-full flex-col gap-2 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
            <span className="text-foreground font-display text-sm font-medium">
              {t("app.name")}
            </span>
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase">
              {t("footer.built")}
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
