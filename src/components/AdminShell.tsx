"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarCheck,
  FaCalendarDays,
  FaChartSimple,
  FaCreditCard,
  FaFolderOpen,
  FaHouse,
  FaRightFromBracket,
  FaUser,
  FaUserGroup,
  FaUsersGear,
} from "react-icons/fa6";

type AdminShellProps = {
  userName: string;
  role: string;
  firmName?: string;
  children: React.ReactNode;
};

type MeResponse = {
  ok?: boolean;
  suggestedRedirect?: string;
  user?: {
    canAccessAdmin?: boolean;
    onboardingStatus?: string;
    role?: string;
    firmId?: string | null;
  } | null;
  firm?: {
    name?: string;
  } | null;
  firmConfig?: {
    moduleDashboard?: boolean;
    moduleClients?: boolean;
    moduleProcesses?: boolean;
    moduleDeadlines?: boolean;
    moduleAppointments?: boolean;
    moduleAvailability?: boolean;
    moduleUsers?: boolean;
    moduleCharges?: boolean;
  } | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  mobile?: boolean;
};

function roleLabel(role: string) {
  if (role === "MASTER") return "Advogado";
  if (role === "SECRETARY") return "Secretário(a)";
  if (role === "SUPERADMIN") return "Super Admin";
  return role;
}

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;

  return pathname === href || pathname.startsWith(href + "/");
}

function DesktopNavItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = isItemActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={[
        "jv-admin-nav-item",
        active ? "jv-admin-nav-item-active" : "",
      ].join(" ")}
    >
      <span className="jv-admin-nav-icon">{item.icon}</span>
      <span className="jv-admin-nav-label">{item.label}</span>
    </Link>
  );
}

function MobileNavItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = isItemActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={[
        "jv-admin-mobile-item",
        active ? "jv-admin-mobile-item-active" : "",
      ].join(" ")}
      title={item.label}
      aria-label={item.label}
    >
      {item.icon}
    </Link>
  );
}

export default function AdminShell({
  userName,
  role,
  firmName,
  children,
}: AdminShellProps) {
  const pathname = usePathname();

  const [loading, setLoading] = useState(false);
  const [resolvedFirmName, setResolvedFirmName] = useState(firmName || "Advocacia");
  const [firmModules, setFirmModules] = useState({
    moduleDashboard: true,
    moduleClients: true,
    moduleProcesses: true,
    moduleDeadlines: true,
    moduleAppointments: true,
    moduleAvailability: true,
    moduleUsers: true,
    moduleCharges: true,
  });

  useEffect(() => {
    let ignore = false;

    async function loadFirm() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as MeResponse | null;

        if (!ignore && response.ok && data?.ok) {
          const canAccessAdmin = data.user?.canAccessAdmin;
          const suggestedRedirect = data.suggestedRedirect || "/";

          if (role !== "SUPERADMIN" && !canAccessAdmin) {
            window.location.href = suggestedRedirect;
            return;
          }

          setResolvedFirmName(data.firm?.name || firmName || "Advocacia");

          if (data.firmConfig) {
            setFirmModules({
              moduleDashboard: data.firmConfig.moduleDashboard ?? true,
              moduleClients: data.firmConfig.moduleClients ?? true,
              moduleProcesses: data.firmConfig.moduleProcesses ?? true,
              moduleDeadlines: data.firmConfig.moduleDeadlines ?? true,
              moduleAppointments: data.firmConfig.moduleAppointments ?? true,
              moduleAvailability: data.firmConfig.moduleAvailability ?? true,
              moduleUsers: data.firmConfig.moduleUsers ?? true,
              moduleCharges: data.firmConfig.moduleCharges ?? true,
            });

            const routeBlocked =
              (pathname === "/admin" && !(data.firmConfig.moduleDashboard ?? true)) ||
              (pathname.startsWith("/admin/clients") && !(data.firmConfig.moduleClients ?? true)) ||
              (pathname.startsWith("/admin/processes") && !(data.firmConfig.moduleProcesses ?? true)) ||
              (pathname.startsWith("/admin/deadlines") && !(data.firmConfig.moduleDeadlines ?? true)) ||
              (pathname.startsWith("/admin/appointments") && !(data.firmConfig.moduleAppointments ?? true)) ||
              (pathname.startsWith("/admin/availability") && !(data.firmConfig.moduleAvailability ?? true)) ||
              (pathname.startsWith("/admin/users") && !(data.firmConfig.moduleUsers ?? true)) ||
              (pathname.startsWith("/admin/charges") && !(data.firmConfig.moduleCharges ?? true));

            if (role !== "SUPERADMIN" && routeBlocked) {
              window.location.href = "/admin";
              return;
            }
          }

          return;
        }

        if (!ignore) {
          window.location.href = "/login";
        }
      } catch {
        if (!ignore) {
          window.location.href = "/login";
        }
      }
    }

    void loadFirm();

    return () => {
      ignore = true;
    };
  }, [firmName, role, pathname]);

  async function logout() {
    if (loading) return;

    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      // segue para login
    }

    window.location.href = "/login";
  }

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      {
        href: "/admin/account",
        label: "Conta",
        icon: <FaUser />,
        mobile: true,
      },
    ];

    if (role === "SUPERADMIN" || firmModules.moduleDashboard) {
      items.push({
        href: "/admin",
        label: "Dashboard",
        icon: <FaHouse />,
        mobile: true,
      });
    }

    if (role === "SUPERADMIN" || firmModules.moduleClients) {
      items.push({
        href: "/admin/clients",
        label: "Clientes",
        icon: <FaUserGroup />,
        mobile: true,
      });
    }

    if (role === "SUPERADMIN" || firmModules.moduleProcesses) {
      items.push({
        href: "/admin/processes",
        label: "Processos",
        icon: <FaFolderOpen />,
        mobile: true,
      });
    }

    if (role === "SUPERADMIN" || firmModules.moduleDeadlines) {
      items.push({
        href: "/admin/deadlines",
        label: "Prazos",
        icon: <FaCalendarDays />,
        mobile: true,
      });
    }

    if (role === "SUPERADMIN" || firmModules.moduleAppointments) {
      items.push({
        href: "/admin/appointments",
        label: "Agendamentos",
        icon: <FaCalendarCheck />,
      });
    }

    if (role === "SUPERADMIN" || firmModules.moduleAvailability) {
      items.push({
        href: "/admin/availability",
        label: "Abertura de agenda",
        icon: <FaCalendarCheck />,
      });
    }

    if (role === "SUPERADMIN" || firmModules.moduleUsers) {
      items.push({
        href: "/admin/users",
        label: "Usuários",
        icon: <FaUsersGear />,
      });
    }

    if (role === "SUPERADMIN" || firmModules.moduleCharges) {
      items.push({
        href: "/admin/charges",
        label: "Cobranças",
        icon: <FaCreditCard />,
      });
    }

    if (role === "SUPERADMIN") {
      items.push({
        href: "/admin/super/site",
        label: "Site público",
        icon: <FaChartSimple />,
      });
    }

    return items;
  }, [firmModules, role]);

  const mobileItems = navItems.filter((item) => item.mobile).slice(0, 5);

  return (
    <div className="jv-admin-shell">
      <style>{`
        .jv-admin-shell {
          min-height: 100vh;
          height: 100vh;
          overflow: hidden;
          color: #f8fafc;
          background:
            radial-gradient(circle at 80% 12%, rgba(124, 58, 237, 0.12), transparent 32%),
            linear-gradient(180deg, #05050a 0%, #090b16 100%);
          font-family: Arial, Helvetica, sans-serif;
        }

        .jv-admin-shell * {
          box-sizing: border-box;
        }

        .jv-admin-layout {
          min-height: 100vh;
          height: 100vh;
          display: grid;
          grid-template-columns: 290px minmax(0, 1fr);
        }

        .jv-admin-sidebar {
          height: 100vh;
          position: sticky;
          top: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(148, 163, 184, 0.14);
          background:
            radial-gradient(circle at top left, rgba(124, 58, 237, 0.08), transparent 38%),
            rgba(6, 7, 13, 0.96);
          backdrop-filter: blur(18px);
          overflow: hidden;
        }

        .jv-admin-brand {
          padding: 28px 20px 22px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        }

        .jv-admin-brand-kicker {
          color: #c084fc;
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.26em;
        }

        .jv-admin-brand-title {
          margin-top: 12px;
          color: #fff;
          font-size: 25px;
          font-weight: 950;
          letter-spacing: -0.05em;
        }

        .jv-admin-firm {
          margin-top: 12px;
          color: #f8fafc;
          font-size: 14px;
          font-weight: 900;
        }

        .jv-admin-user {
          margin-top: 5px;
          color: #a1a1aa;
          font-size: 13px;
          line-height: 1.5;
        }

        .jv-admin-nav {
          flex: 1;
          overflow-y: auto;
          padding: 18px 14px;
          display: grid;
          align-content: start;
          gap: 8px;
          scrollbar-width: thin;
          scrollbar-color: rgba(168, 85, 247, 0.46) rgba(15, 23, 42, 0.40);
        }

        .jv-admin-nav-item {
          min-height: 48px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 0 14px;
          border-radius: 15px;
          color: #e4e4e7;
          text-decoration: none;
          font-size: 14px;
          font-weight: 850;
          border: 1px solid transparent;
          transition: 0.18s ease;
        }

        .jv-admin-nav-item:hover {
          background: rgba(255,255,255,0.045);
          color: white;
        }

        .jv-admin-nav-item-active {
          color: white;
          border-color: rgba(168, 85, 247, 0.40);
          background:
            linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(59, 130, 246, 0.08));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .jv-admin-nav-icon {
          width: 22px;
          display: inline-grid;
          place-items: center;
          color: inherit;
          font-size: 18px;
        }

        .jv-admin-session {
          padding: 14px;
          border-top: 1px solid rgba(148, 163, 184, 0.12);
        }

        .jv-admin-session-card {
          padding: 15px;
          border-radius: 17px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(255,255,255,0.035);
        }

        .jv-admin-session-label {
          color: #71717a;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .jv-admin-session-name {
          margin-top: 10px;
          color: #f8fafc;
          font-size: 14px;
          font-weight: 900;
        }

        .jv-admin-session-role {
          margin-top: 4px;
          color: #a1a1aa;
          font-size: 12px;
        }

        .jv-admin-session-firm {
          margin-top: 8px;
          color: #c084fc;
          font-size: 12px;
          font-weight: 800;
        }

        .jv-admin-logout {
          width: 100%;
          min-height: 44px;
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 15px;
          background: rgba(255,255,255,0.04);
          color: #f8fafc;
          cursor: pointer;
          font-weight: 900;
        }

        .jv-admin-content-wrap {
          min-width: 0;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: rgba(168, 85, 247, 0.46) rgba(15, 23, 42, 0.40);
        }

        .jv-admin-content {
          width: min(100%, 1740px);
          margin: 0 auto;
          padding: 28px 32px;
        }

        .jv-admin-mobile-top,
        .jv-admin-mobile-bottom {
          display: none;
        }

        @media (max-width: 1024px) {
          .jv-admin-shell {
            height: auto;
            min-height: 100vh;
            overflow: visible;
          }

          .jv-admin-layout {
            display: block;
            height: auto;
            min-height: 100vh;
          }

          .jv-admin-sidebar {
            display: none;
          }

          .jv-admin-content-wrap {
            height: auto;
            min-height: 100vh;
            overflow: visible;
            padding-bottom: 92px;
          }

          .jv-admin-content {
            padding: 0 16px 24px;
          }

          .jv-admin-mobile-top {
            position: sticky;
            top: 0;
            z-index: 40;
            min-height: 88px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 18px 18px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.12);
            background: rgba(5, 5, 10, 0.84);
            backdrop-filter: blur(18px);
          }

          .jv-mobile-logo {
            color: #c084fc;
            font-size: 20px;
            font-weight: 950;
            letter-spacing: 0.12em;
          }

          .jv-mobile-user {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .jv-mobile-avatar {
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            color: white;
            font-weight: 950;
            background: linear-gradient(135deg, rgba(124,58,237,0.88), rgba(59,130,246,0.36));
            border: 1px solid rgba(168,85,247,0.35);
          }

          .jv-mobile-user-text {
            text-align: right;
          }

          .jv-mobile-user-name {
            color: #f8fafc;
            font-size: 14px;
            font-weight: 900;
          }

          .jv-mobile-user-firm {
            color: #a1a1aa;
            font-size: 12px;
            margin-top: 3px;
          }

          .jv-admin-mobile-bottom {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 60;
            min-height: 76px;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 4px;
            padding: 8px 16px calc(8px + env(safe-area-inset-bottom));
            border-top: 1px solid rgba(148, 163, 184, 0.13);
            background: rgba(5, 5, 10, 0.88);
            backdrop-filter: blur(20px);
          }

          .jv-admin-mobile-item {
            position: relative;
            min-height: 58px;
            display: grid;
            place-items: center;
            color: #cbd5e1;
            text-decoration: none;
            font-size: 24px;
            border-radius: 18px;
            transition: 0.18s ease;
          }

          .jv-admin-mobile-item-active {
            color: #d8b4fe;
            background: rgba(124, 58, 237, 0.12);
          }

          .jv-admin-mobile-item-active::before {
            content: "";
            position: absolute;
            top: 0;
            width: 34px;
            height: 3px;
            border-radius: 999px;
            background: linear-gradient(90deg, #a855f7, #60a5fa);
          }
        }
      `}</style>

      <div className="jv-admin-mobile-top">
        <div>
          <div className="jv-mobile-logo">JURIDICVAS</div>
        </div>

        <div className="jv-mobile-user">
          <div className="jv-mobile-user-text">
            <div className="jv-mobile-user-name">{resolvedFirmName}</div>
            <div className="jv-mobile-user-firm">{userName}</div>
          </div>

          <div className="jv-mobile-avatar">
            {resolvedFirmName.slice(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="jv-admin-layout">
        <aside className="jv-admin-sidebar">
          <div className="jv-admin-brand">
            <div className="jv-admin-brand-kicker">JuridicVas</div>
            <div className="jv-admin-brand-title">Painel Admin</div>
            <div className="jv-admin-firm">{resolvedFirmName}</div>
            <div className="jv-admin-user">
              {userName} - {roleLabel(role)}
            </div>
          </div>

          <nav className="jv-admin-nav">
            {navItems.map((item) => (
              <DesktopNavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>

          <div className="jv-admin-session">
            <div className="jv-admin-session-card">
              <div className="jv-admin-session-label">Sessão ativa</div>
              <div className="jv-admin-session-name">{userName}</div>
              <div className="jv-admin-session-role">{roleLabel(role)}</div>
              <div className="jv-admin-session-firm">{resolvedFirmName}</div>
            </div>

            <button
              type="button"
              onClick={logout}
              disabled={loading}
              className="jv-admin-logout"
            >
              <FaRightFromBracket />
              {loading ? "Saindo..." : "Sair"}
            </button>
          </div>
        </aside>

        <main className="jv-admin-content-wrap">
          <div className="jv-admin-content">{children}</div>
        </main>
      </div>

      <nav className="jv-admin-mobile-bottom">
        {mobileItems.map((item) => (
          <MobileNavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}