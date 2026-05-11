"use client";

import { useEffect, useMemo, useState } from "react";

type LandingConfig = {
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryButtonText: string;
  heroSecondaryButtonText: string;
  aboutTitle: string;
  aboutText: string;
  featuresTitle: string;
  featuresSubtitle: string;
  mediaTitle: string;
  mediaSubtitle: string;
  plansTitle: string;
  plansSubtitle: string;
  updatesTitle: string;
  updatesSubtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  footerText: string;
  loginUrl: string;
  trackUrl: string;
  isPublished: boolean;
};

type LandingFeature = {
  id: string;
  title: string;
  description: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
};

type LandingMedia = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  url: string;
  alt?: string | null;
  section: string;
  sortOrder: number;
  isActive: boolean;
};

type PublicPlan = {
  id: string;
  name: string;
  priceLabel: string;
  billingPeriod: string;
  description?: string | null;
  featuresText: string;
  badgeText?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  ctaText: string;
  isPurchasable: boolean;
  isHighlighted: boolean;
  sortOrder: number;
  isActive: boolean;
};

type PublicUpdatePost = {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string;
  isPublished: boolean;
  isHighlighted: boolean;
};

type PublicSiteData = {
  config: LandingConfig;
  features: LandingFeature[];
  media: LandingMedia[];
  plans: PublicPlan[];
  updates: PublicUpdatePost[];
};

type PublicSiteResponse = {
  ok?: boolean;
  data?: PublicSiteData;
  message?: string;
};

type MeResponse = {
  ok?: boolean;
  suggestedRedirect?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    active?: boolean;
    firmId?: string | null;
    onboardingStatus?: string;
    canAccessAdmin?: boolean;
  };
};

const fallbackConfig: LandingConfig = {
  brandName: "JURIDICVAS",

  heroTitle: "Gestão jurídica inteligente para escritórios modernos",
  heroSubtitle: "Organize processos, clientes e tarefas em um único sistema simples e poderoso.",

  heroPrimaryButtonText: "Começar agora",
  heroSecondaryButtonText: "Ver demonstração",

  aboutTitle: "Sobre o JuridicVas",
  aboutText: "O JuridicVas é uma plataforma completa para advogados e escritórios que desejam otimizar sua rotina e aumentar a produtividade.",

  featuresTitle: "Funcionalidades",
  featuresSubtitle: "Tudo que você precisa para gerenciar seu escritório em um só lugar.",

  mediaTitle: "Veja na prática",
  mediaSubtitle: "Explore como o sistema funciona no dia a dia.",

  plansTitle: "Planos",
  plansSubtitle: "Escolha o plano ideal para você ou seu escritório.",

  updatesTitle: "Atualizações",
  updatesSubtitle: "Fique por dentro das novidades do sistema.",

  ctaTitle: "Pronto para transformar sua gestão?",
  ctaSubtitle: "Comece agora e leve seu escritório para o próximo nível.",

  footerText: "© 2026 JuridicVas. Todos os direitos reservados.",

  loginUrl: "/login",
  trackUrl: "/dashboard",

  isPublished: true,
};

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  if (index < 0) return 0;
  if (index >= length) return 0;
  return index;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [site, setSite] = useState<PublicSiteData>({
    config: fallbackConfig,
    features: [],
    media: [],
    plans: [],
    updates: [],
  });

  const [viewportWidth, setViewportWidth] = useState(1280);
  const [heroIndex, setHeroIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<MeResponse["user"] | null>(null);
  const [sessionSuggestedRedirect, setSessionSuggestedRedirect] = useState("/login");
  const [checkoutLoadingPlanId, setCheckoutLoadingPlanId] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    nextStep?: string;
    subscription?: {
      status?: string;
      checkoutUrl?: string | null;
      plan?: {
        id?: string;
        name?: string;
      } | null;
    } | null;
  } | null>(null);
  const [showPlansModal, setShowPlansModal] = useState(false);

  const floatingWhatsAppUrl =
    "https://wa.me/5521990414735";

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as MeResponse | null;

        if (!ignore && response.ok && data?.ok && data.user) {
          setSessionUser(data.user);
          setSessionSuggestedRedirect(data.suggestedRedirect || "/");
          return;
        }

        if (!ignore) {
          setSessionUser(null);
          setSessionSuggestedRedirect("/login");
        }
      } catch {
        if (!ignore) {
          setSessionUser(null);
          setSessionSuggestedRedirect("/login");
        }
      }
    }

    void loadSession();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadSubscriptionStatus() {
      if (!sessionUser || sessionUser.role === "SUPERADMIN") return;

      try {
        const response = await fetch("/api/public/subscription/status", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!ignore && response.ok && data?.ok) {
          setSubscriptionStatus(data.data ?? null);
        }
      } catch {
        // sem travar home
      }
    }

    void loadSubscriptionStatus();

    return () => {
      ignore = true;
    };
  }, [sessionUser]);

  useEffect(() => {
  if (!sessionUser) return;

  if (sessionUser.role === "SUPERADMIN") {
    setShowPlansModal(false);
    window.location.href = "/admin/super";
    return;
  }

  if (sessionUser.firmId && sessionUser.onboardingStatus === "ACTIVE") {
    setShowPlansModal(false);
    window.location.href = "/admin";
    return;
  }

  if (sessionUser.onboardingStatus === "FIRM_REQUIRED") {
    setShowPlansModal(false);
    window.location.href = "/onboarding/firm";
    return;
  }

  if (sessionUser.onboardingStatus === "PLAN_REQUIRED") {
    setShowPlansModal(true);
    return;
  }

  if (sessionUser.onboardingStatus === "PLAN_PENDING_PAYMENT") {
    setShowPlansModal(true);
    return;
  }

  setShowPlansModal(false);
}, [sessionUser]);

  useEffect(() => {
    let ignore = false;

    async function loadSite() {
      setLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/public/site", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as PublicSiteResponse | null;

        if (!response.ok || !data?.ok || !data.data) {
          if (!ignore) {
            setErrorMessage(data?.message || "Não foi possível carregar a página inicial.");
          }
          return;
        }

        if (!ignore) {
          setSite({
            config: { ...fallbackConfig, ...data.data.config },
            features: Array.isArray(data.data.features) ? data.data.features : [],
            media: Array.isArray(data.data.media) ? data.data.media : [],
            plans: Array.isArray(data.data.plans) ? data.data.plans : [],
            updates: Array.isArray(data.data.updates) ? data.data.updates : [],
          });
        }
      } catch {
        if (!ignore) {
          setErrorMessage("Falha ao carregar o conteúdo público do sistema.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadSite();

    return () => {
      ignore = true;
    };
  }, []);

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;

  const heroMediaList = useMemo(() => {
    return site.media
      .filter((item) => item.section === "hero")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [site.media]);

  const showcaseMedia = useMemo(() => {
    return site.media
      .filter((item) => item.section === "showcase")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 6);
  }, [site.media]);

  const currentHeroMedia = useMemo(() => {
    if (heroMediaList.length === 0) return null;
    return heroMediaList[clampIndex(heroIndex, heroMediaList.length)];
  }, [heroMediaList, heroIndex]);

  useEffect(() => {
    setHeroIndex(0);
  }, [heroMediaList.length]);

  useEffect(() => {
    if (heroMediaList.length <= 1) return;

    const interval = window.setInterval(() => {
      setHeroIndex((prev) => {
        const next = prev + 1;
        return next >= heroMediaList.length ? 0 : next;
      });
    }, 4200);

    return () => {
      window.clearInterval(interval);
    };
  }, [heroMediaList.length]);

  const officeHref = sessionUser ? sessionSuggestedRedirect : "/login";
  const officeLabel = sessionUser ? "Escritório" : "Login";

  const navItems = [
    ["#inicio", "Início"],
    ["#sobre", "Sobre"],
    ["#recursos", "Recursos"],
    ["#midias", "Demonstrações"],
    ["#planos", "Planos"],
    ["#atualizacoes", "Atualizações"],
  ] as const;

  const containerMaxWidth = 1360;
  const sectionPadding = isMobile ? "42px 16px" : isTablet ? "68px 24px" : "92px 40px";
  const headerPadding = isMobile ? "12px 16px" : "16px 24px";
  const heroTitleSize = isMobile ? 34 : isTablet ? 44 : 64;
  const heroSubtitleSize = isMobile ? 15 : 17;
  const sectionTitleSize = isMobile ? 28 : 36;
  const sectionTextSize = isMobile ? 15 : 15;

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <h2
        style={{
          margin: 0,
          fontSize: sectionTitleSize,
          fontWeight: 950,
          letterSpacing: "-0.05em",
          lineHeight: 1.02,
        }}
      >
        {children}
      </h2>
    );
  }

  function SectionText({ children }: { children: React.ReactNode }) {
    return (
      <p
        style={{
          margin: "10px 0 0",
          color: "#94A3B8",
          lineHeight: 1.8,
          fontSize: sectionTextSize,
        }}
      >
        {children}
      </p>
    );
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  async function startPlanCheckout(planId: string) {
    if (!sessionUser) {
      window.location.href = "/login";
      return;
    }

    setCheckoutMessage("");
    setCheckoutLoadingPlanId(planId);

    try {
      const response = await fetch("/api/public/checkout/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setCheckoutMessage(data?.message || "Não foi possível iniciar a assinatura.");
        return;
      }

      const checkoutUrl = data?.data?.checkoutUrl;
      if (!checkoutUrl) {
        setCheckoutMessage("Checkout não disponível.");
        return;
      }

      window.location.href = checkoutUrl;
    } catch {
      setCheckoutMessage("Falha ao iniciar checkout do plano.");
    } finally {
      setCheckoutLoadingPlanId(null);
    }
  }

  async function handlePublicLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/";
    }
  }

  function handlePrimaryOfficeAction() {
    if (!sessionUser) {
      window.location.href = "/login";
      return;
    }

    if (sessionUser.role === "SUPERADMIN") {
      window.location.href = "/admin/super";
      return;
    }

    if (sessionUser.onboardingStatus === "ACTIVE" && sessionUser.firmId) {
      window.location.href = "/admin";
      return;
    }

    if (sessionUser.onboardingStatus === "FIRM_REQUIRED") {
      window.location.href = "/onboarding/firm";
      return;
    }

    if (
      sessionUser.onboardingStatus === "PLAN_PENDING_PAYMENT" &&
      subscriptionStatus?.subscription?.status === "PENDING" &&
      subscriptionStatus?.subscription?.checkoutUrl
    ) {
      window.location.href = subscriptionStatus.subscription.checkoutUrl;
      return;
    }

    if (
      sessionUser.onboardingStatus === "PLAN_REQUIRED" ||
      sessionUser.onboardingStatus === "PLAN_PENDING_PAYMENT"
    ) {
      setShowPlansModal(true);
      return;
    }

    setShowPlansModal(true);
  }

  return (
    <div
      className="jv-public-home-layout"
      style={{
        minHeight: "100vh", overflowX: "hidden", background:
          "radial-gradient(circle at top, rgba(79,70,229,0.22), transparent 20%), linear-gradient(180deg, #04060c 0%, #090d16 36%, #05070b 100%)",
        color: "#F8FAFC",
      }}
    >
      {/* PUBLIC_HOME_DESKTOP_FIX_START */}
      <style>{`
        .jv-public-home-layout {
          overflow-x: hidden;
        }

        .jv-public-home-layout * {
          box-sizing: border-box;
        }

        @media (min-width: 1024px) {
          .jv-public-home-layout main > section {
            max-width: 1360px !important;
            margin-left: auto !important;
            margin-right: auto !important;
            padding-left: 48px !important;
            padding-right: 48px !important;
          }

          .jv-public-home-layout #inicio {
            padding-top: 92px !important;
            padding-bottom: 92px !important;
          }

          .jv-public-home-layout #inicio > div {
            display: grid !important;
            grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr) !important;
            gap: 58px !important;
            align-items: center !important;
            text-align: left !important;
          }

          .jv-public-home-layout #inicio > div > div:first-child {
            text-align: left !important;
            align-items: start !important;
            justify-items: start !important;
            max-width: 760px !important;
          }

          .jv-public-home-layout #inicio h1 {
            text-align: left !important;
            font-size: 66px !important;
            line-height: 0.98 !important;
            letter-spacing: -0.06em !important;
            max-width: 760px !important;
          }

          .jv-public-home-layout #inicio p {
            text-align: left !important;
            font-size: 18px !important;
            line-height: 1.75 !important;
            max-width: 690px !important;
          }

          .jv-public-home-layout #inicio [style*="display: inline-flex"] {
            justify-self: start !important;
          }

          .jv-public-home-layout #inicio [style*="grid-template-columns: 1fr 1fr 1fr"],
          .jv-public-home-layout #inicio [style*="repeat(3"] {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }

          .jv-public-home-layout #inicio a.jv-premium-btn,
          .jv-public-home-layout #inicio a.jv-premium-btn-secondary,
          .jv-public-home-layout #inicio button.jv-premium-btn,
          .jv-public-home-layout #inicio button.jv-premium-btn-secondary {
            width: 100% !important;
            min-height: 48px !important;
            justify-content: center !important;
          }

          .jv-public-home-layout #inicio .jv-premium-card {
            text-align: left !important;
          }

          .jv-public-home-layout #inicio img,
          .jv-public-home-layout #inicio video {
            width: 100% !important;
            height: 420px !important;
            object-fit: cover !important;
          }

          .jv-public-home-layout h2 {
            font-size: 38px !important;
            line-height: 1.05 !important;
            letter-spacing: -0.05em !important;
          }

          .jv-public-home-layout nav {
            justify-content: center !important;
          }

          .jv-public-home-layout header > div {
            max-width: 1360px !important;
          }
        }

        @media (max-width: 640px) {
          .jv-public-home-layout {
            width: 100% !important;
            overflow-x: hidden !important;
          }

          .jv-public-home-layout main {
            width: 100% !important;
            overflow-x: hidden !important;
          }

          .jv-public-home-layout main > section {
            width: 100% !important;
            max-width: 100% !important;
            padding-left: 16px !important;
            padding-right: 16px !important;
          }

          .jv-public-home-layout #inicio {
            padding-top: 32px !important;
            padding-bottom: 40px !important;
          }

          .jv-public-home-layout #inicio > div {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 22px !important;
            align-items: start !important;
          }

          .jv-public-home-layout [style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          .jv-public-home-layout [style*="repeat(2"] {
            grid-template-columns: 1fr !important;
          }

          .jv-public-home-layout [style*="repeat(3"] {
            grid-template-columns: 1fr !important;
          }

          .jv-public-home-layout [style*="minmax"] {
            grid-template-columns: 1fr !important;
          }

          .jv-public-home-layout h1 {
            font-size: 31px !important;
            line-height: 1.08 !important;
            letter-spacing: -0.035em !important;
            max-width: 100% !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            text-wrap: balance !important;
          }

          .jv-public-home-layout h2 {
            font-size: 26px !important;
            line-height: 1.12 !important;
            letter-spacing: -0.035em !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            text-wrap: balance !important;
          }

          .jv-public-home-layout h3 {
            font-size: 18px !important;
            line-height: 1.2 !important;
            overflow-wrap: break-word !important;
          }

          .jv-public-home-layout p {
            font-size: 15px !important;
            line-height: 1.65 !important;
            max-width: 100% !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
          }

          .jv-public-home-layout .jv-premium-card {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            border-radius: 20px !important;
            padding: 16px !important;
          }

          .jv-public-home-layout a.jv-premium-btn,
          .jv-public-home-layout a.jv-premium-btn-secondary,
          .jv-public-home-layout button.jv-premium-btn,
          .jv-public-home-layout button.jv-premium-btn-secondary {
            width: 100% !important;
            min-height: 46px !important;
            display: inline-flex !important;
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
            padding: 12px 14px !important;
            font-size: 14px !important;
            white-space: normal !important;
            line-height: 1.25 !important;
          }

          .jv-public-home-layout img,
          .jv-public-home-layout video {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: 240px !important;
            object-fit: cover !important;
            border-radius: 16px !important;
          }

          .jv-public-home-layout [aria-label="Falar com o suporte pelo WhatsApp"] {
            right: 16px !important;
            bottom: 18px !important;
            width: 56px !important;
            min-width: 56px !important;
            height: 56px !important;
            padding: 0 !important;
            border-radius: 999px !important;
          }

          .jv-public-home-layout [aria-label="Falar com o suporte pelo WhatsApp"] span:last-child {
            display: none !important;
          }
        }

        @media (max-width: 390px) {
          .jv-public-home-layout main > section {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }

          .jv-public-home-layout h1 {
            font-size: 28px !important;
            line-height: 1.1 !important;
          }

          .jv-public-home-layout h2 {
            font-size: 24px !important;
          }

          .jv-public-home-layout p {
            font-size: 14px !important;
          }

          .jv-public-home-layout .jv-premium-card {
            padding: 14px !important;
            border-radius: 18px !important;
          }
        }
      `}</style>
      {/* PUBLIC_HOME_DESKTOP_FIX_END */}
      {isMobile && mobileMenuOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={closeMobileMenu}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(0,0,0,0.72)",
            border: "none",
            padding: 0,
            margin: 0,
          }}
        />
      ) : null}

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 80,
          backdropFilter: "blur(18px)",
          background: "rgba(4,6,12,0.86)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: containerMaxWidth,
            margin: "0 auto",
            padding: headerPadding,
            display: "grid",
            gap: isMobile ? 10 : 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "#A5B4FC",
                  fontWeight: 900,
                }}
              >
                {site.config.brandName}
              </div>
              <div
                style={{
                  color: "#E2E8F0",
                  fontWeight: 700,
                  fontSize: isMobile ? 13 : 15,
                }}
              >
                Plataforma 
              </div>
            </div>

            {isMobile ? (
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setMobileMenuOpen(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.04)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      width: 18,
                      height: 2,
                      borderRadius: 999,
                      background: "#F8FAFC",
                    }}
                  />
                  <span
                    style={{
                      display: "block",
                      width: 18,
                      height: 2,
                      borderRadius: 999,
                      background: "#F8FAFC",
                    }}
                  />
                  <span
                    style={{
                      display: "block",
                      width: 18,
                      height: 2,
                      borderRadius: 999,
                      background: "#F8FAFC",
                    }}
                  />
                </div>
              </button>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: sessionUser ? "auto auto auto" : "auto auto",
                  gap: 8,
                }}
              >
                <a
                  href={site.config.trackUrl || "/acompanhar"}
                  className="jv-premium-btn-secondary"
                  style={{
                    textDecoration: "none",
                    textAlign: "center",
                  }}
                >
                  Acompanhar
                </a>

                {sessionUser ? (
                  <button
                    type="button"
                    className="jv-premium-btn-secondary"
                    onClick={handlePublicLogout}
                    style={{
                      textAlign: "center",
                    }}
                  >
                    Logout
                  </button>
                ) : null}

                <button
                  type="button"
                  className="jv-premium-btn"
                  onClick={handlePrimaryOfficeAction}
                  style={{
                    textAlign: "center",
                  }}
                >
                  {officeLabel}
                </button>
              </div>
            )}
          </div>

          {!isMobile ? (
            <nav
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {navItems.map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  style={{
                    color: "#CBD5E1",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>
          ) : null}
        </div>

        {isMobile && mobileMenuOpen ? (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 81,
              padding: "0 16px 16px",
            }}
          >
            <div
              className="jv-premium-card"
              style={{
                borderRadius: 22, padding: 16,
                display: "grid",
                gap: 12,
                boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <a
                  href={site.config.trackUrl || "/acompanhar"}
                  className="jv-premium-btn-secondary"
                  onClick={closeMobileMenu}
                  style={{
                    textDecoration: "none",
                    textAlign: "center",
                    width: "100%",
                    padding: "11px 12px",
                  }}
                >
                  Acompanhar
                </a>

                <a
                  href={officeHref}
                  className="jv-premium-btn"
                  onClick={closeMobileMenu}
                  style={{
                    textDecoration: "none",
                    textAlign: "center",
                    width: "100%",
                    padding: "11px 12px",
                  }}
                >
                  {officeLabel}
                </a>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 6,
                }}
              >
                {navItems.map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    onClick={closeMobileMenu}
                    style={{
                      textDecoration: "none",
                      color: "#E2E8F0",
                      fontSize: 14,
                      fontWeight: 700,
                      padding: "12px 13px", borderRadius: 16,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section
          id="inicio"
          style={{
            maxWidth: containerMaxWidth,
            margin: "0 auto",
            padding: isMobile ? "34px 16px 42px" : sectionPadding,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) minmax(0,1fr)",
              gap: isMobile ? 22 : 36,
              alignItems: "center",
            }}
          >
            <div style={{ display: "grid", gap: isMobile ? 16 : 18 }}>
              <div
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  alignItems: "center",
                  gap: 8,
                  padding: isMobile ? "7px 10px" : "8px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#C4B5FD",
                  fontSize: 11,
                  letterSpacing: "0.05em",
                  fontWeight: 900,
                }}
              >
                SISTEMA JURÍDICO
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: heroTitleSize,
                  fontWeight: 950,
                  letterSpacing: isMobile ? "-0.05em" : "-0.06em",
                  lineHeight: isMobile ? 1.0 : 0.96,
                  color: "#F8FAFC",
                }}
              >
                {site.config.heroTitle}
              </h1>

              <p
                style={{
                  margin: 0,
                  color: "#94A3B8",
                  fontSize: heroSubtitleSize,
                  lineHeight: 1.8,
                }}
              >
                {site.config.heroSubtitle}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="jv-premium-btn"
                  onClick={handlePrimaryOfficeAction}
                  style={{
                    textAlign: "center",
                    width: "100%",
                    padding: isMobile ? "12px 10px" : undefined,
                    fontSize: isMobile ? 13 : undefined,
                  }}
                >
                  {sessionUser
                    ? sessionUser.onboardingStatus === "FIRM_REQUIRED"
                      ? "Cadastrar advocacia"
                      : sessionUser.onboardingStatus === "PLAN_PENDING_PAYMENT"
                      ? "Continuar pagamento"
                      : "Escritório"
                    : site.config.heroPrimaryButtonText || "Entrar"}
                </button>

                <a
                  href={site.config.trackUrl || "/acompanhar"}
                  className="jv-premium-btn-secondary"
                  style={{
                    textDecoration: "none",
                    textAlign: "center",
                    width: "100%",
                    padding: isMobile ? "12px 10px" : undefined,
                    fontSize: isMobile ? 13 : undefined,
                  }}
                >
                  {site.config.heroSecondaryButtonText || "Acompanhar"}
                </a>

                <a
                  href="/cadastro"
                  className="jv-premium-btn-secondary"
                  style={{
                    textDecoration: "none",
                    textAlign: "center",
                    width: "100%",
                    padding: isMobile ? "12px 10px" : undefined,
                    fontSize: isMobile ? 13 : undefined,
                  }}
                >
                  Criar conta
                </a>

                {sessionUser ? (
                  <button
                    type="button"
                    className="jv-premium-btn-secondary"
                    onClick={handlePublicLogout}
                    style={{
                      textAlign: "center",
                      width: "100%",
                      padding: isMobile ? "12px 10px" : undefined,
                      fontSize: isMobile ? 13 : undefined,
                    }}
                  >
                    Sair
                  </button>
                ) : null}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : isTablet
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {[
                  ["Clientes", "Organização total"],
                  ["Processos", "Fluxo moderno"],
                  ["Cobranças", "Operação premium"],
                ].map(([title, value]) => (
                  <div
                    key={title}
                    className="jv-premium-card"
                    style={{
                      borderRadius: 18,
                      padding: isMobile ? 16 : 16,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{title}</div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: isMobile ? 19 : 20,
                        fontWeight: 900,
                        lineHeight: 1.1,
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div
                className="jv-premium-card"
                style={{
                  borderRadius: isMobile ? 22 : 24,
                  padding: isMobile ? 10 : 16,
                  overflow: "hidden",
                }}
              >
                {currentHeroMedia ? (
                  currentHeroMedia.type === "video" ? (
                    <video
                      src={currentHeroMedia.url}
                      controls
                      style={{
                        width: "100%",
                        height: isMobile ? 190 : isTablet ? 320 : 420,
                        objectFit: "cover",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.08)",
                        display: "block",
                      }}
                    />
                  ) : (
                    <img
                      src={currentHeroMedia.url}
                      alt={currentHeroMedia.alt || currentHeroMedia.title}
                      style={{
                        width: "100%",
                        height: isMobile ? 190 : isTablet ? 320 : 420,
                        objectFit: "cover",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.08)",
                        display: "block",
                      }}
                    />
                  )
                ) : (
                  <div
                    style={{
                      minHeight: isMobile ? 190 : 380,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      textAlign: "center",
                      padding: 20,
                      background:
                        "linear-gradient(135deg, rgba(99,102,241,0.24), rgba(15,23,42,0.84) 45%, rgba(56,189,248,0.12))",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>Demonstração do sistema</div>
                      <div style={{ marginTop: 8, color: "#94A3B8", lineHeight: 1.7 }}>
                        Cadastre uma Conta.
                      </div>
                    </div>
                  </div>
                )}

                {heroMediaList.length > 1 ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 8,
                      marginTop: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    {heroMediaList.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setHeroIndex(index)}
                        style={{
                          width: index === heroIndex ? 20 : 10,
                          height: 10,
                          borderRadius: 999,
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background: index === heroIndex ? "#A5B4FC" : "rgba(255,255,255,0.18)",
                        }}
                      />
                    ))}
                  </div>
                ) : null}

                {currentHeroMedia ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                    <div
                      style={{
                        color: "#F8FAFC",
                        fontWeight: 800,
                        fontSize: isMobile ? 15 : 16,
                      }}
                    >
                      {currentHeroMedia.title}
                    </div>

                    <div
                      style={{
                        color: "#94A3B8",
                        lineHeight: 1.7,
                        fontSize: isMobile ? 13 : 14,
                      }}
                    >
                      {currentHeroMedia.description || "Preview principal do sistema."}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div
              className="jv-premium-card"
              style={{
                marginTop: 18,
                borderRadius: 18,
                padding: 14,
                color: "#FCA5A5",
                lineHeight: 1.7,
                fontSize: isMobile ? 13 : 14,
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <div
              className="jv-premium-card"
              style={{
                marginTop: 18,
                borderRadius: 18,
                padding: 14,
                color: "#94A3B8",
                fontSize: isMobile ? 13 : 14,
              }}
            >
              Carregando a landing pública...
            </div>
          ) : null}

          {checkoutMessage ? (
            <div
              className="jv-premium-card"
              style={{
                marginTop: 18,
                borderRadius: 18,
                padding: 14,
                color: "#FCA5A5",
                fontSize: isMobile ? 13 : 14,
                lineHeight: 1.7,
              }}
            >
              {checkoutMessage}
            </div>
          ) : null}
        </section>

        <section
          id="sobre"
          style={{
            maxWidth: containerMaxWidth,
            margin: "0 auto",
            padding: sectionPadding,
          }}
        >
          <div
            className="jv-premium-card"
            style={{
              borderRadius: 24,
              padding: isMobile ? 18 : 30,
            }}
          >
            <SectionTitle>{site.config.aboutTitle}</SectionTitle>
            <SectionText>{site.config.aboutText}</SectionText>
          </div>
        </section>

        <section
          id="recursos"
          style={{
            maxWidth: containerMaxWidth,
            margin: "0 auto",
            padding: sectionPadding,
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <SectionTitle>{site.config.featuresTitle}</SectionTitle>
              <SectionText>{site.config.featuresSubtitle}</SectionText>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isTablet
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              {site.features.length === 0 ? (
                <div
                  className="jv-premium-card"
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    color: "#94A3B8",
                    gridColumn: "1 / -1",
                  }}
                >
                  Nenhum recurso publicado ainda.
                </div>
              ) : (
                site.features.map((item) => (
                  <div
                    key={item.id}
                    className="jv-premium-card"
                    style={{
                      borderRadius: 20,
                      padding: isMobile ? 16 : 18,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        display: "grid",
                        placeItems: "center",
                        background:
                          "linear-gradient(135deg, rgba(99,102,241,0.24), rgba(124,58,237,0.18))",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#C4B5FD",
                        fontWeight: 900,
                        fontSize: 11,
                        textTransform: "uppercase",
                      }}
                    >
                      {item.icon?.slice(0, 3) || "JV"}
                    </div>

                    <div
                      style={{
                        color: "#F8FAFC",
                        fontSize: isMobile ? 17 : 18,
                        fontWeight: 900,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        color: "#94A3B8",
                        lineHeight: 1.7,
                        fontSize: isMobile ? 13 : 14,
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section
          id="midias"
          style={{
            maxWidth: containerMaxWidth,
            margin: "0 auto",
            padding: sectionPadding,
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <SectionTitle>{site.config.mediaTitle}</SectionTitle>
              <SectionText>{site.config.mediaSubtitle}</SectionText>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isTablet
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 14,
              }}
            >
              {showcaseMedia.length === 0 ? (
                <div
                  className="jv-premium-card"
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    color: "#94A3B8",
                    gridColumn: "1 / -1",
                  }}
                >
                  Nenhuma mídia de showcase publicada ainda.
                </div>
              ) : (
                showcaseMedia.map((item) => (
                  <div
                    key={item.id}
                    className="jv-premium-card"
                    style={{
                      borderRadius: 20,
                      padding: 10,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    {item.type === "video" ? (
                      <video
                        src={item.url}
                        controls
                        style={{
                          width: "100%",
                          height: isMobile ? 220 : 210,
                          objectFit: "cover",
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "block",
                        }}
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt={item.alt || item.title}
                        style={{
                          width: "100%",
                          height: isMobile ? 220 : 210,
                          objectFit: "cover",
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "block",
                        }}
                      />
                    )}

                    <div
                      style={{
                        color: "#F8FAFC",
                        fontWeight: 900,
                        fontSize: isMobile ? 16 : 17,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        color: "#94A3B8",
                        lineHeight: 1.7,
                        fontSize: isMobile ? 13 : 14,
                      }}
                    >
                      {item.description || "Preview visual do produto."}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section
          id="planos"
          style={{
            maxWidth: containerMaxWidth,
            margin: "0 auto",
            padding: sectionPadding,
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <SectionTitle>{site.config.plansTitle}</SectionTitle>
              <SectionText>{site.config.plansSubtitle}</SectionText>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : isTablet
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 14,
              }}
            >
              {site.plans.length === 0 ? (
                <div
                  className="jv-premium-card"
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    color: "#94A3B8",
                    gridColumn: "1 / -1",
                  }}
                >
                  Nenhum plano publicado ainda.
                </div>
              ) : (
                site.plans.map((item) => (
                  <div
                    key={item.id}
                    className="jv-premium-card"
                    style={{
                      borderRadius: 24,
                      padding: isMobile ? 16 : 18,
                      display: "grid",
                      gap: 14,
                      overflow: "hidden",
                      border: item.isHighlighted
                        ? "1px solid rgba(99,102,241,0.42)"
                        : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: item.isHighlighted
                        ? "0 20px 50px rgba(79,70,229,0.16)"
                        : undefined,
                    }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt || item.name}
                        style={{
                          width: "100%",
                          height: isMobile ? 180 : 210,
                          objectFit: "cover",
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: isMobile ? 180 : 210,
                          borderRadius: 16,
                          border: "1px dashed rgba(255,255,255,0.10)",
                          display: "grid",
                          placeItems: "center",
                          textAlign: "center",
                          color: "#64748B",
                          background:
                            "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(15,23,42,0.40))",
                          padding: 16,
                        }}
                      >
                        Prévia do plano
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ display: "grid", gap: 6 }}>
                        <div
                          style={{
                            color: "#F8FAFC",
                            fontSize: isMobile ? 20 : 22,
                            fontWeight: 950,
                            lineHeight: 1.1,
                          }}
                        >
                          {item.name}
                        </div>

                        <div
                          style={{
                            color: "#94A3B8",
                            lineHeight: 1.6,
                            fontSize: isMobile ? 13 : 14,
                          }}
                        >
                          {item.description || "Plano ideal para operação jurídica profissional."}
                        </div>
                      </div>

                      {item.badgeText ? (
                        <div
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: "rgba(99,102,241,0.18)",
                            border: "1px solid rgba(99,102,241,0.24)",
                            color: "#C4B5FD",
                            fontSize: 12,
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.badgeText}
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        padding: "14px 16px",
                        borderRadius: 18,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: isMobile ? 30 : 34,
                          fontWeight: 950,
                          color: "#F8FAFC",
                          lineHeight: 1,
                        }}
                      >
                        {item.priceLabel}
                        <span
                          style={{
                            fontSize: isMobile ? 14 : 15,
                            color: "#94A3B8",
                            fontWeight: 700,
                            marginLeft: 6,
                          }}
                        >
                          {item.billingPeriod}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        color: "#CBD5E1",
                        lineHeight: 1.8,
                        fontSize: isMobile ? 13 : 14,
                        padding: "2px 2px 0",
                      }}
                    >
                      {item.featuresText}
                    </div>

                    <div style={{ marginTop: 2 }}>
                      <button
                        type="button"
                        className="jv-premium-btn"
                        onClick={() => {
                          if (!item.isPurchasable) return;
                          void startPlanCheckout(item.id);
                        }}
                        disabled={!item.isPurchasable || checkoutLoadingPlanId === item.id}
                        style={{
                          width: "100%",
                          padding: isMobile ? "11px 8px" : undefined,
                          fontSize: isMobile ? 13 : undefined,
                          opacity: item.isPurchasable ? 1 : 0.75,
                          cursor: item.isPurchasable ? "pointer" : "not-allowed",
                        }}
                      >
                        {checkoutLoadingPlanId === item.id
                          ? "Abrindo checkout..."
                          : item.ctaText || "Assinar agora"}
                      </button>
                    </div>

                    {!item.isPurchasable ? (
                      <div
                        style={{
                          padding: "12px 13px", borderRadius: 16,
                          background: "rgba(245,158,11,0.10)",
                          border: "1px solid rgba(245,158,11,0.18)",
                          color: "#FCD34D",
                          fontSize: 12,
                          fontWeight: 800,
                          lineHeight: 1.6,
                        }}
                      >
                        Este plano está visível no site, mas ainda não está liberado para compra.
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section
          id="atualizacoes"
          style={{
            maxWidth: containerMaxWidth,
            margin: "0 auto",
            padding: sectionPadding,
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <SectionTitle>{site.config.updatesTitle}</SectionTitle>
              <SectionText>{site.config.updatesSubtitle}</SectionText>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 14,
              }}
            >
              {site.updates.length === 0 ? (
                <div
                  className="jv-premium-card"
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    color: "#94A3B8",
                    gridColumn: "1 / -1",
                  }}
                >
                  Nenhuma atualização pública cadastrada ainda.
                </div>
              ) : (
                site.updates.map((item) => (
                  <div
                    key={item.id}
                    className="jv-premium-card"
                    style={{
                      borderRadius: 20,
                      padding: isMobile ? 16 : 18,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: item.isHighlighted
                            ? "rgba(99,102,241,0.18)"
                            : "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: item.isHighlighted ? "#C4B5FD" : "#CBD5E1",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {item.category}
                      </div>

                      <div
                        style={{
                          color: "#64748B",
                          fontSize: isMobile ? 11 : 12,
                        }}
                      >
                        {item.publishedAt
                          ? new Date(item.publishedAt).toLocaleString("pt-BR")
                          : "Sem data"}
                      </div>
                    </div>

                    <div
                      style={{
                        color: "#F8FAFC",
                        fontSize: isMobile ? 19 : 20,
                        fontWeight: 900,
                        lineHeight: 1.2,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        color: "#94A3B8",
                        lineHeight: 1.75,
                        fontSize: isMobile ? 13 : 14,
                      }}
                    >
                      {item.summary}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section
          id="cta"
          style={{
            maxWidth: containerMaxWidth,
            margin: "0 auto",
            padding: isMobile ? "20px 14px 44px" : sectionPadding,
          }}
        >
          <div
            className="jv-premium-card"
            style={{
              borderRadius: 24,
              padding: isMobile ? 18 : 30,
              display: "grid",
              gap: 14,
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.20), rgba(15,23,42,0.90) 45%, rgba(56,189,248,0.10))",
            }}
          >
            <div>
              <SectionTitle>{site.config.ctaTitle}</SectionTitle>
              <SectionText>{site.config.ctaSubtitle}</SectionText>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                type="button"
                className="jv-premium-btn"
                onClick={handlePrimaryOfficeAction}
                style={{
                  textAlign: "center",
                  width: "100%",
                  padding: isMobile ? "12px 8px" : undefined,
                  fontSize: isMobile ? 13 : undefined,
                }}
              >
                {sessionUser
                  ? sessionUser.onboardingStatus === "FIRM_REQUIRED"
                    ? "Cadastrar advocacia"
                    : sessionUser.onboardingStatus === "PLAN_PENDING_PAYMENT"
                    ? "Continuar pagamento"
                    : "Escritório"
                  : site.config.heroPrimaryButtonText || "Entrar"}
              </button>

              <a
                href={site.config.trackUrl || "/acompanhar"}
                className="jv-premium-btn-secondary"
                style={{
                  textDecoration: "none",
                  textAlign: "center",
                  width: "100%",
                  padding: isMobile ? "12px 8px" : undefined,
                  fontSize: isMobile ? 13 : undefined,
                }}
              >
                {site.config.heroSecondaryButtonText || "Acompanhar"}
              </a>
            </div>
          </div>
        </section>
      </main>

      {showPlansModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(2,6,23,0.72)",
            backdropFilter: "blur(10px)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            style={{
              width: "min(1180px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 28,
              padding: 22,
              background:
                "linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.92))",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.38)",
              display: "grid",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <div
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 11px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#C4B5FD",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: "0.05em",
                  }}
                >
                  ESCOLHA SEU PLANO
                </div>

                <div
                  style={{
                    color: "#F8FAFC",
                    fontSize: 32,
                    fontWeight: 950,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.05,
                  }}
                >
                  Ative sua experiência no JuridicVas
                </div>

                <div
                  style={{
                    color: "#94A3B8",
                    fontSize: 14,
                    lineHeight: 1.8,
                    maxWidth: 760,
                  }}
                >
                  Escolha um plano para liberar o seu acesso. Se você iniciou um pagamento,
                  pode continuar exatamente de onde parou.
                </div>
              </div>

              <button
                type="button"
                className="jv-premium-btn-secondary"
                onClick={() => setShowPlansModal(false)}
              >
                Fechar
              </button>
            </div>

            {subscriptionStatus?.nextStep === "WAIT_PAYMENT" &&
            subscriptionStatus?.subscription?.checkoutUrl ? (
              <div
                style={{
                  padding: 14,
                  borderRadius: 18,
                  background: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.18)",
                  color: "#FCD34D",
                  fontSize: 14,
                  lineHeight: 1.7,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div>
                  Você ainda tem um pagamento pendente.
                </div>

                <button
                  type="button"
                  className="jv-premium-btn"
                  onClick={() => {
                    const url = subscriptionStatus?.subscription?.checkoutUrl;
                    if (url) window.location.href = url;
                  }}
                  style={{ width: "fit-content" }}
                >
                  Continuar pagamento pendente
                </button>
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  viewportWidth < 640
                    ? "1fr"
                    : viewportWidth < 1024
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 14,
              }}
            >
              {site.plans.length === 0 ? (
                <div
                  className="jv-premium-card"
                  style={{
                    borderRadius: 20,
                    padding: 18,
                    color: "#94A3B8",
                    gridColumn: "1 / -1",
                  }}
                >
                  Nenhum plano disponível no momento.
                </div>
              ) : (
                site.plans.map((item) => (
                  <div
                    key={item.id}
                    className="jv-premium-card"
                    style={{
                      borderRadius: 22,
                      padding: 16,
                      display: "grid",
                      gap: 14,
                      border: item.isHighlighted
                        ? "1px solid rgba(99,102,241,0.42)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt || item.name}
                        style={{
                          width: "100%",
                          height: 190,
                          objectFit: "cover",
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.08)",
                          display: "block",
                        }}
                      />
                    ) : null}

                    <div style={{ display: "grid", gap: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            color: "#F8FAFC",
                            fontSize: 22,
                            fontWeight: 950,
                          }}
                        >
                          {item.name}
                        </div>

                        {item.badgeText ? (
                          <div
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: "rgba(99,102,241,0.18)",
                              border: "1px solid rgba(99,102,241,0.24)",
                              color: "#C4B5FD",
                              fontSize: 12,
                              fontWeight: 900,
                            }}
                          >
                            {item.badgeText}
                          </div>
                        ) : null}
                      </div>

                      <div
                        style={{
                          color: "#C4B5FD",
                          fontSize: 30,
                          fontWeight: 950,
                          lineHeight: 1,
                        }}
                      >
                        {item.priceLabel}
                        <span
                          style={{
                            color: "#94A3B8",
                            fontSize: 14,
                            fontWeight: 700,
                            marginLeft: 6,
                          }}
                        >
                          {item.billingPeriod}
                        </span>
                      </div>

                      <div
                        style={{
                          color: "#94A3B8",
                          lineHeight: 1.7,
                          fontSize: 14,
                        }}
                      >
                        {item.description || "Plano ideal para sua advocacia."}
                      </div>
                    </div>

                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        color: "#CBD5E1",
                        lineHeight: 1.8,
                        fontSize: 14,
                      }}
                    >
                      {item.featuresText}
                    </div>

                    <button
                      type="button"
                      className="jv-premium-btn"
                      disabled={!item.isPurchasable || checkoutLoadingPlanId === item.id}
                      onClick={() => {
                        if (!item.isPurchasable) return;
                        void startPlanCheckout(item.id);
                      }}
                      style={{
                        width: "100%",
                        opacity: item.isPurchasable ? 1 : 0.75,
                        cursor: item.isPurchasable ? "pointer" : "not-allowed",
                      }}
                    >
                      {checkoutLoadingPlanId === item.id
                        ? "Abrindo checkout..."
                        : item.ctaText || "Assinar agora"}
                    </button>

                    {!item.isPurchasable ? (
                      <div
                        style={{
                          padding: "12px 13px", borderRadius: 16,
                          background: "rgba(245,158,11,0.10)",
                          border: "1px solid rgba(245,158,11,0.18)",
                          color: "#FCD34D",
                          fontSize: 12,
                          fontWeight: 800,
                          lineHeight: 1.6,
                        }}
                      >
                        Este plano está visível, mas ainda não está liberado para compra.
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div
          style={{
            maxWidth: containerMaxWidth,
            margin: "0 auto",
            padding: isMobile ? "18px 14px 26px" : "26px 40px",
            display: "grid",
            gap: 6,
            color: "#94A3B8",
            textAlign: isMobile ? "center" : "left",
          }}
        >
          <div style={{ fontSize: isMobile ? 13 : 14 }}>{site.config.footerText}</div>

          <div style={{ color: "#64748B", fontSize: isMobile ? 12 : 13 }}>
            {site.config.brandName} - Dark Premium Experience
          </div>

          <div style={{ marginTop: 6 }}>
            <a
              href="https://wa.me/5521990414735"
              target="_blank"
              style={{
                color: "#22C55E",
                fontSize: isMobile ? 12 : 13,
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Suporte: Fale conosco no WhatsApp
            </a>
          </div>
        </div>
      </footer>

      {/* FLOATING_WHATSAPP_BUTTON_START */}
      <a
        href={floatingWhatsAppUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar com o suporte pelo WhatsApp"
        style={{
          position: "fixed",
          right: isMobile ? 16 : 24,
          bottom: isMobile ? 18 : 24,
          zIndex: 120,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          minWidth: isMobile ? 56 : 190,
          height: isMobile ? 56 : 58,
          padding: isMobile ? "0 16px" : "0 20px",
          borderRadius: 999,
          color: "#ECFDF5",
          textDecoration: "none",
          fontSize: isMobile ? 22 : 14,
          fontWeight: 900,
          letterSpacing: isMobile ? "0" : "-0.01em",
          background:
            "linear-gradient(135deg, rgba(34,197,94,0.96), rgba(22,163,74,0.96))",
          border: "1px solid rgba(187,247,208,0.35)",
          boxShadow:
            "0 18px 45px rgba(22,163,74,0.36), 0 0 0 1px rgba(255,255,255,0.08) inset",
          backdropFilter: "blur(14px)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
          event.currentTarget.style.boxShadow =
            "0 22px 55px rgba(22,163,74,0.46), 0 0 0 1px rgba(255,255,255,0.10) inset";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = "translateY(0) scale(1)";
          event.currentTarget.style.boxShadow =
            "0 18px 45px rgba(22,163,74,0.36), 0 0 0 1px rgba(255,255,255,0.08) inset";
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: isMobile ? 28 : 30,
            height: isMobile ? 28 : 30,
            borderRadius: 999,
            background: "rgba(255,255,255,0.16)",
            fontSize: isMobile ? 20 : 18,
            lineHeight: 1,
          }}
        >
          💬
        </span>

        {!isMobile ? <span>Falar no WhatsApp</span> : null}
      </a>
      {/* FLOATING_WHATSAPP_BUTTON_END */}
    </div>
  );
}



