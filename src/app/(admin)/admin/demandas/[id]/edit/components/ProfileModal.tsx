import React, { useEffect, useState } from "react";
import { doc, query, collection, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Loader as LoaderIcon, ExternalLink, MessageCircle, Copy, Send } from "lucide-react";
import { Usuario } from "../types";
import {
    getUFSetFromUser, normalizeBRWhatsappDigits, maskFrom55Digits,
    firstNonEmptyString, buildAtuacaoBullets, isUserFreeDemand, BIO_KEYS
} from "../utils";
import * as S from "../styles";

interface ProfileModalProps {
    userId: string;
    loading: boolean;
    cached: Usuario | null;
    onClose: () => void;
    defaultPrice: string;
    price: string;
    onPrice: (v: string) => void;
    note: string;
    onNote: (v: string) => void;
    onSend: () => void;
    onToggleFreePlan: (uid: string, currentFree: boolean) => void;
}

export function ProfileModal({
    userId,
    loading,
    cached,
    onClose,
    defaultPrice,
    price,
    onPrice,
    note,
    onNote,
    onSend,
    onToggleFreePlan,
}: ProfileModalProps) {
    const u = cached;
    const nome = u?.nome || u?.email || `Usuário ${userId}`;
    const email = u?.email || "";

    const [leadStats, setLeadStats] = useState({
        loading: true, total: 0, unlocked: 0, freeUnlocked: 0, paidUnlocked: 0,
    });

    useEffect(() => {
        if (!userId) return;
        (async () => {
            try {
                setLeadStats((prev) => ({ ...prev, loading: true }));
                const baseQ = query(collection(db, "demandAssignments"), where("supplierId", "==", userId));
                const totalSnap = await getCountFromServer(baseQ as any);

                const unlockedQ = query(collection(db, "demandAssignments"), where("supplierId", "==", userId), where("status", "==", "unlocked"));
                const unlockedSnap = await getCountFromServer(unlockedQ as any);

                let freeUnlocked = 0;
                try {
                    const freeQ = query(collection(db, "demandAssignments"), where("supplierId", "==", userId), where("status", "==", "unlocked"), where("billingType", "==", "free"));
                    const freeSnap = await getCountFromServer(freeQ as any);
                    freeUnlocked = freeSnap.data().count || 0;
                } catch { freeUnlocked = 0; }

                let paidUnlocked = 0;
                try {
                    const paidQ = query(collection(db, "demandAssignments"), where("supplierId", "==", userId), where("status", "==", "unlocked"), where("billingType", "==", "paid"));
                    const paidSnap = await getCountFromServer(paidQ as any);
                    paidUnlocked = paidSnap.data().count || 0;
                } catch { paidUnlocked = Math.max(0, unlockedSnap.data().count - freeUnlocked); }

                setLeadStats({
                    loading: false, total: totalSnap.data().count || 0, unlocked: unlockedSnap.data().count || 0, freeUnlocked, paidUnlocked,
                });
            } catch (e) {
                console.error("Erro estatísticas:", e);
                setLeadStats((prev) => ({ ...prev, loading: false }));
            }
        })();
    }, [userId]);

    const catSet = new Set<string>();
    (u?.categorias || []).forEach((c) => { if (c) catSet.add(String(c)); });
    (u?.categoriesAll || []).forEach((c) => { if (c) catSet.add(String(c)); });
    (u?.categoriasAtuacaoPairs || []).forEach((p) => { if (p?.categoria) catSet.add(String(p.categoria)); });
    (u?.atuacaoBasica || []).forEach((a) => { if ((a as any)?.categoria) catSet.add(String((a as any).categoria)); });
    const cats = Array.from(catSet);

    const subcats = [
        ...(u?.categoriasAtuacaoPairs || []).map((p) => p?.subcategoria).filter(Boolean) as string[],
        ...(u?.atuacaoBasica || []).map((a: any) => a?.subcategoria).filter(Boolean) as string[],
    ].filter(Boolean);

    const ufSet = u ? getUFSetFromUser(u) : new Set<string>();
    const ufsTxt = ufSet.size ? Array.from(ufSet).join(", ") : "—";
    const contatoDigits = normalizeBRWhatsappDigits(u?.whatsappE164 || u?.whatsapp || u?.telefone || "");
    const contatoMasked = contatoDigits ? maskFrom55Digits(contatoDigits) : "";
    const waLink = contatoDigits ? `https://wa.me/${contatoDigits}` : "";
    const bioText = u?.bio || firstNonEmptyString(u, BIO_KEYS);
    const atBullets = buildAtuacaoBullets(u);
    const isFree = isUserFreeDemand(u || undefined);
    const planLabel = u?.patrocinador ? "Patrocinador (sempre grátis)" : isFree ? "Recebe demandas de graça" : "Plano normal (pago por demanda)";

    return (
        <div style={S.modalBackdrop}>
            <div style={S.modalCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Perfil do fornecedor</h3>
                    <button onClick={onClose} style={S.ghostBtn}>Fechar</button>
                </div>

                {loading && !u && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b" }}>
                        <LoaderIcon className="animate-spin" size={16} /> Carregando perfil...
                    </div>
                )}

                {!!u && (
                    <>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            {u.photoURL ? <img src={u.photoURL} alt={nome} style={{ width: 52, height: 52, borderRadius: 12 }} />
                                : <div style={{ width: 52, height: 52, borderRadius: 12, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#0f172a" }}>{nome.charAt(0).toUpperCase()}</div>}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{nome}</div>
                                    {u.patrocinador && <span style={S.chip("#fff7ed", "#9a3412")}>Patrocinador</span>}
                                    {!u.patrocinador && isFree && <span style={S.chip("#ecfeff", "#155e75")}>Recebe grátis</span>}
                                </div>
                                <div style={{ fontSize: 12, color: "#64748b" }}>{email || "—"}</div>
                            </div>
                            <a href={`/admin/usuarios/${u.id}/edit`} target="_blank" rel="noreferrer" style={S.ghostBtn} title="Abrir no admin"><ExternalLink size={14} /> Admin</a>
                        </div>

                        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                            <div style={S.infoRow}><b>Categorias:</b> {cats.length ? cats.join(", ") : "—"}</div>
                            {!!subcats.length && <div style={S.infoRow}><b>Atuação:</b> {subcats.join(", ")}</div>}
                            <div style={S.infoRow}><b>UFs/Regiões:</b> {ufsTxt}</div>
                            <div style={S.infoRow}><b>Cidade/UF:</b> {(u.cidade || "—")}/{u.estado || "—"}</div>
                            <div style={S.infoRow}><b>Bio/Descrição:</b>&nbsp;{bioText ? <span style={{ whiteSpace: "pre-wrap" }}>{bioText}</span> : "—"}</div>

                            {atBullets.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>Atuação detalhada</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {atBullets.map((line, i) => <span key={i} style={S.chip("#eef2ff", "#3730a3")}>{line}</span>)}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: 10, marginBottom: 8, fontWeight: 900, color: "#0f172a" }}>Leads / Demandas do fornecedor</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 10, fontSize: 13 }}>
                                <div style={{ ...S.badgeBox, justifyContent: "space-between" }}><span>Enviadas</span><b>{leadStats.loading ? "…" : leadStats.total}</b></div>
                                <div style={{ ...S.badgeBox, justifyContent: "space-between" }}><span>Desbloqueadas</span><b>{leadStats.loading ? "…" : leadStats.unlocked}</b></div>
                                <div style={{ ...S.badgeBox, justifyContent: "space-between", background: "#ecfdf3", borderColor: "#bbf7d0" }}><span>Grátis</span><b>{leadStats.loading ? "…" : leadStats.freeUnlocked}</b></div>
                                <div style={{ ...S.badgeBox, justifyContent: "space-between", background: "#fffbeb", borderColor: "#fed7aa" }}><span>Pagas</span><b>{leadStats.loading ? "…" : leadStats.paidUnlocked}</b></div>
                            </div>

                            <div style={S.infoRow}><b>Plano de recebimento:</b> {planLabel}</div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {waLink ? <a href={waLink} target="_blank" rel="noreferrer" style={S.primaryBtn}><MessageCircle size={16} /> WhatsApp ({contatoMasked})</a> : <span style={{ ...S.chip("#fff1f2", "#9f1239"), borderStyle: "dashed" }}>Contato WhatsApp indisponível</span>}
                                {email && <button type="button" onClick={() => navigator.clipboard.writeText(email)} style={S.ghostBtn} title="Copiar e-mail"><Copy size={16} /> Copiar e-mail</button>}
                                {!u.patrocinador && <button type="button" onClick={() => onToggleFreePlan(u.id, isFree)} style={isFree ? S.miniBtnYellow : S.miniBtnGreen}>{isFree ? "Voltar para plano pago" : "Deixar receber de graça"}</button>}
                            </div>
                        </div>

                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #eef2f7" }}>
                            <div style={{ fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>Enviar esta demanda</div>
                            <div style={{ ...S.hintText, marginBottom: 6 }}>Este fornecedor já recebeu <b>{leadStats.total}</b> envios e desbloqueou <b>{leadStats.unlocked}</b> demandas (grátis: <b>{leadStats.freeUnlocked}</b>).</div>
                            <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                <span style={isFree ? S.chip("#ecfdf5", "#065f46") : S.chip("#fff7ed", "#9a3412")}>{isFree ? "Este fornecedor recebe esta demanda de graça (desbloqueio será marcado como pago)." : "Este envio será cobrado conforme o preço definido abaixo."}</span>
                            </div>

                            <div style={S.twoCols}>
                                <div style={{ flex: 1 }}><label style={S.miniLabel}>Preço (R$)</label><input value={price} onChange={(e) => onPrice(e.target.value)} placeholder={`Sugerido: ${defaultPrice}`} style={S.input} /></div>
                                <div style={{ flex: 2 }}><label style={S.miniLabel}>Nota interna (opcional)</label><input value={note} onChange={(e) => onNote(e.target.value)} placeholder="Motivo da escolha, observações..." style={S.input} /></div>
                                <div style={{ display: "flex", alignItems: "flex-end" }}><button type="button" onClick={onSend} style={S.primaryBtn}><Send size={16} /> Enviar</button></div>
                            </div>
                            <div style={{ ...S.hintText, marginTop: 6 }}>O envio aqui cria/atualiza <code>demandAssignments/{"{demandaId}_{userId}"}</code> com <b>pricing</b> custom e <b>notes</b>. Se o fornecedor estiver como “recebe de graça”, o valor será R$ 0,00 e o pagamento marcado como pago.</div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}