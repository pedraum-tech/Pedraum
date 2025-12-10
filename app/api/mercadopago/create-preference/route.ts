import { NextResponse } from "next/server";
import { getPreference } from "@/lib/mercadopago";

/** Cria preferência no Mercado Pago */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      id = "item-001",
      title = "Produto ou Lead",
      quantity = 1,
      currency_id = "BRL",

      // preço em centavos (preferível)
      unitPriceCents,
      // fallback em reais
      unit_price: unitPriceReais,

      // metadados opcionais para rastreio
      kind = "lead",
      refId,
      metadata,
    } = body ?? {};

    // Normaliza preço para REAIS (o SDK espera em reais)
    const priceCents =
      typeof unitPriceCents === "number"
        ? Math.round(unitPriceCents)
        : Math.round(Number(unitPriceReais ?? 0) * 100);

    if (!title || !priceCents || priceCents <= 0) {
      return NextResponse.json(
        { error: "Parâmetros inválidos." },
        { status: 400 },
      );
    }

    const unit_price = Number((priceCents / 100).toFixed(2));

    // ... código anterior ...

    const urlObj = new URL(req.url);
    const protocol = urlObj.protocol;
    const host = urlObj.host;

    // 1. Pega do ENV ou Fallback
    let rawBaseUrl = process.env.BASE_URL || `${protocol}//${host}`;

    // 2. LIMPEZA AGRESSIVA: Remove aspas extras e espaços em branco
    let baseUrl = rawBaseUrl.replace(/['"]+/g, '').trim();

    // 3. Remove barra final se existir
    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, -1);
    }

    console.log("SANITIZED baseUrl:", baseUrl); // Verifique se não há aspas aqui

    // Defina o objeto de URLs explicitamente antes de passar para a função
    const backUrls = {
      success: `${baseUrl}/checkout/success`,
      pending: `${baseUrl}/checkout/pending`,
      failure: `${baseUrl}/checkout/failure`,
    };

    // LOG DE DEBUG: Veja exatamente o que o SDK vai receber
    console.log("Back URLs sendo enviadas:", JSON.stringify(backUrls, null, 2));

    const preferenceData = {
      items: [{ id, title, quantity, currency_id, unit_price }],
      back_urls: backUrls, // Passa o objeto limpo
      auto_return: "approved",
      binary_mode: true,
      external_reference: [kind, refId].filter(Boolean).join(":"),
      metadata: { ...metadata, priceCents, kind, refId },
    };

    const pref = await getPreference().create({
      body: preferenceData,
    });

    // ... resto do código

    return NextResponse.json({
      preferenceId: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
    });
  } catch (e: any) {
    console.error("create-preference error:", e?.message || e);
    return NextResponse.json(
      {
        error: "Falha ao criar preferência.",
        details: String(e?.message || e),
      },
      { status: 500 },
    );
  }
}
