const db = require('../db');
const { scanKeyword, mockScanKeyword, DEFAULT_SCAN_RESULT } = require('../scraper');

const stmts = {
  insertResult: db.prepare(`
    INSERT INTO scan_results
      (scan_id, keyword_id, keyword_text, my_rank, my_likes,
       rank1_likes, rank2_likes, rank3_likes, rank1_needed, rank2_needed, rank3_needed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateProgress: db.prepare('UPDATE scans SET completed_keywords = ? WHERE id = ?'),
  complete:       db.prepare("UPDATE scans SET status = ?, completed_at = datetime('now') WHERE id = ?"),
};

/**
 * @param {number} scanId
 * @param {{ nickname: string }} profile
 * @param {Array<{ id: number, keyword: string }>} keywords
 * @param {{ useMock?: boolean, onProgress?: (event) => void }} opts
 */
async function executeScan(scanId, profile, keywords, { useMock = false, onProgress } = {}) {
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i];
    onProgress?.({ type: 'start', keyword: kw.keyword, index: i });

    let result;
    try {
      result = useMock
        ? mockScanKeyword(kw.keyword)
        : await scanKeyword(kw.keyword, profile.nickname);
    } catch (err) {
      console.error(`[scan] ${kw.keyword} 오류:`, err.message);
    }

    const r = result || DEFAULT_SCAN_RESULT;
    stmts.insertResult.run(
      scanId, kw.id, kw.keyword,
      r.myRank, r.myLikes, r.rank1Likes, r.rank2Likes, r.rank3Likes,
      r.rank1Needed, r.rank2Needed, r.rank3Needed,
    );
    stmts.updateProgress.run(i + 1, scanId);

    onProgress?.({ type: 'done', keyword: kw.keyword, index: i, result: r });
  }

  stmts.complete.run('completed', scanId);
}

module.exports = { executeScan };
