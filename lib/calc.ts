export type Order = {
  id: string;
  data: string;
  pedido: string;
  produto: string;
  venda_bruta: number;
  custo: number;
  taxas_amazon: number;
  status: "Pago" | "Pendente" | "Problema" | "Cancelado";
  conta: string | null;
  observacoes: string | null;
};

export function calc(o: { venda_bruta: number; custo: number; taxas_amazon: number }) {
  const venda = Number(o.venda_bruta) || 0;
  const custo = Number(o.custo) || 0;
  const taxas = Number(o.taxas_amazon) || 0;
  return {
    lucroCaixa: venda - custo,
    amazonVaiPagar: venda - taxas,
    lucroFinal: venda - (custo + taxas),
    taxaPercent: venda ? (taxas / venda) * 100 : 0,
  };
}

export function fmt(n: number) {
  return (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(d: string) {
  if (!d) return "-";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}
