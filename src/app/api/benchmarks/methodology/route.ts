import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'md';
    const filePath = join(process.cwd(), 'data', 'benchmark-methodology.md');
    const content = await readFile(filePath, 'utf-8');

    if (format === 'md') {
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': 'attachment; filename="Benchmark_Methodology_India_Steel_MSME.md"',
        },
      });
    }

    // HTML format — readable in browser, printable as PDF
    const html = renderMethodologyHtml(content);
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('GET /api/benchmarks/methodology error:', error);
    return NextResponse.json({ error: 'Failed to load methodology' }, { status: 500 });
  }
}

function renderMethodologyHtml(markdown: string): string {
  // Simple markdown to HTML conversion for tables, headers, lists, bold, links
  let html = markdown
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr/>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Tables
  html = html.replace(
    /(\|.+\|)\n(\|[-:|  ]+\|)\n((?:\|.+\|\n?)+)/g,
    (_match, headerRow: string, _separator: string, bodyRows: string) => {
      const headers = headerRow.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
      const rows = bodyRows.trim().split('\n').map((row: string) => {
        const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // Lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.+<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Paragraphs — wrap lines that aren't already HTML
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return trimmed;
    return `<p>${trimmed}</p>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Benchmark Methodology - Indian Iron &amp; Steel MSME</title>
  <style>
    @media print { body { font-size: 11pt; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 22px; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-top: 32px; }
    h2 { font-size: 18px; color: #065f46; margin-top: 28px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
    h3 { font-size: 15px; color: #374151; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th { background: #f0fdf4; border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-weight: 600; }
    td { border: 1px solid #d1d5db; padding: 8px 12px; }
    tr:nth-child(even) td { background: #fafafa; }
    ul { margin: 8px 0; padding-left: 24px; }
    li { margin: 4px 0; font-size: 14px; }
    a { color: #059669; }
    p { margin: 8px 0; font-size: 14px; }
    hr { border: none; border-top: 2px solid #e5e7eb; margin: 24px 0; }
    strong { color: #111827; }
    .print-btn { position: fixed; top: 16px; right: 16px; background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
    .print-btn:hover { background: #059669; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  ${html}
</body>
</html>`;
}
