// Migra imagens base64 (data URLs) das colunas de imagem do Carousel Studio
// para o Supabase Storage, substituindo pelo public URL.
//
// Uso: SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-carousel-base64.mjs
//
// Colunas migradas:
//   carousel_studio_slides.bg_image_url
//   carousel_studio_slides.badge_photo_url
//   carousel_studio_projects.shared_bg_image_url
//
// Idempotente: so processa valores que comecam com "data:". Deduplica por
// hash do conteudo (a mesma foto repetida em N slides vira 1 arquivo).

import crypto from "node:crypto";

const SUPABASE_URL = "https://ejwpfztkspbvmuwwiwmk.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error("Defina SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  process.exit(1);
}
const BUCKET = "visual-creatives";
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const uploadedByHash = new Map();

async function uploadDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,/);
  if (!match) throw new Error("data URL invalida");
  const contentType = match[1] || "image/png";
  const isBase64 = !!match[2];
  const raw = dataUrl.slice(match[0].length);
  const bytes = isBase64
    ? Buffer.from(raw, "base64")
    : Buffer.from(decodeURIComponent(raw), "utf8");

  const hash = crypto.createHash("sha1").update(bytes).digest("hex");
  if (uploadedByHash.has(hash)) return uploadedByHash.get(hash);

  const ext = (contentType.split("/")[1] || "png").replace("jpeg", "jpg");
  const path = `carousel-studio/migrated/${hash}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      ...HEADERS,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${await res.text()}`);
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  uploadedByHash.set(hash, publicUrl);
  console.log(`  upload ${path} (${(bytes.length / 1024 / 1024).toFixed(1)}MB)`);
  return publicUrl;
}

async function migrateColumn(table, column) {
  const idsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=id&${column}=like.data:*`,
    { headers: HEADERS },
  );
  if (!idsRes.ok) throw new Error(`list ${table}.${column}: ${idsRes.status}`);
  const rows = await idsRes.json();
  console.log(`${table}.${column}: ${rows.length} linha(s) com base64`);

  for (const { id } of rows) {
    // Busca uma linha por vez — os valores tem dezenas de MB
    const rowRes = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=${column}&id=eq.${id}`,
      { headers: HEADERS },
    );
    const [row] = await rowRes.json();
    const dataUrl = row?.[column];
    if (!dataUrl?.startsWith("data:")) continue;

    const url = await uploadDataUrl(dataUrl);
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ [column]: url }),
    });
    if (!patchRes.ok)
      throw new Error(`patch ${table} ${id}: ${patchRes.status}`);
    console.log(`  ok ${table} ${id}`);
  }
}

await migrateColumn("carousel_studio_slides", "bg_image_url");
await migrateColumn("carousel_studio_slides", "badge_photo_url");
await migrateColumn("carousel_studio_projects", "shared_bg_image_url");
console.log("Migracao concluida.");
