---
name: resume-pdf-export
description: Convert a Markdown resume into a polished Chinese resume HTML and PDF with a compact A4 layout, light-blue professional styling, section hierarchy, and browser-based PDF export. Use when Codex needs to generate, refresh, or tune a resume PDF from a Markdown resume, especially for Chinese resumes with headings, work experience, projects, bullets, dates, and contact information.
---

# Resume PDF Export

## Workflow

Use `scripts/export_resume.js` for Markdown resume export.

```bash
node scripts/export_resume.js examples/sample-resume.md --pdf
```

Default outputs are created next to the Markdown file:

- `<content-derived-name>.html`
- `<content-derived-name>.pdf`

The default output base name is extracted from resume content:

- name from the first `#` heading
- target role from the bold line immediately after the name
- suffix `简历`

For example, `# 张三` plus `**AI应用开发工程师 / 知识库平台方向**` becomes a file name similar to `张三_AI应用开发工程师_简历.pdf`.

Use `--out-html <path>` and `--out-pdf <path>` to override output paths.

## Resume Markdown Expectations

The script is optimized for this structure:

- `# 姓名`
- a bold role line immediately after the name
- a contact line starting with `手机：`
- `##` section headings
- `###` company/role headings
- bold-only project titles such as `**企业级文档知识库与 RAG 智能问答平台**`
- `-` bullet items
- date lines starting with `YYYY年`

Do not rewrite resume content unless the user explicitly asks. Treat export work as layout-only by default.

## Layout Defaults

- A4 portrait, one-page-friendly compact spacing.
- Light-blue / blue-gray professional theme.
- Header centered with name, role, and contact line.
- Section headings use a light-blue band with a left accent bar.
- Project titles use deep-blue bold text.
- Body metrics and numbers remain normal body text; do not auto-highlight numbers.

## PDF Export Notes

The script prefers `RESUME_PDF_BROWSER` when set, then Microsoft Edge, Chrome, Chromium, or Google Chrome. It uses headless browser printing and copies the generated HTML to an ASCII temporary path before printing because browser headless export can be unreliable with non-ASCII file URLs or output paths.

If the target PDF is open in a viewer, overwrite may fail. In that case, export to a suffixed path such as `*-new.pdf` or close the viewer before overwriting.

Browser export may print diagnostic stderr even when the PDF succeeds. Verify success by checking that the target PDF exists, has non-zero size, and starts with `%PDF-`.

## Tightening Or Loosening Layout

If the user asks to fit one page without content changes, adjust CSS only:

- Tighten: reduce `@page` margins, `body` font-size/line-height, `h2` margins, `li` margins.
- Loosen: increase line-height and title/list margins slightly while keeping A4.
- Keep body numbers unstyled unless explicitly requested.

After style changes, regenerate both HTML and PDF.
