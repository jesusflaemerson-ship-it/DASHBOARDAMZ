"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { calc, fmt, type Order } from "@/lib/calc";

type Task = "mensagem" | "resposta" | "analise" | "melhorias" | "livre";

const taskLabels: Record<Task, string> = {
  mensagem: "Gerar mensagem para cliente",
  resposta: "Sugerir resposta a uma reclamação",
  analise: "Analisar pedidos com prejuízo",
  melhorias: "Sugerir melhorias na operação",
  livre: "Pergunta livre",
};

function generateLocalSuggestion(task: Task, input: string, order: Order | null, orders: Order[]) {
  const nome = order ? order.produto : "seu produto";
  const pedido = order ? order.pedido : "";
  const comPrejuizo = orders.filter((o) => calc(o).lucroFinal < 0);
  const faturamento = orders.reduce((a, o) => a + Number(o.venda_bruta), 0);
  const lucro = orders.reduce((a, o) => a + calc(o).lucroFinal, 0);
  const margem = faturamento ? (lucro / faturamento) * 100 : 0;
  const taxaMedia = faturamento
    ? (orders.reduce((a, o) => a + Number(o.taxas_amazon), 0) / faturamento) * 100
    : 0;

  if (task === "mensagem") {
    return `Olá! Tudo bem? Aqui é da loja, referente ao pedido ${pedido || "#seu pedido"}.

Seu produto "${nome}" ${
      order?.status === "Pago"
        ? "já foi confirmado e está sendo preparado com todo cuidado"
        : "está em processamento e em breve você receberá as informações de envio"
    }. Qualquer dúvida, estou à disposição por aqui.

${input ? "Observação adicional: " + input + "\n\n" : ""}Obrigado pela confiança! 🙂`;
  }

  if (task === "resposta") {
    return `Entendo sua preocupação e peço desculpas pelo inconveniente${pedido ? ` com o pedido ${pedido}` : ""}.

Vou verificar o ocorrido com prioridade e retornar com uma solução (reenvio, reembolso parcial ou total, conforme o caso) o mais rápido possível.

Situação relatada: "${input || "não detalhada"}"

Agradeço a paciência e vou resolver isso para você.`;
  }

  if (task === "analise") {
    if (!comPrejuizo.length) {
      return "Nenhum pedido com prejuízo registrado até agora — operação saudável nesse quesito. Continue monitorando a margem por produto para manter esse resultado.";
    }
    const porProduto: Record<string, number> = {};
    comPrejuizo.forEach((o) => {
      porProduto[o.produto] = (porProduto[o.produto] || 0) + 1;
    });
    const piores = Object.entries(porProduto).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `Você tem ${comPrejuizo.length} pedido(s) com prejuízo, totalizando ${fmt(
      comPrejuizo.reduce((a, o) => a + calc(o).lucroFinal, 0)
    )}.

Produtos mais afetados:
${piores.map((p) => `• ${p[0]} (${p[1]} pedido(s))`).join("\n")}

Possíveis causas comuns: custo de compra alto em relação ao preço de venda, taxa da Amazon acima do esperado para a categoria, ou frete/reembolso não considerado no preço. Recomendo revisar o preço de venda desses produtos específicos ou buscar fornecedor mais barato.`;
  }

  if (task === "melhorias") {
    return `Com base nos seus números atuais (margem média de ${margem.toFixed(
      1
    )}%, taxa média da Amazon de ${taxaMedia.toFixed(1)}%), algumas sugestões práticas:

1. Padronize a conferência da taxa real da Amazon por categoria antes de precificar — ela varia e pode estar reduzindo sua margem sem você perceber.
2. Negocie ou pesquise fornecedores alternativos para os produtos com menor margem.
3. Crie um preço-mínimo de venda por produto que já inclua taxa + frete + margem desejada, evitando vender no prejuízo.
4. Monitore semanalmente os pedidos com status "Problema" para identificar padrões (mesmo fornecedor, mesma transportadora, etc).
5. Considere reinvestir parte do lucro em produtos com margem comprovadamente melhor, reduzindo os de baixo desempenho.`;
  }

  return `Sobre sua pergunta: "${input || "(nenhuma pergunta informada)"}"

Com os dados atuais da operação (${orders.length} pedidos, faturamento de ${fmt(
    faturamento
  )}, lucro de ${fmt(lucro)}), recomendo focar em acompanhar de perto a margem por produto e o status dos pedidos pendentes. Para respostas mais elaboradas e personalizadas, você pode colar aqui informações específicas do caso.`;
}

export default function IAPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [task, setTask] = useState<Task>("mensagem");
  const [orderId, setOrderId] = useState("");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("orders")
      .select("*")
      .order("data", { ascending: false })
      .then(({ data }) => setOrders((data as Order[]) || []));
  }, []);

  function handleGenerate() {
    setLoading(true);
    setResult("");
    setTimeout(() => {
      const order = orders.find((o) => o.id === orderId) || null;
      setResult(generateLocalSuggestion(task, input, order, orders));
      setLoading(false);
    }, 400);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="text-xl font-semibold mb-1">IA</h1>
        <p className="text-dim text-sm mb-6">Assistente inteligente para sua operação</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="card space-y-3">
            <select className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">Analisar um pedido específico (opcional)</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.pedido} — {o.produto}
                </option>
              ))}
            </select>

            <select className="input" value={task} onChange={(e) => setTask(e.target.value as Task)}>
              {(Object.keys(taskLabels) as Task[]).map((t) => (
                <option key={t} value={t}>
                  {taskLabels[t]}
                </option>
              ))}
            </select>

            <textarea
              className="input"
              rows={4}
              placeholder="Contexto / detalhes (ex: cliente reclamou que o produto chegou quebrado...)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />

            <button className="btn" onClick={handleGenerate} disabled={loading}>
              {loading ? "Gerando..." : "✦ Gerar sugestão"}
            </button>

            {result && (
              <div className="bg-elev2 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap mt-2">
                {result}
              </div>
            )}
          </div>

          <div className="card">
            <div className="text-sm font-semibold mb-2">Como funciona</div>
            <p className="text-dim text-sm leading-relaxed">
              Este assistente usa os dados reais dos seus pedidos (venda, custo, taxas, status) para gerar
              mensagens, analisar prejuízos e sugerir melhorias — tudo rodando direto no seu sistema, sem
              precisar de chave de API paga. Selecione um pedido específico para respostas mais direcionadas,
              ou deixe em branco para uma análise geral da operação.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
