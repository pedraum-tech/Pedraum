"use client";



import Hero from "@/features/landing-page/Hero";
import FeaturesSection from "@/features/landing-page/FeaturesSection";
import TestimonialsSection from "@/features/landing-page/TestimonialsSection";
import DemandasShowcase from "@/features/demandas/DemandasShowcase";
import SectionTransition from "@/components/ui/SectionTransition";
import NewsletterSection from "@/features/landing-page/NewsletterSection";
import HowItWorks from "@/features/landing-page/HowItWorks";
import SuppliersServices from "@/features/landing-page/SuppliersServices";

interface Machine {
  id: string;
  nome: string;
  preco: string;
  imagens: string[];
  promovida?: boolean;
}
interface Demanda {
  id: string;
  categoria: string;
  descricao: string;
}

export default function HomePage() {

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8f0ff] via-[#fdf7ee] to-[#e8eaff] font-inter">
      {/* HERO com wrapper-alvo do tour */}
      <div className="home-hero-section">
        <Hero />
        {/* IMPORTANTE: dentro do componente Hero, o botão principal precisa ter className="home-hero-cta" */}
      </div>

      {/* Benefícios */}
      <div className="mt-20">
        <FeaturesSection />
      </div>

      {/* Como funciona (3 passos) */}
      <div className="mt-24">
        <HowItWorks />
      </div>

      {/* Demandas recentes (wrapper-alvo do tour) */}
      <div className="mt-24 demandas-section">
        <DemandasShowcase />
      </div>

      {/* Fornecedores e serviços */}
      <div className="mt-24">
        <SuppliersServices />
      </div>



      {/* Depoimentos (wrapper-alvo do tour) */}
      <div className="mt-24 mb-24 testimonials-section">
        <TestimonialsSection />
      </div>

      {/* Transição estética + Newsletter */}
      <div className="mt-24">
        <SectionTransition />
      </div>
      <NewsletterSection />
    </main>
  );
}
