// components/PDFUploader.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "@/lib/firebaseConfig";

type PdfLabels = {
  title?: string;         // "Arquivo PDF"
  helper?: string;
  button?: string;        // "Selecionar PDF"
  attached?: string;      // "PDF anexado:"
  open?: string;          // "abrir"
  remove?: string;        // "Remover"
  uploading?: string;     // "Enviando..."
  invalidType?: string;   // "Envie um arquivo PDF válido."
  tooLarge?: string;      // "Arquivo maior que {max}MB."
  routeError?: string;    // "Rota de upload de PDF não encontrada..."
  genericError?: string;  // "Falha no upload do PDF."
  limitHelper?: string;   // "Apenas 1 PDF • até {max}MB"
};

interface Props {
  /** URL inicial (modo edição) */
  initialUrl?: string | null;
  /** Callback com a URL final do PDF (ou null ao remover) */
  onUploaded: (url: string | null) => void;
  className?: string;
  disableUpload?: boolean;
  /** Tamanho máximo aceito (MB). Default: 16 */
  maxSizeMB?: number;
  /** Rótulos em PT-BR (opcional) */
  labels?: PdfLabels;
  endpoint?: string; // <--- ADICIONE ESTA LINHA

  /** Compat: páginas antigas passam `mode="create" | "edit"` (ignorado) */
  mode?: string;

  // NOVAS PROPS
  collectionName?: "usuarios" | "demandas" | "blog"; // Restringe às suas coleções
  docId?: string;       // O ID do documento para atualizar
  fieldName?: string;   // O nome do campo (ex: 'avatar', 'anexos')
}

const defaultLabels: Required<PdfLabels> = {
  title: "Arquivo PDF",
  helper: "",
  button: "Selecionar PDF",
  attached: "PDF anexado:",
  open: "abrir",
  remove: "Remover",
  uploading: "Enviando...",
  invalidType: "Envie um arquivo PDF válido.",
  tooLarge: "Arquivo maior que {max}MB.",
  routeError:
    "Rota de upload de PDF não encontrada no backend. Verifique 'pdfUploader'.",
  genericError: "Falha no upload do PDF.",
  limitHelper: "Apenas 1 PDF • até {max}MB",
};

export default function PDFUploader({
  initialUrl = null,
  onUploaded,
  className,
  disableUpload = false,
  maxSizeMB = 16,
  labels,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mode,
  collectionName,
  docId,
  fieldName,
  endpoint // <--- Receba aqui também se for usar
}: Props) {
  const L = { ...defaultLabels, ...(labels ?? {}) };

  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFile = useMemo(() => !!currentUrl, [currentUrl]);

  // 🔄 Mantém o estado sincronizado se a prop initialUrl mudar
  useEffect(() => {
    setCurrentUrl(initialUrl ?? null);
  }, [initialUrl]);

  async function handleRemove() {
    const urlParaDeletar = currentUrl;
    if (!urlParaDeletar) return;

    // 1. ATUALIZA A TELA (Rápido/Otimista)
    setCurrentUrl(null);
    onUploaded(null);

    try {
      // 2. DELETA O ARQUIVO FÍSICO (Storage)
      const fileRef = ref(storage, urlParaDeletar);
      await deleteObject(fileRef);

      // 3. LIMPA O BANCO DE DADOS (Firestore)
      if (collectionName && docId && fieldName) {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
          [fieldName]: "" // Limpa o campo da URL
        });
      }
      console.log("PDF removido do Storage e do Banco com sucesso.");

    } catch (error) {
      console.error("Erro ao remover PDF:", error);
      // TODO: Usar um sistema de toast para notificar o usuário
      console.warn("Erro ao remover: O PDF saiu da tela, mas pode ter ficado no servidor.");
    }
  }

  const handleFirebaseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validação de tipo e tamanho
    const maxBytes = maxSizeMB * 1024 * 1024;
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isSizeOk = file.size <= maxBytes;

    if (!isPDF) {
      alert(L.invalidType);
      return;
    }
    if (!isSizeOk) {
      alert(L.tooLarge.replace("{max}", String(maxSizeMB)));
      return;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      const path = `${collectionName || 'uploads'}/${docId || 'misc'}/${fieldName || 'files'}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const currentProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(Math.round(currentProgress));
        },
        (error) => {
          console.error("Erro no upload:", error);
          alert(L.genericError);
          setIsUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          if (collectionName && docId && fieldName) {
            try {
              const docRef = doc(db, collectionName, docId);
              await updateDoc(docRef, { [fieldName]: downloadURL });
              console.log(`PDF salvo em ${collectionName}/${docId} com sucesso!`);
            } catch (err) {
              console.error("Erro ao vincular PDF no banco:", err);
            }
          }

          setCurrentUrl(downloadURL);
          onUploaded(downloadURL);
          setIsUploading(false);
        }
      );
    } catch (error) {
      console.error("Erro ao iniciar upload:", error);
      alert(L.genericError);
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={className ?? "space-y-3"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{L.title}</span>
          <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-full border bg-white text-slate-700 border-slate-200">
            {hasFile ? "1/1" : "0/1"}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {L.limitHelper.replace("{max}", String(maxSizeMB))}
        </span>
      </div>

      {/* Área de Upload */}
      {!disableUpload && !hasFile && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white p-3">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFirebaseUpload}
            accept="application/pdf"
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="w-full max-w-xs mt-2 space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{L.uploading}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-orange-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-md font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors"
            >
              {L.button}
            </button>
          )}
          {!isUploading && <p className="text-xs text-slate-500 mt-2">{L.helper}</p>}
        </div>
      )}

      {/* Cartão de arquivo anexado */}
      {hasFile ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 flex items-center justify-between shadow-sm">
          <div className="truncate">
            <span className="font-semibold">{L.attached}</span>{" "}
            <a
              href={currentUrl!}
              target="_blank"
              rel="noreferrer"
              className="underline hover:no-underline"
            >
              {L.open}
            </a>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="ml-3 bg-white hover:bg-slate-50 border rounded-md px-2 py-1 text-xs font-semibold text-red-600 border-red-200 shadow-sm"
          >
            {L.remove}
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          {isUploading ? L.uploading : ""}
        </p>
      )}
    </div>
  );
}
