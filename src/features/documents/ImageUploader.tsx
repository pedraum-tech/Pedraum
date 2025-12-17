// components/ImageUploader.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { storage, db } from "@/lib/firebaseConfig";


type UploaderLabels = {
  title?: string;          // "Imagens"
  helper?: string;         // "Arraste e solte ou clique para enviar"
  counter?: string;        // "Você pode adicionar até {restantes} imagem(ns)."
  limitReached?: string;   // "Limite de {max} imagens atingido."
  uploading?: string;      // "Enviando..."
  button?: string;         // "Selecionar imagens"
  moveLeft?: string;       // "Mover para a esquerda"
  moveRight?: string;      // "Mover para a direita"
  remove?: string;         // "Remover"
  errorRoute?: string;     // "Rota de upload não encontrada..."
  errorGeneric?: string;   // "Falha no upload."
};

interface Props {
  imagens: string[];
  setImagens: (urls: string[]) => void;
  max?: number;
  circular?: boolean;
  // endpoint?: EndpointName;
  className?: string;
  enableReorder?: boolean;
  labels?: UploaderLabels;

  // NOVAS PROPS
  collectionName?: "usuarios" | "demandas" | "blog"; // Restringe às suas coleções
  docId?: string;       // O ID do documento para atualizar
  fieldName?: string;   // O nome do campo (ex: 'avatar', 'anexos')
}

const defaultLabels: Required<UploaderLabels> = {
  title: "Imagens",
  helper: "Arraste e solte ou clique para enviar",
  counter: "Você pode adicionar até {restantes} imagem(ns).",
  limitReached: "Limite de {max} imagens atingido.",
  uploading: "Enviando...",
  button: "Selecionar imagens",
  moveLeft: "Mover para a esquerda",
  moveRight: "Mover para a direita",
  remove: "Remover",
  errorRoute:
    "Rota de upload não encontrada no backend. Confira o slug no ourFileRouter.",
  errorGeneric: "Falha no upload.",
};

export default function ImageUploader({
  imagens,
  setImagens,
  max = 5,
  circular = false,
  className,
  enableReorder = true,
  labels,
  collectionName,
  docId,
  fieldName,
}: Props) {
  const L = { ...defaultLabels, ...(labels ?? {}) };

  const [isUploading, setIsUploading] = useState(false);

  const limiteAtingido = useMemo(
    () => imagens.length >= max,
    [imagens.length, max],
  );
  const restantes = useMemo(
    () => Math.max(0, max - imagens.length),
    [imagens.length, max],
  );

  async function remover(idx: number) {
    // Guarda a URL antes de tirar da lista, senão perdemos a referência
    const urlParaDeletar = imagens[idx];

    // 1. ATUALIZA A TELA (Rápido/Otimista)
    const clone = [...imagens];
    clone.splice(idx, 1);
    setImagens(clone);

    try {
      // 2. DELETA O ARQUIVO FÍSICO (Storage)
      // O Firebase é esperto: ele entende a URL completa e acha o arquivo para deletar
      const fileRef = ref(storage, urlParaDeletar);
      await deleteObject(fileRef);

      // 3. LIMPA O BANCO DE DADOS (Firestore)
      if (collectionName && docId && fieldName) {
        const docRef = doc(db, collectionName, docId);

        if (max === 1) {
          // Se for Avatar (max=1), a gente limpa o campo (string vazia)
          await updateDoc(docRef, {
            [fieldName]: ""
          });
        } else {
          // Se for Demanda (lista), a gente remove só essa URL específica do array
          await updateDoc(docRef, {
            [fieldName]: arrayRemove(urlParaDeletar)
          });
        }
      }
      console.log("Imagem removida do Storage e do Banco com sucesso.");

    } catch (error) {
      console.error("Erro ao remover imagem completa:", error);
      // TODO: Substituir 'alert' por um sistema de notificação (toast) não-bloqueante para melhor UX.
      console.warn("Erro ao remover: A imagem saiu da tela, mas pode ter ficado no servidor.");
    }
  }

  function mover(idx: number, dir: -1 | 1) {
    if (!enableReorder) return;
    const novo = [...imagens];
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= novo.length) return;
    [novo[idx], novo[alvo]] = [novo[alvo], novo[idx]];
    setImagens(novo);
  }

  useEffect(() => {
    if (imagens.length > max) setImagens(imagens.slice(0, max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max]);

  const [progress, setProgress] = useState(0);

  // Ref auxiliar para calcular a média quando há múltiplos arquivos
  const progressMap = useRef<{ [key: string]: number }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFirebaseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setProgress(0);
    progressMap.current = {}; // Reseta o mapa de progresso

    try {
      const remainingSlots = Math.max(0, max - imagens.length);

      if (remainingSlots === 0) {
        // Usar console.warn ou um toast é melhor que alert, que bloqueia a tela.
        console.warn(L.limitReached?.replace("{max}", String(max)) || "Limite atingido");
        setIsUploading(false);
        return;
      }

      const filesArray = Array.from(files).slice(0, remainingSlots);

      // Prepara o mapa com 0% para todos os arquivos
      filesArray.forEach(f => progressMap.current[f.name] = 0);

      const uploadPromises = filesArray.map((file) => {
        return new Promise<string>((resolve, reject) => {
          // Cria a referência com um caminho bem estruturado: collection/docId/field/filename
          const path = `${collectionName || 'uploads'}/${docId || 'misc'}/${fieldName || 'files'}/${Date.now()}-${file.name}`;
          const storageRef = ref(storage, path);

          // Usa o Resumable ao invés do uploadBytes simples
          const uploadTask = uploadBytesResumable(storageRef, file);

          // Escuta os eventos
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              // Calcula progresso deste arquivo específico
              const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

              // Atualiza no mapa
              progressMap.current[file.name] = fileProgress;

              // Calcula a média total para a UI
              const values = Object.values(progressMap.current);
              const totalProgress = values.reduce((a, b) => a + b, 0) / values.length;

              setProgress(Math.round(totalProgress));
            },
            (error) => {
              // Caso dê erro neste arquivo
              reject(error);
            },
            async () => {
              // Caso finalize com sucesso
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      });

      const newUrls = await Promise.all(uploadPromises);

      if (newUrls.length > 0) {

        // --- BLOCO NOVO: SALVAR NO FIRESTORE ---
        if (collectionName && docId && fieldName) {
          try {
            const docRef = doc(db, collectionName, docId);

            // LÓGICA NOVA: 
            // Se max for 1, a gente entende que é "Substituição" (ex: Avatar)
            // Se max > 1, a gente entende que é "Adicionar na lista" (ex: Galeria)
            if (max === 1) {
              await updateDoc(docRef, {
                [fieldName]: newUrls[0] // Salva a URL direta (String)
              });
            } else {
              await updateDoc(docRef, {
                [fieldName]: arrayUnion(...newUrls) // Adiciona ao array existente
              });
            }

            console.log(`Salvo em ${collectionName}/${docId} com sucesso!`);
          } catch (err) {
            console.error("Erro ao vincular no banco:", err);
            // Não paramos o fluxo visual se der erro no banco, mas avisamos no console
          }
        }
        // ----------------------------------------

        const unique = Array.from(new Set([...imagens, ...newUrls])).slice(0, max);
        setImagens(unique);
      }

    } catch (error: any) {
      console.error("Erro Firebase:", error);
      // TODO: Substituir 'alert' por um sistema de notificação (toast) não-bloqueante para melhor UX.
      console.error("Erro ao enviar imagem: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Lógica de normalização: Garante que sempre teremos um array
  const listaImagens = Array.isArray(imagens)
    ? imagens
    : (typeof (imagens as any) === 'string' && (imagens as any).length > 0)
      ? [imagens] // <--- AQUI ESTÁ A MÁGICA: Envolve a string em colchetes
      : [];

  console.log('Lista Final para Renderizar:', listaImagens); // Para confirmar

  return (
    <div className={className ?? "space-y-3"}>
      {/* Header (MANTIDO IGUAL) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{L.title}</span>
          <span className="inline-flex items-center justify-center text-xs font-semibold px-2 py-0.5 rounded-full border bg-white text-slate-700 border-slate-200">
            {imagens.length}/{max}
          </span>
        </div>
      </div>

      {/* Área de Upload */}
      {!limiteAtingido ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white p-3">

          {/* --- INICIO DA ALTERAÇÃO --- */}

          <div className="flex flex-col items-start">
            {/* 1. Input invisível que recebe os arquivos */}
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFirebaseUpload}
              accept="image/*"
              disabled={isUploading}
            />

            {/* Se estiver enviando, mostra a barra. Se não, mostra o botão. */}
            {isUploading ? (
              <div className="w-full max-w-xs mt-2 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Enviando...</span>
                  <span>{progress}%</span>
                </div>
                {/* Container da barra cinza */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  {/* A barra azul que cresce */}
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              // O Botão original
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {L.button}
              </button>
            )}

            {/* Legenda (só mostra se não estiver enviando para não poluir) */}
            {!isUploading && (
              <span className="text-xs text-slate-500 mt-1">
                Formatos suportados (Máx {max})
              </span>
            )}

          </div>

          {/* --- FIM DA ALTERAÇÃO --- */}

          {/* TODO: Implementar a lógica de onDrop, onDragOver, onDragLeave aqui para o Drag and Drop funcionar. */}
          <p className="text-xs text-slate-500 mt-2">{L.helper}</p>
        </div>
      ) : (
        <p className="text-sm text-red-500">
          {L.limitReached.replace("{max}", String(max))}
        </p>
      )}

      {/* Restante do código (Contador e Grade) continua IGUAL ... */}
      <div className="text-xs text-slate-500">
        {isUploading
          ? L.uploading
          : L.counter.replace("{restantes}", String(restantes))}
      </div>

      {/* ... grid de imagens ... */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 h-[calc(30rem+30px)] overflow-y-auto">
        {listaImagens.map((url, i) => (
          <div
            key={url} // A URL é garantidamente única aqui, sendo uma chave melhor e mais limpa.
            className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm z-0 h-10"
          >
            {/* A Imagem */}
            <img
              src={url}
              alt={`Imagem ${i + 1}`}
              className={[
                "w-full  h28 object-cover", // 7rem é o valor de h-28, que era a altura anterior
                circular ? "rounded-full" : "",
              ].join(" ")}
            />

            {/* Container dos Botões - Alterado para Z-Index alto e posição fixa */}
            <div className="absolute top-2 right-2 z-10 flex gap-1">

              {/* Botões de Mover (Setinhas) */}
              {enableReorder && (
                <>
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    className="bg-white/90 hover:bg-white text-slate-700 rounded-full p-1.5 shadow-md"
                    title={L.moveLeft}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    className="bg-white/90 hover:bg-white text-slate-700 rounded-full p-1.5 shadow-md"
                    title={L.moveRight}
                  >
                    ▶
                  </button>
                </>
              )}

              {/* Botão de Remover (Vermelho) */}
              <button
                type="button"
                onClick={() => remover(i)}
                className="bg-red-600 text-white rounded-full p-2 shadow-lg hover:bg-red-700 transition-transform hover:scale-105"
                title={L.remove}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );


}
