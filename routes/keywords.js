const express = require('express');
const db = require('../db');
const { requireAuth } = require('./auth');
const { getProfile, planKwLimit } = require('../lib/helpers');

const router = express.Router({ mergeParams: true });

const MAX_GEO_SUFFIXES = 5;

const stmts = {
  list:        db.prepare('SELECT * FROM keywords WHERE profile_id = ? ORDER BY created_at ASC'),
  countActive: db.prepare('SELECT COUNT(*) as n FROM keywords WHERE profile_id = ? AND active = 1'),
  insert:      db.prepare('INSERT INTO keywords (profile_id, keyword) VALUES (?, ?)'),
  insertIgnore: db.prepare('INSERT OR IGNORE INTO keywords (profile_id, keyword) VALUES (?, ?)'),
  update:      db.prepare('UPDATE keywords SET active = ?, keyword = ? WHERE id = ?'),
  delete:      db.prepare('DELETE FROM keywords WHERE id = ?'),
  findKw:      db.prepare('SELECT * FROM keywords WHERE id = ? AND profile_id = ?'),
  getUser:     db.prepare('SELECT plan FROM users WHERE id = ?'),
};

router.get('/', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });
  res.json(stmts.list.all(profile.id));
});

router.post('/', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const { keyword } = req.body;
  if (!keyword?.trim()) return res.status(400).json({ error: '키워드를 입력해주세요.' });

  const user = stmts.getUser.get(req.userId);
  const count = stmts.countActive.get(profile.id).n;
  const limit = planKwLimit(user.plan);
  if (count >= limit) return res.status(403).json({ error: `현재 플랜에서 키워드는 최대 ${limit}개까지 추가할 수 있습니다.` });

  try {
    const result = stmts.insert.run(profile.id, keyword.trim());
    res.json({ id: result.lastInsertRowid, keyword: keyword.trim(), active: 1 });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: '이미 추가된 키워드입니다.' });
    throw e;
  }
});

router.post('/bulk', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const { keywords } = req.body;
  if (!Array.isArray(keywords) || keywords.length === 0) return res.status(400).json({ error: '키워드 목록을 입력해주세요.' });

  const user = stmts.getUser.get(req.userId);
  const current = stmts.countActive.get(profile.id).n;
  const limit = planKwLimit(user.plan);
  const canAdd = limit - current;
  if (canAdd <= 0) return res.status(403).json({ error: `키워드 한도(${limit}개)에 도달했습니다.` });

  const toAdd = keywords.slice(0, canAdd).filter(k => k?.trim());
  db.transaction(kws => kws.forEach(kw => stmts.insertIgnore.run(profile.id, kw.trim())))(toAdd);

  res.json({ added: toAdd.length, skipped: keywords.length - toAdd.length });
});

router.put('/:kwId', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const kw = stmts.findKw.get(req.params.kwId, profile.id);
  if (!kw) return res.status(404).json({ error: '키워드를 찾을 수 없습니다.' });

  const { active, keyword } = req.body;
  stmts.update.run(active !== undefined ? (active ? 1 : 0) : kw.active, keyword || kw.keyword, kw.id);
  res.json({ success: true });
});

router.delete('/:kwId', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const kw = stmts.findKw.get(req.params.kwId, profile.id);
  if (!kw) return res.status(404).json({ error: '키워드를 찾을 수 없습니다.' });

  stmts.delete.run(kw.id);
  res.json({ success: true });
});

router.post('/suggest', requireAuth, (req, res) => {
  const profile = getProfile(req.params.profileId, req.userId);
  if (!profile) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });

  const { mainKeywords, count = 50 } = req.body;
  if (!mainKeywords?.length) return res.status(400).json({ error: '메인 키워드를 입력해주세요.' });

  res.json({ keywords: generateKeywordSuggestions(mainKeywords, Math.min(count, 100)) });
});

function generateKeywordSuggestions(mainKeywords, count) {
  const suffixes = ['추천', '가격', '비용', '후기', '위치', '비교', '순위', '방법', '정보', '리뷰',
    '근처', '종류', '효과', '장단점', '선택 방법', '이용 방법', '할인', '혜택', '문의', '예약'];
  const prefixes = ['서울', '강남', '홍대', '신촌', '이태원', '압구정', '여의도', '건대', '왕십리', '마포',
    '부산', '대구', '인천', '광주', '대전'];

  const results = new Set();
  for (const main of mainKeywords) {
    if (!main?.trim()) continue;
    const m = main.trim();
    results.add(m);
    for (const s of suffixes) results.add(`${m} ${s}`);
    for (const p of prefixes) {
      results.add(`${p} ${m}`);
      for (const s of suffixes.slice(0, MAX_GEO_SUFFIXES)) results.add(`${p} ${m} ${s}`);
    }
  }

  return [...results].slice(0, count);
}

module.exports = router;
