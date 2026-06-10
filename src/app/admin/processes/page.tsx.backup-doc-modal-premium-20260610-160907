"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaBoxArchive,
  FaDownload,
  FaFilePdf,
  FaFolderOpen,
  FaMagnifyingGlass,
  FaPenToSquare,
  FaPlus,
  FaTrash,
  FaUpload,
  FaXmark,
} from "react-icons/fa6";
import AdminShell from "@/components/AdminShell";
import PremiumModal from "@/components/PremiumModal";
import PremiumToast from "@/components/PremiumToast";

type MeResponse = {
  ok?: boolean;
  user?: {
    id?: string;
    name?: string;
    role?: string;
  };
};

type Me = {
  id: string;
  name: string;
  role: string;
};

type Client = {
  id: string;
  name: string;
  document: string;
};

type ProcessUpdate = {
  id: string;
  text?: string;
  message?: string;
  content?: string;
  date?: string;
  createdAt?: string;
  visibleToClient?: boolean;
};

type ProcessDocument = {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  docType?: string | null;
  createdAt?: string;
};

type ProcessRow = {
  id: string;
  cnj?: string;
  tribunal?: string | null;
  vara?: string | null;
  status?: string | null;
  startDate?: string | null;
  notes?: string | null;
  archived?: boolean;
  clientId?: string;
  client?: Client;
  updates?: ProcessUpdate[];
  documents?: ProcessDocument[];
  createdAt?: string;
};

type ToastState = {
  open: boolean;
  message: string;
  type: "success" | "error" | "warning" | "info";
};

type ProcessFormState = {
  clientId: string;
  cnj: string;
  tribunal: string;
  vara: string;
  status: string;
  notes: string;
};

type UpdateFormState = {
  text: string;
  visibleToClient: boolean;
};

type ArchiveActionState = {
  process: ProcessRow;
} | null;

const emptyProcessForm: ProcessFormState = {
  clientId: "",
  cnj: "",
  tribunal: "",
  vara: "",
  status: "ACTIVE",
  notes: "",
};

const emptyUpdateForm: UpdateFormState = {
  text: "",
  visibleToClient: true,
};

function normalizeMe(data: MeResponse): Me | null {
  if (!data?.ok || !data?.user) return null;

  return {
    id: data.user.id ?? "",
    name: data.user.name ?? "Usuário",
    role: data.user.role ?? "SECRETARY",
  };
}

function onlyDigits(value: string) {
  return (value || "").replace(/\D/g, "");
}

function formatCnj(value: string) {
  const digits = onlyDigits(value).slice(0, 20);

  return digits
    .replace(/^(\d{7})(\d)/, "$1-$2")
    .replace(/^(\d{7})-(\d{2})(\d)/, "$1-$2.$3")
    .replace(/^(\d{7})-(\d{2})\.(\d{4})(\d)/, "$1-$2.$3.$4")
    .replace(/^(\d{7})-(\d{2})\.(\d{4})\.(\d)(\d)/, "$1-$2.$3.$4.$5")
    .replace(/^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})(\d)/, "$1-$2.$3.$4.$5.$6");
}

function normalizeText(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(date?: string) {
  if (!date) return "Sem data";

  try {
    return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
  } catch {
    return date;
  }
}

function getProcessNumber(process: ProcessRow) {
  return formatCnj(process.cnj || "") || "Sem número";
}

function getUpdateText(update: ProcessUpdate) {
  return update.text || update.message || update.content || "Atualização sem conteúdo";
}

function normalizeProcessesPayload(payload: unknown): ProcessRow[] {
  if (Array.isArray(payload)) return payload as ProcessRow[];

  if (typeof payload === "object" && payload !== null) {
    const value = (payload as { processes?: unknown }).processes;
    if (Array.isArray(value)) return value as ProcessRow[];
  }

  return [];
}

function normalizeClientsPayload(payload: unknown): Client[] {
  if (Array.isArray(payload)) return payload as Client[];

  if (typeof payload === "object" && payload !== null) {
    const value = (payload as { clients?: unknown }).clients;
    if (Array.isArray(value)) return value as Client[];
  }

  return [];
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size)) return "0 KB";

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function ProcessesPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processModalMode, setProcessModalMode] = useState<"create" | "edit">("create");
  const [processForm, setProcessForm] = useState<ProcessFormState>(emptyProcessForm);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
  const [savingProcess, setSavingProcess] = useState(false);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProcessRow | null>(null);
  const [updateForm, setUpdateForm] = useState<UpdateFormState>(emptyUpdateForm);
  const [savingUpdate, setSavingUpdate] = useState(false);

  const [archiveAction, setArchiveAction] = useState<ArchiveActionState>(null);
  const [runningArchive, setRunningArchive] = useState(false);

  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [documentsProcess, setDocumentsProcess] = useState<ProcessRow | null>(null);
  const [documents, setDocuments] = useState<ProcessDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<ProcessDocument | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState("Documento");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [draggingDocumentId, setDraggingDocumentId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: "",
    type: "info",
  });

  const canDeleteProcess = me?.role === "MASTER" || me?.role === "SUPERADMIN";

  const stats = useMemo(() => {
    const total = processes.length;
    const withUpdates = processes.filter((p) => (p.updates?.length || 0) > 0).length;
    const withDocuments = processes.filter((p) => (p.documents?.length || 0) > 0).length;

    return {
      total,
      withUpdates,
      withDocuments,
    };
  }, [processes]);

  const filteredProcesses = useMemo(() => {
    const term = normalizeText(search);
    const digits = onlyDigits(search);

    if (!term && !digits) return processes;

    return processes.filter((process) => {
      const updateText = (process.updates || []).map(getUpdateText).join(" ");
      const docText = (process.documents || []).map((doc) => doc.originalName).join(" ");

      const fullText = normalizeText(
        [
          process.cnj,
          process.client?.name,
          process.tribunal,
          process.vara,
          process.status,
          process.notes,
          updateText,
          docText,
        ]
          .filter(Boolean)
          .join(" ")
      );

      const digitText = onlyDigits([process.cnj].filter(Boolean).join(" "));

      return fullText.includes(term) || Boolean(digits && digitText.includes(digits));
    });
  }, [processes, search]);

  function showToast(message: string, type: ToastState["type"]) {
    setToast({ open: true, message, type });
  }

  async function load() {
    setLoading(true);

    const meResponse = await fetch("/api/me", { cache: "no-store" })
      .then((response) => response.json())
      .catch(() => null);

    const normalizedMe = normalizeMe(meResponse);

    if (!normalizedMe) {
      setLoading(false);
      window.location.href = "/login";
      return;
    }

    setMe(normalizedMe);

    const clientsResponse = await fetch("/api/admin/clients", { cache: "no-store" })
      .then((response) => response.json())
      .catch(() => null);

    const processesResponse = await fetch("/api/admin/processes", { cache: "no-store" })
      .then((response) => response.json())
      .catch(() => null);

    setClients(normalizeClientsPayload(clientsResponse?.clients ?? clientsResponse));
    setProcesses(normalizeProcessesPayload(processesResponse?.processes ?? processesResponse));
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;

    async function run() {
      if (!ignore) {
        await load();
      }
    }

    void run();

    return () => {
      ignore = true;
    };
  }, []);

  function openCreateModal() {
    setProcessModalMode("create");
    setEditingProcessId(null);
    setProcessForm(emptyProcessForm);
    setProcessModalOpen(true);
  }

  function openEditModal(process: ProcessRow) {
    setProcessModalMode("edit");
    setEditingProcessId(process.id);
    setProcessForm({
      clientId: process.clientId || process.client?.id || "",
      cnj: formatCnj(process.cnj || ""),
      tribunal: process.tribunal || "",
      vara: process.vara || "",
      status: process.status || "ACTIVE",
      notes: process.notes || "",
    });
    setProcessModalOpen(true);
  }

  async function submitProcess() {
    const payload = {
      clientId: processForm.clientId.trim(),
      cnj: onlyDigits(processForm.cnj),
      tribunal: processForm.tribunal.trim(),
      vara: processForm.vara.trim(),
      status: processForm.status.trim() || "ACTIVE",
      notes: processForm.notes.trim(),
    };

    if (!payload.clientId || !payload.cnj) {
      showToast("Selecione o cliente e informe o CNJ.", "warning");
      return;
    }

    setSavingProcess(true);

    try {
      const endpoint =
        processModalMode === "create"
          ? "/api/admin/processes"
          : `/api/admin/processes/${editingProcessId}`;

      const response = await fetch(endpoint, {
        method: processModalMode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao salvar processo.", "error");
        return;
      }

      setProcessModalOpen(false);
      setEditingProcessId(null);
      setProcessForm(emptyProcessForm);
      await load();
      showToast(
        processModalMode === "create"
          ? "Processo criado com sucesso."
          : "Processo atualizado com sucesso.",
        "success"
      );
    } catch {
      showToast("Não foi possível salvar o processo.", "error");
    } finally {
      setSavingProcess(false);
    }
  }

  function openUpdateModal(process: ProcessRow) {
    setSelectedProcess(process);
    setUpdateForm(emptyUpdateForm);
    setUpdateOpen(true);
  }

  async function submitUpdate() {
    if (!selectedProcess) return;

    const text = updateForm.text.trim();

    if (!text) {
      showToast("Digite o texto da atualização.", "warning");
      return;
    }

    setSavingUpdate(true);

    try {
      const response = await fetch(`/api/admin/processes/${selectedProcess.id}/updates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          message: text,
          content: text,
          visibleToClient: updateForm.visibleToClient,
          isPublic: updateForm.visibleToClient,
          public: updateForm.visibleToClient,
        }),
      }).then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao adicionar atualização.", "error");
        return;
      }

      setUpdateOpen(false);
      setSelectedProcess(null);
      setUpdateForm(emptyUpdateForm);
      await load();
      showToast("Atualização registrada com sucesso.", "success");
    } catch {
      showToast("Não foi possível registrar a atualização.", "error");
    } finally {
      setSavingUpdate(false);
    }
  }

  async function confirmArchive() {
    if (!archiveAction) return;

    setRunningArchive(true);

    try {
      const response = await fetch("/api/admin/processes/archive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ processId: archiveAction.process.id }),
      }).then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao arquivar processo.", "error");
        return;
      }

      setArchiveAction(null);
      await load();
      showToast("Processo arquivado com sucesso.", "success");
    } catch {
      showToast("Não foi possível arquivar o processo.", "error");
    } finally {
      setRunningArchive(false);
    }
  }

  async function deleteProcess(process: ProcessRow) {
    if (!canDeleteProcess) return;

    const confirmed = window.confirm(
      `Deseja excluir definitivamente o processo ${getProcessNumber(process)}?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/processes/${process.id}`, {
        method: "DELETE",
      }).then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao excluir processo.", "error");
        return;
      }

      await load();
      showToast("Processo excluído com sucesso.", "success");
    } catch {
      showToast("Não foi possível excluir o processo.", "error");
    }
  }

  async function loadDocuments(process: ProcessRow) {
    const response = await fetch(`/api/admin/processes/${process.id}/documents`, {
      cache: "no-store",
    }).then(async (response) => ({
      ok: response.ok,
      data: await response.json().catch(() => ({})),
    }));

    if (!response.ok || !response.data?.ok) {
      showToast(response.data?.message || "Erro ao carregar documentos.", "error");
      return;
    }

    const docs = response.data.documents || [];
    setDocuments(docs);
    setSelectedDocument(docs[0] || null);
  }

  async function openDocumentsModal(process: ProcessRow) {
    setDocumentsProcess(process);
    setDocumentsOpen(true);
    setUploadFile(null);
    setUploadDocType("Documento");
    await loadDocuments(process);
  }

  async function uploadDocument() {
    if (!documentsProcess) return;

    if (!uploadFile) {
      showToast("Selecione um PDF.", "warning");
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith(".pdf") && uploadFile.type !== "application/pdf") {
      showToast("Somente PDF é permitido.", "warning");
      return;
    }

    setUploadingDocument(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("docType", uploadDocType);

      const response = await fetch(`/api/admin/processes/${documentsProcess.id}/documents`, {
        method: "POST",
        body: formData,
      }).then(async (response) => ({
        ok: response.ok,
        data: await response.json().catch(() => ({})),
      }));

      if (!response.ok || !response.data?.ok) {
        showToast(response.data?.message || "Erro ao enviar PDF.", "error");
        return;
      }

      setUploadFile(null);
      setUploadDocType("Documento");
      await loadDocuments(documentsProcess);
      await load();
      showToast("PDF anexado com sucesso.", "success");
    } catch {
      showToast("Não foi possível enviar o PDF.", "error");
    } finally {
      setUploadingDocument(false);
    }
  }

  async function saveDocumentsOrder(nextDocs: ProcessDocument[]) {
    if (!documentsProcess) return;

    setDocuments(nextDocs);

    const response = await fetch(`/api/admin/processes/${documentsProcess.id}/documents`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        documents: nextDocs.map((doc, index) => ({
          id: doc.id,
          sortOrder: index,
          docType: doc.docType || "Documento",
        })),
      }),
    }).then(async (response) => ({
      ok: response.ok,
      data: await response.json().catch(() => ({})),
    }));

    if (response.ok && response.data?.ok) {
      setDocuments(response.data.documents || nextDocs);
      await load();
    }
  }

  async function updateDocumentType(doc: ProcessDocument, docType: string) {
    if (!documentsProcess) return;

    const response = await fetch(`/api/admin/processes/${documentsProcess.id}/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ docType }),
    }).then(async (response) => ({
      ok: response.ok,
      data: await response.json().catch(() => ({})),
    }));

    if (!response.ok || !response.data?.ok) {
      showToast(response.data?.message || "Erro ao editar documento.", "error");
      return;
    }

    await loadDocuments(documentsProcess);
    showToast("Documento atualizado.", "success");
  }

  async function deleteDocument(doc: ProcessDocument) {
    if (!documentsProcess) return;

    const confirmed = window.confirm(`Excluir o documento ${doc.originalName}?`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/processes/${documentsProcess.id}/documents/${doc.id}`, {
      method: "DELETE",
    }).then(async (response) => ({
      ok: response.ok,
      data: await response.json().catch(() => ({})),
    }));

    if (!response.ok || !response.data?.ok) {
      showToast(response.data?.message || "Erro ao excluir documento.", "error");
      return;
    }

    await loadDocuments(documentsProcess);
    await load();
    showToast("Documento excluído.", "success");
  }

  function onDropDocument(targetId: string) {
    if (!draggingDocumentId || draggingDocumentId === targetId) return;

    const fromIndex = documents.findIndex((doc) => doc.id === draggingDocumentId);
    const toIndex = documents.findIndex((doc) => doc.id === targetId);

    if (fromIndex < 0 || toIndex < 0) return;

    const nextDocs = [...documents];
    const [moved] = nextDocs.splice(fromIndex, 1);
    nextDocs.splice(toIndex, 0, moved);

    setDraggingDocumentId(null);
    void saveDocumentsOrder(nextDocs);
  }

  if (!me && loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(180deg, #0B1020 0%, #0F172A 100%)",
          color: "#E2E8F0",
        }}
      >
        Carregando módulo de processos...
      </div>
    );
  }

  return (
    <AdminShell role={me?.role ?? "SECRETARY"} userName={me?.name ?? "Usuário"}>
      <PremiumToast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PremiumModal
        open={processModalOpen}
        onClose={() => {
          if (!savingProcess) setProcessModalOpen(false);
        }}
        title={processModalMode === "create" ? "Novo processo" : "Editar processo"}
        description="Informe os dados principais do processo."
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setProcessModalOpen(false)}
              disabled={savingProcess}
            >
              Cancelar
            </button>

            <button
              className="jv-premium-btn"
              onClick={submitProcess}
              disabled={savingProcess}
            >
              {savingProcess ? "Salvando..." : "Salvar processo"}
            </button>
          </>
        }
      >
        <div className="jv-process-form">
          <select
            className="jv-premium-input"
            value={processForm.clientId}
            onChange={(event) =>
              setProcessForm((prev) => ({ ...prev, clientId: event.target.value }))
            }
            style={{ colorScheme: "dark" }}
          >
            <option value="">Selecione o cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <input
            className="jv-premium-input"
            placeholder="Número CNJ"
            value={processForm.cnj}
            onChange={(event) =>
              setProcessForm((prev) => ({ ...prev, cnj: formatCnj(event.target.value) }))
            }
          />

          <input
            className="jv-premium-input"
            placeholder="Tribunal"
            value={processForm.tribunal}
            onChange={(event) =>
              setProcessForm((prev) => ({ ...prev, tribunal: event.target.value }))
            }
          />

          <input
            className="jv-premium-input"
            placeholder="Vara"
            value={processForm.vara}
            onChange={(event) =>
              setProcessForm((prev) => ({ ...prev, vara: event.target.value }))
            }
          />

          <textarea
            className="jv-premium-input"
            placeholder="Observações"
            value={processForm.notes}
            onChange={(event) =>
              setProcessForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            style={{ minHeight: 120, resize: "vertical" }}
          />
        </div>
      </PremiumModal>

      <PremiumModal
        open={updateOpen}
        onClose={() => {
          if (!savingUpdate) setUpdateOpen(false);
        }}
        title="Nova atualização processual"
        description={
          selectedProcess
            ? `Registrar movimentação para o processo ${getProcessNumber(selectedProcess)}.`
            : "Registrar uma nova atualização processual."
        }
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setUpdateOpen(false)}
              disabled={savingUpdate}
            >
              Cancelar
            </button>

            <button
              className="jv-premium-btn"
              onClick={submitUpdate}
              disabled={savingUpdate}
            >
              {savingUpdate ? "Salvando..." : "Salvar atualização"}
            </button>
          </>
        }
      >
        <div className="jv-process-form">
          <textarea
            className="jv-premium-input"
            placeholder="Digite a atualização processual"
            value={updateForm.text}
            onChange={(event) =>
              setUpdateForm((prev) => ({ ...prev, text: event.target.value }))
            }
            style={{ minHeight: 130, resize: "vertical" }}
          />

          <label className="jv-checkbox-line">
            <input
              type="checkbox"
              checked={updateForm.visibleToClient}
              onChange={(event) =>
                setUpdateForm((prev) => ({
                  ...prev,
                  visibleToClient: event.target.checked,
                }))
              }
            />
            Exibir esta atualização para o cliente no /acompanhar
          </label>
        </div>
      </PremiumModal>

      <PremiumModal
        open={!!archiveAction}
        onClose={() => {
          if (!runningArchive) setArchiveAction(null);
        }}
        title="Arquivar processo"
        description="O processo será removido da lista ativa e enviado para a área de arquivados."
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setArchiveAction(null)}
              disabled={runningArchive}
            >
              Cancelar
            </button>

            <button
              className="jv-premium-btn"
              onClick={confirmArchive}
              disabled={runningArchive}
            >
              {runningArchive ? "Processando..." : "Confirmar"}
            </button>
          </>
        }
        size="sm"
      >
        <div className="jv-action-box">
          <strong>{archiveAction?.process ? getProcessNumber(archiveAction.process) : ""}</strong>
          <span>{archiveAction?.process?.client?.name || "Cliente não informado"}</span>
        </div>
      </PremiumModal>

      <PremiumModal
        open={documentsOpen}
        onClose={() => setDocumentsOpen(false)}
        title="Documentos do processo"
        description={
          documentsProcess
            ? `Gerencie os PDFs do processo ${getProcessNumber(documentsProcess)}.`
            : "Gerencie os PDFs do processo."
        }
        footer={
          <>
            <button
              className="jv-premium-btn-secondary"
              onClick={() => setDocumentsOpen(false)}
            >
              Fechar
            </button>

            {documentsProcess && documents.length > 0 ? (
              <a
                className="jv-premium-btn"
                href={`/api/admin/processes/${documentsProcess.id}/documents/download`}
                target="_blank"
              >
                Baixar PDF único
              </a>
            ) : null}
          </>
        }
      >
        <div className="jv-doc-manager">
          <div className="jv-doc-upload">
            <select
              className="jv-premium-input"
              value={uploadDocType}
              onChange={(event) => setUploadDocType(event.target.value)}
              style={{ colorScheme: "dark" }}
            >
              <option>Documento</option>
              <option>Petição</option>
              <option>Procuração</option>
              <option>Contrato</option>
              <option>Documento pessoal</option>
              <option>Comprovante</option>
              <option>Decisão</option>
              <option>Outros</option>
            </select>

            <input
              className="jv-premium-input"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
            />

            <button
              className="jv-premium-btn"
              onClick={uploadDocument}
              disabled={uploadingDocument}
            >
              {uploadingDocument ? "Enviando..." : "Subir PDF"}
            </button>
          </div>

          <div className="jv-doc-grid">
            <div className="jv-doc-list">
              {documents.length === 0 ? (
                <div className="jv-empty">Nenhum PDF anexado neste processo.</div>
              ) : (
                documents.map((doc, index) => (
                  <div
                    key={doc.id}
                    className={
                      selectedDocument?.id === doc.id
                        ? "jv-doc-row jv-doc-row-active"
                        : "jv-doc-row"
                    }
                    draggable
                    onDragStart={() => setDraggingDocumentId(doc.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => onDropDocument(doc.id)}
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <div className="jv-doc-drag">☰</div>

                    <div className="jv-doc-main">
                      <strong>{index + 1}. {doc.originalName}</strong>
                      <span>{doc.docType || "Documento"} · {formatFileSize(doc.sizeBytes)}</span>
                    </div>

                    <select
                      value={doc.docType || "Documento"}
                      onChange={(event) => updateDocumentType(doc, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <option>Documento</option>
                      <option>Petição</option>
                      <option>Procuração</option>
                      <option>Contrato</option>
                      <option>Documento pessoal</option>
                      <option>Comprovante</option>
                      <option>Decisão</option>
                      <option>Outros</option>
                    </select>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void deleteDocument(doc);
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="jv-doc-preview">
              {documentsProcess && selectedDocument ? (
                <iframe
                  title={selectedDocument.originalName}
                  src={`/api/admin/processes/${documentsProcess.id}/documents/${selectedDocument.id}/file`}
                />
              ) : (
                <div className="jv-empty">Selecione um PDF para pré-visualizar.</div>
              )}
            </div>
          </div>
        </div>
      </PremiumModal>

      <div className="jv-process-page">
        <style>{`
          .jv-process-page {
            display: grid;
            gap: 20px;
          }

          .jv-process-page * {
            box-sizing: border-box;
          }

          .jv-process-form,
          .jv-doc-manager {
            display: grid;
            gap: 12px;
          }

          .jv-checkbox-line {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            color: #e2e8f0;
            font-size: 14px;
            line-height: 1.5;
          }

          .jv-action-box {
            display: grid;
            gap: 6px;
            padding: 16px;
            border-radius: 18px;
            background: rgba(245,158,11,0.08);
            border: 1px solid rgba(245,158,11,0.18);
            color: #e2e8f0;
          }

          .jv-action-box span {
            color: #94a3b8;
          }

          .jv-process-hero {
            min-height: 230px;
            position: relative;
            overflow: hidden;
            border-radius: 28px;
            border: 1px solid rgba(168,85,247,0.22);
            background:
              linear-gradient(90deg, rgba(7, 10, 23, 0.96), rgba(12, 15, 31, 0.84), rgba(17, 24, 39, 0.72)),
              radial-gradient(circle at 82% 17%, rgba(124,58,237,0.34), transparent 32%),
              linear-gradient(135deg, #090b16, #111827);
            box-shadow:
              0 34px 90px rgba(0,0,0,0.36),
              inset 0 1px 0 rgba(255,255,255,0.045);
            padding: 34px 38px;
          }

          .jv-process-hero-content {
            position: relative;
            z-index: 2;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 18px;
            flex-wrap: wrap;
          }

          .jv-kicker {
            width: fit-content;
            color: #c4b5fd;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .jv-title {
            margin: 16px 0 0;
            color: #f8fafc;
            font-size: clamp(36px, 4vw, 54px);
            font-weight: 950;
            line-height: 0.98;
            letter-spacing: -0.06em;
          }

          .jv-subtitle {
            margin: 12px 0 0;
            color: #cbd5e1;
            font-size: 16px;
            line-height: 1.7;
            max-width: 820px;
          }

          .jv-process-primary {
            min-height: 50px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            border: 0;
            border-radius: 15px;
            padding: 0 18px;
            color: #fff;
            cursor: pointer;
            font-weight: 950;
            background: linear-gradient(135deg, #a855f7, #4f46e5);
            box-shadow: 0 18px 40px rgba(79,70,229,0.22);
          }

          .jv-process-secondary,
          .jv-process-danger {
            min-height: 42px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 14px;
            padding: 0 14px;
            cursor: pointer;
            font-weight: 900;
            font-size: 13px;
          }

          .jv-process-secondary {
            color: #e5e7eb;
            background: rgba(255,255,255,0.045);
            border: 1px solid rgba(148,163,184,0.15);
          }

          .jv-process-danger {
            color: #fecaca;
            background: rgba(127,29,29,0.18);
            border: 1px solid rgba(248,113,113,0.25);
          }

          .jv-stats-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
          }

          .jv-stat-card {
            min-height: 132px;
            display: grid;
            grid-template-columns: auto 1fr;
            align-items: center;
            gap: 16px;
            padding: 20px;
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.16);
            background:
              radial-gradient(circle at 95% 5%, rgba(124,58,237,0.18), transparent 32%),
              linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.64));
            box-shadow: 0 26px 60px rgba(0,0,0,0.27);
          }

          .jv-stat-icon {
            width: 58px;
            height: 58px;
            display: grid;
            place-items: center;
            border-radius: 999px;
            color: #d8b4fe;
            background: radial-gradient(circle, rgba(168,85,247,0.40), rgba(15,23,42,0.70));
            font-size: 24px;
          }

          .jv-stat-title {
            color: #a1a1aa;
            font-size: 13px;
          }

          .jv-stat-value {
            margin-top: 6px;
            color: #f8fafc;
            font-size: 34px;
            font-weight: 950;
            line-height: 1;
          }

          .jv-stat-subtitle {
            margin-top: 8px;
            color: #a1a1aa;
            font-size: 13px;
          }

          .jv-panel {
            border-radius: 24px;
            border: 1px solid rgba(168,85,247,0.22);
            background:
              radial-gradient(circle at 0% 0%, rgba(124,58,237,0.11), transparent 30%),
              linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.56));
            box-shadow: 0 28px 70px rgba(0,0,0,0.26);
            padding: 22px;
          }

          .jv-panel-head {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            flex-wrap: wrap;
            margin-bottom: 16px;
          }

          .jv-panel-title {
            color: #f8fafc;
            font-size: 24px;
            font-weight: 950;
            letter-spacing: -0.045em;
          }

          .jv-panel-subtitle {
            margin-top: 5px;
            color: #a1a1aa;
            font-size: 14px;
            line-height: 1.6;
          }

          .jv-search-box {
            min-height: 52px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-radius: 16px;
            border: 1px solid rgba(148,163,184,0.16);
            background: rgba(15,23,42,0.62);
            padding: 0 15px;
            color: #cbd5e1;
            margin-bottom: 18px;
          }

          .jv-search-box input {
            width: 100%;
            border: 0;
            outline: 0;
            background: transparent;
            color: #f8fafc;
            font-size: 14px;
          }

          .jv-list {
            display: grid;
            gap: 13px;
          }

          .jv-process-card {
            display: grid;
            grid-template-columns: minmax(260px, 1fr) auto;
            gap: 18px;
            align-items: center;
            padding: 18px;
            border-radius: 22px;
            border: 1px solid rgba(148,163,184,0.13);
            background: rgba(255,255,255,0.035);
          }

          .jv-process-name {
            color: #f8fafc;
            font-size: 19px;
            font-weight: 950;
          }

          .jv-process-meta {
            margin-top: 8px;
            color: #cbd5e1;
            font-size: 14px;
          }

          .jv-process-muted {
            margin-top: 7px;
            color: #94a3b8;
            font-size: 13px;
          }

          .jv-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
          }

          .jv-pill {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 8px 11px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 900;
          }

          .jv-pill-purple {
            color: #ddd6fe;
            background: rgba(124,58,237,0.13);
            border: 1px solid rgba(168,85,247,0.24);
          }

          .jv-pill-blue {
            color: #bfdbfe;
            background: rgba(59,130,246,0.13);
            border: 1px solid rgba(96,165,250,0.24);
          }

          .jv-pill-green {
            color: #a7f3d0;
            background: rgba(6,78,59,0.18);
            border: 1px solid rgba(52,211,153,0.24);
          }

          .jv-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 9px;
            justify-content: flex-end;
          }

          .jv-empty {
            padding: 20px;
            border-radius: 18px;
            background: rgba(255,255,255,0.035);
            border: 1px dashed rgba(148,163,184,0.22);
            color: #94a3b8;
            text-align: center;
          }

          .jv-doc-upload {
            display: grid;
            grid-template-columns: 160px 1fr auto;
            gap: 10px;
          }

          .jv-doc-grid {
            display: grid;
            grid-template-columns: minmax(280px, 0.9fr) minmax(320px, 1.1fr);
            gap: 12px;
          }

          .jv-doc-list {
            display: grid;
            align-content: start;
            gap: 8px;
          }

          .jv-doc-row {
            display: grid;
            grid-template-columns: auto 1fr 150px auto;
            gap: 8px;
            align-items: center;
            padding: 10px;
            border-radius: 14px;
            border: 1px solid rgba(148,163,184,0.14);
            background: rgba(255,255,255,0.035);
            cursor: grab;
          }

          .jv-doc-row-active {
            border-color: rgba(168,85,247,0.45);
            background: rgba(124,58,237,0.12);
          }

          .jv-doc-drag {
            color: #cbd5e1;
          }

          .jv-doc-main {
            display: grid;
            gap: 4px;
            min-width: 0;
          }

          .jv-doc-main strong {
            color: #f8fafc;
            font-size: 13px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .jv-doc-main span {
            color: #94a3b8;
            font-size: 12px;
          }

          .jv-doc-row select,
          .jv-doc-row button {
            min-height: 34px;
            border-radius: 10px;
            border: 1px solid rgba(148,163,184,0.14);
            background: rgba(15,23,42,0.82);
            color: #e5e7eb;
          }

          .jv-doc-preview {
            min-height: 520px;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid rgba(148,163,184,0.14);
            background: rgba(0,0,0,0.22);
          }

          .jv-doc-preview iframe {
            width: 100%;
            height: 520px;
            border: 0;
            background: #111827;
          }

          @media (max-width: 1100px) {
            .jv-stats-grid,
            .jv-doc-grid,
            .jv-doc-upload {
              grid-template-columns: 1fr;
            }

            .jv-process-card {
              grid-template-columns: 1fr;
            }

            .jv-actions {
              justify-content: flex-start;
            }

            .jv-doc-row {
              grid-template-columns: auto 1fr;
            }

            .jv-doc-row select,
            .jv-doc-row button {
              grid-column: 1 / -1;
              width: 100%;
            }
          }

          @media (max-width: 640px) {
            .jv-process-hero {
              padding: 28px 22px;
              min-height: auto;
            }

            .jv-process-primary,
            .jv-process-secondary,
            .jv-process-danger {
              width: 100%;
            }

            .jv-actions {
              display: grid;
            }
          }
        `}</style>

        <section className="jv-process-hero">
          <div className="jv-process-hero-content">
            <div>
              <div className="jv-kicker">Gestão de processos</div>

              <h1 className="jv-title">Processos</h1>

              <p className="jv-subtitle">
                Gerencie processos, registre atualizações e organize documentos PDF
                em um único fluxo de trabalho.
              </p>
            </div>

            <button className="jv-process-primary" onClick={openCreateModal}>
              <FaPlus />
              Novo processo
            </button>
          </div>
        </section>

        <section className="jv-stats-grid">
          <article className="jv-stat-card">
            <div className="jv-stat-icon">
              <FaFolderOpen />
            </div>
            <div>
              <div className="jv-stat-title">Processos ativos</div>
              <div className="jv-stat-value">{stats.total}</div>
              <div className="jv-stat-subtitle">Em acompanhamento</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon">
              <FaPenToSquare />
            </div>
            <div>
              <div className="jv-stat-title">Com atualizações</div>
              <div className="jv-stat-value">{stats.withUpdates}</div>
              <div className="jv-stat-subtitle">Com movimentações registradas</div>
            </div>
          </article>

          <article className="jv-stat-card">
            <div className="jv-stat-icon">
              <FaFilePdf />
            </div>
            <div>
              <div className="jv-stat-title">Com documentos</div>
              <div className="jv-stat-value">{stats.withDocuments}</div>
              <div className="jv-stat-subtitle">PDFs anexados</div>
            </div>
          </article>
        </section>

        <section className="jv-panel">
          <div className="jv-panel-head">
            <div>
              <div className="jv-panel-title">Lista de processos</div>
              <div className="jv-panel-subtitle">
                Busque por CNJ, cliente, tribunal, vara, atualização ou documento.
              </div>
            </div>
          </div>

          <label className="jv-search-box">
            <FaMagnifyingGlass />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar processo, cliente, CNJ, documento..."
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#CBD5E1",
                  cursor: "pointer",
                }}
              >
                <FaXmark />
              </button>
            ) : null}
          </label>

          {loading ? (
            <div className="jv-empty">Carregando processos...</div>
          ) : filteredProcesses.length === 0 ? (
            <div className="jv-empty">Nenhum processo encontrado.</div>
          ) : (
            <div className="jv-list">
              {filteredProcesses.map((process) => {
                const lastUpdate = process.updates?.[0];

                return (
                  <article className="jv-process-card" key={process.id}>
                    <div>
                      <div className="jv-process-name">{getProcessNumber(process)}</div>

                      <div className="jv-process-meta">
                        Cliente: {process.client?.name || "Não informado"}
                      </div>

                      <div className="jv-process-muted">
                        {[process.tribunal, process.vara].filter(Boolean).join(" · ") ||
                          "Tribunal e vara não informados"}
                      </div>

                      <div className="jv-pills">
                        <span className="jv-pill jv-pill-purple">
                          {(process.updates?.length || 0)} atualização(ões)
                        </span>

                        <span className="jv-pill jv-pill-blue">
                          {(process.documents?.length || 0)} documento(s)
                        </span>

                        <span className="jv-pill jv-pill-green">
                          Criado em {formatDate(process.createdAt)}
                        </span>
                      </div>

                      {lastUpdate ? (
                        <div className="jv-process-muted">
                          Última atualização: {getUpdateText(lastUpdate)}
                        </div>
                      ) : null}
                    </div>

                    <div className="jv-actions">
                      <button
                        className="jv-process-secondary"
                        onClick={() => openUpdateModal(process)}
                      >
                        Nova atualização
                      </button>

                      <button
                        className="jv-process-secondary"
                        onClick={() => openEditModal(process)}
                      >
                        <FaPenToSquare />
                        Editar
                      </button>

                      <button
                        className="jv-process-secondary"
                        onClick={() => openDocumentsModal(process)}
                      >
                        <FaUpload />
                        Documentos
                      </button>

                      <button
                        className="jv-process-secondary"
                        onClick={() => setArchiveAction({ process })}
                      >
                        <FaBoxArchive />
                        Arquivar
                      </button>

                      {canDeleteProcess ? (
                        <button
                          className="jv-process-danger"
                          onClick={() => deleteProcess(process)}
                        >
                          <FaTrash />
                          Excluir
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}