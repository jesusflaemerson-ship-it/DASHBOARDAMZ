"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/calc";

export default function EstoquePage() {
  const supabase = createClient();
  const [stock, setStock] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ id: "", produto: "", quantidade: "", custo_medio: "", fornecedor: "", estoque_minimo: "5" });

  async function load() {
    const { data } = await supabase.from("stock").select("*").order("produto");
    setStock(data || []);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setForm({ id: "", produto: "", quantidade: "", custo_medio: "", fornecedor: "", estoque_minimo: "5" });
    setShowModal(true);
  }
  function openEdit(s: any) {
    setForm({ id: s.id, produto: s.produto, quantidade: String(s.quantidade), custo_medio: String(s.custo_medio), fornecedor: s.fornecedor || "", estoque_minimo: String(s.estoque_minimo) });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      produto: form.produto,
      quantidade: parseInt(form.quantidade) || 0,
      custo_medio: parseFloat(form.custo_medio) || 0,
      fornecedor: form.fornecedor,
      estoque_minimo: parseInt(form.estoque_minimo) || 5,
      user_id: userData.user?.id,
    };
    if (form.id) await supabase.from("stock").update(payload).eq("id", form.id);
    else await supabase.from("stock").insert(payload);
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("stock").delete().eq("id", id);
    load();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold">Estoque</h1>
            <p className="text-dim text-sm">Controle de inventário e fornecedores</p>
          </div>
          <button className="btn" onClick={openNew}>+ Novo produto</button>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elev2 text-faint text-xs uppercase">
              <tr><th className="text-left p-3">Produto</th><th className="text-left p-3">Quantidade</th><th className="text-left p-3">Custo Médio</th><th className="text-left p-3">Fornecedor</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {stock.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-faint">Nenhum produto cadastrado.</td></tr>}
              {stock.map((s) => {
                const low = s.quantidade <= s.estoque_minimo;
                return (
                  <tr key={s.id} className="border-t border-bordersoft">
                    <td className="p-3">{s.produto}</td>
                    <td className={`p-3 mono ${low ? "neg" : "pos"}`}>{s.quantidade}</td>
                    <td className="p-3 mono">{fmt(Number(s.custo_medio))}</td>
                    <td className="p-3">{s.fornecedor}</td>
                    <td className="p-3">{low ? "⚠️ Estoque baixo" : "✅ OK"}</td>
                    <td className="p-3">
                      <button className="text-faint hover:text-text mr-2" onClick={() => openEdit(s)}>✎</button>
                      <button className="text-faint hover:text-text" onClick={() => handleDelete(s.id)}>🗑</button>
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
          <form className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h3 className="font-semibold mb-2">Produto</h3>
            <input className="input" placeholder="Produto" value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} required />
            <div className="grid grid-cols-2 gap-3">
              <input className="input" type="number" placeholder="Quantidade" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
              <input className="input" type="number" step="0.01" placeholder="Custo médio (R$)" value={form.custo_medio} onChange={(e) => setForm({ ...form, custo_medio: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Fornecedor" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
              <input className="input" type="number" placeholder="Alerta mínimo" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
            </div>
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
