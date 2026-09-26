// crawl-mic v4 · Made-in-China como fonte principal do catálogo.
//
// POST { acao: "descobrir", url }            → cadastra a fábrica (se nova), lê as séries (product-group)
//                                              e cria a fila: 1 item por série + 1 item "loja" (varredura geral)
// POST { acao: "pagina", fila_id }           → processa a próxima página daquele item da fila (chamado pelo cron)
// POST { url, pagina?, max_produtos? }       → processa 1 página avulsa (listagem, série ou produto)
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const MAX_POR_SKU = 2;                     // 2 imagens/SKU em 550px (~30 KB cada); se o anúncio tiver 1, fica 1
const IMG_VARIANTE = "202f0j00";           // 550x550 · original "2f0j00" fica em url_origem
const REVISITAR_DIAS = 7;                  // anúncio extraído há menos que isso não é baixado de novo
const LIMITE_MS = 120_000;                 // margem para o limite de execução da Edge Function
const MAX_TENTATIVAS = 3;                  // página com erro é repetida até 3 vezes antes de seguir

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Só o agendamento (service role) chama esta função; o gateway já validou a assinatura do JWT.
function chamadorConfiavel(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (token && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "="))).role === "service_role";
  } catch { return false; }
}

async function get(url: string, tries = 3): Promise<Response> {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" } });
    if (r.ok) return r;
    await sleep(800 * (i + 1));
  }
  throw new Error(`HTTP falhou: ${url}`);
}
async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
const normSku = (s: string) => s.toUpperCase().replace(/[\s_]/g, "").replace(/^([A-Z]+)-(\d)/, "$1$2");
const semQuery = (u: string) => { const x = new URL(u); return x.origin + x.pathname; };
const paginaUrl = (base: string, n: number) =>
  /-\d+\.html$/.test(base) ? base.replace(/-\d+\.html$/, `-${n}.html`) : `${new URL(base).origin}/product-list-${n}.html`;

// ---------- séries (product-group) → linha ----------
const GENERICO = /hot\s*sale|new\s*arrival|^others?\b|accessor|^strength machine$|commercial fitness|^sale$|featured/i;
function linhaDeGrupo(nome: string) {
  const limpo = nome.replace(/\b(19|20)\d{2}\b(?!\s*seri)/g, "").replace(/\bnew\b/ig, "").replace(/\s+/g, " ").trim();
  const m = limpo.match(/^(.*?)[\s-]*seri(es|ses|s)?\b/i);
  const codigo = (m?.[1] || limpo).replace(/[()]/g, "").trim().toUpperCase().replace(/\s+/g, "-").slice(0, 20);
  const cat = /pin/i.test(nome) ? "pin_loaded" : /plate|hammer/i.test(nome) ? "plate_loaded" : /hydraulic/i.test(nome) ? "hidraulico"
    : /treadmill|bike|elliptical|cardio|aerobic|stair|rowing/i.test(nome) ? "cardio" : /rack|bench/i.test(nome) ? "bancos_racks" : null;
  return { codigo, nome: limpo, categoria: cat, serie: /seri/i.test(nome) };
}
async function garantirLinha(fabricaId: string, grupoNome: string) {
  const l = linhaDeGrupo(grupoNome);
  if (!l.serie || GENERICO.test(grupoNome) || !l.codigo) return null;
  await db.from("linhas").upsert({ fabrica_id: fabricaId, codigo: l.codigo, nome: l.nome, categoria: l.categoria },
    { onConflict: "fabrica_id,codigo", ignoreDuplicates: true });
  const { data } = await db.from("linhas").select("id").eq("fabrica_id", fabricaId).eq("codigo", l.codigo).single();
  return data?.id ?? null;
}

// ---------- parse da página de produto ----------
function parseProduto(html: string) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
  const p = blocks.find((b) => b?.["@type"] === "Product");
  if (!p) return null;
  const props: Record<string, string> = {};
  for (const a of p.additionalProperty ?? []) props[String(a.name).trim()] = String(a.value).trim();
  const limpa = (x: string) => x.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const add = (k: string, v: string) => { k = limpa(k).replace(/:$/, ""); v = limpa(v); if (k && v && !(k in props)) props[k] = v.slice(0, 600); };
  for (const m of html.matchAll(/bac-item-label[^>]*>\s*([^<]+?)\s*<\/div>\s*<div[^>]*bac-item-value[^>]*>\s*([^<]+?)\s*<\/div>/g)) add(m[1], m[2]);
  for (const m of html.matchAll(/<dt[^>]*>\s*([^<]{2,80}?)\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)) add(m[1], m[2]);
  for (const m of html.matchAll(/<th[^>]*>\s*([^<]{2,60}?)\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g)) add(m[1], m[2]);
  // FAQ estruturado (JSON-LD FAQPage)
  const faq = blocks.find((b) => b?.["@type"] === "FAQPage");
  for (const q of faq?.mainEntity ?? []) add(String(q.name ?? ""), String(q.acceptedAnswer?.text ?? ""));
  // input oculto priceProp: {'Payment Terms':'...','Port':'...'}
  const pp = html.match(/value="(\{[^"]*\})"\s*id="priceProp"/)?.[1] ?? html.match(/id="priceProp"[^>]*value="(\{[^"]*\})"/)?.[1];
  if (pp) for (const m of pp.matchAll(/'([^']+)':'([^']*)'/g)) add(m[1], m[2]);
  const imgs: string[] = (Array.isArray(p.image) ? p.image : [p.image]).filter(Boolean)
    .map((u: string) => (u.startsWith("//") ? "https:" + u : u));
  const faixa = html.match(/US\s*\$\s*([\d,.]+)\s*-\s*([\d,.]+)/);
  const moq = (props["MOQ"] ?? html.match(/Min\.\s*Order:?\s*<[^>]*>?\s*([\d,]+)/i)?.[1] ?? "").replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\d+/)?.[0];
  const dim = (s?: string) => s?.match(/(\d{3,4})\s*[*x×X]\s*(\d{3,4})\s*[*x×X]\s*(\d{3,4})/)?.slice(1, 4).map(Number) ?? null;
  const cx = (props["Package Size"] ?? "").match(/([\d.]+)\s*cm\s*\*\s*([\d.]+)\s*cm\s*\*\s*([\d.]+)\s*cm/i);
  const pkg = (props["Transport Package"] ?? props["Package"] ?? "").toLowerCase();
  const tipo = /plywood/.test(pkg) ? "plywood" : /wood/.test(pkg) ? "caixa_madeira" : /carton|paper/.test(pkg) ? "caixa_papelao"
    : /pallet/.test(pkg) ? "pallet" : pkg ? "outro" : null;
  const num = (s?: string) => { const m = s?.match(/[\d.]+/); return m ? Number(m[0]) : null; };
  const pick = (re: RegExp) => { const k = Object.keys(props).find((x) => re.test(x)); return k ? props[k] : null; };
  // certificações da empresa (ISO etc.) e do produto (CE, RoHS, EN957...)
  const txtCert = limpa(html.match(/(?:Management System Certification|management system certification, including:)([\s\S]{0,600}?)<\/(?:dd|div|ul)>/i)?.[1] ?? "");
  const isos = [...new Set((txtCert.match(/ISO\s?\d{4,5}(?::\d{4})?|IATF\s?\d+|OHSAS\s?\d+|BSCI|SA8000/gi) ?? []).map((x) => x.toUpperCase().replace(/^ISO\s?/, "ISO ")))];
  const certProd = [...new Set(((props["Certification"] ?? props["Certificate"] ?? "").match(/ISO\s?\d{4,5}|CE|RoHS|EN\s?\d+|GS|TUV|SGS|UL|FCC|ETL|ASTM|CB/gi) ?? []).map((x) => x.toUpperCase()))];
  const comercial = {
    termos_pagamento: pick(/^payment terms$|terms of payment/i),
    porto_embarque: pick(/^port( of loading)?$|delivery port|loading port/i),
    incoterms: pick(/incoterm|trade terms|price terms/i)
      ?? (limpa(html.match(/Incoterms?\)?\s*(?:<[^>]+>\s*)*([A-Z]{3}(?:\s*,\s*[A-Z]{3})*)/)?.[1] ?? "") || null),
    prazo_entrega: pick(/^delivery time$|how long is the delivery|lead time/i),
    tempo_producao: pick(/^production time$/i),
    capacidade_producao: pick(/production capacity|supply ability/i),
    garantia: pick(/^warranty$|warranty period/i),
    amostra: pick(/sample/i),
    mercados: pick(/main markets|export market/i),
    anos_exportacao: pick(/export year/i),
  };
  return {
    titulo: String(p.name ?? "").trim(),
    modelo: props["Model NO."] ?? props["Model No."] ?? null,
    preco_min: faixa ? Number(faixa[1].replace(/,/g, "")) : Number(p.offers?.price) || null,
    preco_max: faixa ? Number(faixa[2].replace(/,/g, "")) : null,
    moq: moq ? Number(moq) : null,
    peso: num(props["Machine Weight"] ?? props["Weight"] ?? props["N.W."]),
    montado: dim(props["Specification"]) ?? dim(props["Product Size"]) ?? dim(props["Size"]),
    caixa_cm: cx ? cx.slice(1, 4).map(Number) : null,
    peso_bruto: num(props["Package Gross Weight"]),
    tipo_embalagem: tipo,
    hs: props["HS Code"] ?? null,
    imagens: [...new Set(imgs)],
    isos, certProd, comercial, props,
  };
}

// ---------- imagens ----------
async function salvarImagens(urls: string[], fabricaSlug: string, pasta: string, produtoId: string | null, anuncioId: string) {
  let jaTem = 0;
  if (produtoId) {
    const { count } = await db.from("produto_imagens").select("id", { count: "exact", head: true }).eq("produto_id", produtoId);
    jaTem = count ?? 0;
  }
  let ok = 0;
  for (const [i, u] of urls.entries()) {
    if (produtoId && jaTem >= MAX_POR_SKU) break;
    if (!produtoId && ok >= MAX_POR_SKU) break;
    // a mesma foto pode servir a mais de um SKU: cada produto tem a sua linha, apontando para o mesmo arquivo
    const { data: jas } = await db.from("produto_imagens").select("id, produto_id, storage_path").eq("url_origem", u);
    if (jas?.length) {
      if (!produtoId || jas.some((x) => x.produto_id === produtoId)) { ok++; continue; }
      const solta = jas.find((x) => !x.produto_id);
      if (solta) await db.from("produto_imagens").update({ produto_id: produtoId }).eq("id", solta.id);
      else await db.from("produto_imagens").insert({ produto_id: produtoId, anuncio_id: anuncioId, url_origem: u, storage_path: jas[0].storage_path, ordem: i });
      ok++; jaTem++; continue;
    }
    try {
      const m = u.match(/\/2f0j00([A-Za-z0-9]+)\//);
      const src = m ? u.replace("/2f0j00", `/${IMG_VARIANTE}`) : u;
      const r = await get(src, 2);
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.byteLength < 5_000) continue;
      const ext = (r.headers.get("content-type") ?? "image/webp").split("/")[1].split(";")[0];
      const path = `${fabricaSlug}/${pasta}/${m?.[1] ?? (await sha(u)).slice(0, 16)}.${ext}`;
      const up = await db.storage.from("produtos").upload(path, buf, { contentType: `image/${ext}`, upsert: true });
      if (up.error) throw up.error;
      await db.from("produto_imagens").insert({ produto_id: produtoId, anuncio_id: anuncioId, url_origem: u, storage_path: path, ordem: i });
      ok++; jaTem++;
    } catch (_e) { /* próxima */ }
  }
  if (produtoId) {
    const { data: pr } = await db.from("produto_imagens").select("id").eq("produto_id", produtoId).eq("principal", true).limit(1).maybeSingle();
    if (!pr) {
      const { data: f } = await db.from("produto_imagens").select("id").eq("produto_id", produtoId).order("ordem").limit(1).maybeSingle();
      if (f) await db.from("produto_imagens").update({ principal: true }).eq("id", f.id);
    }
    return Math.max(ok, jaTem);
  }
  return ok;
}

// ---------- condições comerciais e certificações da fábrica ----------
const PORTOS: [RegExp, string][] = [[/tianjin|xingang/i, "CNTXG"], [/qingdao/i, "CNTAO"], [/ningbo/i, "CNNGB"],
  [/shanghai/i, "CNSHA"], [/xiamen/i, "CNXMN"], [/shenzhen|yantian/i, "CNYTN"]];
async function salvarFabrica(fabricaId: string, d: NonNullable<ReturnType<typeof parseProduto>>, url: string) {
  const agora = new Date().toISOString();
  const cond = Object.entries(d.comercial).filter(([, v]) => v).map(([chave, valor]) => ({
    fabrica_id: fabricaId, chave, valor: String(valor).slice(0, 600), fonte_url: url, atualizado_em: agora,
  }));
  if (cond.length) await db.from("fabrica_condicoes").upsert(cond, { onConflict: "fabrica_id,chave" });
  const certs = [
    ...d.isos.map((c) => ({ fabrica_id: fabricaId, certificado: c, escopo: "empresa", fonte_url: url, visto_em: agora })),
    ...d.certProd.map((c) => ({ fabrica_id: fabricaId, certificado: c, escopo: "produto", fonte_url: url, visto_em: agora })),
  ];
  if (certs.length) await db.from("fabrica_certificacoes").upsert(certs, { onConflict: "fabrica_id,certificado,escopo" });
  // porto informado no site → sugere na fábrica se ainda não confirmado
  const porto = d.comercial.porto_embarque;
  const loc = porto ? PORTOS.find(([re]) => re.test(porto))?.[1] : null;
  if (loc) {
    const { data: f } = await db.from("fabricas").select("porto_confirmado").eq("id", fabricaId).single();
    if (!f?.porto_confirmado) {
      const { data: p } = await db.from("portos").select("id").eq("locode", loc).single();
      await db.from("fabricas").update({ porto_embarque_id: p?.id, observacoes: `Porto informado no site: ${porto}` }).eq("id", fabricaId);
    }
  }
}

// ---------- 1 anúncio ----------
async function processarProduto(url: string, fab: { id: string; slug: string }, linhaId: string | null, forcar: boolean) {
  const { data: prev } = await db.from("anuncios_mic").select("id, produto_id, status_vinculo, score_similaridade, extraido_em").eq("url", url).maybeSingle();
  if (prev && !forcar && Date.now() - new Date(prev.extraido_em).getTime() < REVISITAR_DIAS * 86400000) {
    if (linhaId && prev.produto_id) await db.from("produtos").update({ linha_id: linhaId }).eq("id", prev.produto_id);
    return { url, pulado: true };
  }
  const d = parseProduto(await (await get(url)).text());
  if (!d) return { url, erro: "sem JSON-LD Product" };

  // vínculo com SKU (o site é a fonte principal: cria o SKU se não existir)
  let produtoId: string | null = null, status = "pendente", score: number | null = null;
  const campos = {
    nome_original: d.titulo, preco_fob_usd: d.preco_min, preco_fob_usd_max: d.preco_max,
    ...(d.peso ? { peso_liquido_kg: d.peso } : {}),
    ...(d.montado ? { montado_c_mm: d.montado[0], montado_l_mm: d.montado[1], montado_a_mm: d.montado[2] } : {}),
    ...(linhaId ? { linha_id: linhaId } : {}),
    origem: "site", visto_site_em: new Date().toISOString(),
  };
  // vínculo revisado por uma pessoa vale mais que o SKU detectado: nada é criado nem sobrescrito
  if (prev && ["confirmado", "descartado"].includes(prev.status_vinculo)) {
    produtoId = prev.produto_id; status = prev.status_vinculo; score = prev.score_similaridade;
    if (status === "confirmado" && produtoId) await db.from("produtos").update(campos).eq("id", produtoId);
  } else if (d.modelo) {
    const alvo = normSku(d.modelo);
    const { data: cands } = await db.from("produtos").select("id, sku").eq("fabrica_id", fab.id);
    const hit = cands?.find((c) => normSku(c.sku) === alvo);
    if (hit) {
      produtoId = hit.id;
      await db.from("produtos").update(campos).eq("id", hit.id);
    } else {
      const { data: novo } = await db.from("produtos").insert({
        fabrica_id: fab.id, sku: d.modelo.toUpperCase().trim(), nome_curto: d.titulo.slice(0, 60), ncm: "95069100", ...campos,
      }).select("id").single();
      produtoId = novo?.id ?? null;
    }
    status = "sugerido"; score = 1;
  }

  const { data: an, error } = await db.from("anuncios_mic").upsert({
    fabrica_id: fab.id, url, titulo_original: d.titulo, codigo_detectado: d.modelo,
    preco_min_usd: d.preco_min, preco_max_usd: d.preco_max, moq: d.moq, unidade: "Piece",
    atributos_brutos: d.props,
    hash_conteudo: await sha(`${d.titulo}|${d.modelo}|${d.props["Specification"] ?? ""}`),
    produto_id: produtoId, status_vinculo: status, score_similaridade: score, extraido_em: new Date().toISOString(),
  }, { onConflict: "url" }).select("id").single();
  if (error) return { url, erro: error.message };

  if (produtoId) {
    // atributos do site (confiança 2 > planilha 1; documentos de embarque = 3)
    const at = [
      ["preco_fob_usd_min", d.preco_min, "USD"], ["preco_fob_usd_max", d.preco_max, "USD"], ["moq", d.moq, "pc"],
      ["peso_liquido", d.peso, "kg"], ["medidas_montado", d.montado?.join("x"), "mm"],
      ["medidas_caixa", d.caixa_cm?.join("x"), "cm"], ["peso_bruto_unitario", d.peso_bruto, "kg"],
      ["tipo_embalagem", d.tipo_embalagem, null], ["hs_code", d.hs, null],
      ["certificacao", d.certProd.join(", ") || d.props["Certification"], null], ["espessura_aco", d.props["Steel Thickness"], null],
      ["termos_pagamento", d.comercial.termos_pagamento, null], ["porto_embarque", d.comercial.porto_embarque, null],
      ["prazo_entrega", d.comercial.prazo_entrega ?? d.comercial.tempo_producao, null], ["garantia", d.comercial.garantia, null],
    ].filter(([, v]) => v !== null && v !== undefined && v !== "");
    await db.from("produto_atributos").delete().eq("produto_id", produtoId).eq("fonte", "made_in_china").eq("documento_ref", url);
    await db.from("produto_atributos").insert(at.map(([chave, valor, unidade]) => ({
      produto_id: produtoId, chave, valor: String(valor), unidade, fonte: "made_in_china", confianca: 2, documento_ref: url,
    })));
    // embalagem declarada no anúncio (cm) → tabela de embalagens
    if (d.caixa_cm) {
      const reg = {
        produto_id: produtoId, tipo_embalagem: d.tipo_embalagem ?? "outro",
        comprimento_cm: d.caixa_cm[0], largura_cm: d.caixa_cm[1], altura_cm: d.caixa_cm[2],
        peso_bruto_kg: d.peso_bruto, fonte: "made_in_china", observacao: url,
      };
      const { data: e } = await db.from("embalagens").select("id").eq("produto_id", produtoId).eq("fonte", "made_in_china").limit(1).maybeSingle();
      if (e) await db.from("embalagens").update(reg).eq("id", e.id); else await db.from("embalagens").insert(reg);
    }
  }

  await salvarFabrica(fab.id, d, url);

  const pasta = (d.modelo ?? "sem-sku").toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const n = await salvarImagens(d.imagens, fab.slug, pasta, produtoId, an.id);
  await db.from("anuncios_mic").update({ imagens_insuficientes: n < 2 }).eq("id", an.id);
  return { url, modelo: d.modelo, produto_id: produtoId, imagens: n };
}

// ---------- 1 página (listagem ou série) ----------
async function processarPagina(pageUrl: string, fab: { id: string; slug: string }, linhaId: string | null, max: number, forcar: boolean) {
  const t0 = Date.now();
  const u = new URL(pageUrl);
  let links: string[];
  if (u.pathname.includes("/product/")) links = [semQuery(pageUrl)];
  else {
    const html = await (await get(pageUrl)).text();
    const re = new RegExp(`(?:https:)?//${u.hostname.replace(/\./g, "\\.")}/product/[A-Za-z0-9]+/[^"'\\s?#]+\\.html`, "g");
    links = [...new Set((html.match(re) ?? []).map((l) => (l.startsWith("//") ? "https:" + l : l)))].slice(0, max);
  }
  const resultados: unknown[] = [], erros: unknown[] = [];
  let completa = true;
  for (const l of links) {
    if (Date.now() - t0 > LIMITE_MS) { completa = false; break; }
    try {
      const r = await processarProduto(l, fab, linhaId, forcar);
      resultados.push(r);
      if ((r as { erro?: string }).erro) erros.push(r);
      if (!(r as { pulado?: boolean }).pulado) await sleep(500);
    } catch (e) { erros.push({ url: l, erro: String(e) }); }
  }
  return { links, resultados, erros, completa };
}

// ---------- mantém no máximo MAX_POR_SKU imagens por produto ----------
async function limparImagens(limite: number) {
  const { data } = await db.rpc("imagens_excedentes", { max_por_sku: MAX_POR_SKU, limite });
  const linhas = (data ?? []) as { id: string; storage_path: string | null }[];
  let removidas = 0, falhas = 0;
  for (let i = 0; i < linhas.length; i += 100) {
    const lote = linhas.slice(i, i + 100);
    const paths = lote.map((x) => x.storage_path).filter((x): x is string => !!x);
    if (paths.length) {
      // se o Storage falhar, a linha fica para a próxima limpeza encontrar o arquivo de novo
      const rm = await db.storage.from("produtos").remove(paths);
      if (rm.error) { falhas += lote.length; continue; }
    }
    await db.from("produto_imagens").delete().in("id", lote.map((x) => x.id));
    removidas += lote.length;
  }
  return { removidas, falhas };
}

// ---------- descobrir fábrica + séries ----------
async function descobrir(url: string) {
  const origin = new URL(url).origin;
  const host = new URL(url).hostname;
  if (new URL(url).protocol !== "https:" || !host.endsWith(".made-in-china.com")) throw new Error("URL não é do Made-in-China");
  const html = await (await get(`${origin}/product-list-1.html`)).text();
  const titulo = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
  const nome = titulo.split(" - ").slice(-2, -1)[0]?.trim() || host.split(".")[0];
  const total = Number((html.match(/Total\s*(?:<[^>]*>\s*)*([\d,]+)\s*(?:<[^>]*>\s*)*Products/i)?.[1] ?? "0").replace(/,/g, ""));
  const slug = host.split(".")[0].toLowerCase();

  let { data: fab } = await db.from("fabricas").select("id, slug").ilike("url_mic", `%${host}%`).maybeSingle();
  if (!fab) {
    let cidade: string | null = null, provincia: string | null = null;
    try {
      const info = (await (await get(`${origin}/company-info.html`)).text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const addr = info.match(/Address:\s*([^:]{5,200}?)\s+(?:Main Markets|Account Registered|OEM|Business)/)?.[1] ?? "";
      const parts = addr.split(",").map((s) => s.trim());
      provincia = parts.at(-2) ?? null; cidade = parts.at(-3) ?? null;
    } catch { /* opcional */ }
    const curto = nome.replace(/\(.*?\)/g, "").replace(/\b(co|ltd|company|limited|equipment|fitness|sports?|shandong|tianjin|dezhou)\b\.?/ig, "")
      .replace(/[.,]/g, "").trim().split(/\s+/).slice(0, 2).join(" ");
    const ins = await db.from("fabricas").insert({
      nome, nome_curto: curto || slug, slug, url_mic: `${origin}/`, cidade, provincia,
      observacoes: "Porto de embarque a confirmar.",
    }).select("id, slug").single();
    fab = ins.data!;
  }

  const vistos = new Map<string, string>();
  for (const m of html.matchAll(/href="((?:https:)?\/\/[^"]+\/product-group\/[A-Za-z0-9]+\/[^"]+?\.html)[^"]*"[^>]*>\s*([^<]{2,80}?)\s*</g)) {
    const u = m[1].startsWith("//") ? "https:" + m[1] : m[1];
    if (!vistos.has(semQuery(u))) vistos.set(semQuery(u), m[2].trim());
  }
  const grupos = [...vistos.entries()].filter(([, n]) => /seri/i.test(n) && !GENERICO.test(n));

  const filas: Record<string, unknown>[] = grupos.map(([gUrl, gNome], i) => ({
    fabrica_id: fab!.id, url_loja: gUrl, tipo: "grupo", linha_nome: gNome, prioridade: 10 + i, proxima_pagina: 1,
  }));
  filas.push({ fabrica_id: fab!.id, url_loja: `${origin}/product-list-1.html`, tipo: "loja", linha_nome: null, prioridade: 1000, proxima_pagina: 1 });
  await db.from("crawler_fila").upsert(filas, { onConflict: "url_loja", ignoreDuplicates: true });
  return { fabrica: fab, nome, total_anuncios: total, series: grupos.map(([, n]) => n) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!chamadorConfiavel(req)) return json({ erro: "Acesso restrito ao agendamento (service role)" }, 403);
  try {
    const body = await req.json();
    if (body.acao === "descobrir") return json(await descobrir(body.url));
    if (body.acao === "limpar_imagens") return json(await limparImagens(body.limite ?? 300));

    if (body.acao === "pagina") {
      const { data: f } = await db.from("crawler_fila").select("*").eq("id", body.fila_id).single();
      const { data: fab } = await db.from("fabricas").select("id, slug").eq("id", f.fabrica_id).single();
      const linhaId = f.linha_nome ? await garantirLinha(fab!.id, f.linha_nome) : null;
      const pageUrl = paginaUrl(f.url_loja, f.proxima_pagina);
      const { data: job } = await db.from("crawler_jobs").insert({
        fabrica_id: fab!.id, url: pageUrl, tipo: f.tipo, status: "executando", iniciado_em: new Date().toISOString(),
      }).select("id").single();
      let r: Awaited<ReturnType<typeof processarPagina>>;
      try {
        r = await processarPagina(pageUrl, fab!, linhaId, 24, false);
      } catch (e) {
        // listagem não abriu: mesma página na próxima rodada
        r = { links: [], resultados: [], erros: [{ url: pageUrl, erro: String(e) }], completa: false };
      }
      // página com falhas é repetida (anúncios já gravados são pulados por REVISITAR_DIAS) até MAX_TENTATIVAS
      const repetir = r.erros.length > 0 && (f.tentativas ?? 0) + 1 < MAX_TENTATIVAS;
      const avancar = r.completa && !repetir;
      const primeiro = r.links[0] ?? null;
      const fim = avancar && (r.links.length === 0 || (primeiro !== null && primeiro === f.ultimo_primeiro_link));
      await db.from("crawler_fila").update({
        proxima_pagina: avancar && !fim ? f.proxima_pagina + 1 : f.proxima_pagina,
        ultimo_primeiro_link: avancar ? primeiro : f.ultimo_primeiro_link,
        tentativas: avancar ? 0 : repetir ? (f.tentativas ?? 0) + 1 : f.tentativas ?? 0,
        ativo: !fim, em_execucao_desde: null, atualizado_em: new Date().toISOString(),
      }).eq("id", f.id);
      await db.from("crawler_jobs").update({
        status: r.erros.length ? "com_erros" : "concluido", paginas_processadas: 1, anuncios_encontrados: r.links.length, erros: r.erros,
        finalizado_em: new Date().toISOString(),
      }).eq("id", job!.id);
      return json({ pagina: f.proxima_pagina, anuncios: r.links.length, completa: r.completa, fim, repetir, erros: r.erros.length });
    }

    // modo avulso
    const u = new URL(body.url);
    if (!u.hostname.endsWith(".made-in-china.com")) return json({ erro: "URL não é do Made-in-China" }, 400);
    const { data: fab } = await db.from("fabricas").select("id, slug").ilike("url_mic", `%${u.hostname}%`).maybeSingle();
    if (!fab) return json({ erro: `Loja ${u.hostname} não cadastrada. Use acao "descobrir".` }, 404);
    const pageUrl = body.pagina ? paginaUrl(semQuery(body.url), body.pagina) : semQuery(body.url);
    return json(await processarPagina(pageUrl, fab, null, body.max_produtos ?? 24, body.forcar ?? false));
  } catch (e) {
    return json({ erro: String(e) }, 500);
  }
});
