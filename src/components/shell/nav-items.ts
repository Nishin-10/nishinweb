import {
  Briefcase,
  Compass,
  Gamepad2,
  LayoutDashboard,
  Newspaper,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: LayoutDashboard,
    description: "Your day at a glance",
  },
  {
    href: "/jobs",
    label: "Jobs & CV",
    icon: Briefcase,
    description: "Job search and CV optimizer",
  },
  {
    href: "/discover",
    label: "Discover",
    icon: Compass,
    description: "Books, movies and game picks",
  },
  {
    href: "/play",
    label: "Brain & Fun",
    icon: Gamepad2,
    description: "Puzzles, chess and arcade games",
  },
  {
    href: "/news",
    label: "News",
    icon: Newspaper,
    description: "Daily tech and AI briefing",
  },
  {
    href: "/tools",
    label: "Tools",
    icon: Wrench,
    description: "Summarizer and document writer",
  },
];
