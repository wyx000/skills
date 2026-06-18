# Skills

Personal/public Codex skills collected in one repository.

## Available Skills

### resume-pdf-export

Convert a Markdown resume into a polished Chinese resume HTML and PDF with a compact A4 layout, light-blue professional styling, and browser-based PDF export.

Install this skill by copying or cloning the `resume-pdf-export` folder into your Codex skills directory.

Windows example:

```powershell
git clone https://github.com/wyx000/skills.git
Copy-Item -Recurse -Force ".\skills\resume-pdf-export" "$env:USERPROFILE\.codex\skills\resume-pdf-export"
```

macOS/Linux example:

```bash
git clone https://github.com/wyx000/skills.git
cp -R skills/resume-pdf-export ~/.codex/skills/resume-pdf-export
```

Use the bundled script directly:

```bash
cd resume-pdf-export
node scripts/export_resume.js examples/sample-resume.md --pdf
```

The `resume-pdf-export/examples` folder includes a complete before/after sample:

- `sample-resume.md`: input Markdown resume
- `李明_后端开发工程师_简历.html`: generated HTML output
- `李明_后端开发工程师_简历.pdf`: generated PDF output

## Repository Layout

Each top-level folder is an installable skill folder containing a `SKILL.md` file.

```text
resume-pdf-export/
  SKILL.md
  agents/openai.yaml
  scripts/export_resume.js
  examples/sample-resume.md
  examples/李明_后端开发工程师_简历.html
  examples/李明_后端开发工程师_简历.pdf
```

## License

MIT
