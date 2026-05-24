import postgres from "postgres";

const sql = postgres("postgresql://postgres.wuqomlhctrcvuagaoqkk:Figurinhas189632%25@aws-1-eu-central-1.pooler.supabase.com:6543/postgres", { ssl: "require" });

const TELEFONE = "96991712835";
const variants = [TELEFONE, "55" + TELEFONE];

// Verifica colunas reais da tabela
const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pedido_items' ORDER BY ordinal_position`;
console.log("Colunas:", cols.map(c => `${c.column_name}(${c.data_type})`).join(", "));

// Busca email do pedido existente
const pedidoRows = await sql`
  SELECT email, nome FROM pedidos
  WHERE telefone = ANY(${variants})
  ORDER BY created_at DESC LIMIT 1
`;
console.log("Pedido encontrado:", pedidoRows[0] || "nenhum");

const email = pedidoRows[0]?.email || "pedro@teste.com";
const nome = pedidoRows[0]?.nome || "Pedro";

const PRODUTOS = [
  { hash: "3MSNHT", name: "Figurinha Personalizada Copa 2026" },
  { hash: "3MSNI0", name: "3X - Rifa da Sorte - MIL REAIS" },
  { hash: "3MSNI1", name: "Pacote embalagem figurinha da COPA 2026 - PDF IMPRESSÃO" },
  { hash: "3MSNI2", name: "Poster A4 da sua Figurinha Personalizada - PDF IMPRESSÃO" },
  { hash: "3MSNI3", name: "10X - Rifa da Sorte - MIL REAIS" },
  { hash: "3MSNI4", name: "Edição Especial: Figurinha do Neymar - Camisa da Seleção (PDF)" },
];

for (const p of PRODUTOS) {
  await sql`
    INSERT INTO pedido_items
      (email, nome, item_type, offer_hash, offer_name, product_name, price, status, created_at)
    VALUES
      (${email}, ${nome}, 'product', ${p.hash}, ${p.name}, ${p.name}, 0, 'pago', NOW())
  `;
  console.log("✓", p.name);
}

await sql.end();
console.log("Pronto! Todos os produtos inseridos para", email);
