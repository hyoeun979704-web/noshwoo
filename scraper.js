const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
  'Referer': 'https://kin.naver.com/',
};

const DEFAULT_SCAN_RESULT = Object.freeze({
  myRank: null, myLikes: 0,
  rank1Likes: 0, rank2Likes: 0, rank3Likes: 0,
  rank1Needed: 0, rank2Needed: 0, rank3Needed: 0,
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchKnowledgeIn(keyword) {
  const url = `https://kin.naver.com/search/list.naver?query=${encodeURIComponent(keyword)}&where=kin`;
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 12000 });
    const $ = cheerio.load(res.data);
    const items = [];

    for (const sel of ['.question-item', '.kiu-inquiry-item', 'li.search_item', '.kin-item']) {
      const els = $(sel);
      if (els.length === 0) continue;
      els.each((_, el) => {
        const $el = $(el);
        const link = $el.find('a[href*="/qna/"]').first().attr('href')
                  || $el.find('a').first().attr('href');
        const title = $el.find('.title, .tit, h3, h4').first().text().trim();
        if (link) items.push({ link: link.startsWith('http') ? link : 'https://kin.naver.com' + link, title });
      });
      if (items.length > 0) break;
    }

    if (items.length === 0) {
      $('a[href*="/qna/detail"]').each((_, el) => {
        if (items.length >= 20) return false;
        const href = $(el).attr('href');
        const title = $(el).text().trim();
        if (href && title.length > 5)
          items.push({ link: href.startsWith('http') ? href : 'https://kin.naver.com' + href, title });
      });
    }

    return items.slice(0, 10);
  } catch (err) {
    console.error(`[scraper] 검색 실패 (${keyword}):`, err.message);
    return null;
  }
}

async function getQuestionDetail(url) {
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 12000 });
    const $ = cheerio.load(res.data);
    const answers = [];

    for (const sel of ['.c-heading-answer', '.answer_area', '.kiu-answer-item', '[class*="answer"]']) {
      $(sel).each((_, el) => {
        const $el = $(el);
        const nickname =
          $el.find('.c-userinfo__name, .writer_info .name, .nick, [class*="nick"], [class*="writer"] span').first().text().trim() ||
          $el.find('a[href*="userinfo"]').first().text().trim();
        const likesText = $el.find('[class*="like"], [class*="recommend"], .sympathy_count, em.cnt').first().text().replace(/[^0-9]/g, '');
        const likes = parseInt(likesText) || 0;
        if (nickname) answers.push({ nickname, likes, rank: 0 });
      });
      if (answers.length > 0) break;
    }

    if (answers.length === 0) {
      $('[class*="nick"], [class*="writer"], .name').toArray().slice(0, 5).forEach(el => {
        const nick = $(el).text().trim();
        if (nick.length > 1 && nick.length < 30) answers.push({ nickname: nick, likes: 0, rank: 0 });
      });
    }

    answers.sort((a, b) => b.likes - a.likes);
    answers.forEach((a, i) => { a.rank = i + 1; });
    return answers;
  } catch (err) {
    console.error(`[scraper] 상세 파싱 실패 (${url}):`, err.message);
    return null;
  }
}

function calcNeeded(myLikes, targetLikes) {
  if (myLikes >= targetLikes) return 0;
  const diff = targetLikes - myLikes + 1;
  return Math.max(10, Math.ceil(diff / 5) * 5);
}

async function scanKeyword(keyword, nickname) {
  const results = await searchKnowledgeIn(keyword);
  if (!results) return null;

  for (const item of results.slice(0, 5)) {
    await sleep(800 + Math.random() * 600);
    const answers = await getQuestionDetail(item.link);
    if (!answers || answers.length === 0) continue;

    const myAnswer = answers.find(a =>
      a.nickname === nickname ||
      a.nickname.includes(nickname) ||
      nickname.includes(a.nickname),
    );
    if (!myAnswer) continue;

    const [a1, a2, a3] = answers;
    return {
      myRank: myAnswer.rank,
      myLikes: myAnswer.likes,
      rank1Likes: a1?.likes ?? 0,
      rank2Likes: a2?.likes ?? 0,
      rank3Likes: a3?.likes ?? 0,
      rank1Needed: myAnswer.rank === 1 ? 0 : calcNeeded(myAnswer.likes, a1?.likes ?? 0),
      rank2Needed: myAnswer.rank <= 2 ? 0 : calcNeeded(myAnswer.likes, a2?.likes ?? 0),
      rank3Needed: myAnswer.rank <= 3 ? 0 : calcNeeded(myAnswer.likes, a3?.likes ?? 0),
    };
  }

  return { ...DEFAULT_SCAN_RESULT };
}

function mockScanKeyword() {
  const rand = () => Math.floor(Math.random() * 50) + 1;
  const rank1 = rand() + 20;
  const rank2 = Math.max(1, rank1 - Math.floor(Math.random() * 15) - 1);
  const rank3 = Math.max(1, rank2 - Math.floor(Math.random() * 10) - 1);
  const myRank = [1, 1, 2, 2, 3, 4, 5, null][Math.floor(Math.random() * 8)];
  const likesByRank = { 1: rank1, 2: rank2, 3: rank3 };
  const myLikes = myRank && myRank <= 3
    ? likesByRank[myRank]
    : myRank ? Math.max(1, rank3 - Math.floor(Math.random() * 8)) : 0;

  return {
    myRank, myLikes,
    rank1Likes: rank1, rank2Likes: rank2, rank3Likes: rank3,
    rank1Needed: myRank === 1 ? 0 : calcNeeded(myLikes, rank1),
    rank2Needed: myRank !== null && myRank <= 2 ? 0 : calcNeeded(myLikes, rank2),
    rank3Needed: myRank !== null && myRank <= 3 ? 0 : calcNeeded(myLikes, rank3),
  };
}

module.exports = { scanKeyword, mockScanKeyword, DEFAULT_SCAN_RESULT };
