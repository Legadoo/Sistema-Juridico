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

// 1. Estados novos
if (!content.includes("const [paymentValidityDays, setPaymentValidityDays] = useState")) {
  const anchor = '  const [interestStartsAtInstallment, setInterestStartsAtInstallment] = useState("2");';

  if (!content.includes(anchor)) {
    fail("Nao encontrei o estado interestStartsAtInstallment.");
  } else {
    content = content.replace(
      anchor,
      `${anchor}
  const [paymentValidityDays, setPaymentValidityDays] = useState("3");
  const [lateFeeType, setLateFeeType] = useState<"NONE" | "PERCENT" | "FIXED">("NONE");
  const [lateFeeValue, setLateFeeValue] = useState("");`
    );
    console.log("PATCH: estados de validade/acrescimo adicionados.");
  }
} else {
  console.log("OK: estados de validade/acrescimo ja existem.");
}

// 2. Preview do atraso
if (!content.includes("const lateFeePreview = useMemo")) {
  const anchor = "  const filteredCharges = useMemo(() => {";

  if (!content.includes(anchor)) {
    fail("Nao encontrei anchor filteredCharges para inserir lateFeePreview.");
  } else {
    const previewBlock = `  const lateFeePreview = useMemo(() => {
    if (!isRecurring || !recurringPreview) {
      return null;
    }

    const validityDays = Number(paymentValidityDays);
    const safeValidityDays =
      Number.isFinite(validityDays) && validityDays > 0
        ? Math.floor(validityDays)
        : 3;

    const feeValue = Number(lateFeeValue.replace(",", "."));
    const safeFeeValue =
      Number.isFinite(feeValue) && feeValue > 0 ? feeValue : 0;

    const baseAmountAfterInstallmentInterest =
      recurringPreview.installmentWithInterest || recurringPreview.firstInstallmentValue;

    let increaseAmount = 0;

    if (lateFeeType === "PERCENT") {
      increaseAmount = Number(
        (baseAmountAfterInstallmentInterest * (safeFeeValue / 100)).toFixed(2)
      );
    }

    if (lateFeeType === "FIXED") {
      increaseAmount = Number(safeFeeValue.toFixed(2));
    }

    const finalAmount = Number(
      (baseAmountAfterInstallmentInterest + increaseAmount).toFixed(2)
    );

    return {
      validityDays: safeValidityDays,
      lateFeeType,
      lateFeeValue: safeFeeValue,
      baseAmount: baseAmountAfterInstallmentInterest,
      increaseAmount,
      finalAmount,
      hasLateFee: lateFeeType !== "NONE" && safeFeeValue > 0,
    };
  }, [
    isRecurring,
    recurringPreview,
    paymentValidityDays,
    lateFeeType,
    lateFeeValue,
  ]);

`;

    content = content.replace(anchor, previewBlock + anchor);
    console.log("PATCH: lateFeePreview adicionado.");
  }
} else {
  console.log("OK: lateFeePreview ja existe.");
}

// 3. Payload da API recorrente
if (!content.includes("paymentValidityDays:")) {
  const anchor = `            interestStartsAtInstallment:
              hasInterest && interestStartsAtInstallment.trim()
                ? Number(interestStartsAtInstallment)
                : null,`;

  if (!content.includes(anchor)) {
    fail("Nao encontrei bloco interestStartsAtInstallment no payload.");
  } else {
    content = content.replace(
      anchor,
      `${anchor}
            paymentValidityDays:
              paymentValidityDays.trim()
                ? Number(paymentValidityDays)
                : 3,
            lateFeeType,
            lateFeeValue:
              lateFeeType !== "NONE" && lateFeeValue.trim()
                ? Number(lateFeeValue.replace(",", "."))
                : null,`
    );
    console.log("PATCH: payload recorrente atualizado.");
  }
} else {
  console.log("OK: payload ja possui paymentValidityDays.");
}

// 4. Reset do formulario
if (!content.includes('setPaymentValidityDays("3");')) {
  const anchor = `      setHasInterest(false);
      setInterestPercent("");
      setInterestStartsAtInstallment("2");`;

  if (!content.includes(anchor)) {
    fail("Nao encontrei bloco de reset dos juros.");
  } else {
    content = content.replace(
      anchor,
      `${anchor}
      setPaymentValidityDays("3");
      setLateFeeType("NONE");
      setLateFeeValue("");`
    );
    console.log("PATCH: reset do formulario atualizado.");
  }
} else {
  console.log("OK: reset da validade ja existe.");
}

// 5. UI do bloco de validade/acrescimo
if (!content.includes("Validade e acréscimo após vencimento")) {
  const anchor = `                    {recurringPreview ? (
                      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">`;

  if (!content.includes(anchor)) {
    fail("Nao encontrei anchor do recurringPreview para inserir UI.");
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

    content = content.replace(anchor, uiBlock + anchor);
    console.log("PATCH: UI de validade/acrescimo adicionada.");
  }
} else {
  console.log("OK: UI de validade/acrescimo ja existe.");
}

write(content);
console.log("");
console.log("Fase 3 aplicada em src/app/admin/charges/page.tsx.");
