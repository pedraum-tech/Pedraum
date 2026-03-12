// src/components/ui/MaintenanceScreen.tsx — Versão Premium Pedraum

import { Settings, ShieldCheck, MessageCircle } from "lucide-react";

export default function MaintenanceScreen() {
    return (
        <div className="min-h-screen bg-[#F6F9FA] flex flex-col items-center justify-center p-6 font-inter">

            <div className="max-w-3xl w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] p-10 md:p-14 text-center border border-gray-100 animate-in fade-in zoom-in duration-700">

                {/* ÍCONE DE INFRAESTRUTURA SEGURO */}
                <div className="flex justify-center mb-8 relative">
                    <div className="w-28 h-28 bg-orange-50 rounded-full flex items-center justify-center relative z-10 border-4 border-white shadow-md">
                        <Settings className="w-14 h-14 text-[#FF9900] animate-[spin_6s_linear_infinite]" />
                    </div>
                    <div className="absolute top-0 right-1/2 translate-x-12 -translate-y-3 bg-[#023047] text-white p-3 rounded-full shadow-lg z-20">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                </div>

                {/* TÍTULO E DESCRIÇÃO */}
                <h1 className="text-3xl md:text-5xl font-extrabold text-[#023047] mb-6 leading-tight">
                    Estamos atualizando nossos sistemas
                </h1>

                <p className="text-gray-600 text-lg leading-relaxed mb-10 max-w-2xl mx-auto font-medium">
                    Para garantir a máxima <strong>segurança, estabilidade e a melhor experiência</strong> para todos os nossos usuários, a PedraUm está passando por uma manutenção de infraestrutura programada.
                </p>

                {/* CAIXA DE PREVISÃO — ESTILIZADA PREMIUM */}
                <div className="bg-[#fdf7ee] border-2 border-dashed border-orange-100 rounded-2xl p-8 mb-10 text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 bg-[#FF9900]/10 text-[#FF9900] rounded-bl-xl font-bold text-xs uppercase">Estável</div>

                    <h3 className="font-extrabold text-[#023047] text-lg mb-3 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#FF9900] animate-pulse"></span>
                        Previsão de Retorno
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                        Nossa equipe de engenharia está trabalhando duro. O sistema voltará ao ar em breve com todos os dados protegidos e operando em força total.
                    </p>
                </div>

                {/* AÇÃO E CONTATO — RECRIANDO O BOTÃO WHATSAPP */}
                <div className="flex flex-col items-center justify-center gap-5 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">Tem uma demanda urgente?</p>
                    <a
                        href="https://wa.me/553190903613" // <-- COLOQUE O NÚMERO DA PEDRAUM AQUI
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#1ebd5a] text-white font-extrabold py-4 px-10 rounded-full transition-all shadow-lg shadow-green-500/30 hover:scale-105"
                    >
                        <MessageCircle className="w-6 h-6" />
                        Fale conosco no WhatsApp
                    </a>
                </div>

            </div>

            {/* RODAPÉ LIMPO E MODERNO */}
            <div className="mt-10 text-gray-400 text-sm font-medium tracking-wide">
                © {new Date().getFullYear()} Pedraum Brasil. Todos os direitos reservados.
                <div className="text-xs mt-1 font-light">Seus dados estão protegidos.</div>
            </div>

        </div>
    );
}