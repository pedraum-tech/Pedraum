import { Usuario } from "./types";

export const UFS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const UF_MAP: Record<string, string> = {
    "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM", "bahia": "BA", "ceara": "CE",
    "distrito federal": "DF", "espirito santo": "ES", "goias": "GO", "maranhao": "MA", "mato grosso": "MT",
    "mato grosso do sul": "MS", "minas gerais": "MG", "para": "PA", "paraiba": "PB", "parana": "PR",
    "pernambuco": "PE", "piaui": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS",
    "rondonia": "RO", "roraima": "RR", "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO",
    "brasil": "BRASIL", "nacional": "BRASIL"
};

export const noAcento = (s: string) =>
    (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export const toUF = (val?: string): string => {
    if (!val) return "";
    const upp = val.toUpperCase().trim();
    if ((UFS as readonly string[]).includes(upp)) return upp;
    return UF_MAP[noAcento(val)] || "";
};

export const BIO_KEYS = [
    "bio", "descricaoPublica", "sobre", "observacoesPublicas", "descricao", "about", "obsPublicas",
];

export function firstNonEmptyString(obj: any, keys: string[]): string {
    for (const k of keys) {
        const v = obj?.[k];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
}

export function buildAtuacaoBullets(u: any): string[] {
    const out: string[] = [];
    const arr = Array.isArray(u?.atuacaoBasica) ? u.atuacaoBasica : [];
    for (const a of arr) {
        if (!a?.categoria) continue;
        const parts: string[] = [];
        if (a?.vendaProdutos?.ativo && a?.vendaProdutos?.obs) parts.push(`Produtos: ${a.vendaProdutos.obs}`);
        if (a?.vendaPecas?.ativo && a?.vendaPecas?.obs) parts.push(`Peças: ${a.vendaPecas.obs}`);
        if (a?.servicos?.ativo && a?.servicos?.obs) parts.push(`Serviços: ${a.servicos.obs}`);
        if (parts.length) out.push(`${a.categoria}: ${parts.join(" | ")}`);
    }
    return out;
}

export const extractUFsFromFreeText = (val?: string): string[] => {
    if (!val) return [];
    const parts = val.replace(/[|/\\\-–—,;:\(\)\[\]]/g, " ").split(/\s+/).filter(Boolean);
    const out = new Set<string>();
    for (const p of parts) {
        const uf = toUF(p);
        if (uf) out.add(uf);
    }
    return Array.from(out);
};

export const getUFSetFromUser = (u: any): Set<string> => {
    const out = new Set<string>();
    const addMaybe = (x?: string) => { const uf = toUF(x || ""); if (uf) out.add(uf); };
    (u.ufs || []).forEach(addMaybe);
    (u.ufsAtendidas || []).forEach(addMaybe);
    [u.estado, u.state, u.uf, u.endereco?.uf, u.endereco?.estado].forEach(addMaybe);
    [u.cidade, u.localizacao, u.regioes, u.regioesAtendidas, u.endereco?.cidade]
        .forEach((x: string) => extractUFsFromFreeText(x).forEach((uf) => out.add(uf)));
    if (u.atendeBrasil) out.add("BRASIL");
    return out;
};

export const toReais = (cents?: number) => `R$ ${(Number(cents || 0) / 100).toFixed(2).replace(".", ",")}`;

export const reaisToCents = (val: string) => {
    const n = Number(String(val || "0").replace(/\./g, "").replace(",", "."));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
};

export const norm = (s?: string) =>
    (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();

export const onlyDigits = (v: string) => (v || "").replace(/\D/g, "");

// WhatsApp Helpers
export function normalizeBRWhatsappDigits(raw?: string): string {
    let d = onlyDigits(raw || "");
    if (!d) return "";
    d = d.replace(/^0+/, "");
    if (d.startsWith("55555")) d = d.slice(2);
    if (d.startsWith("55")) {
        let rest = d.slice(2);
        if (rest.length > 11) rest = rest.slice(0, 11);
        if (rest.length !== 10 && rest.length !== 11) return "";
        return "55" + rest;
    }
    if (d.length === 10 || d.length === 11) return "55" + d;
    if (d.length > 11) {
        const tail11 = d.slice(-11);
        const tail10 = d.slice(-10);
        if (/^\d{11}$/.test(tail11)) return "55" + tail11;
        if (/^\d{10}$/.test(tail10)) return "55" + tail10;
    }
    return "";
}

export function maskFrom55Digits(d55?: string): string {
    if (!d55 || !d55.startsWith("55")) return "";
    const ddd = d55.slice(2, 4);
    const core = d55.slice(4);
    if (core.length === 8) return `+55 (${ddd}) ${core.slice(0, 4)}-${core.slice(4)}`;
    if (core.length === 9) return `+55 (${ddd}) ${core.slice(0, 5)}-${core.slice(5)}`;
    return `+55 (${ddd}) ${core}`;
}

export function ensurePlus55Prefix(masked: string) {
    const t = (masked || "").trim();
    return t.startsWith("+55") ? t : `+55 ${t.replace(/^\+?/, "")}`;
}

export function isValidBRWhatsappDigits(d55: string) {
    if (!/^55\d{10,11}$/.test(d55)) return false;
    const ddd = d55.slice(2, 4);
    return /^\d{2}$/.test(ddd);
}

export function formatWhatsappBRIntl(inp: string): string {
    const d = normalizeBRWhatsappDigits(inp);
    return d ? maskFrom55Digits(d) : ensurePlus55Prefix(inp);
}

export function extractDigits55FromMasked(masked: string): string {
    return normalizeBRWhatsappDigits(masked);
}

// Plan & Stats Helpers
export function deriveUserFreePlanFromRaw(raw: any): boolean {
    if (!raw) return false;
    if (raw.patrocinador) return true;
    return !!(raw.recebeGratisDemandas || raw.freeDemandAccess || raw.planoDemandasGratis || raw.demandasGratis);
}

export function deriveDemandStatsFromRaw(raw: any) {
    const stats = raw?.demandStats || raw?.statsDemandas || {};
    const sent = typeof stats.enviadas === "number" ? stats.enviadas :
        typeof stats.sent === "number" ? stats.sent :
            typeof raw?.demandasEnviadas === "number" ? raw.demandasEnviadas :
                typeof raw?.totalDemandasEnviadas === "number" ? raw.totalDemandasEnviadas :
                    typeof raw?.totalDemandasRecebidas === "number" ? raw.totalDemandasRecebidas : 0;

    const unlocked = typeof stats.desbloqueadas === "number" ? stats.desbloqueadas :
        typeof stats.unlocked === "number" ? stats.unlocked :
            typeof raw?.demandasDesbloqueadas === "number" ? raw.demandasDesbloqueadas : 0;

    const freeCount = typeof stats.gratuitas === "number" ? stats.gratuitas :
        typeof stats.free === "number" ? stats.free :
            typeof raw?.demandasGratuitas === "number" ? raw.demandasGratuitas : 0;

    return { demStatsTotalSent: sent, demStatsUnlocked: unlocked, demStatsFree: freeCount };
}

export function isUserFreeDemand(u?: Usuario | null): boolean {
    if (!u) return false;
    if (u.patrocinador) return true;
    return !!u.recebeGratisDemandas;
}

export function docToUsuario(d: any): Usuario {
    // Aceita tanto um DocumentSnapshot do Firestore quanto um objeto cru
    const raw = d.data && typeof d.data === 'function' ? d.data() : d;
    const id = d.id || raw.id;
    const stats = deriveDemandStatsFromRaw(raw);
    const recebeGratis = deriveUserFreePlanFromRaw(raw);

    const out: Usuario = {
        id: id,
        ...raw,
        bio: firstNonEmptyString(raw, BIO_KEYS),
        categorias: Array.isArray(raw.categorias) ? raw.categorias : [],
        categoriasAtuacaoPairs: Array.isArray(raw.categoriasAtuacaoPairs) ? raw.categoriasAtuacaoPairs : [],
        atuacaoBasica: Array.isArray(raw.atuacaoBasica) ? raw.atuacaoBasica : [],
        categoriesAll: Array.isArray(raw.categoriesAll) ? raw.categoriesAll : [],
        ufs: Array.isArray(raw.ufs) ? raw.ufs : Array.isArray(raw.ufsAtendidas) ? raw.ufsAtendidas : [],
        atendeBrasil: !!raw.atendeBrasil,
        recebeGratisDemandas: recebeGratis,
        demStatsTotalSent: stats.demStatsTotalSent,
        demStatsUnlocked: stats.demStatsUnlocked,
        demStatsFree: stats.demStatsFree,
    };
    return out;
}

// --- 1. CONFIGURAÇÃO DO FILTRO INTELIGENTE (COPIAR ISSO) ---

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