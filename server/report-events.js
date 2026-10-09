const { db } = require('./db');

const recordReportEvent = ({
  reportId,
  eventType,
  title,
  details = null,
  fromStatus = null,
  toStatus = null,
  actor = null,
  createdAt,
}) => {
  db.prepare(`
    INSERT INTO report_status_history
      (report_id, event_type, title, details, from_status, to_status, actor_name, actor_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reportId,
    eventType,
    title,
    details,
    fromStatus,
    toStatus,
    actor?.full_name || null,
    actor?.id || null,
    createdAt,
  );
};

const recordReportStatusChange = (report, nextStatus, actor, createdAt, details = null) => {
  if (!report || report.status === nextStatus) return;
  recordReportEvent({
    reportId: report.id,
    eventType: 'status',
    title: `Status updated to ${nextStatus}`,
    details,
    fromStatus: report.status,
    toStatus: nextStatus,
    actor,
    createdAt,
  });
};

module.exports = { recordReportEvent, recordReportStatusChange };
