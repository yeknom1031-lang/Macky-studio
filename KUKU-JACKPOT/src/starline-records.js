const safe=n=>Number.isFinite(n)&&n>=0?Math.floor(Math.min(n,1e9)):0;
export const endlessRecordKey=table=>Number.isInteger(table)&&table>=1&&table<=9?String(table):'mix';
export function normalizeEndlessRecords(raw){
 const records={};for(const key of ['mix','1','2','3','4','5','6','7','8','9']){
  const r=raw?.[key];if(!r||typeof r!=='object')continue;
  records[key]={bestCorrect:safe(r.bestCorrect),bestScore:safe(r.bestScore),bestBpm:safe(r.bestBpm),bestSpeed:Number.isFinite(r.bestSpeed)&&r.bestSpeed>=0?Math.min(r.bestSpeed,1e6):0,runs:safe(r.runs)};
 }return records;
}
export function updateEndlessRecords(raw,summary,{table=0,watch=false,finished=false}={}){
 const records=normalizeEndlessRecords(raw);if(watch)return {records,changed:false};
 const key=endlessRecordKey(table),old=records[key]||{bestCorrect:0,bestScore:0,bestBpm:0,bestSpeed:0,runs:0};
 const next={bestCorrect:Math.max(old.bestCorrect,safe(summary.correct)),bestScore:Math.max(old.bestScore,safe(summary.score)),bestBpm:Math.max(old.bestBpm,safe(summary.maxBpm)),bestSpeed:Math.max(old.bestSpeed,Number.isFinite(summary.maxSpeed)?Math.max(0,Math.min(1e6,summary.maxSpeed)):0),runs:old.runs+Number(finished)};
 const changed=Object.keys(next).some(k=>next[k]!==old[k]);if(changed)records[key]=next;
 return {records,changed,record:records[key]||old};
}
