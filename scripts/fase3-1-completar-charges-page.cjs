const fs = require("fs");

const file = "src/app/admin/charges/page.tsx";

function read() {
  return fs.readFileSync(file, "utf8");
}

function write(content) {
  fs.writeFileSync(file, content, "utf8");
}

function fail(message) {
  console.error("ERRO:", message);
  process.exitCode = 1;
}

let content = read();

// 1. Garantir payload na chamada /api/admin/charges/recurring
const recurringFetchIndex = content.indexOf('fetch("/api/admin/charges/recurring"');

if (recurringFetchIndex === -1) {
  fail("Nao encontrei fetch da API de recorrencia.");
} else {
  const nextFetchIndex = content.indexOf('fetch("/api/admin/charges"', recurringFetchIndex + 1);
  const recurringBlockEnd = nextFetchIndex === -1 ? content.indexOf("});", recurringFetchIndex) : nextFetchIndex;
  const recurringBlock = content.slice(recurringFetchIndex, recurringBlockEnd);

  if (recurringBlock.includes("paymentValidityDays:")) {
    console.log("OK: payload da recorrencia ja possui paymentValidityDays.");
  } else {
    const pattern =
      /interestStartsAtInstallment:\s*\r?\n\s*hasInterest && interestStartsAtInstallment\.trim\(\)\s*\r?\n\s*\? Number\(interestStartsAtInstallment\)\s*\r?\n\s*: null,/;

    const match = pattern.exec(content);

    if (!match) {
      fail("Nao encontrei bloco interestStartsAtInstallment no payload.");
    } else {
      const replacement = `${match[0]}
            paymentValidityDays:
              paymentValidityDays.trim()
                ? Number(paymentValidityDays)
                : 3,
            lateFeeType,
            lateFeeValue:
              lateFeeType !== "NONE" && lateFeeValue.trim()
                ? Number(lateFeeValue.replace(",", "."))
                : null,`;

      content = content.replace(match[0], replacement);
      console.log("PATCH: payload da recorrencia atualizado.");
    }
  }
}

// 2. Garantir reset do formulario
if (content.includes('setPaymentValidityDays("3");')) {
  console.log("OK: reset da validade ja existe.");
} else {
  const resetAnchor = '      setInterestStartsAtInstallment("2");';

  if (!content.includes(resetAnchor)) {
    fail("Nao encontrei setInterestStartsAtInstallment no reset.");
  } else {
    content = content.replace(
      resetAnchor,
      `${resetAnchor}
      setPaymentValidityDays("3");
      setLateFeeType("NONE");
      setLateFeeValue("");`
    );
    console.log("PATCH: reset de validade/acrescimo adicionado.");
  }
}

// 3. Garantir bloco visual
if (content.includes("Validade e acréscimo após vencimento")) {
  console.log("OK: bloco visual ja existe.");
} else {
  const uiAnchor = '                    {recurringPreview ? (';

  if (!content.includes(uiAnchor)) {
    fail("Nao encontrei anchor recurringPreview para inserir UI.");
  } else {
    const uiBlock = `                    <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4">
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-white">
                          Validade e acréscimo após vencimento
                        </div>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">
                          Configure por quantos dias o link ficará válido e o que acontece se o cliente não pagar dentro do prazo.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-200">
                            Validade do link (dias)
                          </label>
                          <input
                            value={paymentValidityDays}
                            onChange={(e) => setPaymentValidityDays(e.target.value)}
                            placeholder="Ex.: 3"
                            className={fieldClassName}
                            style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                            required={isRecurring}
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-200">
                            Após vencer
                          </label>
                          <select
                            value={lateFeeType}
                            onChange={(e) =>
                              setLateFeeType(e.target.value as "NONE" | "PERCENT" | "FIXED")
                            }
                            className={\`\${fieldClassName} [&>option]:bg-zinc-950 [&>option]:text-zinc-100\`}
                            style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                          >
                            <option value="NONE">Não aplicar acréscimo</option>
                            <option value="PERCENT">Aplicar percentual</option>
                            <option value="FIXED">Aplicar valor fixo</option>
                          </select>
                        </div>
                      </div>

                      {lateFeeType !== "NONE" ? (
                        <div className="mt-4">
                          <label className="mb-2 block text-sm font-medium text-zinc-200">
                            {lateFeeType === "PERCENT"
                              ? "Percentual de acréscimo após vencimento"
                              : "Valor fixo de acréscimo após vencimento"}
                          </label>
                          <input
                            value={lateFeeValue}
                            onChange={(e) => setLateFeeValue(e.target.value)}
                            placeholder={lateFeeType === "PERCENT" ? "Ex.: 10" : "Ex.: 30"}
                            className={fieldClassName}
                            style={{ backgroundColor: "#09090b", color: "#f4f4f5" }}
                          />
                        </div>
                      ) : null}

                      {lateFeePreview ? (
                        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                            Prévia se passar da validade
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                              <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                Validade
                              </div>
                              <div className="text-sm font-semibold text-white">
                                {lateFeePreview.validityDays} dia(s)
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                              <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                Valor base
                              </div>
                              <div className="text-sm font-semibold text-white">
                                {formatCurrency(lateFeePreview.baseAmount)}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                              <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                Acréscimo
                              </div>
                              <div className="text-sm font-semibold text-white">
                                {lateFeePreview.hasLateFee
                                  ? lateFeePreview.lateFeeType === "PERCENT"
                                    ? \`\${lateFeePreview.lateFeeValue}% (+\${formatCurrency(lateFeePreview.increaseAmount)})\`
                                    : formatCurrency(lateFeePreview.increaseAmount)
                                  : "Sem acréscimo"}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                              <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                Novo valor
                              </div>
                              <div className="text-sm font-semibold text-white">
                                {formatCurrency(lateFeePreview.finalAmount)}
                              </div>
                            </div>
                          </div>

                          <p className="mt-3 text-xs leading-5 text-amber-100/80">
                            Essa é apenas a prévia visual. A aplicação automática do novo link vencido será ativada na próxima fase.
                          </p>
                        </div>
                      ) : null}
                    </div>

`;

    content = content.replace(uiAnchor, uiBlock + uiAnchor);
    console.log("PATCH: bloco visual de validade/acrescimo adicionado.");
  }
}

write(content);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("");
console.log("Fase 3.1 aplicada com sucesso.");
