import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: any) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(`Generated ${format(new Date(), 'PPpp')}`, 14, 25);
  autoTable(doc, { head: [headers], body: rows.map(r => r.map(String)), startY: 32, styles: { fontSize: 9 }, headStyles: { fillColor: [236, 72, 90] } });
  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}
