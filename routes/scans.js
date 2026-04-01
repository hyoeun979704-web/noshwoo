const express = require('express');
const db = require('../db');
const { requireAuth } = require('./auth');
const { getProfile, sinceDate } = require('../lib/helpers');
const { executeScan } = require('../lib/scanRunner');

const router = express.Router({ mergeParams: true });

const runningScans = new Map();

const stmts = {
  list: db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM scan_results WHERE scan_id = s.id AND my_rank = 1) as rank1_count,
      (SELECT COUNT(*) FROM scan_results WHERE scan_id = s.id AND my_rank = 2) as rank2_count,
      (SELECT COUNT(*) FROM scan_results WHERE scan_id = s.id AND my_rank = 3) as rank3_count
    FROM scans s
    WHERE s.profile_id = ? AND s.started_at >= ?
    ORDER BY s.started_at DESC
    LIMIT 50
  `),
  get:           db.prepare('SELECT * FROM scans WHERE id = ? AND profile_id = ?'),
  getById:       db.prepare('SELECT * FROM scans WHERE id = ?'),
  results:       db.prepare('SELECT * FROM scan_results WHERE scan_id = ? ORDER BY my_rank ASC NULLS LAST, keyword_text ASC'),
  allKeywords:   db.prepare('SELECT * FROM keywords WHERE profile_id = ? AND active = 1'),
  insertScan:    db.prepare('INSERT INTO scans (profile_id, scan_type, status, total_keywords) VALUES (?, ?, ?, ?)'),
  failScan:      db.prepare("UPDATE scans SET status = ?, completed_at = datetime('now') WHERE id = ?"),
  getUser:       db.prepare('SELECT plan FROM users WHERE id = ?'),
  compareR:      db.prepare('SELECT keyword_text, my_rank, my_likes, rank1_likes, rank2_likes, rank3_likes, rank1_needed, rank2_needed, rank3_needed FROM scan_results WHERE scan_id = ?'),
};

router.get('/', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const user = stmts.getUser.get(req.userId);
  res.json(stmts.list.all(profile.id, sinceDate(user.plan)));
});

router.get('/:scanId', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const scan = stmts.get.get(req.params.scanId, profile.id);
  if (!scan) return res.status(404).json({ error: '스캔을 찾을 수 없습니다.' });

  res.json({ scan, results: stmts.results.all(scan.id) });
});

router.get('/:scanId/progress', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const scanId = parseInt(req.params.scanId);
  const sendEvent = data => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let lastLogIndex = 0;

  const interval = setInterval(() => {
    const scan = stmts.getById.get(scanId);
    if (!scan) { clearInterval(interval); res.end(); return; }

    const progress = runningScans.get(scanId) || {};
    const allLog = progress.log || [];
    const logDelta = allLog.slice(lastLogIndex);
    lastLogIndex = allLog.length;

    sendEvent({
      status: scan.status,
      total: scan.total_keywords,
      completed: scan.completed_keywords,
      pct: scan.total_keywords > 0 ? Math.round(scan.completed_keywords / scan.total_keywords * 100) : 0,
      currentKeyword: progress.currentKeyword || '',
      logDelta,
    });

    if (scan.status === 'completed' || scan.status === 'failed') {
      clearInterval(interval);
      setTimeout(() => res.end(), 1000);
    }
  }, 1000);

  req.on('close', () => clearInterval(interval));
});

router.post('/', requireAuth, async (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const { keywordIds, scanType = 'manual', useMock = false } = req.body;

  let keywords;
  if (keywordIds?.length > 0) {
    const placeholders = keywordIds.map(() => '?').join(',');
    keywords = db.prepare(`SELECT * FROM keywords WHERE profile_id = ? AND id IN (${placeholders}) AND active = 1`)
      .all(profile.id, ...keywordIds);
  } else {
    keywords = stmts.allKeywords.all(profile.id);
  }

  if (keywords.length === 0) return res.status(400).json({ error: '스캔할 키워드가 없습니다. 먼저 키워드를 추가해주세요.' });

  const scanId = stmts.insertScan.run(profile.id, scanType, 'running', keywords.length).lastInsertRowid;

  res.json({ scanId, totalKeywords: keywords.length, message: '스캔이 시작되었습니다.' });

  const log = [];
  runningScans.set(scanId, { currentKeyword: '', log });

  executeScan(scanId, profile, keywords, {
    useMock,
    onProgress({ type, keyword, result }) {
      const state = runningScans.get(scanId);
      if (!state) return;
      if (type === 'start') {
        state.currentKeyword = keyword;
      } else {
        const label = result?.myRank ? `${result.myRank}위 (따봉 ${result.myLikes})` : '순위권 외';
        log.push({ type: result?.myRank ? 'ok' : 'info', text: `✓ ${keyword} — ${label}` });
      }
    },
  })
    .catch(err => {
      console.error('[scan] 스캔 오류:', err);
      stmts.failScan.run('failed', scanId);
    })
    .finally(() => runningScans.delete(scanId));
});

router.get('/compare/:scanId1/:scanId2', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const scan1 = stmts.get.get(req.params.scanId1, profile.id);
  const scan2 = stmts.get.get(req.params.scanId2, profile.id);
  if (!scan1 || !scan2) return res.status(404).json({ error: '스캔을 찾을 수 없습니다.' });

  const r1 = stmts.compareR.all(scan1.id);
  const r2 = stmts.compareR.all(scan2.id);

  const map2 = new Map(r2.map(r => [r.keyword_text, r]));
  const diff = r1.map(a => {
    const b = map2.get(a.keyword_text);
    const rankChange = b?.my_rank != null && a.my_rank != null ? b.my_rank - a.my_rank : null;
    return { ...a, prev_rank: b?.my_rank, rank_change: rankChange };
  });

  res.json({
    diff,
    summary: {
      up:   diff.filter(d => d.rank_change > 0).length,
      down: diff.filter(d => d.rank_change < 0).length,
      same: diff.filter(d => d.rank_change === 0).length,
    },
  });
});

module.exports = { router, runningScans };
