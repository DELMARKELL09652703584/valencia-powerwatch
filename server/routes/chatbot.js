const express = require('express');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../auth');

const router = express.Router();
const MAX_QUESTION_LENGTH = 500;
const MAX_ACTIVE_ITEMS = 5;
const MAX_ANNOUNCEMENTS = 3;

const FAQS = [
  {
    id: 'tracking',
    matches: /\b(track|tracking|my report|submitted report|where.*report|report code|akong report|status sa akong report|asa.*report)\b/i,
    answer: 'Open Reports in the bottom navigation to see your submissions. Tap a report to view its current status and available history. Only your own reports are shown in that area.',
    bisayaAnswer: 'Ablihi ang Reports sa ubos aron makita ang imong mga gisumite. Pilia ang report aron makita ang pinakabag-ong status ug history niini. Imong kaugalingong reports ra ang ma-access dinhi.',
    action: { label: 'View my reports', tab: 'reports' },
  },
  {
    id: 'report',
    matches: /\b(report|submit|file|brownout|power outage|interruption|brown out|reporting)\b/i,
    answer: 'To report an interruption, sign in and tap Report in the bottom navigation. Complete the outage details, choose your barangay and a specific purok or landmark, set your location with GPS or a map pin, then review and submit. You need an internet connection to send the report.',
    bisayaAnswer: 'Aron mo-report og brownout, ablihi ang Report sa ubos. Isulat ang detalye, pilia ang barangay ug purok o landmark, kumpirmaha ang lokasyon gamit ang GPS o map pin, dayon susiha ug i-submit. Kinahanglan og internet aron maipadala ang report.',
    action: { label: 'Open report form', tab: 'report' },
  },
  {
    id: 'status',
    matches: /\b(status|pending|verified|ongoing|resolved|rejected|under review|restored)\b/i,
    answer: 'Pending means the report has been received and may still be under review. Verified means staff confirmed the report. Ongoing means an associated outage incident or restoration response is in progress. Resolved means the interruption has been marked restored or resolved. Rejected means staff could not accept the report; check the report details or staff remarks for more information. A report status and its linked incident status can differ.',
    bisayaAnswer: 'Ang Pending nagpasabot nga nadawat na ang report ug naghulat o nagpaagi pa sa review. Ang Verified gikumpirma na sa staff. Ang Ongoing nagpasabot nga adunay response o restoration nga nagpadayon. Ang Resolved gi-mark na nga naayo o nauli ang kuryente. Ang Rejected wala dawata; tan-awa ang detalye ug staff remarks. Mahimong lahi ang status sa report ug sa linked incident.',
    action: { label: 'View my reports', tab: 'reports' },
  },
  {
    id: 'evidence',
    matches: /\b(photo|video|picture|evidence|upload|attachment|attach)\b/i,
    answer: 'When you submit a report, use the photo/video evidence control on the report form to attach supporting media. The portal accepts JPG, PNG, WebP, MP4, and MOV files, up to five attachments and 50 MB per file. Submit while online; your selected files are not sent until you submit the form.',
    bisayaAnswer: 'Sa Report form, gamita ang photo/video evidence aron mudugang og hulagway o video. Dawaton ang JPG, PNG, WebP, MP4 ug MOV; kutob sa lima ka file ug 50 MB matag usa. I-submit samtang online kay dili ipadala ang mga file hangtod i-submit nimo ang form.',
    action: { label: 'Open report form', tab: 'report' },
  },
  {
    id: 'map',
    matches: /\b(map|maps|location|gps|pin|barangay map)\b/i,
    answer: 'Open Map in the bottom navigation to view the available outage locations. On the report form, use GPS or place a map pin to confirm where the interruption was noticed. Map tiles may require an internet connection.',
    bisayaAnswer: 'Ablihi ang Map sa ubos aron makita ang mga outage location nga anaa sa sistema. Sa Report form, gamita ang GPS o ibutang ang map pin sa lugar nga imong namatikdan. Basin kinahanglan og internet aron mo-load ang mapa.',
    action: { label: 'Open outage map', tab: 'map' },
  },
  {
    id: 'scheduled',
    matches: /\b(schedule|scheduled|planned|maintenance|upcoming|next outage)\b/i,
    answer: 'Open Scheduled Outages to see published schedule records. The live schedule list is also shown below when the system has records.',
    bisayaAnswer: 'Ablihi ang Scheduled Outages aron makita ang mga gipatik nga iskedyul. Ipakita lang sa listahan ang mga schedule nga naa gyud sa sistema.',
    action: { label: 'View scheduled outages', tab: 'scheduled' },
  },
  {
    id: 'announcements',
    matches: /\b(announcement|announcements|advisory|advisories|notice)\b/i,
    answer: 'Open Announcements to read published public-service updates and advisories.',
    bisayaAnswer: 'Ablihi ang Announcements aron mabasa ang mga gipatik nga pahibalo ug advisory.',
    action: { label: 'View announcements', tab: 'announcements' },
  },
  {
    id: 'notifications',
    matches: /\b(notification|notifications|alert|alerts|bell)\b/i,
    answer: 'Your latest alerts are available from the notification bell and the Notifications section. You can also manage notification preferences from your profile/settings.',
    bisayaAnswer: 'I-tap ang notification bell o ablihi ang Notifications aron makita ang imong mga alert. Mahimo usab nimo usbon ang notification preferences sa Profile o Settings.',
    action: { label: 'View notifications', tab: 'notifications' },
  },
  {
    id: 'history',
    matches: /\b(outage history|past outages|previous outages|history)\b/i,
    answer: 'Open Reports, then choose Outage History to review completed interruptions recorded in the system.',
    bisayaAnswer: 'Ablihi ang Reports ug pilia ang Outage History aron makita ang mga nahuman nang outage nga nakarekord sa sistema.',
    action: { label: 'View outage history', tab: 'history' },
  },
  {
    id: 'feedback',
    matches: /\b(feedback|rate the app|rating|review the app)\b/i,
    answer: 'Open Profile and scroll to Rate the app. Choose a star rating, optionally add a comment, then tap Send feedback.',
    bisayaAnswer: 'Ablihi ang Profile ug pangitaa ang Rate the app. Pilia ang star rating, butangi og komento kon gusto, dayon i-tap ang Send feedback.',
    action: { label: 'Open profile', tab: 'profile' },
  },
  {
    id: 'profile',
    matches: /\b(profile|account|password|settings|contact details)\b/i,
    answer: 'Open Profile in the bottom navigation to review your account details and available settings. Use the account security controls there if you need to update security information.',
    bisayaAnswer: 'Ablihi ang Profile sa ubos aron susihon ang detalye sa imong account ug mga setting. Didto usab makita ang mga opsyon sa seguridad sa account.',
    action: { label: 'Open profile', tab: 'profile' },
  },
  {
    id: 'help',
    matches: /\b(help|how do i|how to|use the portal|features|what can you do)\b/i,
    answer: 'I can guide you through reporting and tracking outages, report statuses, photo/video evidence, the map, scheduled outages, announcements, notifications, outage history, feedback, and your profile. Ask about one of those topics.',
    bisayaAnswer: 'Makatabang ko sa pag-report ug pag-track sa outage, pagpasabot sa report status, pagdugang og photo/video evidence, ug paggamit sa mapa, schedule, announcements, notifications, outage history, feedback ug profile. Pangutana lang bahin sa usa niini.',
    action: null,
  },
];

const BISAYA_ACTION_LABELS = {
  reports: 'Ablihi ang akong reports',
  report: 'Ablihi ang report form',
  outages: 'Tan-awa ang outage list',
  map: 'Ablihi ang outage map',
  scheduled: 'Tan-awa ang outage schedule',
  announcements: 'Ablihi ang announcements',
  notifications: 'Tan-awa ang notifications',
  history: 'Tan-awa ang outage history',
  profile: 'Ablihi ang profile',
};

const localizeAction = (action, isBisaya) => action && isBisaya
  ? { ...action, label: BISAYA_ACTION_LABELS[action.tab] || action.label }
  : action;

const containsBisaya = (text) => /\b(unsa|unsaon|asa|akong|nako|gani|dili|ngano|pwede|palihog|tabang|gusto|kani|adto|diri|naa|naay|way|wala|walay|brownout|karon|sunod|kuryente|gi-submit|gi report|status sa)\b/i.test(text);
const formatWhen = (date, time) => `${date}${time ? `, ${String(time).slice(0, 5)}` : ''}`;

const getLiveOutages = () => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const incidents = db.prepare(`
    SELECT incident_code, title, barangay, status, start_time, estimated_restoration, priority
    FROM outage_incidents
    WHERE status IN ('Ongoing', 'Restoration in Progress')
    ORDER BY CASE priority WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 ELSE 2 END, start_time DESC
    LIMIT ?
  `).all(MAX_ACTIVE_ITEMS);
  const schedules = db.prepare(`
    SELECT schedule_code, title, barangay, outage_date, start_time, expected_end_time, status
    FROM scheduled_outages
    WHERE status IN ('Scheduled', 'In Preparation', 'Being Implemented')
      AND outage_date >= ?
    ORDER BY outage_date, start_time
    LIMIT ?
  `).all(today, MAX_ACTIVE_ITEMS);
  return { incidents, schedules };
};

const getPublishedAnnouncements = () => db.prepare(`
  SELECT title, category, published_at, created_at
  FROM announcements
  WHERE status = 'Published'
  ORDER BY COALESCE(published_at, created_at) DESC
  LIMIT ?
`).all(MAX_ANNOUNCEMENTS);

const answerLiveQuestion = (question, isBisaya) => {
  const { incidents, schedules } = getLiveOutages();
  const asksCurrent = /\b(current|currently|now|ongoing|active|today|karon|naa bay|naay|brownout|outage|interruption)\b/i.test(question);
  const asksSchedule = /\b(schedule|scheduled|planned|maintenance|upcoming|sunod)\b/i.test(question);
  const answers = [];

  if (asksCurrent) {
    if (incidents.length) {
      const lines = incidents.map((item) => `• ${item.title} — ${item.barangay} (${item.status})${item.estimated_restoration ? `; estimated restoration ${item.estimated_restoration}` : ''}`);
      answers.push(`${isBisaya ? 'Mga outage nga naa sa sistema karon' : 'Current outages recorded in the system'}:\n${lines.join('\n')}`);
    } else {
      answers.push(isBisaya
        ? 'Walay active nga outage incident nga nakarekord sa sistema karon. Dili ni garantiya nga walay interruption—tan-awa ang announcements o i-report kon naapektuhan mo.'
        : 'The system currently has no active outage incidents recorded. This does not guarantee that there is no interruption; check announcements or submit a report if you are affected.');
    }
  }

  if (asksSchedule) {
    if (schedules.length) {
      const lines = schedules.map((item) => `• ${item.title} — ${item.barangay}, ${formatWhen(item.outage_date, item.start_time)}${item.expected_end_time ? ` to ${String(item.expected_end_time).slice(0, 5)}` : ''} (${item.status})`);
      answers.push(`${isBisaya ? 'Mga iskedyul nga naa sa sistema' : 'Scheduled outages recorded in the system'}:\n${lines.join('\n')}`);
    } else {
      answers.push(isBisaya
        ? 'Walay umaabot nga scheduled outage nga nakarekord sa sistema karon.'
        : 'There are no upcoming scheduled outages recorded in the system right now.');
    }
  }

  if (answers.length) {
    return {
      answer: answers.join('\n\n'),
      source: 'live-system-data',
      action: { label: isBisaya ? 'Tan-awa ang outage list' : 'View outage list', tab: asksSchedule && !asksCurrent ? 'scheduled' : 'outages' },
    };
  }
  return null;
};

const getOwnReportStatus = (question, userId, isBisaya) => {
  const code = question.match(/\bVPR-[A-Z0-9-]+\b/i)?.[0];
  if (!code && !/\b(my|mine|my report|report code|akong report|ako nga report|status sa akong report|asa (?:na )?(?:ang )?(?:status|report)|unsa (?:na )?(?:ang )?(?:status|report))\b/i.test(question)) return null;
  const report = code
    ? db.prepare(`
      SELECT r.report_code, r.status, r.verification_status, r.barangay, r.purok,
             r.date_time_noticed, i.incident_code, i.status AS incident_status
      FROM outage_reports r
      LEFT JOIN outage_incidents i ON i.id = r.incident_id
      WHERE r.reporter_id = ? AND r.report_code = ? COLLATE NOCASE
    `).get(userId, code)
    : db.prepare(`
      SELECT r.report_code, r.status, r.verification_status, r.barangay, r.purok,
             r.date_time_noticed, i.incident_code, i.status AS incident_status
      FROM outage_reports r
      LEFT JOIN outage_incidents i ON i.id = r.incident_id
      WHERE r.reporter_id = ?
      ORDER BY r.reported_at DESC LIMIT 1
    `).get(userId);
  if (!report) {
    return {
      answer: code
        ? (isBisaya ? `Wala koy nakitang report nga ${code} sa imong account. Siguroa nga sakto ang code ug naka-login ka sa account nga naghimo niini.` : `I could not find report ${code} on your account. Check the code and make sure you are signed in to the account that submitted it.`)
        : (isBisaya ? 'Wala koy nakitang imong report sa sistema karon. Kung bag-o pa nimo kini gi-submit, sulayi pag-usab human makakonekta sa internet.' : 'I could not find a report on your account right now. If you just submitted one, reconnect to the internet and try again.'),
      source: 'your-report-records',
      action: { label: isBisaya ? 'Ablihi ang akong reports' : 'Open my reports', tab: 'reports' },
    };
  }
  const explanation = {
    Submitted: isBisaya ? 'nadawat na ug naghulat pa og review' : 'has been received and is awaiting review',
    'Under Review': isBisaya ? 'gi-review pa sa staff' : 'is being reviewed by staff',
    Verified: isBisaya ? 'na-verify na sa staff' : 'has been verified by staff',
    'Officially Confirmed': isBisaya ? 'opisyal nang gikumpirma' : 'has been officially confirmed',
    Assigned: isBisaya ? 'na-assignan na og response team' : 'has been assigned to a response team',
    Acknowledged: isBisaya ? 'gi-acknowledge na sa response team' : 'has been acknowledged by the response team',
    'In Progress': isBisaya ? 'naa nay response o restoration nga nagpadayon' : 'has a response or restoration in progress',
    Resolved: isBisaya ? 'gi-mark nang naayo o nauli na ang kuryente' : 'has been marked resolved or restored',
    Rejected: isBisaya ? 'gi-reject; tan-awa ang detalye ug staff remarks sa report' : 'was rejected; check its details and staff remarks',
    Duplicate: isBisaya ? 'gi-mark nga parehas sa laing report' : 'was marked as a duplicate of another report',
    Unverified: isBisaya ? 'wala makumpirma sa verification' : 'could not be verified',
    Closed: isBisaya ? 'gisirad-an na human sa Admin review' : 'has been closed after Admin review',
  }[report.status] || (isBisaya ? 'adunay status nga makita sa report details' : 'has a status shown in the report details');
  const location = [report.barangay, report.purok].filter(Boolean).join(', ');
  const noticedAt = report.date_time_noticed && Number.isFinite(Date.parse(report.date_time_noticed))
    ? new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    }).format(new Date(report.date_time_noticed))
    : null;
  const incident = report.incident_code
    ? (isBisaya
      ? ` Linked incident ${report.incident_code}: ${report.incident_status}.`
      : ` Linked incident ${report.incident_code}: ${report.incident_status}.`)
    : '';
  const details = [
    location && (isBisaya ? `Lugar: ${location}.` : `Location: ${location}.`),
    noticedAt && (isBisaya ? `Oras nga namatikdan: ${noticedAt}.` : `Reported time: ${noticedAt}.`),
  ].filter(Boolean).join(' ');
  return {
    answer: isBisaya
      ? `Ang imong report ${report.report_code} (${report.status}) ${explanation}.${details ? ` ${details}` : ''}${incident}`
      : `Your report ${report.report_code} is ${report.status}: it ${explanation}.${details ? ` ${details}` : ''}${incident}`,
    source: 'your-report-records',
    action: localizeAction({ label: 'View my reports', tab: 'reports' }, isBisaya),
  };
};

router.post('/', requireAuth, requireRole('resident'), (req, res) => {
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question) return res.status(400).json({ error: 'Enter a question.' });
  if (question.length > MAX_QUESTION_LENGTH) {
    return res.status(400).json({ error: `Questions must be ${MAX_QUESTION_LENGTH} characters or fewer.` });
  }

  const isBisaya = containsBisaya(question);
  const reportAnswer = getOwnReportStatus(question, req.user.id, isBisaya);
  if (reportAnswer) return res.json(reportAnswer);

  const faq = FAQS.find((item) => item.matches.test(question));
  const isRequestingGuidance = /^(how|where|can i|what do i|help me|show me|i need help|unsaon|unsa|asa|pwede|tabang)\b/i.test(question);
  if (faq && isRequestingGuidance) {
    return res.json({
      answer: isBisaya ? faq.bisayaAnswer : faq.answer,
      source: 'PowerWatch help guide',
      action: localizeAction(faq.action, isBisaya),
    });
  }

  const liveAnswer = answerLiveQuestion(question, isBisaya);
  if (liveAnswer) return res.json(liveAnswer);

  if (/\b(announcement|announcements|advisory|advisories|notice|update)\b/i.test(question)) {
    const announcements = getPublishedAnnouncements();
    const answer = announcements.length
      ? `${isBisaya ? 'Mga published announcement sa sistema' : 'Published announcements in the system'}:\n${announcements.map((item) => `• ${item.title} (${item.category})`).join('\n')}`
      : (isBisaya ? 'Walay published announcement nga nakarekord sa sistema karon.' : 'There are no published announcements recorded in the system right now.');
    return res.json({
      answer,
      source: 'live-system-data',
      action: { label: isBisaya ? 'Ablihi ang announcements' : 'Open announcements', tab: 'announcements' },
    });
  }

  if (faq) {
    return res.json({
      answer: isBisaya ? faq.bisayaAnswer : faq.answer,
      source: 'PowerWatch help guide',
      action: localizeAction(faq.action, isBisaya),
    });
  }

  return res.json({
    answer: isBisaya
      ? 'Pasayloa, wala koy kasaligan nga tubag ana. Makagiya ko sa pag-report, pag-track, statuses, photo/video evidence, outage map, schedules, announcements, notifications, ug profile.'
      : 'I do not have reliable information to answer that. I can help with reporting, tracking, statuses, photo/video evidence, the outage map, schedules, announcements, notifications, and your profile.',
    source: 'PowerWatch help guide',
    action: null,
  });
});

module.exports = router;
