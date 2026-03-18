/**
 * Reports Route
 * Generates CSV, Excel (.xlsx), and PDF exports.
 */

const express = require('express');
const db      = require('../db/postgres');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { requireAdmin } = require('../middleware/authMiddleware');
const router  = express.Router();

function fmtDuration(s) {
  if (!s) return '0m';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

async function fetchReport(query) {
  const { from, to, userId } = query;
  const params = [];
  let i = 1;
  let filter = 'WHERE t.end_time IS NOT NULL';
  if (from)   { filter += ` AND t.start_time >= $${i++}`; params.push(from); }
  if (to)     { filter += ` AND t.start_time <= $${i++}`; params.push(to); }
  if (userId) { filter += ` AND t.user_id = $${i++}`;     params.push(userId); }

  const result = await db.query(`
    SELECT u.name as employee, t.task_name, t.start_time, t.end_time,
           t.total_duration, t.active_duration, t.idle_duration, t.productivity_score
    FROM tasks t JOIN users u ON t.user_id = u.user_id
    ${filter}
    ORDER BY t.start_time DESC
    LIMIT 5000
  `, params);
  return result.rows;
}

// GET /api/reports/csv
router.get('/csv', requireAdmin, async (req, res) => {
  try {
    const rows = await fetchReport(req.query);
    const headers = ['Employee','Task','Start','End','Total','Active','Idle','Score'];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      lines.push([
        `"${r.employee}"`,
        `"${r.task_name.replace(/"/g,'""')}"`,
        new Date(r.start_time).toLocaleString(),
        r.end_time ? new Date(r.end_time).toLocaleString() : '',
        fmtDuration(r.total_duration),
        fmtDuration(r.active_duration),
        fmtDuration(r.idle_duration),
        r.productivity_score ? `${Math.round(r.productivity_score)}%` : ''
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="worktrack_report_${Date.now()}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/excel
router.get('/excel', requireAdmin, async (req, res) => {
  try {
    const rows = await fetchReport(req.query);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'WorkTrack';
    wb.created = new Date();

    const ws = wb.addWorksheet('Task Report');
    ws.columns = [
      { header: 'Employee',   key: 'employee',   width: 20 },
      { header: 'Task',       key: 'task_name',  width: 40 },
      { header: 'Start',      key: 'start_time', width: 20 },
      { header: 'End',        key: 'end_time',   width: 20 },
      { header: 'Total',      key: 'total',      width: 12 },
      { header: 'Active',     key: 'active',     width: 12 },
      { header: 'Idle',       key: 'idle',       width: 12 },
      { header: 'Score (%)',  key: 'score',      width: 12 },
    ];

    // Header styling
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    rows.forEach(r => {
      ws.addRow({
        employee:  r.employee,
        task_name: r.task_name,
        start_time: new Date(r.start_time).toLocaleString(),
        end_time:   r.end_time ? new Date(r.end_time).toLocaleString() : '',
        total:  fmtDuration(r.total_duration),
        active: fmtDuration(r.active_duration),
        idle:   fmtDuration(r.idle_duration),
        score:  r.productivity_score ? Math.round(r.productivity_score) : null,
      });
    });

    // Alternate row shading
    ws.eachRow((row, rowNum) => {
      if (rowNum > 1 && rowNum % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="worktrack_report_${Date.now()}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reports/pdf
router.get('/pdf', requireAdmin, async (req, res) => {
  try {
    const rows = await fetchReport(req.query);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="worktrack_report_${Date.now()}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('WorkTrack — Productivity Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#6B7280')
       .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    // Summary stats
    if (rows.length > 0) {
      const totalActive = rows.reduce((s, r) => s + (r.active_duration || 0), 0);
      const avgScore    = rows.reduce((s, r) => s + (r.productivity_score || 0), 0) / rows.length;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text('Summary');
      doc.fontSize(10).font('Helvetica').fillColor('#374151')
         .text(`Total tasks: ${rows.length}   Active time: ${fmtDuration(totalActive)}   Avg score: ${Math.round(avgScore)}%`);
      doc.moveDown(0.8);
    }

    // Table header
    const cols = [40, 130, 280, 360, 430, 490, 540];
    const colW = cols.map((c, i) => (cols[i + 1] || 595) - c);
    const headers = ['Employee', 'Task', 'Date', 'Total', 'Active', 'Idle', 'Score'];

    doc.rect(40, doc.y, 515, 18).fill('#2563EB');
    const hy = doc.y - 18;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff');
    headers.forEach((h, i) => doc.text(h, cols[i] + 4, hy + 5, { width: colW[i] - 4 }));
    doc.y = hy + 20;

    // Table rows
    rows.slice(0, 200).forEach((r, idx) => {
      if (doc.y > 760) { doc.addPage(); }
      if (idx % 2 === 0) { doc.rect(40, doc.y, 515, 16).fill('#F9FAFB'); }
      const ry = doc.y;
      doc.font('Helvetica').fontSize(8).fillColor('#374151');
      const vals = [
        r.employee.slice(0, 14),
        r.task_name.slice(0, 22),
        new Date(r.start_time).toLocaleDateString(),
        fmtDuration(r.total_duration),
        fmtDuration(r.active_duration),
        fmtDuration(r.idle_duration),
        r.productivity_score ? `${Math.round(r.productivity_score)}%` : '—'
      ];
      vals.forEach((v, i) => doc.text(v, cols[i] + 4, ry + 4, { width: colW[i] - 6 }));
      doc.y = ry + 17;
    });

    if (rows.length > 200) {
      doc.moveDown().fontSize(9).fillColor('#6B7280')
         .text(`... and ${rows.length - 200} more rows. Use CSV/Excel export for full data.`);
    }

    doc.end();
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
