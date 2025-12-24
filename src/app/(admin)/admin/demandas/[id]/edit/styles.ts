import type { CSSProperties } from "react";

export const badgeBox: CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
    borderRadius: 999, border: "1px solid #e5e7eb", background: "#f9fafb", color: "#111827",
};
export const backLink: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18,
    color: "#2563eb", fontWeight: 800, fontSize: 16, textDecoration: "none",
};
export const gridWrap: CSSProperties = {
    display: "grid", gridTemplateColumns: "1fr", gap: 18,
};
export const card: CSSProperties = {
    background: "#fff", borderRadius: 18, boxShadow: "0 2px 16px #0001", padding: "26px 22px",
};
export const cardTitle: CSSProperties = {
    fontWeight: 900, fontSize: "1.55rem", color: "#023047", marginBottom: 10,
};
export const metaLine: CSSProperties = {
    display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12, color: "#94a3b8", fontSize: 13,
};
export const twoCols: CSSProperties = {
    display: "flex", gap: 14, flexWrap: "wrap",
};
export const label: CSSProperties = {
    fontWeight: 800, fontSize: 15, color: "#2563eb", marginBottom: 7, marginTop: 14, display: "block",
};
export const miniLabel: CSSProperties = {
    fontWeight: 800, fontSize: 12, color: "#64748b", marginBottom: 6, display: "block",
};
export const input: CSSProperties = {
    width: "100%", marginTop: 6, padding: "12px 13px", borderRadius: 10,
    border: "1.5px solid #e5e7eb", fontSize: 16, color: "#023047",
    background: "#f8fafc", fontWeight: 600, outline: "none",
};
export const chipTag: CSSProperties = {
    background: "#fff7ea", color: "#fb8500", fontWeight: 800, padding: "6px 10px",
    borderRadius: 12, border: "1px solid #ffe4c4", display: "inline-flex", alignItems: "center", gap: 8,
};
export const chipClose: CSSProperties = {
    border: "none", background: "transparent", color: "#fb8500", fontWeight: 900, cursor: "pointer",
};
export const primaryBtn: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
    background: "#2563eb", color: "#fff", border: "none", fontWeight: 900, fontSize: "1rem",
    padding: "12px 16px", borderRadius: 12, cursor: "pointer", boxShadow: "0 2px 14px #0001",
};
export const dangerBtn: CSSProperties = { ...primaryBtn, background: "#e11d48" };
export const ghostBtn: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: "#f8fafc", color: "#0f172a", border: "1.5px solid #e5e7eb", fontWeight: 800,
    fontSize: "0.95rem", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
};
export const listBox: CSSProperties = {
    border: "1.5px solid #eaeef4", borderRadius: 14, overflow: "hidden", marginTop: 14,
};
export const listHeader: CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #eef2f7",
};
export const rowItem = (bg: string): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: bg,
});
export const subLine: CSSProperties = {
    fontSize: 12, color: "#64748b", marginTop: 2, whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis",
};
export const subMicro: CSSProperties = {
    fontSize: 11, color: "#94a3b8", marginTop: 2, whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis",
};
export const hintText: CSSProperties = {
    fontSize: 11, color: "#94a3b8", marginTop: 6,
};
export const centerBox: CSSProperties = {
    minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb",
};
export const emptyBox: CSSProperties = {
    background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: 12, padding: 16, color: "#475569",
};
export const tableHeader: CSSProperties = {
    display: "flex", gap: 12, padding: "10px 12px", background: "#f8fafc",
    border: "1px solid #eef2f7", borderRadius: 12, fontSize: 12, color: "#475569", fontWeight: 900,
};
export const tableRow: CSSProperties = {
    display: "flex", gap: 12, padding: "12px 12px", background: "#fff",
    border: "1px solid #e5e7eb", borderRadius: 12, alignItems: "center",
};
export const avatarBox: CSSProperties = {
    width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900,
};
export const miniBtnGreen: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, background: "#16a34a", color: "#fff",
    border: "1px solid #16a34a", fontWeight: 800, fontSize: 12, padding: "8px 10px",
    borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #16a34a22",
};
export const miniBtnYellow: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, background: "#f59e0b", color: "#fff",
    border: "1px solid #f59e0b", fontWeight: 800, fontSize: 12, padding: "8px 10px",
    borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #f59e0b22",
};
export const miniBtnBlue: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, background: "#2563eb", color: "#fff",
    border: "1px solid #2563eb", fontWeight: 800, fontSize: 12, padding: "8px 10px",
    borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #2563eb22",
};
export const miniBtnOrange: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, background: "#fb923c", color: "#fff",
    border: "1px solid #fb923c", fontWeight: 800, fontSize: 12, padding: "8px 10px",
    borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #fb923c22",
};
export const miniBtnGray: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, background: "#475569", color: "#fff",
    border: "1px solid #475569", fontWeight: 800, fontSize: 12, padding: "8px 10px",
    borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #47556922",
};
export const miniBtnRed: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, background: "#e11d48", color: "#fff",
    border: "1px solid #e11d48", fontWeight: 800, fontSize: 12, padding: "8px 10px",
    borderRadius: 9, cursor: "pointer", boxShadow: "0 2px 10px #e11d4822",
};
export const chip = (bg: string, fg: string): CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px",
    borderRadius: 999, background: bg, color: fg, border: "1px solid #e5e7eb",
    fontSize: 12, fontWeight: 800, lineHeight: 1.2,
});
export const infoRow: CSSProperties = {
    fontSize: 14, color: "#334155",
};
export const modalBackdrop: CSSProperties = {
    position: "fixed", inset: 0, background: "#0f172a66", display: "flex",
    alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50,
};
export const modalCard: CSSProperties = {
    width: "min(920px, 96vw)", background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb",
    padding: 16, boxShadow: "0 10px 30px #00000022",
};