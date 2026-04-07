"use client";

import { ReactNode, useEffect } from "react";

type PremiumModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

function getWidth(size: "sm" | "md" | "lg") {
  if (size === "sm") return "420px";
  if (size === "lg") return "880px";
  return "640px";
}

export default function PremiumModal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  size = "md",
}: PremiumModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="jv-fade-in"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(2, 6, 23, 0.62)",
        backdropFilter: "blur(10px)",
      }}
      onClick={onClose}
    >
      <div
        className="jv-rise-in"
        style={{
          width: "100%",
          maxWidth: getWidth(size),
          borderRadius: 28,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(17,24,39,0.94))",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.45)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "relative",
            padding: "22px 24px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.14), rgba(56,189,248,0.06) 45%, transparent 85%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -25,
              right: -20,
              width: 110,
              height: 110,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,58,237,0.25), transparent 68%)",
              filter: "blur(10px)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "#F8FAFC",
              }}
            >
              {title}
            </div>

            {description ? (
              <div
                style={{
                  marginTop: 8,
                  color: "#94A3B8",
                  fontSize: 14,
                  lineHeight: 1.7,
                  maxWidth: 560,
                }}
              >
                {description}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            padding: 24,
            color: "#E2E8F0",
          }}
        >
          {children}
        </div>

        {footer ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: 20,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
