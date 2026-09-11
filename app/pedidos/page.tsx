"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { calc, fmt, type Order } from "@/lib/calc";

const emptyForm = {
  id: "",
  data: new Date().toISOString().slice(0, 10),
  pedido: "",
  produto: "",
  venda_bruta: "",
  custo: "",
  taxas_amazon: "",
  status: "Pendente",
  conta: "",
  observacoes: "",
};

export default function PedidosPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("data", { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(o: Order) {
    setForm({
      id: o.id,
      data: o.data,
      pedido: o.pedido,
      produto: o.produto,
      venda_bruta: String(o.venda_bruta),
      custo: String(o.custo),
      taxas_amazon: String(o.taxas_amazon),
      status: o.status,
      conta: o.conta || "",
      observacoes: o.observacoes || "",
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      data: form.data,
      pedido: form.pedido,
      produto: form.produto,
      venda_bruta: parseFloat(form.venda_bruta) || 0,
      custo: parseFloat(form.custo) || 0,
      taxas_amazon: parseFloat(form.taxas_amazon) || 0,
      status: form.status,
      conta: form.conta,
      observacoes: form.observacoes,
      user_id: userData.user?.id,
    };
    if (form.id) {
      await supabase.from("orders").update(payload).eq("id", form.id);
    } else {
      await supabase.from("orders").insert(payload);
    }
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este pedido?")) return;
    await supabase.from("orders").delete().eq("id", id);
    load();
  }

  async function handleDuplicate(o: Order) {
    const { data: userData } = await supabase.auth.getUser();
    const { id, ...rest } = o;
    await supabase.from("orders").insert({ ...rest, pedido: rest.pedido + "-copia", user_id: userData.user?.id });
    load();
  }

  async function handleImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const { data: userData } = await supabase.auth.getUser();
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName = wb.SheetNames.find((n) => /controle|pedido|geral/i.test(n)) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const existingKeys = new Set(orders.map((o) => `${o.pedido}|${o.data}`));
      const toInsert: any[] = [];
      let skipped = 0;

      for (const r of rows) {
        const pedido = String(r["Pedido"] || r["Número do pedido"] || "").trim();
        const produto = String(r["Produto"] || "").trim();
        if (!pedido && !produto) continue;

        let dataStr = "";
        const dataVal = r["Data"];
        if (dataVal instanceof Date) {
          dataStr = dataVal.toISOString().slice(0, 10);
        } else if (typeof dataVal === "number") {
          const d = XLSX.SSF.parse_date_code(dataVal);
          dataStr = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        } else if (dataVal) {
          dataStr = String(dataVal);
        }
        if (!dataStr) dataStr = new Date().toISOString().slice(0, 10);

        const key = `${pedido}|${dataStr}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        existingKeys.add(key);

        const taxas = parseFloat(
          r["Taxas Amazon (R$)"] || r["Taxas Amazon"] || r["Taxa Amazon (R$)"] || r["Taxas"] || r["taxas"]
        ) || 0;

        toInsert.push({
          data: dataStr,
          pedido,
          produto,
          venda_bruta: parseFloat(r["Venda Bruta"]) || 0,
          custo: parseFloat(r["custo"] || r["Custo"]) || 0,
          taxas_amazon: taxas,
          status: r["Status"] || "Pendente",
          conta: r["conta shopee"] || r["Conta"] || "",
          observacoes: "",
          user_id: userData.user?.id,
        });
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("orders").insert(toInsert);
        if (error) throw error;
      }

      setImportMsg(`Importado: ${toInsert.length} pedido(s) (${skipped} duplicado(s) ignorado(s))`);
      load();
    } catch (err: any) {
      setImportMsg("Erro ao importar: " + (err.message || "verifique o formato do arquivo"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleExportExcel() {
    const rows = orders.map((o) => {
      const c = calc(o);
      return {
        Data: o.data,
        Pedido: o.pedido,
        Produto: o.produto,
        "Venda Bruta": o.venda_bruta,
        custo: o.custo,
        "Taxas Amazon (R$)": o.taxas_amazon,
        "Taxa Amazon (%)": Number(c.taxaPercent.toFixed(2)),
        "Lucro Caixa": c.lucroCaixa,
        "Amazon Vai Pagar": c.amazonVaiPagar,
        "Lucro Final": c.lucroFinal,
        Status: o.status,
        "conta shopee": o.conta,
        Observações: o.observacoes,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Controle Geral");
    XLSX.writeFile(wb, "controle-geral-export.xlsx");
  }


    (o) =>
      o.pedido.toLowerCase().includes(search.toLowerCase()) ||
      o.produto.toLowerCase().includes(search.toLowerCase())
  );

  const taxaPercent =
    (parseFloat(form.venda_bruta) || 0) > 0
      ? (((parseFloat(form.taxas_amazon) || 0) / (parseFloat(form.venda_bruta) || 1)) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold">Pedidos</h1>
            <p className="text-dim text-sm">Gestão completa de pedidos</p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleImportExcel}
              style={{ display: "none" }}
            />
            <button
              className="px-4 py-2 rounded-lg text-sm bg-elev2 border border-border"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? "Importando..." : "⇧ Importar Excel"}
            </button>
            <button className="px-4 py-2 rounded-lg text-sm bg-elev2 border border-border" onClick={handleExportExcel}>
              ⇩ Exportar Excel
            </button>
            <button className="btn" onClick={openNew}>+ Novo pedido</button>
          </div>
        </div>

        {importMsg && <p className="text-xs text-dim mb-3">{importMsg}</p>}

        <input
          className="input max-w-xs mb-4"
          placeholder="Pesquisar pedido ou produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-elev2 text-faint text-xs uppercase">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Pedido</th>
                <th className="text-left p-3">Produto</th>
                <th className="text-left p-3">Venda</th>
                <th className="text-left p-3">Custo</th>
                <th className="text-left p-3">Taxa R$</th>
                <th className="text-left p-3">Taxa %</th>
                <th className="text-left p-3">Lucro Final</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Conta</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="p-6 text-center text-faint">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={11} className="p-6 text-center text-faint">Nenhum pedido ainda.</td></tr>
              )}
              {filtered.map((o) => {
                const c = calc(o);
                return (
                  <tr key={o.id} className="border-t border-bordersoft hover:bg-elev2">
                    <td className="p-3">{o.data}</td>
                    <td className="p-3 mono">{o.pedido}</td>
                    <td className="p-3">{o.produto}</td>
                    <td className="p-3 mono">{fmt(Number(o.venda_bruta))}</td>
                    <td className="p-3 mono">{fmt(Number(o.custo))}</td>
                    <td className="p-3 mono">{fmt(Number(o.taxas_amazon))}</td>
                    <td className="p-3 mono">{c.taxaPercent.toFixed(1)}%</td>
                    <td className={`p-3 mono ${c.lucroFinal >= 0 ? "pos" : "neg"}`}>{fmt(c.lucroFinal)}</td>
                    <td className="p-3">{o.status}</td>
                    <td className="p-3">{o.conta}</td>
                    <td className="p-3">
                      <button className="text-faint hover:text-text mr-2" onClick={() => openEdit(o)}>✎</button>
                      <button className="text-faint hover:text-text mr-2" onClick={() => handleDuplicate(o)}>⧉</button>
                      <button className="text-faint hover:text-text" onClick={() => handleDelete(o.id)}>🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <form
            className="card w-full max-w-md space-y-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSave}
          >
            <h3 className="font-semibold text-base mb-2">{form.id ? "Editar pedido" : "Novo pedido"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              <input className="input" placeholder="Número do pedido" value={form.pedido} onChange={(e) => setForm({ ...form, pedido: e.target.value })} required />
            </div>
            <input className="input" placeholder="Produto" value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} required />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="number" step="0.01" placeholder="Venda Bruta (R$)" value={form.venda_bruta} onChange={(e) => setForm({ ...form, venda_bruta: e.target.value })} />
              <input className="input" type="number" step="0.01" placeholder="Custo (R$)" value={form.custo} onChange={(e) => setForm({ ...form, custo: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="number" step="0.01" placeholder="Taxas Amazon (R$) — valor exato" value={form.taxas_amazon} onChange={(e) => setForm({ ...form, taxas_amazon: e.target.value })} />
              <input className="input" disabled value={`${taxaPercent}% (calculado)`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Pago</option>
                <option>Pendente</option>
                <option>Problema</option>
                <option>Cancelado</option>
              </select>
              <input className="input" placeholder="Conta utilizada" value={form.conta} onChange={(e) => setForm({ ...form, conta: e.target.value })} />
            </div>
            <textarea className="input" placeholder="Observações internas" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-4 py-2 rounded-lg text-sm bg-elev2 border border-border" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
