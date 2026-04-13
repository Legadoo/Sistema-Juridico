import fs from "fs";

const filePath = "A:/git/Sistema Juridico/src/app/admin/super/firms/[id]/page.tsx";

if (!fs.existsSync(filePath)) {
  throw new Error("Arquivo da página da firma não encontrado.");
}

let content = fs.readFileSync(filePath, "utf8");

if (!content.includes("firmId={params.id}")) {
  console.log("Nenhuma ocorrência de firmId={params.id} encontrada.");
} else {
  content = content.replace(/firmId=\{params\.id\}/g, "firmId={id}");
  console.log("Troca aplicada: firmId={params.id} -> firmId={id}");
}

if (!content.includes("const { id } = await params;")) {
  const patterns = [
    /export default async function [^(]+\([^)]*params:\s*Promise<\{\s*id:\s*string\s*\}>[^)]*\)\s*\{/m,
    /export default async function [^(]+\([^)]*params:\s*Promise<\{\s*id:\s*string;\s*\}>[^)]*\)\s*\{/m
  ];

  let inserted = false;

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const matchedText = match[0];
      content = content.replace(
        matchedText,
        `${matchedText}\n  const { id } = await params;`
      );
      inserted = true;
      console.log("Linha inserida: const { id } = await params;");
      break;
    }
  }

  if (!inserted) {
    throw new Error(
      "Não consegui localizar a assinatura async da página para inserir 'const { id } = await params;'."
    );
  }
} else {
  console.log("A linha 'const { id } = await params;' já existe.");
}

fs.writeFileSync(filePath, content, { encoding: "utf8" });
console.log("Correção aplicada com sucesso.");