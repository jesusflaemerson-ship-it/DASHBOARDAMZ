"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";
import { fmt } from "@/lib/calc";

export default function ReembolsosPage() {
  const supabase = createClient();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ data: new Date().toISOString().slice(0, 10), order_id: "", tipo: "Envio errado", valor: "", observacoes: "" });

  async function load() {
    const { data: r } = await supabase.from("refunds").select("*, orders(pedido, produto)").order("data", { ascending: false });
    const { data: o } = await supabase.from("orders").select("id, pedido, produto");
    setRefunds(r || []);
    setOrders(o || []);
  }
  useEffect(() => { load(); }, []);

  const total = refunds.reduce((a, r) => a + Number(r.valor), 0);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("refunds").insert({
      data: form.data,
      order_id: form.order_id || null,
      tipo: form.tipo,
      valor: parseFloat(form.valor) || 0,
      observacoes: form.observacoes,
      user_id: userData.user?.id,
    });
    setShowModal(false);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("refunds").delete().eq("id", id);
    load();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-semibold">Reembolsos & Problemas</h1>
            <p className="text-dim text-sm">Controle de casos problemáticos</p>
          </div>
          <button className="btn" onClick={() => setShowModal(true)}>+ Novo caso</button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card"><div className="text-xs text-dim mb-2">Casos registrados</div><div className="text-2xl font-semibold">{refunds.length}</div></div>
          <div className="card"><div className="text-xs text-dim mb-2">Prejuízo total</div><div className="text-2xl font-semibold neg">{fmt(total)}</div></div>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elev2 text-faint text-xs uppercase">
              <tr><th className="text-left p-3">Data</th><th className="text-left p-3">Pedido</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Valor</th><th className="text-left p-3">Observações</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {refunds.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-faint">Nenhum caso registrado.</td></tr>}
              {refunds.map((r) => (
                <tr key={r.id} className="border-t border-bordersoft">
                  <td className="p-3">{r.data}</td>
                  <td className="p-3 mono">{r.orders?.pedido || "—"}</td>
                  <td className="p-3">{r.tipo}</td>
                  <td className="p-3 mono neg">{fmt(Number(r.valor))}</td>
                  <td className="p-3">{r.observacoes}</td>
                  <td className="p-3"><button className="text-faint hover:text-text" onClick={() => handleDelete(r.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <form className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h3 className="font-semibold mb-2">Novo caso</h3>
            <input className="input" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            <select className="input" value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })}>
              <option value="">Pedido relacionado (opcional)</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.pedido} — {o.produto}</option>)}
            </select>
            <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option>Envio errado</option><option>Reembolso parcial</option><option>Prejuízo operacional</option><option>Cliente suspeito</option><option>Chargeback</option>
            </select>
            <input className="input" type="number" step="0.01" placeholder="Valor do prejuízo (R$)" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            <textarea className="input" placeholder="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
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
