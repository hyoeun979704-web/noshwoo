const db = require('../db');

const PLAN_PROFILE_LIMITS = { free: 1, basic: 2, pro: 5 };
const PLAN_KW_LIMITS      = { free: 50, basic: 75, pro: 100 };

function getProfile(profileId, userId) {
  return db.prepare('SELECT * FROM profiles WHERE id = ? AND user_id = ?').get(profileId, userId);
}

function planProfileLimit(plan) { return PLAN_PROFILE_LIMITS[plan] || 1; }
function planKwLimit(plan)      { return PLAN_KW_LIMITS[plan] || 50; }
function dayLimit(plan)         { return plan === 'free' ? 7 : 30; }
function sinceDate(plan) {
  return new Date(Date.now() - dayLimit(plan) * 864e5).toISOString();
}

module.exports = { getProfile, planProfileLimit, planKwLimit, dayLimit, sinceDate };
