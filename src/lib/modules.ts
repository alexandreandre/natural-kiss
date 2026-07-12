import type { LucideIcon } from "lucide-react";
import {
  Database,
  Sprout,
  ShieldCheck,
  Inbox,
  ClipboardList,
  Boxes,
  PackageCheck,
  FileCheck2,
  Ship,
  PlaneLanding,
  MapPinned,
  Wallet,
  Users,
  MailCheck,
  LayoutDashboard,
  Bot,
  BellRing,
} from "lucide-react";

import type { FeatureFlag } from "@/lib/feature-flags";
import { isFeatureEnabled } from "@/lib/feature-flags";

/** Les 4 strates de l'architecture (cf. NATURAL_KISS_Plateforme_Architecture §1.1). */
export type Strate = "socle" | "rail_client" | "rail_lot" | "transverse";

export interface ModuleDef {
  /** Identifiant module (M0, M6, T1…). */
  id: string;
  /** Clé i18n : `modules.<key>.title` / `.desc`. */
  key: string;
  strate: Strate;
  icon: LucideIcon;
  /** Brique qui livre ce module (0 = socle déjà livré). */
  brique: number;
  /** Flag qui pilote son activation. */
  flag: FeatureFlag;
  /** Route interne quand le module est actif (sinon non cliquable). */
  href?: string;
  /** Libellé de nav alternatif (clé i18n complète) si le titre module ne convient pas. */
  navLabelKey?: string;
}

export const MODULES: ModuleDef[] = [
  // 🗄️ SOCLE PERMANENT
  {
    id: "M0",
    key: "referentiel",
    strate: "socle",
    icon: Database,
    brique: 0,
    flag: "REFERENTIEL",
  },
  {
    id: "M0b",
    key: "tracabilite_champ",
    strate: "socle",
    icon: Sprout,
    brique: 8,
    flag: "COMPLETUDE",
  },
  {
    id: "M0c",
    key: "coffre_certifs",
    strate: "socle",
    icon: ShieldCheck,
    brique: 7,
    flag: "ONBOARDING",
  },

  // 👤 RAIL CLIENT
  {
    id: "M1",
    key: "demande",
    strate: "rail_client",
    icon: Inbox,
    brique: 7,
    flag: "ONBOARDING",
    href: "/demande",
    navLabelKey: "nav.demande",
  },
  {
    id: "M2",
    key: "onboarding",
    strate: "rail_client",
    icon: Users,
    brique: 7,
    flag: "ONBOARDING",
  },

  // 📦 RAIL LOT
  {
    id: "M3",
    key: "commande_planning",
    strate: "rail_lot",
    icon: ClipboardList,
    brique: 5,
    flag: "DASHBOARD",
    href: "/planning",
    navLabelKey: "nav.planning",
  },
  {
    id: "M4",
    key: "booking",
    strate: "rail_lot",
    icon: Boxes,
    brique: 9,
    flag: "BOOKING",
    href: "/booking",
    navLabelKey: "nav.booking",
  },
  {
    id: "M5",
    key: "chargement",
    strate: "rail_lot",
    icon: PackageCheck,
    brique: 4,
    flag: "PORTAIL",
    href: "/chargement",
    navLabelKey: "nav.chargement",
  },
  {
    id: "M6",
    key: "documents_gate",
    strate: "rail_lot",
    icon: FileCheck2,
    brique: 3,
    flag: "GATE",
    href: "/gate",
    navLabelKey: "nav.gate",
  },
  {
    id: "M7",
    key: "tracking",
    strate: "rail_lot",
    icon: Ship,
    brique: 1,
    flag: "TRACKING",
    href: "/tracking",
  },
  {
    id: "M8",
    key: "arrivee_douane",
    strate: "rail_lot",
    icon: PlaneLanding,
    brique: 8,
    flag: "COMPLETUDE",
  },
  {
    id: "M9",
    key: "qualite_client",
    strate: "rail_lot",
    icon: MapPinned,
    brique: 6,
    flag: "EMAIL_HUB",
    href: "/qualite",
    navLabelKey: "nav.qualite",
  },
  {
    id: "M10",
    key: "finance",
    strate: "rail_lot",
    icon: Wallet,
    brique: 8,
    flag: "COMPLETUDE",
    href: "/finance",
    navLabelKey: "nav.finance",
  },

  // 🔁 TRANSVERSES
  {
    id: "T1",
    key: "portail_client",
    strate: "transverse",
    icon: Users,
    brique: 4,
    flag: "PORTAIL",
    href: "/portail",
    navLabelKey: "nav.portail",
  },
  {
    id: "T2",
    key: "hub_email",
    strate: "transverse",
    icon: MailCheck,
    brique: 6,
    flag: "EMAIL_HUB",
  },
  {
    id: "T3",
    key: "dashboard",
    strate: "transverse",
    icon: LayoutDashboard,
    brique: 5,
    flag: "DASHBOARD",
    href: "/dashboard",
    navLabelKey: "nav.dashboard",
  },
  {
    id: "T4",
    key: "copilot",
    strate: "transverse",
    icon: Bot,
    brique: 8,
    flag: "COMPLETUDE",
    href: "/copilot",
    navLabelKey: "nav.copilot",
  },
  {
    id: "T5",
    key: "alertes",
    strate: "transverse",
    icon: BellRing,
    brique: 8,
    flag: "COMPLETUDE",
    href: "/alertes",
    navLabelKey: "nav.alertes",
  },
];

export const STRATE_ORDER: Strate[] = [
  "socle",
  "rail_client",
  "rail_lot",
  "transverse",
];

export function isModuleEnabled(m: ModuleDef): boolean {
  return isFeatureEnabled(m.flag);
}

export function modulesByStrate(strate: Strate): ModuleDef[] {
  return MODULES.filter((m) => m.strate === strate);
}
