"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit as fsLimit,
  startAfter,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  where,
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import {
  ArrowLeft,
  PlusCircle,
  Search,
  Trash2,
  Save,
  Wallet,
  BadgeDollarSign,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";
import { withRoleProtection } from "@/utils/withRoleProtection";
import { useTaxonomia } from "@/hooks/useTaxonomia";

// ✅ Novos imports (Componentes e Utils)
import {
  STATUS_META,
  fmtDate,
  currency,
  StatusCode,
} from "@/features/admin/demandas/utils";
import { DemandasKPIs } from "@/features/admin/demandas/components/DemandasKPIs";
import { DemandaCard } from "@/features/admin/demandas/components/DemandaCard";

/* =================== Types locais =================== */
// Mantemos tipos que são usados na lógica de estado da página
type Demanda = {
  id: string;
  titulo: string;
  categoria?: string;
  criador?: string;
  emailCriador?: string;
  status?: StatusCode | string;
  createdAt?: any;
  visibilidade?: "publica" | "oculta";
  preco?: number;
  cobrancaStatus?: "pendente" | "pago" | "isento";
  liberacoesCount?: number;
  searchKeywords?: string[];
};

const PAGE_SIZE = 30;

/* =================== Helpers de Busca/Query =================== */

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function normalize(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function tokenizeTerm(s = ""): string[] {
  const base = normalize(s);
  if (!base) return [];
  const parts = base.split(/[\s,.;:/\\\-_|]+/g).filter(Boolean);
  return Array.from(new Set([base, ...parts])).slice(0, 10);
}

function looksLikeDocId(s = "") {
  return s.trim().length >= 18;
}

// Helper para converter status antigo em novo (útil para queries e exibição)
function normalizeStatus(raw?: string): StatusCode {
  const s = (raw || "").trim().toLowerCase();
  if (["pending", "approved", "in_progress", "rejected", "closed"].includes(s)) {
    return s as StatusCode;
  }
  switch (s) {
    case "aberta":
      return "approved";
    case "andamento":
      return "in_progress";
    case "fechada":
    case "encerrada":
    case "inativa":
      return "closed";
    default:
      return "pending";
  }
}

function getStatusQueryValues(status: StatusCode): string[] {
  switch (status) {
    case "pending":
      return ["pending"];
    case "approved":
      return ["approved", "aberta"];
    case "in_progress":
      return ["in_progress", "andamento"];
    case "closed":
      return ["closed", "fechada", "encerrada", "inativa"];
    case "rejected":
      return ["rejected"];
    default:
      return [status];
  }
}

/* =================== Toast Hook =================== */
function useToasts() {
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  function push(text: string) {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }
  return { push, toasts };
}

/* =================== Página Principal =================== */
function AdminDemandasPage() {
  const { push, toasts } = useToasts();
  const { categorias: taxCats, loading: loadingTax } = useTaxonomia();

  const categoriaOptions = useMemo(
    () =>
      (taxCats || [])
        .map((c) => c.nome)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
    [taxCats]
  );

  // Estados
  const [items, setItems] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Filtros
  const [term, setTerm] = useState("");
  const [fStatus, setFStatus] = useState<StatusCode | "">("");
  const [fCat, setFCat] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fIni, setFIni] = useState("");
  const [fFim, setFFim] = useState("");

  // Totais
  const [totalGeral, setTotalGeral] = useState(0);
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [kpi, setKpi] = useState({
    hoje: 0,
    andamento: 0,
    fechadas: 0,
    rejeitadas: 0,
  });

  // Paginação
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const hasMoreRef = useRef<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Seleção e Drawer
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const selCount = useMemo(() => Object.values(sel).filter(Boolean).length, [sel]);
  const [drawer, setDrawer] = useState<Demanda | null>(null);
  const [editPreco, setEditPreco] = useState("");

  // Construção da Query
  const buildConstraints = useCallback((): QueryConstraint[] => {
    const c: QueryConstraint[] = [];

    if (fStatus) {
      const vals = getStatusQueryValues(fStatus as StatusCode);
      if (!term.trim()) {
        if (vals.length === 1) c.push(where("status", "==", vals[0]));
        else c.push(where("status", "in", vals));
      }
    }
    if (fCat) c.push(where("categoria", "==", fCat));
    if (fEmail.trim()) c.push(where("emailCriador", "==", fEmail.trim()));
    if (fIni) c.push(where("createdAt", ">=", startOfDay(new Date(fIni))));
    if (fFim) c.push(where("createdAt", "<=", endOfDay(new Date(fFim))));
    if (term.trim()) {
      const tokens = tokenizeTerm(term);
      if (tokens.length > 0)
        c.push(where("searchKeywords", "array-contains-any", tokens));
    }
    return c;
  }, [fStatus, fCat, fEmail, fIni, fFim, term]);

  // Contagens
  const refreshCounts = useCallback(async () => {
    // Nota: Em app real, talvez otimizar para não chamar sempre
    const totalAll = await getCountFromServer(collection(db, "demandas"));
    setTotalGeral(totalAll.data().count);

    const base = buildConstraints();
    const totalSnap = await getCountFromServer(
      query(collection(db, "demandas"), ...base)
    );
    setTotalFiltrado(totalSnap.data().count);

    // KPIs simples (lógica simplificada para exemplo)
    // Para KPIs precisos com filtros complexos, ideal seria aggrgations ou counters dedicados
    const baseNoStatus = base.filter(
      (cc: any) =>
        !(cc?.type === "where" && cc?.fieldPath?.canonicalString === "status")
    );

    // Funcao auxiliar interna
    const statusQuery = (st: StatusCode) => {
      const vals = getStatusQueryValues(st);
      return vals.length === 1
        ? query(collection(db, "demandas"), ...baseNoStatus, where("status", "==", vals[0]))
        : query(collection(db, "demandas"), ...baseNoStatus, where("status", "in", vals));
    };

    const today = startOfDay(new Date());
    const [hojeC, andC, fecC, rejC] = await Promise.all([
      getCountFromServer(
        query(
          collection(db, "demandas"),
          ...baseNoStatus.filter((c: any) => c.fieldPath !== "createdAt"),
          where("createdAt", ">=", today)
        )
      ),
      getCountFromServer(statusQuery("in_progress")),
      getCountFromServer(statusQuery("closed")),
      getCountFromServer(statusQuery("rejected")),
    ]);

    setKpi({
      hoje: hojeC.data().count,
      andamento: andC.data().count,
      fechadas: fecC.data().count,
      rejeitadas: rejC.data().count,
    });
  }, [buildConstraints]);

  // Carregar Dados
  const loadFirst = useCallback(async () => {
    setLoading(true);
    setErrMsg(null);
    setSel({});
    try {
      // 1. Tentar ID direto
      const raw = term.trim();
      if (raw && looksLikeDocId(raw)) {
        const dsnap = await getDoc(doc(db, "demandas", raw));
        if (dsnap.exists()) {
          const it = { id: dsnap.id, ...(dsnap.data() as any) } as Demanda;
          setItems([it]);
          setTotalFiltrado(1);
          setLoading(false);
          return;
        }
      }

      // 2. Query normal
      const constraints = buildConstraints();
      const qPage = query(
        collection(db, "demandas"),
        ...constraints,
        orderBy("createdAt", "desc"),
        fsLimit(PAGE_SIZE)
      );
      const snap = await getDocs(qPage);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Demanda[];

      setItems(list);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      hasMoreRef.current = snap.docs.length === PAGE_SIZE; // Heurística simples

      await refreshCounts();
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes("index")) {
        setErrMsg("Faltou índice no Firestore. Ver console.");
      } else {
        setErrMsg("Erro ao carregar demandas.");
      }
    } finally {
      setLoading(false);
    }
  }, [buildConstraints, refreshCounts, term]);

  const loadMore = useCallback(async () => {
    if (!lastDocRef.current || !hasMoreRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const constraints = buildConstraints();
      const snap = await getDocs(
        query(
          collection(db, "demandas"),
          ...constraints,
          orderBy("createdAt", "desc"),
          startAfter(lastDocRef.current),
          fsLimit(PAGE_SIZE)
        )
      );
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Demanda[];
      setItems((prev) => [...prev, ...list]);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      hasMoreRef.current = list.length === PAGE_SIZE;
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }, [buildConstraints, loadingMore]);

  // Effects
  useEffect(() => {
    loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    const t = setTimeout(() => {
      if (!loading) loadFirst(); // Avoid double call on init
    }, 500);
    return () => clearTimeout(t);
  }, [term, fStatus, fCat, fEmail, fIni, fFim]); // Debounce filters

  // Intersection Observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !loading && !loadingMore && hasMoreRef.current) {
        loadMore();
      }
    });
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [loading, loadingMore, loadMore]);


  // Actions
  async function changeStatus(d: Demanda) {
    const current = normalizeStatus(d.status as string);
    const next = STATUS_META[current].next;
    await updateDoc(doc(db, "demandas", d.id), {
      status: next,
      updatedAt: serverTimestamp(),
    });
    setItems((arr) =>
      arr.map((x) => (x.id === d.id ? { ...x, status: next } : x))
    );
    await refreshCounts();
    if (drawer && drawer.id === d.id) {
      setDrawer(prev => prev ? { ...prev, status: next } : null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta demanda?")) return;
    await deleteDoc(doc(db, "demandas", id));
    if (drawer?.id === id) setDrawer(null);
    await loadFirst();
  }

  async function toggleVis(d: Demanda) {
    const next = d.visibilidade === "oculta" ? "publica" : "oculta";
    await updateDoc(doc(db, "demandas", d.id), { visibilidade: next });
    setItems((arr) =>
      arr.map((x) => (x.id === d.id ? { ...x, visibilidade: next } : x))
    );
    if (drawer && drawer.id === d.id) {
      setDrawer(prev => prev ? { ...prev, visibilidade: next } : null);
    }
  }

  // Bulk Actions
  const selectedIds = useMemo(() => Object.keys(sel).filter(k => sel[k]), [sel]);

  async function bulkStatus(next: StatusCode) {
    if (!selectedIds.length || !confirm(`Mudar ${selectedIds.length} itens para ${STATUS_META[next].label}?`)) return;
    await Promise.all(selectedIds.map(id => updateDoc(doc(db, "demandas", id), { status: next })));
    await loadFirst();
  }

  async function bulkDelete() {
    if (!selectedIds.length || !confirm(`Excluir ${selectedIds.length} itens?`)) return;
    await Promise.all(selectedIds.map(id => deleteDoc(doc(db, "demandas", id))));
    await loadFirst();
  }

  // Drawer Helpers
  async function salvarPreco() {
    if (!drawer) return;
    const val = Number(String(editPreco).replace(",", "."));
    if (isNaN(val)) return push("Valor inválido");
    await updateDoc(doc(db, "demandas", drawer.id), { preco: val });
    setItems(prev => prev.map(x => x.id === drawer.id ? { ...x, preco: val } : x));
    setDrawer(d => d ? { ...d, preco: val } : null);
    push("Preço salvo");
  }

  async function setCobranca(status: "pendente" | "pago" | "isento") {
    if (!drawer) return;
    await updateDoc(doc(db, "demandas", drawer.id), { cobrancaStatus: status });
    setItems(prev => prev.map(x => x.id === drawer.id ? { ...x, cobrancaStatus: status } : x));
    setDrawer(d => d ? { ...d, cobrancaStatus: status } : null);
  }


  return (
    <section className="adm">
      {/* HEADER */}
      <div className="adm-header">
        <div className="adm-left">
          <Link href="/admin" className="btn-sec">
            <ArrowLeft size={18} /> Voltar
          </Link>
          <h1>Demandas</h1>
        </div>
        <Link href="/create-demanda" className="btn-cta">
          <PlusCircle size={18} /> Nova
        </Link>
      </div>

      {/* TOTAIS */}
      <div className="totals">
        <div className="total-box">
          <div className="total-label">Total</div>
          <div className="total-value">{totalGeral}</div>
        </div>
        <div className="total-box muted-box">
          <div className="total-label">Filtrado</div>
          <div className="total-value">{totalFiltrado}</div>
        </div>
      </div>

      {/* ✅ Componente KPIs */}
      <DemandasKPIs kpi={kpi} />

      {/* FILTROS */}
      <div className="filters">
        <div className="input-with-icon">
          <Search size={18} className="icon" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar..."
          />
        </div>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value as any)}>
          <option value="">Status</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} disabled={loadingTax}>
          <option value="">Categoria</option>
          {categoriaOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Botão limpar */}
        {(term || fStatus || fCat) && (
          <button className="btn-sec" onClick={() => { setTerm(""); setFStatus(""); setFCat(""); }}>
            Limpar
          </button>
        )}
      </div>

      {/* LISTA */}
      {errMsg && <div className="error">{errMsg}</div>}

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="empty">
          <h3>Nada encontrado</h3>
          <Link href="/create-demanda" className="btn-cta" style={{ marginTop: 10 }}>Criar Nova</Link>
        </div>
      ) : (
        <>
          {/* Bulk Toolbar */}
          {selCount > 0 && (
            <div className="bulk">
              <span className="bulk-count">{selCount} selecionados</span>
              <button className="pill pill-warn" onClick={() => bulkStatus("in_progress")}>Andamento</button>
              <button className="pill pill-danger" onClick={() => bulkStatus("closed")}>Encerrar</button>
              <button className="pill pill-danger" style={{ marginLeft: "auto" }} onClick={bulkDelete}>Excluir</button>
            </div>
          )}

          {/* Grid de Cards */}
          <div className="grid-cards">
            {items.map((d) => (
              /* ✅ Componente Card */
              <DemandaCard
                key={d.id}
                // Normalizamos o status aqui para garantir que o card renderize a cor certa
                // mesmo se o banco tiver status antigo ("aberta")
                d={{ ...d, status: normalizeStatus(d.status as string) }}
                selected={!!sel[d.id]}
                onSelect={() => setSel(s => ({ ...s, [d.id]: !s[d.id] }))}
                onDrawer={setDrawer}
                onChangeStatus={changeStatus}
              />
            ))}
          </div>

          <div ref={sentinelRef} style={{ height: 20 }} />
          {loadingMore && <div className="loading">Carregando mais...</div>}
        </>
      )}

      {/* DRAWER (Modal Lateral) - Mantido aqui para acesso fácil às funções de edição */}
      {drawer && (
        <div className="drawer-mask" onClick={() => setDrawer(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setDrawer(null)}>×</button>
            <h3 className="drawer-title">{drawer.titulo}</h3>

            <div className="drawer-sub">
              <span className="pill mini" style={{
                background: STATUS_META[normalizeStatus(drawer.status as string)].bg,
                color: STATUS_META[normalizeStatus(drawer.status as string)].color
              }}>
                {STATUS_META[normalizeStatus(drawer.status as string)].label}
              </span>
              <span className="muted small ml-2">{fmtDate(drawer.createdAt)}</span>
            </div>

            <div className="drawer-group">
              <Link href={`/admin/demandas/${drawer.id}/edit`} className="pill pill-edit big">
                <Pencil size={18} /> Editar
              </Link>
              <button className="pill big" onClick={() => toggleVis(drawer)}>
                {drawer.visibilidade === "oculta" ? <><Eye size={18} /> Publicar</> : <><EyeOff size={18} /> Ocultar</>}
              </button>
              <button className="pill pill-danger big" onClick={() => remove(drawer.id)}>
                <Trash2 size={18} /> Excluir
              </button>
            </div>

            {/* Bloco de Preço */}
            <div className="drawer-box">
              <div className="drawer-box-title"><Wallet size={18} /> Preço</div>
              <div className="drawer-inline">
                <input className="drawer-input" placeholder="0,00" defaultValue={drawer.preco} onChange={e => setEditPreco(e.target.value)} />
                <button className="pill pill-primary" onClick={salvarPreco}><Save size={16} /></button>
              </div>
              <div className="muted mt-2">Atual: {currency(drawer.preco)}</div>
            </div>

            {/* Bloco de Cobrança */}
            <div className="drawer-box">
              <div className="drawer-box-title"><BadgeDollarSign size={18} /> Status Pagamento</div>
              <div className="drawer-inline">
                <button className="pill pill-success" onClick={() => setCobranca("pago")}>Pago</button>
                <button className="pill pill-warn" onClick={() => setCobranca("pendente")}>Pendente</button>
              </div>
              <div className="muted mt-2">Atual: {drawer.cobrancaStatus || "—"}</div>
            </div>

          </aside>
        </div>
      )}

      {/* TOASTS */}
      <div className="toasts">
        {toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}
      </div>

      {/* ESTILOS GLOBAIS DA PÁGINA (Layout) */}
      <style jsx>{`
        .adm { max-width: 1380px; margin: 0 auto; padding: 30px 2vw 60px; background: #f8fbfd; min-height: 100vh; }
        .adm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .adm-left { display: flex; align-items: center; gap: 12px; }
        h1 { font-size: 2rem; color: #023047; margin: 0; font-weight: 900; }
        
        .totals { display: flex; gap: 10px; margin-bottom: 20px; }
        .total-box { background: #fff; padding: 12px 18px; border-radius: 14px; border: 1px solid #edf2f7; }
        .total-value { font-size: 1.5rem; font-weight: 900; color: #023047; }
        .total-label { font-size: 0.85rem; color: #64748b; font-weight: 700; }

        .filters { display: flex; gap: 10px; flex-wrap: wrap; margin: 20px 0; }
        .filters input, .filters select { height: 42px; padding: 0 12px; border-radius: 10px; border: 1px solid #e2e8f0; font-weight: 600; }
        .input-with-icon { position: relative; }
        .input-with-icon .icon { position: absolute; left: 10px; top: 12px; color: #94a3b8; }
        .input-with-icon input { padding-left: 34px; min-width: 280px; }

        .btn-sec, .btn-cta { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; font-weight: 800; cursor: pointer; text-decoration: none; }
        .btn-sec { background: #fff; border: 1px solid #e2e8f0; color: #023047; }
        .btn-cta { background: #fb8500; color: #fff; border: none; box-shadow: 0 4px 12px rgba(251, 133, 0, 0.3); }

        .grid-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-top: 20px; }
        
        .bulk { background: #fff; padding: 10px 14px; border-radius: 12px; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; border: 1px solid #e2e8f0; }
        .bulk-count { font-weight: 800; color: #023047; margin-right: 10px; }

        .loading, .empty { text-align: center; padding: 40px; color: #64748b; font-weight: 700; }
        .error { background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 8px; margin-bottom: 20px; }

        /* Drawer Styles */
        .drawer-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 50; display: flex; justify-content: flex-end; }
        .drawer { width: 100%; max-width: 500px; background: #fff; padding: 24px; overflow-y: auto; position: relative; box-shadow: -4px 0 20px rgba(0,0,0,0.1); }
        .drawer-close { position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }
        .drawer-title { font-size: 1.5rem; margin: 0 0 10px 0; color: #023047; }
        .drawer-group { display: grid; gap: 8px; margin: 20px 0; }
        .drawer-box { background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 12px; }
        .drawer-box-title { display: flex; gap: 8px; font-weight: 800; color: #475569; margin-bottom: 8px; }
        .drawer-inline { display: flex; gap: 8px; }
        .drawer-input { flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; }
        
        /* Helpers do Drawer */
        .pill { padding: 6px 12px; border-radius: 8px; font-weight: 700; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .pill.big { padding: 12px; justify-content: center; }
        .pill-edit { background: #eff6ff; color: #2563eb; border-color: #dbeafe; }
        .pill-danger { background: #fef2f2; color: #dc2626; border-color: #fee2e2; }
        .pill-warn { background: #fff7ed; color: #ea580c; border-color: #ffedd5; }
        .pill-success { background: #f0fdf4; color: #16a34a; border-color: #dcfce7; }
        .pill-primary { background: #2563eb; color: #fff; border: none; }
        .muted { color: #94a3b8; font-size: 0.9rem; }
        .mt-2 { margin-top: 8px; }
        
        .toasts { position: fixed; bottom: 20px; right: 20px; z-index: 60; display: flex; flex-direction: column; gap: 10px; }
        .toast { background: #0f172a; color: #fff; padding: 12px 16px; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      `}</style>
    </section>
  );
}

export default withRoleProtection(AdminDemandasPage, { allowed: ["admin"] });