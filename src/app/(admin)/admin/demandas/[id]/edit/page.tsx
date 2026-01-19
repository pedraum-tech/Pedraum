"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebaseConfig";
import {
  doc, getDoc, updateDoc, deleteDoc, getDocs, collection, query, where,
  writeBatch, serverTimestamp, orderBy, limit, onSnapshot, arrayRemove,
  arrayUnion, increment, setDoc
} from "firebase/firestore";
import {
  Loader as LoaderIcon, ArrowLeft, Save, Trash2, Upload, Tag, Send, Users,
  Filter, DollarSign, ShieldCheck, RefreshCw, CheckCircle2, XCircle, Layers,
  FileText, Image as ImageIcon, Search, ExternalLink, Copy
} from "lucide-react";
import ImageUploader from "@/features/documents/ImageUploader";
import nextDynamic from "next/dynamic";
import { useTaxonomia } from "@/hooks/useTaxonomia";

// Imports Modularizados
import { Assignment, Demanda, DemandaStatus, PaymentStatus, Usuario, AssignmentStatus } from "./types";
import {
  UFS, normalizeBRWhatsappDigits, maskFrom55Digits, extractDigits55FromMasked,
  isValidBRWhatsappDigits, formatWhatsappBRIntl, ensurePlus55Prefix,
  reaisToCents, docToUsuario, getUFSetFromUser, norm, isUserFreeDemand
} from "./utils";
import * as S from "./styles";
import { AssignmentRow } from "./components/AssignmentRow";
import { ProfileModal } from "./components/ProfileModal";

// Lazy imports
const PDFUploader = nextDynamic(() => import("@/features/documents/PDFUploader"), { ssr: false }) as any;
const DrivePDFViewer = nextDynamic(() => import("@/features/documents/DrivePDFViewer"), { ssr: false }) as any;

// ============================================================================
// 👇 AQUI ESTAVA FALTANDO: FUNÇÕES DE FILTRO INTELIGENTE (ADICIONADO AGORA) 👇
// ============================================================================

const STOP_WORDS_PT = new Set([
  "de", "a", "o", "que", "e", "do", "da", "em", "um", "para", "com", "nao", "uma", "os", "no", "se", "na", "por", "mais", "as", "dos", "como", "mas", "ao", "ele", "das", "tem", "seu", "sua", "ou", "ser", "quando", "muito", "nos", "ja", "eu", "tambem", "so", "pelo", "pela", "ate", "isso", "ela", "entre", "depois", "sem", "mesmo", "aos", "ter", "seus", "quem", "nas", "me", "esse", "eles", "voce", "essa", "num", "nem", "suas", "meu", "minha", "numa", "pelos", "elas", "qual", "nos", "lhe", "deles", "essas", "esses", "pelas", "este", "dele", "tu", "te", "voces", "vos", "lhes", "meus", "minhas", "teu", "tua", "teus", "tuas", "nosso", "nossa", "nossos", "nossas", "dela", "delas", "esta", "estes", "estas", "aquele", "aquela", "aqueles", "aquelas", "isto", "aquilo", "estou", "estamos", "estao", "sou", "somos", "sao", "era", "eram", "fui", "foi", "fomos", "foram", "tinha", "tinham", "tive", "teve"
]);

function extractKeywordsClient(text: string): string[] {
  if (!text) return [];
  // 1. Remove acentos, pontuação e joga para minúsculo
  const normalized = text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\s{2,}/g, " ");

  // 2. Quebra em palavras e filtra
  return normalized.split(" ").filter(word => {
    // Remove números puros, palavras curtas (<3 letras) e stop words
    return word.length > 2 && isNaN(Number(word)) && !STOP_WORDS_PT.has(word);
  });
}

// ============================================================================

export default function EditDemandaPage() {
  const router = useRouter();
  const params = useParams();
  const demandaId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params!.id[0] : "";

  // Taxonomia
  const { categorias, loading: taxLoading } = useTaxonomia() as {
    categorias: { nome: string; slug?: string; subcategorias?: { nome: string; slug?: string }[] }[];
    loading: boolean;
  };

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [demandaStatus, setDemandaStatus] = useState<DemandaStatus>("pending");

  const [imagens, setImagens] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [cidades, setCidades] = useState<string[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);

  const [form, setForm] = useState<{
    titulo: string; descricao: string; categoria: string; subcategoria: string; subcategoriaOutrosTexto: string;
    estado: string; cidade: string; prazo: string; orcamento: string; whatsapp: string; observacoes: string;
    contatoNome: string; contatoEmail: string; contatoWhatsappMasked: string;
  }>({
    titulo: "", descricao: "", categoria: "", subcategoria: "", subcategoriaOutrosTexto: "",
    estado: "", cidade: "", prazo: "", orcamento: "", whatsapp: "", observacoes: "",
    contatoNome: "", contatoEmail: "", contatoWhatsappMasked: "",
  });

  const [createdAt, setCreatedAt] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [precoPadraoReais, setPrecoPadraoReais] = useState<string>("19,90");
  const [precoEnvioReais, setPrecoEnvioReais] = useState<string>("");
  const [unlockCap, setUnlockCap] = useState<number | null>(null);
  const [liberacoesCount, setLiberacoesCount] = useState<number>(0);

  // Usuários
  const [allUsuarios, setAllUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [selUsuarios, setSelUsuarios] = useState<string[]>([]);
  const [envLoading, setEnvLoading] = useState(false);

  // Envios (stream)
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const jaEnviados = useMemo(() => new Set(assignments.map((a) => a.supplierId)), [assignments]);

  // Filtros
  const [fCat, setFCat] = useState("");
  const [fUF, setFUF] = useState("");
  const [qUser, setQUser] = useState("");
  const [fTipo, setFTipo] = useState("");

  // NOVO: Estado para ativar/desativar o filtro inteligente
  // const [filtroDescricaoAtivo, setFiltroDescricaoAtivo] = useState(false);

  const subsForm = useMemo(
    () => categorias.find((c) => c.nome === form.categoria)?.subcategorias ?? [],
    [categorias, form.categoria]
  );

  // Effect Cidades
  useEffect(() => {
    let abort = false;
    async function fetchCidades(uf: string) {
      if (!uf || uf === "BRASIL") {
        setCidades([]);
        return;
      }
      setCarregandoCidades(true);
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        const data = await res.json();
        if (abort) return;
        const nomes = (Array.isArray(data) ? data : [])
          .map((m: any) => m?.nome).filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b, "pt-BR"));
        setCidades(nomes);
      } catch (e) {
        console.error("Erro ao carregar cidades do IBGE:", e);
        setCidades([]);
      } finally {
        if (!abort) setCarregandoCidades(false);
      }
    }
    fetchCidades(form.estado || "");
    return () => { abort = true; };
  }, [form.estado]);

  // Carregar Demanda
  useEffect(() => {
    async function fetchDemanda() {
      if (!demandaId) return;
      setLoading(true);
      const snap = await getDoc(doc(db, "demandas", demandaId));
      if (!snap.exists()) {
        setLoading(false);
        alert("Demanda não encontrada.");
        router.push("/admin/demandas");
        return;
      }
      const d = snap.data() as Demanda;
      setDemandaStatus((d.status as DemandaStatus) || "pending");
      const rawWpp = d.contatoWhatsappE164 || d.autorWhatsapp || d.whatsapp || "";
      const d55 = normalizeBRWhatsappDigits(rawWpp);
      const isOutros = (d.categoria || "") === "Outros";

      setForm({
        titulo: d.titulo || "", descricao: d.descricao || "", categoria: d.categoria || "",
        subcategoria: isOutros ? "" : d.subcategoria || "", subcategoriaOutrosTexto: isOutros ? (d.subcategoria || "") : "",
        estado: d.estado || "", cidade: d.cidade || "", prazo: d.prazo || "", orcamento: d.orcamento != null ? String(d.orcamento) : "",
        whatsapp: d.whatsapp || "", observacoes: d.observacoes || "", contatoNome: d.contatoNome || d.autorNome || "",
        contatoEmail: (d.contatoEmail || d.autorEmail || "").toLowerCase(), contatoWhatsappMasked: d55 ? maskFrom55Digits(d55) : "",
      });

      setTags(d.tags || []);
      const rawImagens = d.imagens;
      const imagensNormalizadas = Array.isArray(rawImagens) ? rawImagens : (typeof rawImagens === 'string' && (rawImagens as string).length > 0) ? [rawImagens] : [];
      setImagens(imagensNormalizadas);
      setPdfUrl(d.pdfUrl ?? null);
      setUserId(d.userId || "");
      setCreatedAt(d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).toLocaleString("pt-BR") : "");
      setLiberacoesCount(d.liberacoesCount ?? 0);
      const cents = d?.pricingDefault?.amount ?? 1990;
      setPrecoPadraoReais((cents / 100).toFixed(2).replace(".", ","));
      setPrecoEnvioReais((cents / 100).toFixed(2).replace(".", ","));
      setUnlockCap(typeof d.unlockCap === "number" ? d.unlockCap : null);
      setFCat(d.categoria || "");
      setFUF(d.estado || "");
      setLoading(false);
    }
    fetchDemanda();
  }, [demandaId, router]);

  // Stream assignments
  useEffect(() => {
    if (!demandaId) return;
    const qAssign = query(collection(db, "demandAssignments"), where("demandId", "==", demandaId), limit(2000));
    const unsub = onSnapshot(qAssign, (snap) => {
      const arr: Assignment[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setAssignments(arr);
    });
    return () => unsub();
  }, [demandaId]);

  // Busca de usuários
  const userCacheRef = useRef<Map<string, Usuario>>(new Map());

  // Busca todos os usuários do Firestore. Executado apenas uma vez.
  async function fetchAllUsuarios() {
    setLoadingUsuarios(true);
    try {
      const collectionsToRead = ["usuarios", "users", "user"];
      const mapById = new Map<string, Usuario>();

      await Promise.all(collectionsToRead.map(async (colName) => {
        try {
          // Aumentamos o limite para garantir que todos os usuários sejam carregados para a filtragem no cliente.
          const snap = await getDocs(query(collection(db, colName), limit(2500)));
          snap.forEach((d) => {
            const u = docToUsuario(d);
            if (!u.id || mapById.has(u.id)) return; // Evita duplicatas se o usuário existir em mais de uma coleção
            mapById.set(u.id, u);
            userCacheRef.current.set(u.id, u);
          });
        } catch (e) {
          console.warn(`Aviso: Falha ao ler a coleção de usuários '${colName}'.`, e);
        }
      }));

      const all = Array.from(mapById.values());
      all.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
      setAllUsuarios(all);
    } finally { setLoadingUsuarios(false); }
  }

  // Efeito para buscar os usuários apenas uma vez, na montagem do componente.
  useEffect(() => { fetchAllUsuarios(); }, []);

  // Centraliza toda a lógica de filtragem (dropdowns e busca de texto) em um único useMemo.
  // Isso evita novas buscas ao banco de dados a cada mudança de filtro, tornando a UI muito mais rápida.
  const usuariosVisiveis = useMemo(() => {
    let filteredUsers = [...allUsuarios];

    // Filtros Básicos
    const ufFilter = (fUF || "").trim();
    const catFilter = norm(fCat);
    const tipoFilter = (fTipo || "").toLowerCase();
    const textFilter = norm(qUser);

    // --- NOVO: FILTRO INTELIGENTE POR DESCRIÇÃO (Lógica do Node.js portada) ---
    // if (filtroDescricaoAtivo && form.descricao) {
    //   // 1. Extrai keywords da descrição atual do formulário
    //   const keywords = extractKeywordsClient(form.descricao);

    //   if (keywords.length > 0) {
    //     filteredUsers = filteredUsers.filter((u) => {
    //       // Se o usuário não tem atuação básica, sai fora
    //       if (!Array.isArray(u.atuacaoBasica)) return false;

    //       // Verifica se ALGUM item de atuação básica tem match
    //       return u.atuacaoBasica.some((atuacao: any) => {
    //         // Checa se Venda Produtos está ativo
    //         if (atuacao.vendaProdutos && atuacao.vendaProdutos.ativo) {
    //           const obsTexto = atuacao.vendaProdutos.obs || "";
    //           const obsNormalizada = norm(obsTexto); // Usa sua função norm() existente

    //           // Verifica se alguma keyword da demanda está no obs do usuário
    //           return keywords.some(kw => obsNormalizada.includes(kw));
    //         }
    //         return false;
    //       });
    //     });
    //   }
    // }
    // --------------------------------------------------------------------------

    // ... (Mantenha o resto dos filtros existentes abaixo: Categoria, UF, Tipo, Texto) ...
    // Importante: A ordem importa. Se colocar o filtro inteligente antes, ele já reduz a lista.

    // 1. Filtros de Dropdown
    if (catFilter) {
      filteredUsers = filteredUsers.filter((u) => {
        const cats: string[] = [];
        if (Array.isArray(u.categorias)) cats.push(...u.categorias);
        if (Array.isArray(u.categoriesAll)) cats.push(...u.categoriesAll);
        if (Array.isArray(u.categoriasAtuacaoPairs)) cats.push(...u.categoriasAtuacaoPairs.map((p) => p?.categoria));
        if (Array.isArray(u.atuacaoBasica)) cats.push(...u.atuacaoBasica.map((a) => a?.categoria));
        return cats.some((c) => c && norm(c).includes(catFilter));
      });
    }
    if (ufFilter) {
      const wantedUF = (ufFilter.length === 2 && UFS.includes(ufFilter as any)) ? ufFilter : ufFilter.toUpperCase();
      filteredUsers = filteredUsers.filter((u) => {
        if (wantedUF === "BRASIL" || u.atendeBrasil) return true;
        const setUF = getUFSetFromUser(u);
        return setUF.has(wantedUF) || setUF.has("BRASIL");
      });
    }
    if (tipoFilter) {
      filteredUsers = filteredUsers.filter((u) => {
        const arr = Array.isArray(u.atuacaoBasica) ? u.atuacaoBasica : [];
        return arr.some((a) => {
          if (!a) return false;
          if (tipoFilter === "venda") return !!a.vendaProdutos?.ativo;
          if (tipoFilter === "pecas") return !!a.vendaPecas?.ativo;
          if (tipoFilter === "servicos") return !!a.servicos?.ativo;
          return false;
        });
      });
    }

    // 2. Filtro de busca por texto
    if (textFilter) {
      filteredUsers = filteredUsers.filter((u) => {
        const nome = norm(u.nome || "");
        const email = norm(u.email || "");
        const whatsapp = norm(u.whatsappE164 || u.whatsapp || u.telefone || "");
        const cidade = norm(u.cidade || "");
        const id = (u.id || "").toLowerCase();
        return nome.includes(textFilter) || email.includes(textFilter) || whatsapp.includes(textFilter) || cidade.includes(textFilter) || id.includes(textFilter);
      });
    }

    return filteredUsers;
  }, [allUsuarios, fCat, fUF, fTipo, qUser,/* filtroDescricaoAtivo,*/ form.descricao]);

  // Handlers
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    if (name === "categoria") {
      setForm((f) => ({ ...f, categoria: value, subcategoria: "", subcategoriaOutrosTexto: "" }));
      return;
    }
    if (name === "estado") {
      setForm((f) => ({ ...f, estado: value, cidade: "" }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  }
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim() && tags.length < 3) {
      setTags((prev) => [...prev, tagInput.trim()]);
      setTagInput("");
      e.preventDefault();
    }
  }
  function removeTag(idx: number) { setTags((prev) => prev.filter((_, i) => i !== idx)); }

  async function approveAndPublish() {
    try {
      await updateDoc(doc(db, "demandas", demandaId), {
        status: "approved", curated: true, curatedAt: serverTimestamp(), publishedAt: serverTimestamp(), updatedAt: serverTimestamp(), curationNotes: (form.observacoes || "").trim(),
      });
      setDemandaStatus("approved");
      alert("Demanda aprovada e publicada no feed.");
    } catch { alert("Falha ao aprovar/publicar."); }
  }
  async function rejectDemand() {
    if (!window.confirm("Tem certeza que deseja REJEITAR esta demanda?")) return;
    try {
      await updateDoc(doc(db, "demandas", demandaId), {
        status: "rejected", curated: true, curatedAt: serverTimestamp(), updatedAt: serverTimestamp(), curationNotes: (form.observacoes || "").trim(), publishedAt: null,
      });
      setDemandaStatus("rejected");
      alert("Demanda rejeitada.");
    } catch { alert("Falha ao rejeitar."); }
  }
  async function backToPending() {
    try {
      await updateDoc(doc(db, "demandas", demandaId), {
        status: "pending", curated: false, curatedAt: null, updatedAt: serverTimestamp(), publishedAt: null,
      });
      setDemandaStatus("pending");
      alert("Demanda voltou para pendente (não aparece no feed).");
    } catch { alert("Falha ao voltar para pendente."); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const cents = reaisToCents(precoPadraoReais);
      const e164Digits = extractDigits55FromMasked(form.contatoWhatsappMasked || "");
      const contatoOk = !form.contatoWhatsappMasked || isValidBRWhatsappDigits(e164Digits);
      if (!contatoOk) { alert("WhatsApp inválido. Use o formato +55 (DDD) número."); setSalvando(false); return; }
      const subcategoriaFinal = form.categoria === "Outros" ? (form.subcategoriaOutrosTexto || "").trim() : form.subcategoria;

      await updateDoc(doc(db, "demandas", demandaId), {
        titulo: form.titulo, descricao: form.descricao, categoria: form.categoria, subcategoria: subcategoriaFinal,
        estado: form.estado, cidade: form.cidade, prazo: form.prazo, orcamento: form.orcamento ? Number(form.orcamento) : null,
        observacoes: form.observacoes || "", tags, imagens, pdfUrl: pdfUrl || null, pricingDefault: { amount: cents, currency: "BRL" },
        unlockCap: unlockCap ?? null, contatoNome: form.contatoNome.trim(), contatoEmail: form.contatoEmail.trim().toLowerCase(),
        contatoWhatsappMasked: form.contatoWhatsappMasked || "", contatoWhatsappE164: e164Digits || "",
        autorNome: form.contatoNome.trim(), autorEmail: form.contatoEmail.trim().toLowerCase(), autorWhatsapp: e164Digits || "",
        whatsapp: e164Digits || form.whatsapp || "", updatedAt: serverTimestamp(),
      });
      alert("Demanda atualizada com sucesso!");
    } catch (err) { console.error(err); alert("Erro ao atualizar demanda!"); }
    setSalvando(false);
  }

  async function handleDelete() {
    if (!window.confirm("Deseja mesmo excluir esta demanda? Esta ação é irreversível!")) return;
    setRemovendo(true);
    try {
      await deleteDoc(doc(db, "demandas", demandaId));
      alert("Demanda excluída.");
      router.push("/admin/demandas");
    } catch { alert("Erro ao excluir demanda."); }
    setRemovendo(false);
  }

  // Envio p/ usuários
  function toggleUsuario(id: string, checked: boolean) {
    setSelUsuarios((prev) => checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));
  }
  function selecionarTodosVisiveis() {
    setSelUsuarios((prev) => Array.from(new Set([...prev, ...usuariosVisiveis.filter((c) => !jaEnviados.has(c.id)).map((c) => c.id)])));
  }
  function limparSelecao() { setSelUsuarios([]); }

  async function enviarParaSelecionados() {
    if (!selUsuarios.length) { alert("Selecione pelo menos um usuário."); return; }
    const centsBase = reaisToCents(precoEnvioReais || precoPadraoReais);
    if (!centsBase || centsBase < 100) { alert("Defina um preço válido em reais. Ex.: 19,90"); return; }

    setEnvLoading(true);
    try {
      const batch = writeBatch(db);
      selUsuarios.forEach((uid) => {
        if (jaEnviados.has(uid)) return;
        const u = allUsuarios.find((user) => user.id === uid);
        const isFree = isUserFreeDemand(u);
        const amount = isFree ? 0 : centsBase;
        const paymentStatus: PaymentStatus = isFree ? "paid" : "pending";
        const billingType: "free" | "paid" = isFree ? "free" : "paid";
        const aRef = doc(db, "demandAssignments", `${demandaId}_${uid}`);
        batch.set(aRef, {
          demandId: demandaId, supplierId: uid, status: "sent" as AssignmentStatus,
          pricing: { amount, currency: "BRL", exclusive: false, cap: unlockCap ?? null, soldCount: 0 },
          paymentStatus, billingType, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        }, { merge: true });
      });
      batch.update(doc(db, "demandas", demandaId), { lastSentAt: serverTimestamp() });
      await batch.commit();
      alert(`Enviado para ${selUsuarios.length} usuário(s).`);
      setSelUsuarios([]);
    } catch (e: any) { console.error(e); alert(e.message || "Falha ao enviar a demanda."); } finally { setEnvLoading(false); }
  }

  // Ações por assignment
  async function setPaymentStatus(supplierId: string, status: PaymentStatus) {
    try { await updateDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`), { paymentStatus: status, updatedAt: serverTimestamp() }); } catch { alert("Erro ao atualizar pagamento."); }
  }
  async function unlockAssignment(supplierId: string) {
    try {
      const curUnlocked = assignments.filter((a) => a.status === "unlocked").length;
      if (unlockCap != null && curUnlocked >= unlockCap) { alert(`Limite de desbloqueios atingido (${unlockCap}).`); return; }
      const existing = assignments.find((x) => x.supplierId === supplierId);
      let billingType: "free" | "paid" = "paid";
      if (existing?.billingType) { billingType = existing.billingType; } else { const u = allUsuarios.find((usr) => usr.id === supplierId); billingType = isUserFreeDemand(u || undefined) ? "free" : "paid"; }
      await updateDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`), { status: "unlocked", unlockedByAdmin: true, unlockedAt: serverTimestamp(), updatedAt: serverTimestamp(), paymentStatus: "paid", billingType });
      await updateDoc(doc(db, "demandas", demandaId), { liberadoPara: arrayUnion(supplierId), liberacoesCount: increment(1), updatedAt: serverTimestamp() });
    } catch { alert("Erro ao liberar contato."); }
  }
  async function cancelAssignment(supplierId: string) {
    if (!window.confirm("Cancelar o envio? O fornecedor não poderá pagar/desbloquear.")) return;
    try {
      await updateDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`), { status: "canceled", paymentStatus: "pending", updatedAt: serverTimestamp() });
      await updateDoc(doc(db, "demandas", demandaId), { liberadoPara: arrayRemove(supplierId), updatedAt: serverTimestamp() }).catch(() => { });
      await deleteDoc(doc(db, "demandas", demandaId, "acessos", supplierId)).catch(() => { });
    } catch { alert("Erro ao cancelar envio."); }
  }
  async function reactivateAssignment(supplierId: string) {
    try { await updateDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`), { status: "sent", paymentStatus: "pending", updatedAt: serverTimestamp() }); } catch { alert("Erro ao reativar envio."); }
  }
  async function deleteAssignment(supplierId: string) {
    if (!window.confirm("Excluir completamente o envio?")) return;
    try {
      await updateDoc(doc(db, "demandas", demandaId), { liberadoPara: arrayRemove(supplierId), updatedAt: serverTimestamp() }).catch(() => { });
      await deleteDoc(doc(db, "demandas", demandaId, "acessos", supplierId)).catch(() => { });
      await deleteDoc(doc(db, "demandAssignments", `${demandaId}_${supplierId}`));
    } catch { alert("Erro ao excluir envio."); }
  }

  // Modal de Perfil
  const [openProfileUserId, setOpenProfileUserId] = useState<string | null>(null);
  const [profileLocalPrice, setProfileLocalPrice] = useState<string>("");
  const [profileNote, setProfileNote] = useState<string>("");
  const [profileCache, setProfileCache] = useState<Record<string, Usuario>>({});
  const [profileLoading, setProfileLoading] = useState(false);

  async function openProfile(uid: string) {
    setOpenProfileUserId(uid);
    setProfileLocalPrice(precoPadraoReais);
    setProfileNote("");
    if (profileCache[uid]) return;
    setProfileLoading(true);
    try {
      let s = await getDoc(doc(db, "usuarios", uid));
      if (!s.exists()) s = await getDoc(doc(db, "users", uid));
      if (!s.exists()) s = await getDoc(doc(db, "user", uid));
      if (s.exists()) {
        // aqui precisamos garantir que o usuario seja processado igual na busca
        const u = { id: s.id, ...s.data() } as Usuario; // Simplificado
        setProfileCache((prev) => ({ ...prev, [uid]: u }));
      }
    } finally { setProfileLoading(false); }
  }

  async function sendFromProfile(uid: string) {
    const centsBase = reaisToCents(profileLocalPrice || precoPadraoReais);
    if (!centsBase || centsBase < 100) { alert("Defina um preço válido (Ex.: 19,90)."); return; }
    try {
      const u = profileCache[uid] || allUsuarios.find((user) => user.id === uid);
      const isFree = isUserFreeDemand(u);
      const amount = isFree ? 0 : centsBase;
      const paymentStatus: PaymentStatus = isFree ? "paid" : "pending";
      const billingType: "free" | "paid" = isFree ? "free" : "paid";
      const ref = doc(db, "demandAssignments", `${demandaId}_${uid}`);
      await setDoc(ref, {
        demandId: demandaId, supplierId: uid, status: "sent" as AssignmentStatus,
        pricing: { amount, currency: "BRL", exclusive: false, cap: unlockCap ?? null, soldCount: 0 },
        paymentStatus, billingType, notes: (profileNote || "").trim(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, { merge: true });
      alert("Demanda enviada ao usuário.");
      setOpenProfileUserId(null);
    } catch (e: any) { alert(e.message || "Falha ao enviar a demanda."); }
  }

  async function toggleUserFreePlan(uid: string, currentFree: boolean) {
    const nextVal = !currentFree;
    const collectionsToUpdate = ["usuarios", "users", "user"];
    let updated = false;
    for (const colName of collectionsToUpdate) {
      try {
        const ref = doc(db, colName, uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) continue;
        await updateDoc(ref, { recebeGratisDemandas: nextVal, freeDemandAccess: nextVal, planoDemandasGratis: nextVal });
        updated = true;
      } catch { }
    }
    if (!updated) { alert("Não foi possível atualizar o plano deste fornecedor."); return; }
    const updatedUserFields = { recebeGratisDemandas: nextVal, freeDemandAccess: nextVal, planoDemandasGratis: nextVal };
    setAllUsuarios((prev) => prev.map((u) => (u.id === uid ? { ...u, ...updatedUserFields } : u)));
    setProfileCache((prev) => prev[uid] ? { ...prev, [uid]: { ...prev[uid], ...updatedUserFields } } : prev);
  }

  const unlockedCount = useMemo(() => assignments.filter((a) => a.status === "unlocked").length, [assignments]);
  const capInfo = unlockCap != null ? `${unlockedCount}/${unlockCap}` : String(unlockedCount);

  // CSS Responsivo
  useEffect(() => {
    const styleId = "pedraum-edit-demand-responsive-v4";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) { el = document.createElement("style"); el.id = styleId; document.head.appendChild(el); }
    el.innerHTML = ` @media (max-width: 860px) { input, select, textarea { max-width: 100% !important; } .sticky-top { position: sticky; top: 0; background: #fff; z-index: 2; } } `;
    return () => { try { el && el.remove(); } catch { } };
  }, []);

  if (loading) { return (<div style={S.centerBox}><LoaderIcon className="animate-spin" size={28} />&nbsp; Carregando demanda...</div>); }

  return (
    <section style={{ maxWidth: 1320, margin: "0 auto", padding: "32px 2vw 60px" }}>
      <Link href="/admin/demandas" style={S.backLink}><ArrowLeft size={19} /> Voltar</Link>
      <div style={S.gridWrap}>
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={S.cardTitle}>Editar Necessidade</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Limite de desbloqueios</div>
              <input type="number" min={0} value={unlockCap ?? ""} onChange={(e) => setUnlockCap(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} style={{ ...S.input, width: 110 }} placeholder="Ex.: 5" />
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Liberados: <b>{capInfo}</b></div>
            </div>
          </div>
          <div style={S.metaLine}>
            <div><b>ID:</b> {demandaId}</div> {createdAt && <div><b>Criada:</b> {createdAt}</div>} {userId && <div><b>UserID:</b> {userId}</div>}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700"><span className="font-semibold">Liberações:</span><span className="text-blue-600 font-bold">{liberacoesCount}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "8px 0 14px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 999, border: "1px solid #e5e7eb", fontWeight: 900, fontSize: 12, ...(demandaStatus === "approved" ? { background: "#ecfdf5", color: "#065f46" } : demandaStatus === "rejected" ? { background: "#fff1f2", color: "#9f1239" } : { background: "#f1f5f9", color: "#111827" }) }}>Status: {demandaStatus}</span>
          </div>

          <form onSubmit={handleSubmit}>
            <label style={S.label}>Título da Demanda</label>
            <input name="titulo" value={form.titulo} onChange={handleChange} required placeholder="Ex: Preciso de peça X / serviço Y" style={S.input} />
            <label style={S.label}>Descrição</label>
            <textarea name="descricao" value={form.descricao} onChange={handleChange} required placeholder="Detalhe sua necessidade..." style={{ ...S.input, minHeight: 110, resize: "vertical" }} />

            {/* Taxonomia */}
            <div style={S.twoCols}>
              <div style={{ flex: 1 }}>
                <label style={S.label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Layers size={16} /> Categoria</span></label>
                <select name="categoria" value={form.categoria} onChange={handleChange} required style={S.input} disabled={taxLoading}>
                  <option value="">{taxLoading ? "Carregando..." : "Selecione"}</option>
                  {categorias.map((c) => <option key={c.slug || c.nome} value={c.nome}>{c.nome}</option>)}
                </select>
                {form.categoria === "Outros" ? (
                  <textarea name="subcategoriaOutrosTexto" value={form.subcategoriaOutrosTexto} onChange={handleChange} required placeholder="Descreva o que você precisa / o que vende" style={{ ...S.input, minHeight: 80 }} />
                ) : (
                  <select name="subcategoria" value={form.subcategoria} onChange={handleChange} required style={S.input} disabled={!form.categoria}>
                    <option value="">{form.categoria ? "Selecione a subcategoria" : "Selecione a categoria"}</option>
                    {subsForm.map((s) => <option key={s.slug || s.nome} value={s.nome}>{s.nome}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Localização */}
            <div style={S.twoCols}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Estado (UF)</label>
                <select name="estado" value={form.estado} onChange={handleChange} required style={S.input}>
                  <option value="">Selecione o estado</option>
                  {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Cidade</label>
                <select name="cidade" value={form.cidade} onChange={handleChange} style={S.input} disabled={!form.estado || form.estado === "BRASIL" || carregandoCidades || !cidades.length}>
                  <option value="">{!form.estado ? "Selecione o estado" : form.estado === "BRASIL" ? "Brasil inteiro (sem cidade específica)" : carregandoCidades ? "Carregando cidades..." : "Selecione a cidade"}</option>
                  {cidades.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Anexos */}
            <label style={S.label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Upload size={16} color="#2563eb" /> Anexos</span></label>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr", border: "1px solid #eaeef4", borderRadius: 12, padding: 12 }}>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6ebf2", background: "radial-gradient(1200px 300px at -200px -200px, #eef6ff 0%, transparent 60%), #ffffff" }}>
                <div className="px-4 pt-4 pb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-sky-700" /><strong className="text-[#0f172a]">Imagens (opcional)</strong></div>
                <div className="px-4 pb-4">
                  <div className="rounded-lg border border-dashed p-3">
                    <ImageUploader imagens={imagens} setImagens={setImagens} max={5} collectionName="demandas" docId={demandaId} fieldName="imagens" />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Adicione até 5 imagens.</p>
                </div>
              </div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e6ebf2", background: "radial-gradient(1200px 300px at -200px -200px, #fff1e6 0%, transparent 60%), #ffffff" }}>
                <div className="px-4 pt-4 pb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-orange-600" /><strong className="text-[#0f172a]">Anexo PDF (opcional)</strong></div>
                <div className="px-4 pb-4 space-y-3">
                  <div className="rounded-lg border border-dashed p-3"><PDFUploader onUploaded={setPdfUrl} /></div>
                  {pdfUrl ? (
                    <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}>
                      {/* <DrivePDFViewer fileUrl={`/api/pdf-proxy?file=${encodeURIComponent(pdfUrl || "")}`} height={300} /> */}
                      {/* <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <a href={pdfUrl} target="_blank" rel="noreferrer" style={S.ghostBtn}>Abrir em nova aba</a>
                        <button type="button" onClick={() => setPdfUrl(null)} style={S.dangerBtn}>Remover PDF</button>
                      </div> */}
                    </div>
                  ) : <p className="text-xs text-slate-500">Envie orçamento, memorial ou ficha técnica (até ~8MB).</p>}
                </div>
              </div>
            </div>

            {/* Contato do solicitante */}
            <div style={{ marginTop: 14, padding: 12, border: "1px dashed #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
              <div style={{ fontWeight: 900, color: "#023047", marginBottom: 8 }}>Contato do solicitante</div>
              <div style={S.twoCols}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Nome</label>
                  <input name="contatoNome" value={form.contatoNome} onChange={(e) => setForm((f) => ({ ...f, contatoNome: e.target.value }))} placeholder="Ex.: João da Silva" style={S.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>E-mail</label>
                  <input name="contatoEmail" value={form.contatoEmail} onChange={(e) => setForm((f) => ({ ...f, contatoEmail: e.target.value }))} placeholder="exemplo@empresa.com" style={S.input} type="email" />
                </div>
              </div>
              <div style={S.twoCols}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>WhatsApp (formato obrigatório +55)</label>
                  <input name="contatoWhatsappMasked" value={form.contatoWhatsappMasked} onChange={(e) => setForm((f) => ({ ...f, contatoWhatsappMasked: formatWhatsappBRIntl(e.target.value) }))} onFocus={() => setForm((f) => ({ ...f, contatoWhatsappMasked: ensurePlus55Prefix(f.contatoWhatsappMasked) }))} onBlur={() => setForm((f) => ({ ...f, contatoWhatsappMasked: formatWhatsappBRIntl(f.contatoWhatsappMasked) }))} placeholder="+55 (DD) número" style={S.input} maxLength={20} inputMode="tel" />
                  {(() => { const d55 = extractDigits55FromMasked(form.contatoWhatsappMasked); const ok = !form.contatoWhatsappMasked || isValidBRWhatsappDigits(d55); return ok ? null : (<div style={{ fontSize: 12, color: "#b45309", marginTop: 6 }}>Informe no padrão +55 (DDD) 8–9 dígitos.</div>); })()}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Orçamento estimado (opcional)</label>
                  <input name="orcamento" value={form.orcamento} onChange={(e) => setForm((f) => ({ ...f, orcamento: e.target.value }))} type="number" min={0} placeholder="R$" style={S.input} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={S.label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><DollarSign size={16} /> Preço padrão do desbloqueio (R$)</span></label>
              <input value={precoPadraoReais} onChange={(e) => setPrecoPadraoReais(e.target.value)} placeholder="Ex.: 19,90" style={S.input} />
              <div style={S.hintText}>Sugerido ao enviar para usuários. Pode ser sobrescrito no envio.</div>
            </div>

            <label style={S.label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Tag size={16} color="#fb8500" /> Referências <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: 12 }}>(até 3)</span></span></label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.map((tg, idx) => (<span key={idx} style={S.chipTag}>{tg} <button type="button" onClick={() => removeTag(idx)} style={S.chipClose}>×</button></span>))}
              {tags.length < 3 && (<input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder="Nova tag" maxLength={16} style={{ ...S.input, width: 140 }} />)}
            </div>

            <label style={S.label}>Observações (opcional)</label>
            <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Alguma observação extra?" style={{ ...S.input, minHeight: 70 }} />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {demandaStatus !== "approved" && <button type="button" onClick={approveAndPublish} style={{ ...S.primaryBtn, background: "#16a34a", border: "1px solid #16a34a" }}><CheckCircle2 size={18} /> Aprovar &amp; Publicar</button>}
                {demandaStatus !== "rejected" && <button type="button" onClick={rejectDemand} style={S.dangerBtn}><XCircle size={18} /> Rejeitar</button>}
                {demandaStatus !== "pending" && <button type="button" onClick={backToPending} style={S.ghostBtn}>Voltar a pendente</button>}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" disabled={salvando} style={S.primaryBtn}><Save size={20} /> {salvando ? "Salvando..." : "Salvar Alterações"}</button>
                <button type="button" disabled={removendo} onClick={handleDelete} style={S.dangerBtn}><Trash2 size={20} /> {removendo ? "Excluindo..." : "Excluir"}</button>
              </div>
            </div>
          </form>
        </div>

        <div style={S.card}>
          <h2 style={S.cardTitle}><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Send size={20} color="#2563eb" /> Enviar esta demanda para usuários</span></h2>
          <div style={S.twoCols}>
            <div style={{ flex: 1 }}><label style={S.label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><DollarSign size={16} /> Preço do envio (R$)</span></label><input value={precoEnvioReais} onChange={(e) => setPrecoEnvioReais(e.target.value)} placeholder={`Sugerido: ${precoPadraoReais}`} style={S.input} /><div style={S.hintText}>Digite em reais, ex.: 25,00.</div></div>
            <div style={{ flex: 1 }}><label style={S.label}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ShieldCheck size={16} /> Limite de desbloqueios (cap)</span></label><input type="number" min={0} value={unlockCap ?? ""} onChange={(e) => setUnlockCap(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))} style={S.input} placeholder="Ex.: 5" /><div style={S.hintText}>A demanda respeita este limite total de desbloqueios.</div></div>
          </div>

          <div className="sticky-top" style={{ ...S.twoCols, alignItems: "flex-end", paddingTop: 10, borderBottom: "1px solid #eef2f7", paddingBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div><label style={S.miniLabel}><Filter size={13} /> Categoria</label><select value={fCat} onChange={(e) => setFCat(e.target.value)} style={{ ...S.input, width: 260 }} disabled={taxLoading}><option value="">{taxLoading ? "Carregando..." : "Todas"}</option>{categorias.map((c) => <option key={c.slug || c.nome} value={c.nome}>{c.nome}</option>)}</select></div>
              <div><label style={S.miniLabel}><Filter size={13} /> UF</label><select value={fUF} onChange={(e) => setFUF(e.target.value)} style={{ ...S.input, width: 140 }}><option value="">Todas</option>{UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}</select></div>
              <div><label style={S.miniLabel}><Filter size={13} /> Atuação</label><select value={fTipo} onChange={(e) => setFTipo(e.target.value)} style={{ ...S.input, width: 180 }}><option value="">Todas</option><option value="venda">Venda de produtos</option><option value="pecas">Peças</option><option value="servicos">Serviços</option></select></div>
              <div><label style={S.miniLabel}><Search size={13} /> Buscar</label><div style={{ display: "flex", gap: 6 }}><input value={qUser} onChange={(e) => setQUser(e.target.value)} placeholder="nome, e-mail, whatsapp, cidade ou id" style={{ ...S.input, width: 280 }} />{qUser && <button type="button" onClick={() => setQUser("")} style={S.ghostBtn}>Limpar</button>}</div></div>
              {/* NOVO BOTÃO DE FILTRO INTELIGENTE */}
              {/* <div
                onClick={() => setFiltroDescricaoAtivo(!filtroDescricaoAtivo)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                  background: filtroDescricaoAtivo ? "#e0f2fe" : "#f1f5f9",
                  border: `1px solid ${filtroDescricaoAtivo ? "#0ea5e9" : "#cbd5e1"}`,
                  padding: "0 10px", borderRadius: 6, height: 42,
                  color: filtroDescricaoAtivo ? "#0284c7" : "#64748b",
                  fontWeight: 600, fontSize: 13, userSelect: "none"
                }}
                title="Filtra usuários que tenham palavras-chave da descrição em seus produtos."
              >
                {filtroDescricaoAtivo ? <CheckCircle2 size={16} /> : <Filter size={16} />}
                Match Descrição
              </div> */}
              <button type="button" onClick={() => fetchAllUsuarios()} style={S.ghostBtn} title="Recarregar lista de usuários do banco de dados"><RefreshCw size={16} /> Atualizar</button>
            </div>
          </div>

          <div style={S.listBox}>
            <div style={S.listHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#334155", fontWeight: 800, fontSize: 13 }}><Users size={16} /> Usuários</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Selecionados: <b>{selUsuarios.length}</b></div>
            </div>
            <div style={{ maxHeight: "56vh", overflow: "auto" }}>
              {usuariosVisiveis.map((u) => {
                const nome = u.nome || u.email || `Usuário ${u.id}`;
                const contato = u.whatsappE164 || u.whatsapp || u.telefone || "—";
                const regioes = u.atendeBrasil ? "BRASIL" : u.ufs?.length ? u.ufs.join(", ") : u.estado || "—";
                const cats = u.categorias?.length ? u.categorias.join(", ") : "—";
                const already = jaEnviados.has(u.id);
                const selected = selUsuarios.includes(u.id);
                const isFree = isUserFreeDemand(u);

                return (
                  <div key={u.id} style={S.rowItem(already ? "#f1fff6" : selected ? "#f1f5ff" : "#fff")}>
                    <input type="checkbox" checked={selected || already} disabled={already} onChange={(e) => toggleUsuario(u.id, e.target.checked)} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 900, color: "#0f172a" }}>{nome}</span>
                          {already && <span style={S.chip("#eef2ff", "#3730a3")}><CheckCircle2 size={12} /> enviado</span>}
                          {u.patrocinador && <span style={S.chip("#fff7ed", "#9a3412")}>Patrocinador</span>}
                          {!u.patrocinador && isFree && <span style={S.chip("#ecfeff", "#155e75")}>Recebe grátis</span>}
                        </div>
                        <div style={S.subLine}>{u.email || "—"} • {contato} • {u.cidade || "—"}/{regioes}</div>
                        <div style={S.subMicro}>Categorias: {cats}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={() => openProfile(u.id)} style={S.ghostBtn}>Ver perfil</button>
                        <a href={`/admin/usuarios/${u.id}/edit`} target="_blank" rel="noreferrer" style={S.ghostBtn} title="Abrir no admin"><ExternalLink size={14} /></a>
                      </div>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>#{u.id}</span>
                    </div>
                  </div>
                );
              })}
              {!loadingUsuarios && usuariosVisiveis.length === 0 && <div style={{ padding: "24px 12px", textAlign: "center", color: "#64748b", fontSize: 14 }}>Nenhum usuário encontrado. Ajuste os filtros/busca.</div>}
              {loadingUsuarios && <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 14 }}><LoaderIcon className="animate-spin" size={16} /> Carregando...</div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button type="button" onClick={selecionarTodosVisiveis} style={S.ghostBtn}>Selecionar visíveis</button>
            <button type="button" onClick={limparSelecao} style={S.ghostBtn}>Limpar seleção</button>
            <div style={{ flex: 1 }} />
            <button type="button" onClick={enviarParaSelecionados} disabled={envLoading || selUsuarios.length === 0} style={S.primaryBtn}><Send size={18} /> {envLoading ? "Enviando..." : `Enviar (${selUsuarios.length})`}</button>
          </div>
        </div>
      </div>

      {openProfileUserId && (
        <ProfileModal userId={openProfileUserId} loading={profileLoading} cached={profileCache[openProfileUserId] || null} onClose={() => setOpenProfileUserId(null)} defaultPrice={precoPadraoReais} price={profileLocalPrice} onPrice={(v) => setProfileLocalPrice(v)} note={profileNote} onNote={(v) => setProfileNote(v)} onSend={() => sendFromProfile(openProfileUserId)} onToggleFreePlan={toggleUserFreePlan} />
      )}
    </section>
  );
}