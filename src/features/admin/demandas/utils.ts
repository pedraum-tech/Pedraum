import { Timestamp } from "firebase/firestore";

export type StatusCode = "pending" | "approved" | "in_progress" | "rejected" | "closed";

export const STATUS_META: Record<
    StatusCode,
    { label: string; color: string; bg: string; next: StatusCode }
> = {
    pending: {
        label: "Em curadoria",
        color: "#92400e",
        bg: "#fffbeb",
        next: "approved",
    },
    approved: {
        label: "Aprovada",
        color: "#059669",
        bg: "#e7faec",
        next: "in_progress",
    },
    in_progress: {
        label: "Em andamento",
        color: "#2563eb",
        bg: "#eff6ff",
        next: "closed",
    },
    closed: {
        label: "Encerrada",
        color: "#334155",
        bg: "#f1f5f9",
        next: "pending",
    },
    rejected: {
        label: "Rejeitada",
        color: "#b91c1c",
        bg: "#fef2f2",
        next: "pending",
    },
};

export function toDate(ts?: any): Date | null {
    if (!ts) return null;
    if (typeof ts?.toDate === "function") return ts.toDate();
    if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(ts?: any) {
    const d = toDate(ts);
    if (!d) return "—";
    return d.toLocaleDateString("pt-BR");
}

export function currency(n?: number) {
    return typeof n === "number"
        ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "—";
}