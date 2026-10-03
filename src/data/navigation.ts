export interface NavItem {
  label: string;
  /** In-page anchor on the home page. */
  href: string;
  /** Shown in the header; every item is reachable from the command palette. */
  primary: boolean;
}

export const navigation: NavItem[] = [
  { label: "Principles", href: "/#principles", primary: false },
  { label: "Stack", href: "/#stack", primary: false },
  { label: "Projects", href: "/#projects", primary: true },
  { label: "GitHub", href: "/#github", primary: true },
  { label: "Incident", href: "/#incident", primary: true },
  { label: "Architecture", href: "/#architecture", primary: true },
  { label: "Status", href: "/#status", primary: false },
  { label: "Experience", href: "/#experience", primary: true },
  { label: "Credentials", href: "/#credentials", primary: false },
  { label: "Writing", href: "/#writing", primary: true },
  { label: "Contact", href: "/#contact", primary: true },
];

export const primaryNavigation = navigation.filter((item) => item.primary);
