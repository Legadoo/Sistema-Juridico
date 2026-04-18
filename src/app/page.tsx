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
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    active?: boolean;
    firmId?: string | null;
  };
};

const fallbackConfig: LandingConfig = {
  brandName: "JURIDICVAS",
  heroTitle: "Gestão jurídica premium para escritórios que querem crescer com organização.",
  heroSubtitle:
    "Centralize clientes, processos, prazos, agendamentos e cobranças em uma plataforma moderna, profissional e acessível.",
  heroPrimaryButtonText: "Entrar",
  heroSecondaryButtonText: "Acompanhar",
  aboutTitle: "Sobre o sistema",
  aboutText:
    "O JURIDICVAS foi criado para profissionalizar a operação jurídica com mais controle, imagem profissional e praticidade no dia a dia.",
  featuresTitle: "Funcionalidades",
  featuresSubtitle: "Tudo o que seu escritório precisa para operar com segurança e organização.",
  mediaTitle: "Veja o sistema em ação",
  mediaSubtitle: "Apresente telas, GIFs e demonstrações do produto em uma experiência premium.",
  plansTitle: "Planos",
  plansSubtitle: "Escolha o plano ideal para o seu momento.",
  updatesTitle: "Atualizações",
  updatesSubtitle: "Acompanhe novidades, melhorias e lançamentos do sistema.",
  ctaTitle: "Pronto para elevar o nível da sua operação jurídica?",
  ctaSubtitle:
    "Entre agora ou acompanhe seu processo em um ambiente moderno, seguro e profissional.",
  footerText: "JURIDICVAS - Plataforma jurídica premium.",
  loginUrl: "/login",
  trackUrl: "/acompanhar",
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

  useEffect(() => {
    function updateViewport() {
      setViewportWidth(window.innerWidth);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (viewportWidth >= 640) {
      setMobileMenuOpen(false);
    }
  }, [viewportWidth]);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as MeResponse | null;

        if (!ignore && response.ok && data?.ok && data.user) {
          setSessionUser(data.user);
        }
      } catch {
        // sem sessão, segue normal
      }
    }

    void loadSession();

    return () => {
      ignore = true;
    };
  }, []);

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

  const officeHref = sessionUser?.role === "SUPERADMIN" ? "/admin/super" : "/admin";
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
  const sectionPadding = isMobile ? "44px 14px" : isTablet ? "68px 24px" : "92px 40px";
  const headerPadding = isMobile ? "12px 14px" : "16px 24px";
  const heroTitleSize = isMobile ? 28 : isTablet ? 44 : 64;
  const heroSubtitleSize = isMobile ? 14 : 17;
  const sectionTitleSize = isMobile ? 24 : 36;
  const sectionTextSize = isMobile ? 14 : 15;

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(79,70,229,0.22), transparent 20%), linear-gradient(180deg, #04060c 0%, #090d16 36%, #05070b 100%)",
        color: "#F8FAFC",
      }}
    >
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
                Plataforma jurídica premium
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
                  gridTemplateColumns: "auto auto",
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

                <a
                  href={officeHref}
                  className="jv-premium-btn"
                  style={{
                    textDecoration: "none",
                    textAlign: "center",
                  }}
                >
                  {officeLabel}
                </a>
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
              padding: "0 14px 14px",
            }}
          >
            <div
              className="jv-premium-card"
              style={{
                borderRadius: 20,
                padding: 14,
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
                      padding: "10px 12px",
                      borderRadius: 14,
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
            padding: isMobile ? "28px 14px 44px" : sectionPadding,
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
                SISTEMA · {site.config.brandName}
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
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <a
                  href={officeHref}
                  className="jv-premium-btn"
                  style={{
                    textDecoration: "none",
                    textAlign: "center",
                    width: "100%",
                    padding: isMobile ? "12px 10px" : undefined,
                    fontSize: isMobile ? 13 : undefined,
                  }}
                >
                  {sessionUser ? "Escritório" : site.config.heroPrimaryButtonText || "Entrar"}
                </a>

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
                      padding: isMobile ? 14 : 16,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{title}</div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: isMobile ? 18 : 20,
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
                        height: isMobile ? 220 : isTablet ? 320 : 420,
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
                        height: isMobile ? 220 : isTablet ? 320 : 420,
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
                      minHeight: isMobile ? 220 : 380,
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
                        Cadastre uma mídia na seção hero do site público.
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
                  : "repeat(3, minmax(0, 1fr))",
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
                  : "repeat(3, minmax(0, 1fr))",
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
                      borderRadius: 22,
                      padding: isMobile ? 18 : 20,
                      display: "grid",
                      gap: 14,
                      border: item.isHighlighted
                        ? "1px solid rgba(99,102,241,0.38)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
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
                          fontSize: isMobile ? 20 : 22,
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

                    <div>
                      <div
                        style={{
                          fontSize: isMobile ? 28 : 32,
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
                            marginLeft: 4,
                          }}
                        >
                          {item.billingPeriod}
                        </span>
                      </div>

                      <div
                        style={{
                          color: "#94A3B8",
                          lineHeight: 1.7,
                          marginTop: 8,
                          fontSize: isMobile ? 13 : 14,
                        }}
                      >
                        {item.description || "Plano ideal para operação jurídica profissional."}
                      </div>
                    </div>

                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        color: "#CBD5E1",
                        lineHeight: 1.8,
                        fontSize: isMobile ? 13 : 14,
                      }}
                    >
                      {item.featuresText}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <a
                        href={officeHref}
                        className="jv-premium-btn"
                        style={{
                          textDecoration: "none",
                          textAlign: "center",
                          width: "100%",
                          padding: isMobile ? "11px 8px" : undefined,
                          fontSize: isMobile ? 13 : undefined,
                        }}
                      >
                        {sessionUser ? "Escritório" : "Entrar"}
                      </a>

                      <a
                        href="#atualizacoes"
                        className="jv-premium-btn-secondary"
                        style={{
                          textDecoration: "none",
                          textAlign: "center",
                          width: "100%",
                          padding: isMobile ? "11px 8px" : undefined,
                          fontSize: isMobile ? 13 : undefined,
                        }}
                      >
                        Novidades
                      </a>
                    </div>
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
                        fontSize: isMobile ? 18 : 20,
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
              <a
                href={officeHref}
                className="jv-premium-btn"
                style={{
                  textDecoration: "none",
                  textAlign: "center",
                  width: "100%",
                  padding: isMobile ? "12px 8px" : undefined,
                  fontSize: isMobile ? 13 : undefined,
                }}
              >
                {sessionUser ? "Escritório" : site.config.heroPrimaryButtonText || "Entrar"}
              </a>

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
            {site.config.brandName} · Dark Premium Experience
          </div>
        </div>
      </footer>
    </div>
  );
}