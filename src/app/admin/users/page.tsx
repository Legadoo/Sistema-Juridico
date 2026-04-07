"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";

type Me = { id: string; name: string; role: string };
type UserRow = { id: string; name: string; email: string; role: string; active: boolean; createdAt: string };

export default function UsersPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // criar
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SECRETARY");
  const [password, setPassword] = useState("");

  // editar (modal)
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"MASTER" | "SECRETARY">("SECRETARY");

  async function load() {
    setMsg(null);

    const m = await fetch("/api/me").then(r => r.json()).catch(() => null);
    if (!m?.ok) return;

    setMe({ id: m.user.id, name: m.user.name, role: m.user.role });

    if (m.user.role !== "MASTER" && m.user.role !== "SUPERADMIN") {
      setMsg("Sem permissão.");
      return;
    }

    const res = await fetch("/api/admin/users").then(r => r.json()).catch(() => null);
    if (res?.ok) setUsers(res.users);
  }

  useEffect(() => { load(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, role, password }),
    }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) })).catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      setMsg(res?.d?.message || "Erro ao criar usuário.");
      return;
    }

    setName(""); setEmail(""); setPassword(""); setRole("SECRETARY");
    await load();
  }

  async function toggleActive(userId: string, active: boolean) {
    const res = await fetch("/api/admin/users/toggle-active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, active }),
    }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) })).catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      alert(res?.d?.message || "Erro ao alterar status.");
      return;
    }

    await load();
  }

  async function deleteUser(userId: string) {
    if (me?.role !== "SUPERADMIN") return;

    const ok = confirm("EXCLUIR conta PERMANENTEMENTE? Essa pessoa perderá acesso e será apagada do sistema.");
    if (!ok) return;

    const res = await fetch("/api/admin/users/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) })).catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      alert(res?.d?.message || "Erro ao excluir usuário.");
      return;
    }

    await load();
  }

  function openEdit(u: UserRow) {
    setEditId(u.id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPassword("");
    setEditRole(u.role === "MASTER" ? "MASTER" : "SECRETARY");
  }

  async function saveEdit() {
    if (!editId || !me) return;

    const payload: any = {
      userId: editId,
      name: editName,
      email: editEmail,
      password: editPassword,
    };

    // só SUPERADMIN pode trocar cargo
    if (me.role === "SUPERADMIN") {
      payload.role = editRole;
    }

    const res = await fetch("/api/admin/users/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) })).catch(() => null);

    if (!res || !res.ok || !res.d.ok) {
      alert(res?.d?.message || "Erro ao salvar.");
      return;
    }

    setEditId(null);
    await load();
  }

  if (!me) return <div style={{ padding: 16 }}>Carregando...</div>;

  const isSuper = me.role === "SUPERADMIN";

  return (
    <AdminShell userName={me.name} role={me.role}>
      <div style={{ display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0 }}>Usuários</h1>

        {msg && (
          <div style={{ background: "#fff4f4", border: "1px solid #ffd0d0", padding: 10, borderRadius: 10 }}>
            {msg}
          </div>
        )}

        <form onSubmit={createUser} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Criar usuário</div>

          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" style={{ padding: 10 }} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ padding: 10 }} />

          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: 10 }}>
            <option value="SECRETARY">SECRETARY</option>
            {isSuper && <option value="MASTER">MASTER</option>}
          </select>

          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" type="password" style={{ padding: 10 }} />

          <button style={{ padding: 10, borderRadius: 12, border: "1px solid #111827", background: "#111827", color: "white", fontWeight: 900 }}>
            Criar usuário
          </button>

          <div style={{ fontSize: 12, color: "#6b7280" }}>
            MASTER só cria SECRETARY. SUPERADMIN cria MASTER e SECRETARY.
          </div>
        </form>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Lista</div>

          <div style={{ display: "grid", gap: 8 }}>
            {users.map(u => {
              const canDelete = isSuper && u.role !== "SUPERADMIN" && u.id !== me.id;

              return (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, border: "1px solid #f0f0f0", borderRadius: 12, padding: 10, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{u.email}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{u.role} · {u.active ? "Ativo" : "Inativo"}</div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => openEdit(u)}
                      style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 900 }}>
                      Editar
                    </button>

                    <button type="button" onClick={() => toggleActive(u.id, !u.active)}
                      style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 900 }}>
                      {u.active ? "Desativar" : "Ativar"}
                    </button>

                    {canDelete && (
                      <button type="button" onClick={() => deleteUser(u.id)}
                        style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #fecaca", background: "#fff", cursor: "pointer", fontWeight: 900, color: "#991b1b" }}>
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {users.length === 0 && <div style={{ color: "#6b7280" }}>Nenhum usuário encontrado.</div>}
          </div>
        </div>

        {editId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", padding: 16 }}>
            <div style={{ width: 560, maxWidth: "100%", background: "#fff", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 900 }}>Editar usuário</div>
                <button onClick={() => setEditId(null)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>

              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" style={{ width: "100%", marginTop: 10, padding: 10 }} />
              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" style={{ width: "100%", marginTop: 10, padding: 10 }} />
              <input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Nova senha (opcional)" type="password" style={{ width: "100%", marginTop: 10, padding: 10 }} />

              {isSuper && (
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as any)} style={{ width: "100%", marginTop: 10, padding: 10 }}>
                  <option value="SECRETARY">SECRETARY</option>
                  <option value="MASTER">MASTER</option>
                </select>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                <button onClick={() => setEditId(null)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900 }}>
                  Cancelar
                </button>
                <button onClick={saveEdit} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "#fff", fontWeight: 900 }}>
                  Salvar
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                MASTER só edita SECRETARY (básico + senha). SUPERADMIN pode trocar cargo e excluir contas.
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
