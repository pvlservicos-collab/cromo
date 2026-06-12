import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Rate limiting: 10 req/IP/minuto
const membrosRL = new Map<string, { count: number; resetAt: number }>();
function checkRL(ip: string): boolean {
  const now = Date.now();
  const e = membrosRL.get(ip);
  if (!e || now > e.resetAt) { membrosRL.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (e.count >= 10) return false;
  e.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRL(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const fone = (searchParams.get("fone") || "").replace(/\D/g, "").slice(0, 15);

  if (fone.length < 8) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }

  // Match bidirecional por conteúdo: cobre tanto o digitado mais curto (ex: 91712835)
  // contido no número guardado, quanto o digitado mais longo com código de país
  // (ex: 559699712835) contendo o número guardado mais curto.
  const fonePattern = `%${fone}%`;

  const [pedidos, emailRow] = await Promise.all([
    sql`
      SELECT id, nome, clube, sticker_url, preview_url, pdf_url, status, created_at
      FROM pedidos
      WHERE (telefone LIKE ${fonePattern} OR ${fone} LIKE ('%' || telefone || '%'))
        AND sticker_url IS NOT NULL
      ORDER BY created_at DESC
    `,
    sql`
      SELECT email FROM pedidos
      WHERE (telefone LIKE ${fonePattern} OR ${fone} LIKE ('%' || telefone || '%'))
        AND email IS NOT NULL
      ORDER BY created_at DESC LIMIT 1
    `,
  ]);

  const email = emailRow[0]?.email || null;

  // Busca itens: por email (se tiver) + por trecho do telefone (bidirecional)
  const [itemsByEmail, itemsByPhone] = await Promise.all([
    email ? sql`
      SELECT item_type, offer_name, product_name, price, status, created_at
      FROM pedido_items
      WHERE email = ${email}
      ORDER BY created_at DESC
    ` : [],
    sql`
      SELECT item_type, offer_name, product_name, price, status, created_at
      FROM pedido_items
      WHERE telefone LIKE ${fonePattern} OR ${fone} LIKE ('%' || telefone || '%')
      ORDER BY created_at DESC
    `.catch(() => []),
  ]);

  // Merge sem duplicatas (pelo offer_name + created_at)
  const seen = new Set<string>();
  const items = [...itemsByEmail, ...itemsByPhone].filter(i => {
    const key = `${i.offer_name}|${i.created_at}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const nome = pedidos[0]?.nome || null;

  if (!pedidos.length && !items.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ nome, pedidos, items });
}
