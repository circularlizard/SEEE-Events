import type { AppKey } from "@/types/app";

type RouteMatcher = {
  app: AppKey;
  match: (pathname: string) => boolean;
};

type UserRole = 'admin' | 'standard' | 'readonly';

type RoleMatcher = {
  role: UserRole;
  match: (pathname: string) => boolean;
};

const normalizePath = (pathname: string): string => {
  if (!pathname) return "/";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

const startsWith = (prefix: string) => {
  const normalizedPrefix = normalizePath(prefix);
  return (pathname: string) =>
    pathname === normalizedPrefix || pathname.startsWith(`${normalizedPrefix}/`);
};

const routeMatchers: RouteMatcher[] = [
  {
    app: "platform-admin",
    match: (pathname) =>
      startsWith("/dashboard/admin")(pathname) ||
      startsWith("/dashboard/api-browser")(pathname) ||
      startsWith("/dashboard/debug")(pathname) ||
      startsWith("/dashboard/platform")(pathname),
  },
  {
    app: "data-quality",
    match: (pathname) => startsWith("/dashboard/members/issues")(pathname),
  },
  {
    app: "multi",
    match: (pathname) =>
      startsWith("/dashboard/members")(pathname) ||
      startsWith("/dashboard/section-picker")(pathname),
  },
  {
    app: "planning",
    match: (pathname) =>
      startsWith("/dashboard/planning")(pathname) || startsWith("/dashboard/people")(pathname),
  },
  {
    app: "expedition",
    match: (pathname) =>
      pathname === "/dashboard" ||
      startsWith("/dashboard/events")(pathname),
  },
];

const roleMatchers: RoleMatcher[] = [
  {
    role: 'admin',
    match: (pathname) =>
      startsWith('/dashboard/admin')(pathname) ||
      startsWith('/dashboard/api-browser')(pathname) ||
      startsWith('/dashboard/debug')(pathname) ||
      startsWith('/dashboard/platform')(pathname) ||
      startsWith('/dashboard/members')(pathname),
  },
];

const DEFAULT_APP_PATH: Record<AppKey, string> = {
  expedition: "/dashboard",
  multi: "/dashboard/members",
  "platform-admin": "/dashboard/admin",
  planning: "/dashboard/planning",
  "data-quality": "/dashboard/members/issues",
};

export function getRequiredAppForPath(pathname: string): AppKey | null {
  const normalized = normalizePath(pathname);
  for (const matcher of routeMatchers) {
    if (matcher.match(normalized)) {
      return matcher.app;
    }
  }
  return null;
}

export function isPathAllowedForApp(pathname: string, app: AppKey | null): boolean {
  const required = getRequiredAppForPath(pathname);
  if (!required || !app) return true;
  return required === app;
}

export function getRequiredRoleForPath(pathname: string): UserRole | null {
  const normalized = normalizePath(pathname);
  for (const matcher of roleMatchers) {
    if (matcher.match(normalized)) {
      return matcher.role;
    }
  }
  return null;
}

const ROLE_RANK: Record<UserRole, number> = {
  readonly: 0,
  standard: 1,
  admin: 2,
};

export function isRoleAllowed(required: UserRole | null, actual: UserRole | null): boolean {
  if (!required) return true;
  if (!actual) return false;
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export function getDefaultPathForApp(app: AppKey): string {
  return DEFAULT_APP_PATH[app] ?? "/dashboard";
}
