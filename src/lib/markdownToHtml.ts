/** Lightweight markdown → styled HTML converter for clipboard rich-paste */
export function markdownToStyledHtml(md: string): string {
  const baseStyle = `font-family:'Segoe UI',Calibri,Arial,sans-serif;color:#1a1a2e;line-height:1.6;`;
  const h1Style = `font-size:20px;font-weight:700;color:#006B8F;border-bottom:2px solid #006B8F;padding-bottom:4px;margin:16px 0 8px;`;
  const h2Style = `font-size:17px;font-weight:700;color:#006B8F;margin:14px 0 6px;`;
  const h3Style = `font-size:15px;font-weight:600;color:#1a1a2e;margin:12px 0 4px;`;
  const pStyle = `font-size:14px;margin:6px 0;`;
  const liStyle = `font-size:14px;margin:3px 0;`;
  const tableStyle = `border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;`;
  const thStyle = `background:#006B8F;color:white;padding:8px 12px;text-align:left;font-weight:600;border:1px solid #005a77;`;
  const tdStyle = `padding:6px 12px;border:1px solid #dde3ea;`;
  const trEvenStyle = `background:#f0f7fa;`;
  const strongStyle = `color:#006B8F;font-weight:600;`;
  const codeStyle = `background:#f0f4f8;padding:2px 6px;border-radius:4px;font-family:'Cascadia Code','Consolas',monospace;font-size:13px;`;

  let html = md;

  // Tables (process before other rules)
  html = html.replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_match, headerRow, _sep, bodyRows) => {
    const headers = headerRow.split('|').filter((c: string) => c.trim());
    const rows = bodyRows.trim().split('\n').map((r: string) => r.split('|').filter((c: string) => c.trim()));

    let table = `<table style="${tableStyle}"><thead><tr>`;
    headers.forEach((h: string) => { table += `<th style="${thStyle}">${h.trim()}</th>`; });
    table += `</tr></thead><tbody>`;
    rows.forEach((row: string[], i: number) => {
      const bg = i % 2 === 0 ? '' : ` style="${trEvenStyle}"`;
      table += `<tr${bg}>`;
      row.forEach((cell: string) => { table += `<td style="${tdStyle}">${cell.trim()}</td>`; });
      table += `</tr>`;
    });
    table += `</tbody></table>`;
    return table;
  });

  // Headers
  html = html.replace(/^### (.+)$/gm, `<h3 style="${h3Style}">$1</h3>`);
  html = html.replace(/^## (.+)$/gm, `<h2 style="${h2Style}">$1</h2>`);
  html = html.replace(/^# (.+)$/gm, `<h1 style="${h1Style}">$1</h1>`);

  // Bold & italic
  html = html.replace(/\*\*(.+?)\*\*/g, `<strong style="${strongStyle}">$1</strong>`);
  html = html.replace(/\*(.+?)\*/g, `<em>$1</em>`);

  // Inline code
  html = html.replace(/`(.+?)`/g, `<code style="${codeStyle}">$1</code>`);

  // List items
  html = html.replace(/^[-*] (.+)$/gm, `<li style="${liStyle}">$1</li>`);
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, `<ul style="margin:8px 0;padding-left:20px;">$1</ul>`);

  // Paragraphs (lines that aren't already HTML)
  html = html.replace(/^(?!<[hultd/])(.+)$/gm, `<p style="${pStyle}">$1</p>`);

  // Clean empty paragraphs
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');

  return `<div style="${baseStyle}">${html}</div>`;
}
