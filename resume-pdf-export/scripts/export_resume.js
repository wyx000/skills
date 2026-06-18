const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { pathToFileURL } = require("url");

const args = process.argv.slice(2);
if (!args.length || args.includes("--help") || args.includes("-h")) {
  console.error(`Usage:
  node scripts/export_resume.js <resume.md> [--pdf] [--out-html <file>] [--out-pdf <file>]

Examples:
  node scripts/export_resume.js examples/sample-resume.md
  node scripts/export_resume.js examples/sample-resume.md --pdf
  node scripts/export_resume.js examples/sample-resume.md --out-html resume.html --out-pdf resume.pdf --pdf

Environment:
  RESUME_PDF_BROWSER=/path/to/browser  Override Edge/Chrome/Chromium detection`);
  process.exit(args.length ? 0 : 1);
}

const mdPath = path.resolve(args[0]);
let outHtml = null;
let outPdf = null;
let exportPdf = false;

for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--pdf") {
    exportPdf = true;
  } else if (arg === "--out-html") {
    outHtml = path.resolve(args[++i]);
  } else if (arg === "--out-pdf") {
    outPdf = path.resolve(args[++i]);
    exportPdf = true;
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

if (!fs.existsSync(mdPath)) {
  throw new Error(`Markdown file not found: ${mdPath}`);
}

const parsed = path.parse(mdPath);

function sanitizeFileName(name) {
  return name
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "")
    .replace(/[｜|]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function extractResumeMeta(md) {
  const lines = md.replace(/^\uFEFF/, "").split(/\r?\n/);
  const name = (lines.find((line) => line.startsWith("# ")) || "")
    .replace(/^#\s+/, "")
    .trim();
  const roleLineIndex = lines.findIndex((line) => line.startsWith("# "));
  const role = lines
    .slice(roleLineIndex + 1)
    .find((line) => /^\*\*.+\*\*$/.test(line.trim()));
  const cleanRole = role
    ? role.replace(/^\*\*/, "").replace(/\*\*$/, "").trim()
    : "";
  const title = [name, cleanRole].filter(Boolean).join(" - ") || parsed.name;
  const rolePrefix = cleanRole.split(/[\/／｜|]/)[0]?.trim();
  const baseName = sanitizeFileName(
    [name, rolePrefix, "简历"].filter(Boolean).join("_")
  ) || parsed.name;
  return { name, role: cleanRole, title, baseName };
}

const md = fs.readFileSync(mdPath, "utf8");
const resumeMeta = extractResumeMeta(md);
outHtml = outHtml || path.join(parsed.dir, `${resumeMeta.baseName}.html`);
outPdf = outPdf || path.join(parsed.dir, `${resumeMeta.baseName}.pdf`);

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function markdownToBody(markdown) {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  let body = "";
  let inList = false;
  let afterName = false;

  function closeList() {
    if (inList) {
      body += "</ul>\n";
      inList = false;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      body += `<header class="resume-header"><h1>${inlineMarkdown(line.slice(2).trim())}</h1>\n`;
      afterName = true;
      continue;
    }

    if (afterName && line.startsWith("**")) {
      body += `<div class="role">${inlineMarkdown(line.trim())}</div>\n`;
      continue;
    }

    if (afterName && line.startsWith("手机：")) {
      body += `<div class="contact">${inlineMarkdown(line.trim())}</div></header>\n`;
      afterName = false;
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      body += `<section><h2>${inlineMarkdown(line.slice(3).trim())}</h2>\n`;
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      body += `<h3>${inlineMarkdown(line.slice(4).trim())}</h3>\n`;
      continue;
    }

    if (/^\*\*.+\*\*$/.test(line.trim())) {
      closeList();
      body += `<div class="project-title">${inlineMarkdown(line.trim())}</div>\n`;
      continue;
    }

    if (line.trimStart().startsWith("- ")) {
      if (!inList) {
        body += "<ul>\n";
        inList = true;
      }
      body += `<li>${inlineMarkdown(line.trimStart().slice(2).trim())}</li>\n`;
      continue;
    }

    closeList();
    if (/^\d{4}年/.test(line.trim())) {
      body += `<p class="date-line">${inlineMarkdown(line.trim())}</p>\n`;
    } else {
      body += `<p>${inlineMarkdown(line.trim())}</p>\n`;
    }
  }
  closeList();
  return body;
}

function buildHtml(body, title) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
@page { size: A4; margin: 9mm 10mm 8.5mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  color: #1f2933;
  background: #fff;
  font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", Arial, sans-serif;
  font-size: 9.15pt;
  line-height: 1.37;
}
.resume-header {
  padding: 9px 14px 8px;
  margin-bottom: 8px;
  text-align: center;
  border-top: 5px solid #6db7df;
  border-bottom: 1px solid #c8e2f1;
  background: linear-gradient(180deg, #eef8fd 0%, #ffffff 100%);
}
h1 {
  margin: 0 0 3px;
  color: #173f5f;
  font-size: 21.5pt;
  line-height: 1.08;
  font-weight: 800;
  letter-spacing: 0;
}
.role { margin: 1px 0 3px; color: #225d83; font-size: 11.4pt; font-weight: 700; }
.contact { color: #52616f; font-size: 9.2pt; }
h2 {
  margin: 8px 0 4px;
  padding: 3px 8px 3px 10px;
  color: #17496b;
  background: #e8f4fb;
  border-left: 5px solid #62add6;
  border-bottom: 1px solid #cfe6f3;
  font-size: 12pt;
  line-height: 1.18;
  font-weight: 800;
}
h3 { margin: 7px 0 2px; color: #243746; font-size: 10.6pt; line-height: 1.22; font-weight: 800; }
p { margin: 2px 0 3.5px; }
.date-line { margin: 1px 0 5.5px; color: #52616f; font-size: 9pt; font-weight: 600; }
.project-title { margin: 7px 0 2.5px; color: #125174; font-size: 10.3pt; font-weight: 800; }
ul { margin: 1.5px 0 4.5px 0; padding-left: 16px; }
li { margin: 1.25px 0; padding-left: 1px; }
li::marker { color: #4ea3cf; }
strong { font-weight: 800; }
code { font-family: Consolas, "Microsoft YaHei", monospace; font-size: 92%; }
section { break-inside: auto; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2, h3, .project-title { break-after: avoid; }
  li { break-inside: avoid; }
}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(checker, [command], { encoding: "utf8" });
  if (result.status !== 0) return null;
  const first = (result.stdout || "").split(/\r?\n/).find(Boolean);
  return first || command;
}

function findBrowser() {
  if (process.env.RESUME_PDF_BROWSER) {
    return process.env.RESUME_PDF_BROWSER;
  }

  const candidates = [];
  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
    );
  } else if (process.platform === "darwin") {
    candidates.push(
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    );
  } else {
    candidates.push(
      commandExists("microsoft-edge"),
      commandExists("microsoft-edge-stable"),
      commandExists("google-chrome"),
      commandExists("google-chrome-stable"),
      commandExists("chromium"),
      commandExists("chromium-browser")
    );
  }
  return candidates.filter(Boolean).find((candidate) => fs.existsSync(candidate) || !path.isAbsolute(candidate));
}

function exportPdfWithBrowser(htmlPath, pdfPath) {
  const browser = findBrowser();
  if (!browser) {
    throw new Error("No Edge, Chrome, or Chromium executable found. Set RESUME_PDF_BROWSER to a browser executable path.");
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "resume-pdf-export-"));
  const tempHtml = path.join(tempDir, "resume.html");
  const tempPdf = path.join(tempDir, "resume.pdf");
  const profileDir = path.join(tempDir, "profile");
  fs.copyFileSync(htmlPath, tempHtml);

  const result = spawnSync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--user-data-dir=${profileDir}`,
    `--print-to-pdf=${tempPdf}`,
    pathToFileURL(tempHtml).href,
  ], { encoding: "utf8" });

  if (!fs.existsSync(tempPdf)) {
    throw new Error(`Browser PDF export failed.\nstdout:\n${result.stdout || ""}\nstderr:\n${result.stderr || ""}`);
  }

  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.copyFileSync(tempPdf, pdfPath);
  const header = fs.readFileSync(pdfPath, "ascii").slice(0, 5);
  if (header !== "%PDF-") {
    throw new Error(`Generated file is not a PDF: ${pdfPath}`);
  }
}

const html = buildHtml(markdownToBody(md), resumeMeta.title);
fs.mkdirSync(path.dirname(outHtml), { recursive: true });
fs.writeFileSync(outHtml, html, "utf8");
console.log(`HTML written: ${outHtml}`);

if (exportPdf) {
  exportPdfWithBrowser(outHtml, outPdf);
  const stat = fs.statSync(outPdf);
  console.log(`PDF written: ${outPdf} (${stat.size} bytes)`);
}
