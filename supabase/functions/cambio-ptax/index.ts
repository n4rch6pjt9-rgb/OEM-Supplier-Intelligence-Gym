// cambio-ptax · busca a PTAX (USD/BRL) no Banco Central e grava em public.cambio.
// POST { dias?: number (padrão 7) }  → agende diariamente via pg_cron.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const fmt = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const dias = Math.min(Number(body.dias ?? 7), 365);
    const fim = new Date(), ini = new Date(Date.now() - dias * 86400000);
    const url = "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/" +
      `CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
      `?@dataInicial='${fmt(ini)}'&@dataFinalCotacao='${fmt(fim)}'&$format=json`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`BCB HTTP ${r.status}`);
    const { value } = await r.json();
    const rows = (value ?? []).map((v: { cotacaoCompra: number; cotacaoVenda: number; dataHoraCotacao: string }) => ({
      data: v.dataHoraCotacao.slice(0, 10), moeda: "USD", compra: v.cotacaoCompra, venda: v.cotacaoVenda, fonte: "PTAX",
    }));
    if (rows.length) {
      const { error } = await db.from("cambio").upsert(rows, { onConflict: "data,moeda,fonte" });
      if (error) throw error;
    }
    return new Response(JSON.stringify({ gravados: rows.length, ultimo: rows.at(-1) ?? null }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ erro: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
