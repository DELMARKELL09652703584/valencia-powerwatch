const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();

const monthKey = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key) => {
  if (!key) return '';
  const [y, m] = key.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1]} ${y}`;
};

const durationHours = (start, end) => {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.round((ms / 3600000) * 10) / 10;
};

const readDateRange = (req, res) => {
  const from = String(req.query.from || '');
  const to = String(req.query.to || '');
  const isDate = (value) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (!isDate(from) || !isDate(to)) {
    res.status(400).json({ error: 'Dates must use a valid YYYY-MM-DD format.' });
    return null;
  }
  if (from && to && from > to) {
    res.status(400).json({ error: 'Start date must be on or before the end date.' });
    return null;
  }
  return { from, to };
};

const dateClause = (column, range) => {
  const clauses = [];
  const params = [];
  if (range.from) { clauses.push(`date(${column}) >= date(?)`); params.push(range.from); }
  if (range.to) { clauses.push(`date(${column}) <= date(?)`); params.push(range.to); }
  return { sql: clauses.length ? ` AND ${clauses.join(' AND ')}` : '', params };
};

const countInRange = (table, condition, dateColumn, range) => {
  const date = dateClause(dateColumn, range);
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ${condition}${date.sql}`).get(...date.params);
  return Number(row.c);
};

const dateKey = (date) => date.toISOString().slice(0, 10);

const shiftDate = (date, days) => {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return dateKey(shifted);
};

const monthKeyAtValencia = (value) => {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? new Date(timestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 7) : '';
};

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 10) / 10;
};

const monthKeysBefore = (date, count) => {
  const [year, month] = date.split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const value = new Date(Date.UTC(year, month - 1 - count + index, 1));
    return value.toISOString().slice(0, 7);
  });
};

router.get('/insights', requireAuth, (req, res) => {
  const isResident = req.user.role === 'resident';
  const barangay = String(req.user.barangay || '').trim();
  const scopeSql = isResident
    ? ` AND (i.barangay = ? OR EXISTS (
        SELECT 1 FROM incident_areas scoped_area
        WHERE scoped_area.incident_id = i.id AND scoped_area.barangay = ?
      ))`
    : '';
  const scopeParams = isResident ? [barangay, barangay] : [];
  const manilaToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const todayExclusive = shiftDate(manilaToday, 1);
  const currentFrom = shiftDate(manilaToday, -89);
  const previousFrom = shiftDate(currentFrom, -90);
  const [currentYear, currentMonthNumber] = manilaToday.slice(0, 7).split('-').map(Number);
  const projectionFrom = new Date(Date.UTC(currentYear, currentMonthNumber - 1 - 6, 1)).toISOString().slice(0, 10);
  const incidentRows = db.prepare(`
    SELECT i.id, i.incident_type, i.status, i.start_time, i.end_time, i.closed_at,
           i.barangay
    FROM outage_incidents i
    WHERE i.start_time IS NOT NULL
      AND i.status NOT IN ('Reported', 'Under Verification')
      AND date(i.start_time, '+8 hours') >= date(?)
      AND date(i.start_time, '+8 hours') < date(?)
      ${scopeSql}
  `).all(projectionFrom, todayExclusive, ...scopeParams);
  const localDay = (value) => new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const currentIncidents = incidentRows.filter((item) => {
    const day = localDay(item.start_time);
    return day >= currentFrom && day < todayExclusive;
  });
  const previousIncidents = incidentRows.filter((item) => {
    const day = localDay(item.start_time);
    return day >= previousFrom && day < currentFrom;
  });
  const unexpectedCount = (rows) => rows.filter((item) => item.incident_type === 'Unexpected').length;
  const currentUnexpected = unexpectedCount(currentIncidents);
  const previousUnexpected = unexpectedCount(previousIncidents);
  const trendDirection = currentUnexpected === previousUnexpected
    ? 'stable'
    : currentUnexpected > previousUnexpected
      ? (previousUnexpected ? 'up' : 'new_activity')
      : 'down';
  const changePercent = previousUnexpected
    ? Math.round(((currentUnexpected - previousUnexpected) / previousUnexpected) * 100)
    : null;

  const activeIncidentCount = Number(db.prepare(`
    SELECT COUNT(*) AS count
    FROM outage_incidents i
    WHERE i.status NOT IN ('Closed', 'Restored', 'Resolved')${scopeSql}
  `).get(...scopeParams).count);
  const openReports = Number(db.prepare(`
    SELECT COUNT(*) AS count
    FROM outage_reports r
    WHERE r.incident_id IS NULL
      AND r.status NOT IN ('Rejected', 'Duplicate', 'Resolved')
      AND date(r.date_time_noticed, '+8 hours') >= date(?)
      AND date(r.date_time_noticed, '+8 hours') < date(?)
      ${isResident ? 'AND r.barangay = ?' : ''}
  `).get(currentFrom, todayExclusive, ...(isResident ? [barangay] : [])).count);

  const resolvedDurations = currentIncidents
    .filter((item) => ['Closed', 'Restored', 'Resolved'].includes(item.status))
    .map((item) => durationHours(item.start_time, item.end_time || item.closed_at))
    .filter((value) => value !== null);
  const assignmentRows = db.prepare(`
    SELECT dispatched_at, arrived_at
    FROM repair_assignments
    WHERE arrived_at IS NOT NULL
      AND status != 'Cancelled'
      AND date(dispatched_at, '+8 hours') >= date(?)
      AND date(dispatched_at, '+8 hours') < date(?)
      ${isResident ? 'AND target_barangay = ?' : ''}
  `).all(currentFrom, todayExclusive, ...(isResident ? [barangay] : []));
  const responseDurations = assignmentRows
    .map((item) => durationHours(item.dispatched_at, item.arrived_at))
    .filter((value) => value !== null);

  const currentAreaRows = db.prepare(`
    SELECT i.id, i.barangay AS incident_barangay, ia.barangay AS area_barangay
    FROM outage_incidents i
    LEFT JOIN incident_areas ia ON ia.incident_id = i.id
    WHERE i.start_time IS NOT NULL
      AND i.incident_type = 'Unexpected'
      AND i.status NOT IN ('Reported', 'Under Verification')
      AND date(i.start_time, '+8 hours') >= date(?)
      AND date(i.start_time, '+8 hours') < date(?)
      ${scopeSql}
  `).all(currentFrom, todayExclusive, ...scopeParams);
  const incidentsByBarangay = new Map();
  for (const row of currentAreaRows) {
    const area = String(row.area_barangay || row.incident_barangay || '').trim();
    if (!area || (isResident && area.toLowerCase() !== barangay.toLowerCase())) continue;
    if (!incidentsByBarangay.has(area)) incidentsByBarangay.set(area, new Set());
    incidentsByBarangay.get(area).add(row.id);
  }
  const hotspots = [...incidentsByBarangay.entries()]
    .map(([name, ids]) => ({ barangay: name, incidents: ids.size }))
    .sort((a, b) => b.incidents - a.incidents || a.barangay.localeCompare(b.barangay))
    .slice(0, 5);

  const monthlyKeys = monthKeysBefore(manilaToday, 6);
  const monthlyCounts = Object.fromEntries(monthlyKeys.map((key) => [key, 0]));
  for (const incident of incidentRows) {
    if (incident.incident_type !== 'Unexpected') continue;
    const key = monthKeyAtValencia(incident.start_time);
    if (Object.hasOwn(monthlyCounts, key)) monthlyCounts[key] += 1;
  }
  const monthly = monthlyKeys.map((key) => ({ month: monthLabel(key), count: monthlyCounts[key] }));
  const sampleMonths = monthly.filter((item) => item.count > 0).length;
  const sampleIncidents = monthly.reduce((sum, item) => sum + item.count, 0);
  const projectionAvailable = sampleIncidents >= 12 && sampleMonths >= 3;

  res.json({
    scope: { type: isResident ? 'barangay' : 'city', name: isResident ? (barangay || null) : 'Valencia City' },
    period: { days: 90, current_from: currentFrom, previous_from: previousFrom, through: manilaToday },
    current: {
      unexpected_incidents: currentUnexpected,
      scheduled_incidents: currentIncidents.filter((item) => item.incident_type === 'Scheduled').length,
      active_incidents: activeIncidentCount,
      open_unlinked_reports: openReports,
      median_restoration_hours: median(resolvedDurations),
      restoration_sample_size: resolvedDurations.length,
      median_dispatch_response_hours: median(responseDurations),
      response_sample_size: responseDurations.length,
    },
    previous: { unexpected_incidents: previousUnexpected },
    trend: { direction: trendDirection, change_percent: changePercent },
    hotspots,
    monthly,
    projection: {
      status: projectionAvailable ? 'available' : 'insufficient_data',
      next_month_unexpected_incidents: projectionAvailable
        ? Math.round((sampleIncidents / monthly.length) * 10) / 10
        : null,
      method: 'six-month average of confirmed unexpected incidents',
      sample_months: sampleMonths,
      sample_incidents: sampleIncidents,
      required_incidents: 12,
      required_active_months: 3,
    },
  });
});

// Role-aware dashboard summary
router.get('/dashboard', requireAuth, (req, res) => {
  const reportsTotal = Number(db.prepare('SELECT COUNT(*) AS c FROM outage_reports').get().c);
  const reportsPending = Number(db.prepare("SELECT COUNT(*) AS c FROM outage_reports WHERE status = 'Submitted'").get().c);
  const reportsUnderReview = Number(db.prepare("SELECT COUNT(*) AS c FROM outage_reports WHERE status = 'Under Review'").get().c);
  const reportsVerified = Number(db.prepare("SELECT COUNT(*) AS c FROM outage_reports WHERE status IN ('Verified', 'Officially Confirmed')").get().c);
  const activeIncidents = Number(db.prepare("SELECT COUNT(*) AS c FROM outage_incidents WHERE status NOT IN ('Closed', 'Restored', 'Resolved')").get().c);
  const restored = Number(db.prepare("SELECT COUNT(*) AS c FROM outage_incidents WHERE status = 'Restored'").get().c);
  const ongoing = Number(db.prepare("SELECT COUNT(*) AS c FROM outage_incidents WHERE status IN ('Ongoing', 'Restoration in Progress')").get().c);
  const scheduledCount = Number(db.prepare("SELECT COUNT(*) AS c FROM scheduled_outages WHERE status IN ('Scheduled', 'In Preparation')").get().c);
  const unexpected = Number(db.prepare("SELECT COUNT(*) AS c FROM outage_incidents WHERE incident_type = 'Unexpected' AND status NOT IN ('Closed', 'Restored', 'Resolved')").get().c);
  const resolved = Number(db.prepare("SELECT COUNT(*) AS c FROM outage_incidents WHERE status = 'Closed'").get().c);
  const manilaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const resolvedToday = Number(db.prepare(`
    SELECT COUNT(*) AS c FROM outage_incidents
    WHERE status IN ('Closed', 'Restored')
      AND date(COALESCE(closed_at, end_time, updated_at), '+8 hours') = date(?)
  `).get(manilaDate).c);
  const myReports = Number(db.prepare('SELECT COUNT(*) AS c FROM outage_reports WHERE reporter_id = ?').get(req.user.id).c);

  const avgDur = db.prepare("SELECT start_time, end_time, closed_at FROM outage_incidents WHERE status = 'Closed'").all()
    .map((r) => durationHours(r.start_time, r.end_time || r.closed_at))
    .filter((v) => v !== null);
  const avgDuration = avgDur.length ? Math.round(avgDur.reduce((a, b) => a + b, 0) / avgDur.length * 10) / 10 : null;

  const activeDispatches = Number(db.prepare("SELECT COUNT(*) AS c FROM repair_assignments WHERE status NOT IN ('Resolved', 'Cancelled')").get()?.c || 0);
  const availableCrews = Number(db.prepare("SELECT COUNT(*) AS c FROM repair_teams WHERE status = 'Available'").get()?.c || 0);
  const totalCrews = Number(db.prepare("SELECT COUNT(*) AS c FROM repair_teams").get()?.c || 0);
  const affectedCustomers = Number(db.prepare("SELECT COALESCE(SUM(customers_affected), 0) AS c FROM outage_incidents WHERE status NOT IN ('Closed', 'Restored', 'Resolved')").get()?.c || 0);

  res.json({
    stats: {
      reports_total: reportsTotal,
      reports_pending: reportsPending,
      reports_under_review: reportsUnderReview,
      reports_verified: reportsVerified,
      active_incidents: activeIncidents,
      ongoing,
      restored,
      scheduled: scheduledCount,
      unexpected,
      resolved,
      resolved_today: resolvedToday,
      my_reports: myReports,
      avg_duration_hours: avgDuration,
      active_dispatches: activeDispatches,
      available_crews: availableCrews,
      total_crews: totalCrews,
      affected_customers: affectedCustomers,
    },
  });
});

// Analytics (administrator / personnel / utility)
router.get('/summary', requireAuth, requireRole('administrator', 'personnel', 'utility'), (req, res) => {
  const range = readDateRange(req, res);
  if (!range) return;
  const reportsTotal = countInRange('outage_reports', '1 = 1', 'date_time_noticed', range);
  const verified = countInRange('outage_reports', "verification_status IN ('Verified', 'Officially Confirmed')", 'date_time_noticed', range);
  const pending = countInRange('outage_reports', "status IN ('Submitted', 'Under Review')", 'date_time_noticed', range);
  const rejected = countInRange('outage_reports', "status IN ('Rejected', 'Unverified')", 'date_time_noticed', range);
  const duplicate = countInRange('outage_reports', "status = 'Duplicate'", 'date_time_noticed', range);
  const active = countInRange('outage_incidents', "status NOT IN ('Closed')", 'start_time', range);
  const scheduled = countInRange('outage_incidents', "incident_type = 'Scheduled'", 'start_time', range);
  const unexpected = countInRange('outage_incidents', "incident_type = 'Unexpected'", 'start_time', range);
  const resolved = countInRange('outage_incidents', "status = 'Closed'", 'start_time', range);

  const incidentDate = dateClause('start_time', range);
  const avgDurations = db.prepare(`SELECT start_time, end_time, closed_at FROM outage_incidents WHERE status = 'Closed'${incidentDate.sql}`).all(...incidentDate.params)
    .map((r) => durationHours(r.start_time, r.end_time || r.closed_at))
    .filter((v) => v !== null);
  const avgDuration = avgDurations.length ? Math.round(avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length * 10) / 10 : null;

  res.json({
    summary: {
      reports_total: reportsTotal, verified, pending, rejected, duplicate,
      active, scheduled, unexpected, resolved, avg_duration_hours: avgDuration,
    },
  });
});

router.get('/monthly', requireAuth, requireRole('administrator', 'personnel', 'utility'), (req, res) => {
  const range = readDateRange(req, res);
  if (!range) return;
  const date = dateClause('start_time', range);
  const rows = db.prepare(`SELECT start_time, incident_type FROM outage_incidents WHERE start_time IS NOT NULL${date.sql}`).all(...date.params);
  const byMonth = {};
  for (const r of rows) {
    const key = monthKey(r.start_time);
    if (!key) continue;
    if (!byMonth[key]) byMonth[key] = { scheduled: 0, unexpected: 0 };
    if (r.incident_type === 'Scheduled') byMonth[key].scheduled += 1;
    else byMonth[key].unexpected += 1;
  }
  const data = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, counts]) => ({ month: monthLabel(key), ...counts, count: counts.scheduled + counts.unexpected }));
  res.json({ data });
});

router.get('/barangay', requireAuth, requireRole('administrator', 'personnel', 'utility'), (req, res) => {
  const range = readDateRange(req, res);
  if (!range) return;
  const date = dateClause('date_time_noticed', range);
  const rows = db.prepare(`SELECT barangay, COUNT(*) AS c FROM outage_reports WHERE 1 = 1${date.sql} GROUP BY barangay ORDER BY c DESC`).all(...date.params);
  res.json({ data: rows });
});

router.get('/types', requireAuth, requireRole('administrator', 'personnel', 'utility'), (req, res) => {
  const range = readDateRange(req, res);
  if (!range) return;
  const date = dateClause('date_time_noticed', range);
  const scheduled = countInRange('outage_incidents', "incident_type = 'Scheduled'", 'start_time', range);
  const unexpected = countInRange('outage_incidents', "incident_type = 'Unexpected'", 'start_time', range);
  const categories = db.prepare(`SELECT COALESCE(NULLIF(TRIM(possible_outage_type), ''), 'Unspecified') AS type, COUNT(*) AS count FROM outage_reports WHERE 1 = 1${date.sql} GROUP BY COALESCE(NULLIF(TRIM(possible_outage_type), ''), 'Unspecified') ORDER BY count DESC`).all(...date.params);
  res.json({ data: { scheduled, unexpected, categories } });
});

router.get('/status', requireAuth, requireRole('administrator', 'personnel', 'utility'), (req, res) => {
  const range = readDateRange(req, res);
  if (!range) return;
  const date = dateClause('start_time', range);
  const rows = db.prepare(`SELECT status, COUNT(*) AS c FROM outage_incidents WHERE 1 = 1${date.sql} GROUP BY status ORDER BY c DESC`).all(...date.params);
  res.json({ data: rows });
});

router.get('/duration', requireAuth, requireRole('administrator', 'personnel', 'utility'), (req, res) => {
  const range = readDateRange(req, res);
  if (!range) return;
  const date = dateClause('start_time', range);
  const rows = db.prepare(`SELECT start_time, end_time, closed_at FROM outage_incidents WHERE status = 'Closed' AND start_time IS NOT NULL${date.sql}`).all(...date.params);
  const byMonth = {};
  for (const r of rows) {
    const key = monthKey(r.start_time);
    if (!key) continue;
    const h = durationHours(r.start_time, r.end_time || r.closed_at);
    if (h === null) continue;
    if (!byMonth[key]) byMonth[key] = { total: 0, count: 0 };
    byMonth[key].total += h;
    byMonth[key].count += 1;
  }
  const data = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, v]) => ({ month: monthLabel(key), avg_hours: Math.round(v.total / v.count * 10) / 10 }));
  res.json({ data });
});

module.exports = router;