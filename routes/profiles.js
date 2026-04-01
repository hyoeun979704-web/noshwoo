const express = require('express');
const db = require('../db');
const { requireAuth } = require('./auth');
const { getProfile, planProfileLimit, sinceDate } = require('../lib/helpers');

const router = express.Router();

const stmts = {
  list: db.prepare(`
    SELECT p.*, COUNT(k.id) as keyword_count,
      (SELECT started_at FROM scans WHERE profile_id = p.id ORDER BY started_at DESC LIMIT 1) as last_scan
    FROM profiles p
    LEFT JOIN keywords k ON k.profile_id = p.id AND k.active = 1
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at ASC
  `),
  countProfiles:  db.prepare('SELECT COUNT(*) as n FROM profiles WHERE user_id = ?'),
  insert:         db.prepare('INSERT INTO profiles (user_id, nickname, display_name, color) VALUES (?, ?, ?, ?)'),
  initSchedule:   db.prepare('INSERT OR IGNORE INTO schedules (profile_id) VALUES (?)'),
  update:         db.prepare('UPDATE profiles SET nickname = ?, display_name = ?, color = ? WHERE id = ?'),
  delete:         db.prepare('DELETE FROM profiles WHERE id = ?'),
  latestScan:     db.prepare(`SELECT id, completed_at FROM scans WHERE profile_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1`),
  scanStats:      db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN my_rank = 1 THEN 1 ELSE 0 END) as rank1,
      SUM(CASE WHEN my_rank = 2 THEN 1 ELSE 0 END) as rank2,
      SUM(CASE WHEN my_rank = 3 THEN 1 ELSE 0 END) as rank3,
      SUM(CASE WHEN my_rank IS NULL OR my_rank > 3 THEN 1 ELSE 0 END) as unranked
    FROM scan_results WHERE scan_id = ?
  `),
  latestResults:  db.prepare(`
    SELECT keyword_text, my_rank, my_likes, rank1_likes, rank1_needed, rank2_needed, rank3_needed
    FROM scan_results WHERE scan_id = ? ORDER BY my_rank ASC LIMIT 10
  `),
  trendScans:     db.prepare(`
    SELECT s.id, s.completed_at,
      SUM(CASE WHEN r.my_rank = 1 THEN 1 ELSE 0 END) as rank1,
      SUM(CASE WHEN r.my_rank = 2 THEN 1 ELSE 0 END) as rank2,
      SUM(CASE WHEN r.my_rank = 3 THEN 1 ELSE 0 END) as rank3
    FROM scans s
    JOIN scan_results r ON r.scan_id = s.id
    WHERE s.profile_id = ? AND s.status = 'completed' AND s.completed_at >= ?
    GROUP BY s.id
    ORDER BY s.completed_at ASC
    LIMIT 30
  `),
  kwCount:        db.prepare('SELECT COUNT(*) as n FROM keywords WHERE profile_id = ? AND active = 1'),
  getSchedule:    db.prepare('SELECT * FROM schedules WHERE profile_id = ?'),
  upsertSchedule: db.prepare(`
    INSERT INTO schedules (profile_id, hour, minute, enabled, notify_email, notify_kakao)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id) DO UPDATE SET
      hour = excluded.hour, minute = excluded.minute, enabled = excluded.enabled,
      notify_email = excluded.notify_email, notify_kakao = excluded.notify_kakao
  `),
  getUser: db.prepare('SELECT plan FROM users WHERE id = ?'),
};

router.get('/', requireAuth, (req, res) => {
  res.json(stmts.list.all(req.userId));
});

router.post('/', requireAuth, (req, res) => {
  const { nickname, display_name, color } = req.body;
  if (!nickname || !display_name) return res.status(400).json({ error: '닉네임과 프로필 이름을 입력해주세요.' });

  const user = stmts.getUser.get(req.userId);
  const count = stmts.countProfiles.get(req.userId).n;
  const limit = planProfileLimit(user.plan);
  if (count >= limit) return res.status(403).json({ error: `현재 플랜(${user.plan})에서는 최대 ${limit}개의 프로필만 생성할 수 있습니다.` });

  const result = stmts.insert.run(req.userId, nickname, display_name, color || '#2563eb');
  stmts.initSchedule.run(result.lastInsertRowid);
  res.json({ id: result.lastInsertRowid, nickname, display_name, color });
});

router.put('/:id', requireAuth, (req, res) => {
  const profile = getProfile(req.params.id, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const { nickname, display_name, color } = req.body;
  stmts.update.run(
    nickname || profile.nickname,
    display_name || profile.display_name,
    color || profile.color,
    profile.id,
  );
  res.json({ success: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  const profile = getProfile(req.params.id, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });
  stmts.delete.run(profile.id);
  res.json({ success: true });
});

router.get('/:id/dashboard', requireAuth, (req, res) => {
  const profile = getProfile(req.params.id, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const user = stmts.getUser.get(req.userId);
  const latestScan = stmts.latestScan.get(profile.id);

  let stats = { rank1: 0, rank2: 0, rank3: 0, unranked: 0, total: 0 };
  let latestResults = [];
  let trendData = [];

  if (latestScan) {
    stats = stmts.scanStats.get(latestScan.id);
    latestResults = stmts.latestResults.all(latestScan.id);
    trendData = stmts.trendScans.all(profile.id, sinceDate(user.plan));
  }

  res.json({
    stats,
    latestResults,
    trendData,
    keywordCount: stmts.kwCount.get(profile.id).n,
    lastScanTime: latestScan?.completed_at || null,
    profile,
  });
});

router.get('/:id/schedule', requireAuth, (req, res) => {
  const profile = getProfile(req.params.id, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });
  res.json(stmts.getSchedule.get(profile.id) || { profile_id: profile.id, hour: 9, minute: 0, enabled: 0, notify_email: 1, notify_kakao: 0 });
});

router.put('/:id/schedule', requireAuth, (req, res) => {
  const profile = getProfile(req.params.id, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const { hour, minute, enabled, notify_email, notify_kakao } = req.body;
  stmts.upsertSchedule.run(profile.id, hour ?? 9, minute ?? 0, enabled ? 1 : 0, notify_email ? 1 : 0, notify_kakao ? 1 : 0);
  res.json({ success: true });
});

module.exports = router;
