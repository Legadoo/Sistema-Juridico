import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "src", "components", "SuperAdminShell.tsx");

if (!fs.existsSync(filePath)) {
  console.error("Arquivo não encontrado:", filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

const markerStart = "{/* SUPER_ADMIN_FIXED_SIDEBAR_START */}";
const markerEnd = "{/* SUPER_ADMIN_FIXED_SIDEBAR_END */}";

const fixedStyle = `
        ${markerStart}
        <style>{\`
          @media (min-width: 901px) {
            html,
            body {
              height: 100%;
            }

            body:has(.jv-super-fixed-shell) {
              overflow: hidden;
            }

            .jv-super-fixed-shell {
              height: 100vh !important;
              max-height: 100vh !important;
              overflow: hidden !important;
            }

            .jv-super-fixed-shell > aside,
            .jv-super-fixed-shell aside:first-of-type,
            .jv-super-fixed-shell [data-super-sidebar="true"] {
              position: sticky !important;
              top: 0 !important;
              height: 100vh !important;
              max-height: 100vh !important;
              overflow-y: auto !important;
              overflow-x: hidden !important;
              flex-shrink: 0 !important;
              align-self: start !important;
              scrollbar-width: thin;
              scrollbar-color: rgba(56, 189, 248, 0.45) rgba(15, 23, 42, 0.40);
            }

            .jv-super-fixed-shell > aside::-webkit-scrollbar,
            .jv-super-fixed-shell aside:first-of-type::-webkit-scrollbar,
            .jv-super-fixed-shell [data-super-sidebar="true"]::-webkit-scrollbar {
              width: 8px;
            }

            .jv-super-fixed-shell > aside::-webkit-scrollbar-track,
            .jv-super-fixed-shell aside:first-of-type::-webkit-scrollbar-track,
            .jv-super-fixed-shell [data-super-sidebar="true"]::-webkit-scrollbar-track {
              background: rgba(15, 23, 42, 0.40);
            }

            .jv-super-fixed-shell > aside::-webkit-scrollbar-thumb,
            .jv-super-fixed-shell aside:first-of-type::-webkit-scrollbar-thumb,
            .jv-super-fixed-shell [data-super-sidebar="true"]::-webkit-scrollbar-thumb {
              background: rgba(56, 189, 248, 0.45);
              border-radius: 999px;
            }

            .jv-super-fixed-shell > main,
            .jv-super-fixed-shell main:first-of-type,
            .jv-super-fixed-shell [data-super-content="true"] {
              height: 100vh !important;
              max-height: 100vh !important;
              overflow-y: auto !important;
              overflow-x: hidden !important;
              min-width: 0 !important;
              scrollbar-width: thin;
              scrollbar-color: rgba(56, 189, 248, 0.45) rgba(15, 23, 42, 0.40);
            }

            .jv-super-fixed-shell > main::-webkit-scrollbar,
            .jv-super-fixed-shell main:first-of-type::-webkit-scrollbar,
            .jv-super-fixed-shell [data-super-content="true"]::-webkit-scrollbar {
              width: 10px;
            }

            .jv-super-fixed-shell > main::-webkit-scrollbar-track,
            .jv-super-fixed-shell main:first-of-type::-webkit-scrollbar-track,
            .jv-super-fixed-shell [data-super-content="true"]::-webkit-scrollbar-track {
              background: rgba(15, 23, 42, 0.40);
            }

            .jv-super-fixed-shell > main::-webkit-scrollbar-thumb,
            .jv-super-fixed-shell main:first-of-type::-webkit-scrollbar-thumb,
            .jv-super-fixed-shell [data-super-content="true"]::-webkit-scrollbar-thumb {
              background: rgba(56, 189, 248, 0.45);
              border-radius: 999px;
            }
          }

          @media (max-width: 900px) {
            .jv-super-fixed-shell {
              min-height: 100vh;
              overflow: visible;
            }
          }
        \`}</style>
        ${markerEnd}
`;

// remove bloco antigo, caso já exista
const existingBlockRegex = new RegExp(
  "\\s*" +
    markerStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
    "[\\s\\S]*?" +
    markerEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  "g"
);

content = content.replace(existingBlockRegex, "");

// adiciona classe no primeiro elemento visual retornado pelo componente
const returnIndex = content.indexOf("return (");

if (returnIndex === -1) {
  console.error("Não encontrei return ( no SuperAdminShell.");
  process.exit(1);
}

const beforeReturn = content.slice(0, returnIndex);
let afterReturn = content.slice(returnIndex);

const rootTagRegex = /<(div|main|section)\b([^>]*)>/;
const rootMatch = afterReturn.match(rootTagRegex);

if (!rootMatch) {
  console.error("Não encontrei um elemento raiz div/main/section após o return.");
  process.exit(1);
}

const fullRootTag = rootMatch[0];
const tagName = rootMatch[1];
const attrs = rootMatch[2];

let newRootTag = fullRootTag;

if (/className\s*=/.test(attrs)) {
  newRootTag = fullRootTag.replace(/className\s*=\s*"([^"]*)"/, (match, classes) => {
    if (classes.includes("jv-super-fixed-shell")) return match;
    return `className="${classes} jv-super-fixed-shell"`;
  });

  newRootTag = newRootTag.replace(/className\s*=\s*'([^']*)'/, (match, classes) => {
    if (classes.includes("jv-super-fixed-shell")) return match;
    return `className='${classes} jv-super-fixed-shell'`;
  });

  if (newRootTag === fullRootTag && /className\s*=\s*{/.test(attrs)) {
    console.error("O elemento raiz usa className dinâmico. Faça ajuste manual.");
    process.exit(1);
  }
} else {
  newRootTag = `<${tagName} className="jv-super-fixed-shell"${attrs}>`;
}

afterReturn = afterReturn.replace(fullRootTag, `${newRootTag}${fixedStyle}`);

fs.writeFileSync(filePath, beforeReturn + afterReturn, "utf8");

console.log("SuperAdminShell atualizado com barra lateral fixa.");
