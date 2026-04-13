import fs from "fs";

const filePath = "A:/git/Sistema Juridico/src/app/admin/super/firms/[id]/page.tsx";

if (!fs.existsSync(filePath)) {
  throw new Error("Arquivo da página da firma do superadmin não encontrado.");
}

let content = fs.readFileSync(filePath, "utf8");

const importLine = 'import SuperFirmBillingCard from "@/components/superadmin/SuperFirmBillingCard";';

if (!content.includes(importLine)) {
  const lines = content.split("\n");
  let insertIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) {
      insertIndex = i + 1;
    }
  }

  lines.splice(insertIndex, 0, importLine);
  content = lines.join("\n");
}

if (!content.includes("<SuperFirmBillingCard firmId={id} />")) {
  const markerCandidates = [
    "</div>\n    </SuperAdminShell>",
    "</main>\n    </SuperAdminShell>",
    "</section>\n    </SuperAdminShell>",
  ];

  let patched = false;

  for (const marker of markerCandidates) {
    if (content.includes(marker)) {
      content = content.replace(
        marker,
        `        <div className="mt-6">\n          <SuperFirmBillingCard firmId={id} />\n        </div>\n${marker}`
      );
      patched = true;
      break;
    }
  }

  if (!patched) {
    throw new Error(
      "Não foi possível encontrar ponto seguro para inserir o bloco financeiro na página da firma."
    );
  }
}

fs.writeFileSync(filePath, content, { encoding: "utf8" });
console.log("Patch da página da firma aplicado com sucesso.");