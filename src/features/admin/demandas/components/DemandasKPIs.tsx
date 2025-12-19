import React from "react";

interface KPIProps {
    kpi: {
        hoje: number;
        andamento: number;
        fechadas: number;
        rejeitadas: number;
    };
}

export function DemandasKPIs({ kpi }: KPIProps) {
    return (
        <>
            <div className="kpis">
                <div className="kpi">
                    <div className="kpi-label">Criadas hoje</div>
                    <div className="kpi-value" style={{ color: "#2563eb" }}>
                        {kpi.hoje}
                    </div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Em andamento</div>
                    <div className="kpi-value" style={{ color: "#FB8500" }}>
                        {kpi.andamento}
                    </div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Encerradas</div>
                    <div className="kpi-value" style={{ color: "#d90429" }}>
                        {kpi.fechadas}
                    </div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Rejeitadas</div>
                    <div className="kpi-value" style={{ color: "#6b7280" }}>
                        {kpi.rejeitadas}
                    </div>
                </div>
            </div>

            <style jsx>{`
        .kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 12px;
        }
        .kpi {
          background: #fff;
          border: 1.5px solid #edf2f7;
          border-radius: 16px;
          padding: 14px 18px;
          box-shadow: 0 2px 14px #0000000a;
        }
        .kpi-label {
          color: #6b7280;
          font-weight: 600;
          font-size: 0.92rem;
        }
        .kpi-value {
          font-size: 2rem;
          font-weight: 900;
        }
        @media (max-width: 900px) {
          .kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
        </>
    );
}