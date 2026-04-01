const cron = require('node-cron');
const db = require('./db');
const { executeScan } = require('./lib/scanRunner');

const stmts = {
  schedules: db.prepare(`
    SELECT s.*, p.nickname, p.id as profile_id
    FROM schedules s
    JOIN profiles p ON p.id = s.profile_id
    WHERE s.enabled = 1 AND s.hour = ? AND s.minute = ?
  `),
  keywords:   db.prepare('SELECT * FROM keywords WHERE profile_id = ? AND active = 1'),
  insertScan: db.prepare('INSERT INTO scans (profile_id, scan_type, status, total_keywords) VALUES (?, ?, ?, ?)'),
  failScan:   db.prepare("UPDATE scans SET status = ?, completed_at = datetime('now') WHERE id = ?"),
};

cron.schedule('* * * * *', () => {
  const now = new Date();
  const schedules = stmts.schedules.all(now.getHours(), now.getMinutes());
  for (const schedule of schedules) {
    runAutoScan(schedule.profile_id, schedule.nickname).catch(err =>
      console.error(`[scheduler] 자동 스캔 실패 (profile ${schedule.profile_id}):`, err.message),
    );
  }
});

async function runAutoScan(profileId, nickname) {
  const keywords = stmts.keywords.all(profileId);
  if (keywords.length === 0) return;

  const scanId = stmts.insertScan.run(profileId, 'auto', 'running', keywords.length).lastInsertRowid;
  console.log(`[scheduler] 자동 스캔 시작 (profile ${profileId}, ${keywords.length}개 키워드)`);

  try {
    await executeScan(scanId, { nickname }, keywords);
    console.log(`[scheduler] 자동 스캔 완료 (scanId ${scanId})`);
  } catch (err) {
    stmts.failScan.run('failed', scanId);
    throw err;
  }
}

module.exports = { runAutoScan };
