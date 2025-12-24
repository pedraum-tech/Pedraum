import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { CreditCard, Undo2, LockOpen, Ban, RefreshCw, XCircle, CheckCircle2 } from "lucide-react";
import { Assignment, Usuario } from "../types";
import { toReais, isUserFreeDemand } from "../utils";
import * as S from "../styles";

interface AssignmentRowProps {
    a: Assignment;
    onPago: () => void;
    onPendente: () => void;
    onLiberar: () => void;
    onCancelar: () => void;
    onExcluir: () => void;
    onReativar: () => void;
}

export function AssignmentRow({
    a,
    onPago,
    onPendente,
    onLiberar,
    onCancelar,
    onExcluir,
    onReativar,
}: AssignmentRowProps) {
    const [user, setUser] = useState<Usuario | null>(null);

    useEffect(() => {
        (async () => {
            try {
                let s = await getDoc(doc(db, "usuarios", a.supplierId));
                if (!s.exists()) s = await getDoc(doc(db, "users", a.supplierId));
                if (!s.exists()) s = await getDoc(doc(db, "user", a.supplierId));
                if (s.exists()) setUser({ id: s.id, ...(s.data() as any) });
            } catch { }
        })();
    }, [a.supplierId]);

    const nome = user?.nome || user?.email || `Usuário ${a.supplierId}`;
    const contato = user?.whatsappE164 || user?.whatsapp || user?.telefone || "—";
    const cidadeUf = `${user?.cidade || "—"}/${user?.estado || "—"}`;
    const pago = a.paymentStatus === "paid";

    const stChip =
        a.status === "unlocked"
            ? S.chip("#ecfdf5", "#065f46")
            : a.status === "canceled"
                ? S.chip("#fff1f2", "#9f1239")
                : a.status === "viewed"
                    ? S.chip("#eef2ff", "#3730a3")
                    : S.chip("#f1f5f9", "#111827");

    const payChip = pago
        ? S.chip("#ecfdf5", "#065f46")
        : S.chip("#fff7ed", "#9a3412");

    const isFree = isUserFreeDemand(user || undefined);

    return (
        <div style={S.tableRow}>
            <div style={{ flex: 1.7, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt={nome} style={{ width: 28, height: 28, borderRadius: "50%" }} />
                    ) : (
                        <div style={S.avatarBox}>{(nome || "?").charAt(0).toUpperCase()}</div>
                    )}
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nome}</span>
                    {user?.patrocinador && <span style={S.chip("#fff7ed", "#9a3412")}>Patrocinador</span>}
                    {!user?.patrocinador && isFree && <span style={S.chip("#ecfeff", "#155e75")}>Recebe grátis</span>}
                </div>
                <div style={S.subLine}>{user?.email || "—"} • {contato} • {cidadeUf}</div>
            </div>

            <div style={{ flex: 1 }}>
                <span style={stChip}>
                    {a.status === "unlocked" ? <LockOpen size={12} /> :
                        a.status === "canceled" ? <Ban size={12} /> :
                            <CheckCircle2 size={12} />}
                    {a.status}
                </span>
            </div>

            <div style={{ flex: 0.8 }}>
                <span style={payChip}>
                    <CreditCard size={12} /> {pago ? "pago" : "pendente"}
                </span>
            </div>

            <div style={{ flex: 0.6, textAlign: "right", fontWeight: 900, color: "#0f172a" }}>
                {toReais(a.pricing?.amount)}
            </div>
            <div style={{ flex: 0.6, textAlign: "right", color: "#64748b", fontWeight: 800 }}>
                {a.pricing?.cap != null ? a.pricing.cap : "—"}
            </div>

            <div style={{ flex: 1.6, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                {!pago ? (
                    <button onClick={onPago} style={S.miniBtnGreen}><CreditCard size={14} /> Marcar pago</button>
                ) : (
                    <button onClick={onPendente} style={S.miniBtnYellow}><Undo2 size={14} /> Pendente</button>
                )}
                {a.status !== "unlocked" && a.status !== "canceled" && (
                    <button onClick={onLiberar} style={S.miniBtnBlue}><LockOpen size={14} /> Liberar contato</button>
                )}
                {a.status !== "canceled" && a.status !== "unlocked" && (
                    <button onClick={onCancelar} style={S.miniBtnOrange}><Ban size={14} /> Cancelar envio</button>
                )}
                {a.status === "canceled" && (
                    <button onClick={onReativar} style={S.miniBtnGray}><RefreshCw size={14} /> Reativar envio</button>
                )}
                <button onClick={onExcluir} style={S.miniBtnRed}><XCircle size={14} /> Excluir envio</button>
            </div>
        </div>
    );
}