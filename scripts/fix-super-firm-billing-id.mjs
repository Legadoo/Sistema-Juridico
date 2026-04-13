import fs from "fs";

const filePath = "A:/git/Sistema Juridico/src/app/admin/super/firms/[id]/page.tsx";

if (!fs.existsSync(filePath)) {
  throw new Error("Arquivo da página da firma do superadmin não encontrado.");
}

let content = fs.readFileSync(filePath, "utf8");

if (!content.includes("firmId={id}")) {
  console.log("Nenhuma ocorrência de firmId={id} encontrada. Nada para corrigir.");
  process.exit(0);
}

let replacement = null;

if (content.includes("firm.id")) {
  replacement = "firm.id";
} else if (content.includes("lawFirm.id")) {
  replacement = "lawFirm.id";
} else if (content.includes("firmData.id")) {
  replacement = "firmData.id";
}

if (!replacement) {
  throw new Error(
    "Não encontrei firm.id, lawFirm.id ou firmData.id na página para substituir firmId={id}."
  );
}

content = content.replace(/firmId=\{id\}/g, `firmId={${replacement}}`);

fs.writeFileSync(filePath, content, { encoding: "utf8" });
console.log(`Correção aplicada com sucesso. firmId agora usa ${replacement}.`);