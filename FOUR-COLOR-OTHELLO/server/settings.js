export const ONLINE_SIZES = Object.freeze([6,8,10,12]);
export const ONLINE_TURN_SECONDS = Object.freeze([30,45,60,90]);
export const ONLINE_AI = Object.freeze(['easy','normal','hard']);
export function normalizeOnlineSettings(value={}) {
  const raw=value&&typeof value==='object'?value:{};
  return {size:ONLINE_SIZES.includes(raw.size)?raw.size:8,turnSeconds:ONLINE_TURN_SECONDS.includes(raw.turnSeconds)?raw.turnSeconds:45,aiDifficulty:ONLINE_AI.includes(raw.aiDifficulty)?raw.aiDifficulty:'normal'};
}
export function validateOnlineSettings(raw) {
  if(!raw||typeof raw!=='object'||!ONLINE_SIZES.includes(raw.size)||!ONLINE_TURN_SECONDS.includes(raw.turnSeconds)||!ONLINE_AI.includes(raw.aiDifficulty))throw new Error('対局設定を確認してください');
  return normalizeOnlineSettings(raw);
}
