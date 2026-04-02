import { toast } from 'sonner';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface ReportStats {
  totalCases: number;
  totalSuites: number;
  totalPlans: number;
  totalRuns: number;
  passRate: number;
  results: {
    PASS?: number;
    FAIL?: number;
    SKIP?: number;
  };
}

interface ReportTrend {
  status: string;
  _count: number;
}

interface TestRunResult {
  id: string;
  testCase: {
    title: string;
    description: string;
    priority: string;
  };
  status: string;
  notes: string;
}

interface TestRunData {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  testPlan: {
    name: string;
    description: string;
  };
  results: TestRunResult[];
  resultsCount: number;
}

export async function exportReportToPDF(
  stats: ReportStats,
  trends: ReportTrend[],
  period: string
) {
  try {
    toast.info('Generating PDF with charts...', { id: 'pdf-export' });

    const { toPng } = await import('html-to-image');
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // ── Header ──────────────────────────────────────────────
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('TEST REPORTS', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const dateStr = format(new Date(), 'PPpp');
    doc.text(`Generated: ${dateStr}  •  Period: Last ${period} days`, pageWidth / 2, y, {
      align: 'center',
    });
    doc.setTextColor(0);
    y += 4;

    // divider
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    // ── Snapshots ───────────────────────────────────────────
    const captureAndAdd = async (elementId: string, title?: string) => {
      const el = document.getElementById(elementId);
      if (el) {
        const dataUrl = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 1.5 });
        const imgWidth = pageWidth - 28;
        const imgHeight = (el.offsetHeight * imgWidth) / el.offsetWidth;
        
        if (y + imgHeight > 280) {
          doc.addPage();
          y = 15;
        }

        if (title) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(title, 14, y);
          y += 5;
        }

        doc.addImage(dataUrl, 'PNG', 14, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      }
    };

    await captureAndAdd('reports-stats', 'Overview Statistics');
    await captureAndAdd('reports-trends', 'Test Results Trends');

    // ── Data Tables ────────────────────────────────────────
    if (y > 240) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DATA TABLES', 14, y);
    y += 8;

    const pass = stats.results.PASS || 0;
    const fail = stats.results.FAIL || 0;
    const skip = stats.results.SKIP || 0;
    const total = pass + fail + skip;

    autoTable(doc, {
      startY: y,
      head: [['Status', 'Count', 'Percentage']],
      body: [
        ['PASS', String(pass), total > 0 ? `${((pass / total) * 100).toFixed(1)}%` : '0%'],
        ['FAIL', String(fail), total > 0 ? `${((fail / total) * 100).toFixed(1)}%` : '0%'],
        ['SKIP', String(skip), total > 0 ? `${((skip / total) * 100).toFixed(1)}%` : '0%'],
        ['Total', String(total), '100%'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 },
      bodyStyles: { fontSize: 10 },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          const status = data.row.cells[0]?.text?.[0];
          if (status === 'PASS') data.cell.styles.textColor = [22, 163, 74];
          if (status === 'FAIL') data.cell.styles.textColor = [220, 38, 38];
          if (status === 'Total') data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 14, right: 14 },
    });

    // ── Footer ──────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Test Reports  •  Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const timestampName = format(new Date(), 'yyyyMMdd-HHmm');
    doc.save(`Test-Report-Last-${period}-Days-${timestampName}.pdf`);
    toast.success('PDF exported successfully!', { id: 'pdf-export' });
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Failed to generate PDF', { id: 'pdf-export' });
  }
}

export async function exportTestRunToPDF(testRunBasic: TestRunData) {
  try {
    toast.info('Fetching unpaginated run data...', { id: 'pdf-export' });

    // Fetch the FULL results bypassing pagination via large limit
    const fullRunResponse = await api.get(`/testruns/${testRunBasic.id}?page=1&limit=100000&resultsOffset=0`);
    const testRun: TestRunData = fullRunResponse;

    toast.info('Generating PDF report...', { id: 'pdf-export' });

    const { toPng } = await import('html-to-image');
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // ── Header ──────────────────────────────────────────────
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('TEST RUN RESULT', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(14);
    doc.text(testRun.name, pageWidth / 2, y, { align: 'center' });
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 4;

    // divider
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.line(14, y, pageWidth - 14, y);
    y += 10;

    // ── Run Info ────────────────────────────────────────────
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RUN INFORMATION', 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Field', 'Value']],
      body: [
        ['Test Plan', testRun.testPlan?.name || '-'],
        ['Description', testRun.testPlan?.description || '-'],
        ['Status', testRun.status],
        ['Started At', testRun.startedAt ? format(new Date(testRun.startedAt), 'PPpp') : '-'],
        ['Completed At', testRun.completedAt ? format(new Date(testRun.completedAt), 'PPpp') : 'In Progress'],
        ['Total Test Cases', String(testRun.resultsCount)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // ── Chart Snapshot ─────────────────────────────────────────
    const chartEl = document.getElementById('test-run-distribution-chart');
    if (chartEl) {
      if (y > 220) {
        doc.addPage();
        y = 15;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DISTRIBUTION CHART', 14, y);
      y += 5;
      
      const dataUrl = await toPng(chartEl, { backgroundColor: '#ffffff', pixelRatio: 1.5 });
      const imgWidth = pageWidth - 28;
      // to keep aspect ratio
      const imgHeight = (chartEl.offsetHeight * imgWidth) / chartEl.offsetWidth;

      doc.addImage(dataUrl, 'PNG', 14, y, imgWidth, imgHeight);
      y += imgHeight + 10;
    }

    // ── Test Results Table ──────────────────────────────────
    if (y > 240) {
      doc.addPage();
      y = 15;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TEST RESULTS (${testRun.results.length} total)`, 14, y);
    y += 8;

    const resultsBody = testRun.results.map((result, idx) => [
      String(idx + 1),
      result.testCase?.title || '-',
      result.testCase?.priority || '-',
      result.status,
      result.notes || '-',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Test Case', 'Priority', 'Status', 'Notes']],
      body: resultsBody,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 55 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          const status = data.cell.text?.[0];
          if (status === 'PASS') data.cell.styles.textColor = [22, 163, 74];
          if (status === 'FAIL') data.cell.styles.textColor = [220, 38, 38];
        }
      },
      margin: { left: 14, right: 14 },
    });

    // ── Footer ──────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${testRun.name}  •  Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    const safeName = testRun.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestampName = format(new Date(), 'yyyyMMdd-HHmm');
    doc.save(`Test-Run-Result-${safeName}-${timestampName}.pdf`);
    toast.success('PDF exported successfully!', { id: 'pdf-export' });
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Failed to generate PDF', { id: 'pdf-export' });
  }
}
