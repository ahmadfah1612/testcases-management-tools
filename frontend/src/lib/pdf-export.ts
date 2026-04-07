import { toast } from 'sonner';
import { api } from '@/lib/api';
import { format } from 'date-fns';

// ── Colour palette ───────────────────────────────────────────────────────────
const C = {
  black:      [15,  23,  42]  as [number, number, number],
  accent:     [30,  64, 175]  as [number, number, number], // indigo-700
  accentLight:[219, 234, 254] as [number, number, number], // indigo-100
  pass:       [22, 163,  74]  as [number, number, number], // green-600
  passLight:  [220, 252, 231] as [number, number, number],
  fail:       [220,  38,  38] as [number, number, number], // red-600
  failLight:  [254, 226, 226] as [number, number, number],
  skip:       [107, 114, 128] as [number, number, number], // gray-500
  skipLight:  [243, 244, 246] as [number, number, number],
  rowAlt:     [248, 250, 252] as [number, number, number], // slate-50
  border:     [226, 232, 240] as [number, number, number], // slate-200
  mutedText:  [100, 116, 139] as [number, number, number], // slate-500
  white:      [255, 255, 255] as [number, number, number],
};

interface ReportStats {
  totalCases:  number;
  totalSuites: number;
  totalPlans:  number;
  totalRuns:   number;
  passRate:    number;
  results: { PASS?: number; FAIL?: number; SKIP?: number };
}

interface ReportTrend {
  status: string;
  _count: number;
}

interface TestRunResult {
  id: string;
  testCase: { title: string; description: string; priority: string };
  status: string;
  notes: string;
}

interface TestRunData {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  testPlan: { name: string; description: string };
  results: TestRunResult[];
  resultsCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function accentHeader(doc: any, pageWidth: number, title: string, subtitle?: string) {
  // Solid accent bar
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, 14, 14);

  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth - 14, 14, { align: 'right' });
  }

  doc.setTextColor(...C.black);
  return 30; // y after header
}

function sectionTitle(doc: any, label: string, y: number, pageWidth: number): number {
  doc.setFillColor(...C.accentLight);
  doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.accent);
  doc.text(label.toUpperCase(), 16, y + 1);
  doc.setTextColor(...C.black);
  return y + 8;
}

function addFooters(doc: any, docTitle: string) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const ts = format(new Date(), 'dd MMM yyyy HH:mm');

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.mutedText);
    doc.text(docTitle, 14, pageHeight - 9);
    doc.text(`Page ${i} of ${pageCount}  •  ${ts}`, pageWidth - 14, pageHeight - 9, { align: 'right' });
  }
}

function ensureSpace(doc: any, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return 15;
  }
  return y;
}

// ── Programmatic stacked-bar chart ───────────────────────────────────────────

function drawDistributionBar(
  doc: any,
  y: number,
  pass: number,
  fail: number,
  skip: number,
  pageWidth: number
): number {
  const barX = 14;
  const barW = pageWidth - 28;
  const barH = 10;
  const total = pass + fail + skip;

  if (total === 0) return y;

  const passW = (pass / total) * barW;
  const failW = (fail / total) * barW;
  const skipW = (skip / total) * barW;

  const passX = barX;
  const failX = barX + passW;
  const skipX = barX + passW + failW;

  // segments
  if (passW > 0) { doc.setFillColor(...C.pass); doc.rect(passX, y, passW, barH, 'F'); }
  if (failW > 0) { doc.setFillColor(...C.fail); doc.rect(failX, y, failW, barH, 'F'); }
  if (skipW > 0) { doc.setFillColor(...C.skip); doc.rect(skipX, y, skipW, barH, 'F'); }

  // outline
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.rect(barX, y, barW, barH);
  y += barH + 5;

  // legend
  const items = [
    { color: C.pass, label: `PASS: ${pass} (${total > 0 ? ((pass / total) * 100).toFixed(1) : 0}%)` },
    { color: C.fail, label: `FAIL: ${fail} (${total > 0 ? ((fail / total) * 100).toFixed(1) : 0}%)` },
    { color: C.skip, label: `SKIP: ${skip} (${total > 0 ? ((skip / total) * 100).toFixed(1) : 0}%)` },
  ];
  let lx = barX;
  items.forEach(({ color, label }) => {
    doc.setFillColor(...color);
    doc.rect(lx, y - 3, 4, 4, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.black);
    doc.text(label, lx + 6, y);
    lx += 55;
  });

  return y + 8;
}

// ── Export: Test Run ─────────────────────────────────────────────────────────

export async function exportTestRunToPDF(testRunBasic: TestRunData) {
  try {
    toast.info('Fetching all test results…', { id: 'pdf-export' });

    const testRun: TestRunData = await api.get(
      `/testruns/${testRunBasic.id}?page=1&limit=100000&resultsOffset=0`
    );

    toast.info('Generating PDF…', { id: 'pdf-export' });

    const { toPng }  = await import('html-to-image');
    const { jsPDF }  = await import('jspdf');
    const autoTable  = (await import('jspdf-autotable')).default;

    const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // ── Header ───────────────────────────────────────────────────────────────
    const subtitle = `${testRun.testPlan?.name}  •  Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}`;
    let y = accentHeader(doc, pageWidth, 'TEST RUN REPORT', subtitle);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(testRun.name, 14, y);
    y += 5;

    const statusColor = testRun.status === 'COMPLETED' ? C.pass : testRun.status === 'FAILED' ? C.fail : C.accent;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusColor);
    doc.text(testRun.status, 14, y);
    doc.setTextColor(...C.black);
    y += 8;

    // ── Run Information ───────────────────────────────────────────────────────
    y = sectionTitle(doc, 'Run Information', y, pageWidth);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: [
        ['Test Plan',     testRun.testPlan?.name        || '—'],
        ['Description',   testRun.testPlan?.description || '—'],
        ['Status',        testRun.status],
        ['Started',       testRun.startedAt   ? format(new Date(testRun.startedAt),   'dd MMM yyyy HH:mm') : '—'],
        ['Completed',     testRun.completedAt ? format(new Date(testRun.completedAt), 'dd MMM yyyy HH:mm') : 'In Progress'],
        ['Total Cases',   String(testRun.resultsCount)],
      ],
      theme: 'plain',
      headStyles: {
        fillColor: C.accent, textColor: C.white, fontStyle: 'bold', fontSize: 9,
      },
      bodyStyles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 38 } },
      tableLineColor: C.border,
      tableLineWidth: 0.2,
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Distribution ─────────────────────────────────────────────────────────
    y = ensureSpace(doc, y, 50);
    y = sectionTitle(doc, 'Results Distribution', y, pageWidth);
    y += 4;

    const allResults = testRun.results;
    const pass = allResults.filter(r => r.status === 'PASS').length;
    const fail = allResults.filter(r => r.status === 'FAIL').length;
    const skip = allResults.filter(r => r.status === 'SKIP').length;

    y = drawDistributionBar(doc, y, pass, fail, skip, pageWidth);
    y += 4;

    // ── Screenshot of distribution chart from page (if available) ────────────
    const chartEl = document.getElementById('test-run-distribution-chart');
    if (chartEl) {
      y = ensureSpace(doc, y, 70);
      const dataUrl = await toPng(chartEl, { backgroundColor: '#ffffff', pixelRatio: 1.5 });
      const imgW = (pageWidth - 28) * 0.55; // 55% width, centered
      const imgH = (chartEl.offsetHeight * imgW) / chartEl.offsetWidth;
      const imgX = (pageWidth - imgW) / 2;
      doc.addImage(dataUrl, 'PNG', imgX, y, imgW, imgH);
      y += imgH + 10;
    }

    // ── Test Results Table ────────────────────────────────────────────────────
    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, `Test Results (${allResults.length} total)`, y, pageWidth);
    y += 2;

    const resultsBody = allResults.map((result, idx) => [
      String(idx + 1),
      result.testCase?.title    || '—',
      result.testCase?.priority || '—',
      result.status,
      result.notes              || '—',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Test Case', 'Priority', 'Status', 'Notes']],
      body: resultsBody,
      theme: 'plain',
      headStyles: {
        fillColor: C.accent, textColor: C.white, fontStyle: 'bold', fontSize: 9,
      },
      bodyStyles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 'auto' },
      },
      tableLineColor: C.border,
      tableLineWidth: 0.2,
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          const s = data.cell.text?.[0];
          if (s === 'PASS') { data.cell.styles.textColor = C.pass; data.cell.styles.fillColor = data.row.index % 2 === 0 ? C.white : C.rowAlt; }
          if (s === 'FAIL') { data.cell.styles.textColor = C.fail; }
          if (s === 'SKIP') { data.cell.styles.textColor = C.skip; }
        }
      },
      margin: { left: 14, right: 14 },
    });

    // ── Footers ───────────────────────────────────────────────────────────────
    addFooters(doc, `Test Run Report — ${testRun.name}`);

    const safeName = testRun.name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    const ts = format(new Date(), 'yyyyMMdd_HHmm');
    doc.save(`TestRun_${safeName}_${ts}.pdf`);
    toast.success('PDF exported successfully!', { id: 'pdf-export' });
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Failed to generate PDF', { id: 'pdf-export' });
  }
}

// ── Export: Reports ──────────────────────────────────────────────────────────

export async function exportReportToPDF(
  stats:  ReportStats,
  trends: ReportTrend[],
  period: string
) {
  try {
    toast.info('Generating PDF report…', { id: 'pdf-export' });

    const { toPng }  = await import('html-to-image');
    const { jsPDF }  = await import('jspdf');
    const autoTable  = (await import('jspdf-autotable')).default;

    const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // ── Header ───────────────────────────────────────────────────────────────
    const subtitle = `Last ${period} Days  •  Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}`;
    let y = accentHeader(doc, pageWidth, 'TEST REPORT', subtitle);
    y += 4;

    // ── Capture DOM sections ─────────────────────────────────────────────────
    const captureAndAdd = async (elementId: string, label: string) => {
      const el = document.getElementById(elementId);
      if (!el) return;

      y = ensureSpace(doc, y, 40);
      y = sectionTitle(doc, label, y, pageWidth);
      y += 4;

      const dataUrl = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 1.5 });
      const imgW    = pageWidth - 28;
      const imgH    = (el.offsetHeight * imgW) / el.offsetWidth;

      y = ensureSpace(doc, y, imgH + 10);
      doc.addImage(dataUrl, 'PNG', 14, y, imgW, imgH);
      y += imgH + 10;
    };

    await captureAndAdd('reports-stats',  'Overview Statistics');
    await captureAndAdd('reports-trends', 'Test Results Trends');

    // ── Overview Data Table ───────────────────────────────────────────────────
    y = ensureSpace(doc, y, 50);
    y = sectionTitle(doc, 'Summary', y, pageWidth);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Count']],
      body: [
        ['Test Cases',  String(stats.totalCases)],
        ['Test Suites', String(stats.totalSuites)],
        ['Test Plans',  String(stats.totalPlans)],
        ['Test Runs',   String(stats.totalRuns)],
        ['Overall Pass Rate', `${stats.passRate.toFixed(1)}%`],
      ],
      theme: 'plain',
      headStyles: {
        fillColor: C.accent, textColor: C.white, fontStyle: 'bold', fontSize: 9,
      },
      bodyStyles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { halign: 'right' },
      },
      tableLineColor: C.border,
      tableLineWidth: 0.2,
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Results Breakdown Table ───────────────────────────────────────────────
    y = ensureSpace(doc, y, 50);
    y = sectionTitle(doc, 'Results Breakdown', y, pageWidth);
    y += 2;

    const pass  = stats.results.PASS  || 0;
    const fail  = stats.results.FAIL  || 0;
    const skip  = stats.results.SKIP  || 0;
    const total = pass + fail + skip;

    autoTable(doc, {
      startY: y,
      head: [['Status', 'Count', 'Percentage', 'Visual']],
      body: [
        ['PASS', String(pass), total > 0 ? `${((pass / total) * 100).toFixed(1)}%` : '0%', ''],
        ['FAIL', String(fail), total > 0 ? `${((fail / total) * 100).toFixed(1)}%` : '0%', ''],
        ['SKIP', String(skip), total > 0 ? `${((skip / total) * 100).toFixed(1)}%` : '0%', ''],
        ['Total', String(total), '100%', ''],
      ],
      theme: 'plain',
      headStyles: {
        fillColor: C.accent, textColor: C.white, fontStyle: 'bold', fontSize: 9,
      },
      bodyStyles: { fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: C.rowAlt },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30 },
        1: { halign: 'right', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 30 },
        3: { cellWidth: 'auto' },
      },
      tableLineColor: C.border,
      tableLineWidth: 0.2,
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          const s = data.row.cells[0]?.text?.[0];
          if (data.column.index === 0) {
            if (s === 'PASS')  data.cell.styles.textColor = C.pass;
            if (s === 'FAIL')  data.cell.styles.textColor = C.fail;
            if (s === 'SKIP')  data.cell.styles.textColor = C.skip;
            if (s === 'Total') data.cell.styles.fontStyle  = 'bold';
          }
        }
      },
      didDrawCell: (data: any) => {
        // Draw mini bar in the Visual column
        if (data.section === 'body' && data.column.index === 3) {
          const s     = data.row.cells[0]?.text?.[0];
          const pct   = parseFloat(data.row.cells[2]?.text?.[0]) || 0;
          const barW  = (data.cell.width - 4) * (pct / 100);
          if (barW <= 0 || s === 'Total') return;
          const color = s === 'PASS' ? C.pass : s === 'FAIL' ? C.fail : C.skip;
          doc.setFillColor(...color);
          doc.rect(data.cell.x + 2, data.cell.y + 2.5, barW, 3, 'F');
        }
      },
      margin: { left: 14, right: 14 },
    });

    // ── Trends Distribution Bar ───────────────────────────────────────────────
    y = (doc as any).lastAutoTable.finalY + 10;
    y = ensureSpace(doc, y, 40);
    y = sectionTitle(doc, `Trend Distribution (Last ${period} Days)`, y, pageWidth);
    y += 4;

    const tPass = trends.find(t => t.status === 'PASS')?._count || 0;
    const tFail = trends.find(t => t.status === 'FAIL')?._count || 0;
    const tSkip = trends.find(t => t.status === 'SKIP')?._count || 0;

    y = drawDistributionBar(doc, y, tPass, tFail, tSkip, pageWidth);

    // ── Footers ───────────────────────────────────────────────────────────────
    addFooters(doc, `Test Report — Last ${period} Days`);

    const ts = format(new Date(), 'yyyyMMdd_HHmm');
    doc.save(`TestReport_Last${period}Days_${ts}.pdf`);
    toast.success('PDF exported successfully!', { id: 'pdf-export' });
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Failed to generate PDF', { id: 'pdf-export' });
  }
}
