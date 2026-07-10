//src/utils/exportHtml.ts

// Plain CSS mirroring the preview's Tailwind styling, embedded in exported
// files so they are self-contained (syntax highlighting is already inline;
// Mermaid diagrams are inline SVG; only KaTeX needs its stylesheet)
const EXPORT_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
         color: #1f2937; max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem; line-height: 1.625; }
  h1 { font-size: 1.875rem; font-weight: 700; color: #111827; margin: 2rem 0 1rem; padding-bottom: .5rem; border-bottom: 1px solid #e5e7eb; }
  h2 { font-size: 1.5rem; font-weight: 600; color: #111827; margin: 1.5rem 0 .75rem; }
  h3 { font-size: 1.25rem; font-weight: 600; color: #111827; margin: 1.25rem 0 .5rem; }
  h4 { font-size: 1.125rem; font-weight: 600; color: #111827; margin: 1rem 0 .5rem; }
  p { margin: 0 0 1rem; }
  ul, ol { margin: 0 0 1rem; padding-left: 1.5rem; }
  li { margin: .25rem 0; }
  blockquote { border-left: 4px solid #3b82f6; padding: .5rem 0 .5rem 1rem; font-style: italic;
               color: #4b5563; background: #eff6ff; margin: 1rem 0; }
  code { background: #f3f4f6; padding: .15rem .4rem; border-radius: .25rem;
         font-family: "SF Mono", Monaco, Consolas, monospace; font-size: .875rem; color: #dc2626; }
  pre code, div[style] code { background: transparent; padding: 0; color: inherit; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 1rem; font-size: .875rem; border: 1px solid #e5e7eb; }
  th { background: #f9fafb; padding: .625rem 1rem; font-weight: 600; text-align: left;
       border: 1px solid #e5e7eb; border-bottom: 2px solid #d1d5db; }
  td { padding: .625rem 1rem; border: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  hr { border: 0; border-top: 1px solid #d1d5db; margin: 2rem 0; }
  a { color: #2563eb; }
  img, svg { max-width: 100%; }
`;

const KATEX_CSS_URL = 'https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css';

export const buildExportHtml = (previewHtml: string, title: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="${KATEX_CSS_URL}">
<style>${EXPORT_CSS}</style>
</head>
<body>
${previewHtml}
</body>
</html>`;

export const downloadHtml = (previewHtml: string, title = 'document'): void => {
       const html = buildExportHtml(previewHtml, title);
       const blob = new Blob([html], { type: 'text/html' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `${title}.html`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
};
