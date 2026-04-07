"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";

type Me = { name: string; role: string };
type Client = {
  id: string;
  name: string;
  document: string;
  phone?: string | null;
  email?: string | null;
  accessCode: string;
  createdAt: string;
};

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export default function ClientsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // criar cliente
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // modal editar (SUPERADMIN)
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDocument, setEditDocument] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const isSuper = me?.role === "SUPERADMIN";
const canEdit = me?.role === "SUPERADMIN" || me?.role === "MASTER" || me?.role === "SECRETARY";

  async function load() {
    const m = await fetch("/api/me").then(r => r.json()).catch(() => null);
    if (!m?.ok) return;
    setMe({ name: m.user.name, role: m.user.role });

    const res = await fetch("/api/admin/clients").then(r => r.json()).catch(() => null);
    if (res?.ok) setClients(res.clients);
  }

  useEffect(() => { load(); }, []);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const payload = {
      name: name.trim(),
      document: onlyDigits(document),
      phone: phone.trim(),
      email: email.trim(),
    };

    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) })).catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao criar cliente.");
      return;
    }

    setName(""); setDocument(""); setPhone(""); setEmail("");
    await load();
  }

  async function archiveClient(clientId: string) {
    if (!confirm("Arquivar este cliente? Ele some das listas ativas.")) return;

    await fetch("/api/admin/clients/archive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId }),
    }).catch(() => null);

    await load();
  }

  async function deleteClient(clientId: string) {
    if (!isSuper) return;

    const ok = confirm("EXCLUIR cliente PERMANENTEMENTE? Isso apaga de vez do sistema.");
    if (!ok) return;

    const res = await fetch("/api/admin/clients/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId }),
    }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) })).catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      alert(res?.d?.message || "Erro ao excluir cliente.");
      return;
    }

    await load();
  }

  function openEdit(c: Client) { if (!canEdit) return;

    setEditId(c.id);
    setEditName(c.name || "");
    setEditDocument(c.document || "");
    setEditPhone(c.phone || "");
    setEditEmail(c.email || "");
    setEditOpen(true);
  }

  async function saveEdit() { if (!canEdit || !editId) return;

    const payload = {
      clientId: editId,
      name: editName.trim(),
      document: onlyDigits(editDocument),
      phone: editPhone.trim(),
      email: editEmail.trim(),
    };

    const res = await fetch("/api/admin/clients/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) })).catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      alert(res?.d?.message || "Erro ao salvar.");
      return;
    }

    setEditOpen(false);
    setEditId(null);
    await load();
  }

  async function copyWhatsapp(c: Client) {
    const link = `${window.location.origin}/acompanhar`;
    const text =
`Olá, ${c.name}!

Seu acesso ao acompanhamento no juridicVas é:
CPF/CNPJ: ${c.document}
Código: ${c.accessCode}

Acesse: ${link}`;

    try {
      await navigator.clipboard.writeText(text);
      alert("Mensagem copiada! Cole no WhatsApp.");
    } catch {
      alert("Não consegui copiar automaticamente. Seu navegador bloqueou a cópia.");
    }
  }

  if (!me) return <div style={{ padding: 16 }}>Carregando...</div>;

  return (
    <AdminShell userName={me.name} role={me.role}>
      <div style={{ display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Clientes</h1>

        <form onSubmit={createClient} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Cadastrar cliente</div>

          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" style={{ padding: 10 }} />
          <input value={document} onChange={(e) => setDocument(e.target.value)} placeholder="CPF ou CNPJ" style={{ padding: 10 }} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone (opcional)" style={{ padding: 10 }} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opcional)" style={{ padding: 10 }} />

          {msg && <div style={{ background: "#fff4f4", border: "1px solid #ffd0d0", padding: 10, borderRadius: 10 }}>{msg}</div>}

          <button style={{ padding: 10, borderRadius: 12, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 800 }}>
            Salvar cliente
          </button>

          <div style={{ fontSize: 12, color: "#6b7280" }}>
            O sistema gera um <b>código de 6 dígitos</b>. Use “Copiar mensagem” para enviar no WhatsApp.
          </div>
        </form>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Lista</div>

          <div style={{ display: "grid", gap: 8 }}>
            {clients.map(c => (
              <div key={c.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 10, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{c.document}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {c.phone || ""}{c.email ? (c.phone ? " · " : "") + c.email : ""}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Código</div>
                  <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2 }}>{c.accessCode}</div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => copyWhatsapp(c)}
                      style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white", cursor: "pointer", fontWeight: 800 }}>
                      Copiar mensagem
                    </button>

                    <button type="button" onClick={() => archiveClient(c.id)}
                      style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 800 }}>
                      Arquivar
                    </button>

                    {canEdit && (
  <button type="button" onClick={() => openEdit(c)}
    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 800 }}>
    Editar
  </button>
)}
{isSuper && (
  <button type="button" onClick={() => deleteClient(c.id)}
    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff", cursor: "pointer", fontWeight: 900, color: "#991b1b" }}>
    Excluir
  </button>
)}
                  </div>
                </div>
              </div>
            ))}
            {clients.length === 0 && <div style={{ color: "#6b7280" }}>Nenhum cliente cadastrado ainda.</div>}
          </div>
        </div>

        {editOpen && canEdit && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", padding: 16 }}>
            <div style={{ width: 560, maxWidth: "100%", background: "#fff", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 900 }}>Editar cliente</div>
                <button onClick={() => setEditOpen(false)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>

              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" style={{ width: "100%", marginTop: 10, padding: 10 }} />
              <input value={editDocument} onChange={(e) => setEditDocument(e.target.value)} placeholder="CPF/CNPJ" style={{ width: "100%", marginTop: 10, padding: 10 }} />
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Telefone" style={{ width: "100%", marginTop: 10, padding: 10 }} />
              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" style={{ width: "100%", marginTop: 10, padding: 10 }} />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button onClick={() => setEditOpen(false)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 800 }}>
                  Cancelar
                </button>
                <button onClick={saveEdit} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 900 }}>
                  Salvar
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                Edição liberada para Advogado e Estagiário. Exclusão permanece apenas com o Super Admin.
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}


