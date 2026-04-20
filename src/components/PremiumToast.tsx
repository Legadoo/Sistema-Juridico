"use client";

import { useEffect } from "react";

type PremiumToastProps = {
  open: boolean;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  onClose: () => void;
  duration?: number;
};

function getStyles(type: "success" | "error" | "warning" | "info") {
  if (type === "success") {
    return {
      border: "1px solid rgba(16,185,129,0.30)",
      background: "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(15,23,42,0.95))",
      color: "#D1FAE5",
      dot: "#10B981",
    };
  }

  if (type === "error") {
    return {
      border: "1px solid rgba(239,68,68,0.30)",
      background: "linear-gradient(135deg, rgba(239,68,68,0.16), rgba(15,23,42,0.95))",
      color: "#FECACA",
      dot: "#EF4444",
    };
  }

  if (type === "warning") {
    return {
      border: "1px solid rgba(245,158,11,0.30)",
      background: "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(15,23,42,0.95))",
      color: "#FDE68A",
      dot: "#F59E0B",
    };
  }

  return {
    border: "1px solid rgba(56,189,248,0.30)",
    background: "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(15,23,42,0.95))",
    color: "#BAE6FD",
    dot: "#38BDF8",
  };
}

export default function PremiumToast({
  open,
  message,
  type = "info",
  onClose,
  duration = 2800,
}: PremiumToastProps) {
  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      onClose();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  const styles = getStyles(type);

  return (
    <div
      className="jv-rise-in"
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 1100,
        width: "min(92vw, 420px)",
        borderRadius: 18,
        padding: "14px 16px",
        border: styles.border,
        background: styles.background,
        backdropFilter: "blur(14px)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.30)",
        color: styles.color,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: styles.dot,
            marginTop: 6,
            boxShadow: `0 0 14px ${styles.dot}`,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, lineHeight: 1.6, fontSize: 14, fontWeight: 600 }}>
          {message}
        </div>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: "#94A3B8",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
