import Link from "next/link";
import { Info, Pencil, ArrowLeftRight } from "lucide-react";
import { STATUS_META, fmtDate, StatusCode } from "../utils";

// Definindo o tipo básico aqui para não depender de imports circulares
// Se tiver um arquivo de types global, melhor usar de lá.
interface DemandaProps {
    id: string;
    titulo: string;
    categoria?: string;
    criador?: string;
    emailCriador?: string;
    status?: string | StatusCode;
    createdAt?: any;
    visibilidade?: "publica" | "oculta";
    liberacoesCount?: number;
    [key: string]: any;
}

interface CardProps {
    d: DemandaProps;
    selected: boolean;
    onSelect: () => void;
    onDrawer: (d: any) => void;
    onChangeStatus: (d: any) => void;
}

export function DemandaCard({ d, selected, onSelect, onDrawer, onChangeStatus }: CardProps) {
    const statusCode = (d.status as StatusCode) || "pending";
    // Fallback seguro caso o status venha errado do banco
    const meta = STATUS_META[statusCode] || STATUS_META.pending;

    return (
        <>
            <article className="card">
                <div className="card-top">
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={onSelect}
                        className="chk"
                    />
                    <h3 className="card-title">{d.titulo}</h3>
                    <button
                        className="icon-btn"
                        title="Detalhes"
                        onClick={() => onDrawer(d)}
                    >
                        <Info size={18} color="#2563eb" />
                    </button>
                </div>

                {d.categoria && <div className="card-cat">{d.categoria}</div>}

                {(d.criador || d.emailCriador) && (
                    <div className="card-author">
                        {d.criador || "—"}{" "}
                        {d.emailCriador && (
                            <span className="muted">({d.emailCriador})</span>
                        )}
                    </div>
                )}

                <div className="badges">
                    <span
                        className="status"
                        style={{ background: meta.bg, color: meta.color }}
                    >
                        {meta.label}
                    </span>
                    <span
                        className={
                            d.visibilidade === "oculta"
                                ? "vis-badge oculta"
                                : "vis-badge publica"
                        }
                    >
                        {d.visibilidade === "oculta" ? "Oculta" : "Pública"}
                    </span>
                    <span className="muted small">Criado: {fmtDate(d.createdAt)}</span>
                </div>

                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="lib-badge">
                        Liberações: {d.liberacoesCount ?? 0}
                    </span>
                </div>

                <div className="card-actions">
                    <Link
                        href={`/admin/demandas/${d.id}/edit`}
                        className="pill pill-edit"
                    >
                        <Pencil size={16} /> Editar
                    </Link>
                    <button
                        className="pill pill-warn"
                        onClick={() => onChangeStatus(d)}
                        title="Trocar status"
                    >
                        <ArrowLeftRight size={16} /> Status
                    </button>
                    <button className="pill" onClick={() => onDrawer(d)}>
                        Ações
                    </button>
                </div>
            </article>

            <style jsx>{`
        .card {
          background: #fff;
          border: 1.5px solid #eef2f7;
          border-radius: 18px;
          padding: 18px 18px 14px;
          box-shadow: 0 2px 14px #0000000a;
          transition: box-shadow 0.12s, transform 0.12s;
        }
        .card:hover {
          box-shadow: 0 6px 22px #00000014;
          transform: translateY(-1px);
        }
        .card-top {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .chk {
          margin-top: 3px;
        }
        .card-title {
          margin: 0;
          font-size: 1.12rem;
          font-weight: 900;
          color: #023047;
          flex: 1;
        }
        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
        }
        .card-cat {
          color: #fb8500;
          font-weight: 900;
          margin-top: 3px;
        }
        .card-author {
          color: #2563eb;
          font-weight: 800;
          font-size: 0.96rem;
        }
        .card-author .muted {
          color: #94a3b8;
          font-weight: 500;
          margin-left: 4px;
        }
        .badges {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .status {
          font-weight: 900;
          font-size: 0.92rem;
          border-radius: 8px;
          padding: 4px 12px;
        }
        .vis-badge {
          font-weight: 800;
          font-size: 0.86rem;
          border-radius: 8px;
          padding: 3px 10px;
          border: 1px solid;
        }
        .vis-badge.publica {
          background: #e8f8fe;
          color: #2563eb;
          border-color: #e0ecff;
        }
        .vis-badge.oculta {
          background: #f3f4f6;
          color: #6b7280;
          border-color: #e5e7eb;
        }
        .lib-badge {
            font-size: 0.8rem;
            background: #e0ecff;
            color: #1d4ed8;
            border-radius: 999px;
            padding: 3px 10px;
            font-weight: 800;
        }
        .muted {
          color: #94a3b8;
        }
        .small {
          font-size: 0.82rem;
        }
        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid #e8edf3;
          font-weight: 800;
          background: #fff;
          cursor: pointer;
        }
        .pill-edit {
          background: #e8f8fe;
          color: #2563eb;
          border: 1px solid #e0ecff;
        }
        .pill-warn {
          background: #fff7ea;
          color: #fb8500;
          border: 1px solid #ffeccc;
        }
      `}</style>
        </>
    );
}