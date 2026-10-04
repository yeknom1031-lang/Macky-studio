import {normalizeCustomDisc,cleanDiscText} from './cosmetics.js';
export const DISC_LIBRARY_LIMIT=24;
const discIdValid=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,64}$/.test(id);
const newDiscId=()=>globalThis.crypto?.randomUUID?.()??`disc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function normalizeDiscCollection(raw={}) {
  raw=raw&&typeof raw==='object'?raw:{};
  const discLibrary=[],seen=new Set();
  for(const item of (Array.isArray(raw.discLibrary)?raw.discLibrary:[]).slice(0,96)){
    if(!item||!discIdValid(item.id)||seen.has(item.id))continue;
    seen.add(item.id);discLibrary.push({id:item.id,name:cleanDiscText(item.name,24),design:normalizeCustomDisc({...item.design,enabled:true})});
    if(discLibrary.length===DISC_LIBRARY_LIMIT)break;
  }
  let customDisc=normalizeCustomDisc(raw.customDisc),activeDiscId=discIdValid(raw.activeDiscId)?raw.activeDiscId:null;
  // Existing single-design saves become the first item, without touching coins or progress.
  if(!Array.isArray(raw.discLibrary)&&raw.customDisc&&(customDisc.enabled||JSON.stringify({...customDisc,enabled:false})!==JSON.stringify(normalizeCustomDisc()))){
    discLibrary.push({id:'legacy-custom',name:'',design:{...customDisc,enabled:true}});activeDiscId=customDisc.enabled?'legacy-custom':null;
  }
  const active=discLibrary.find(d=>d.id===activeDiscId);
  if(active)customDisc={...active.design,enabled:true};else activeDiscId=null;
  return {discLibrary,activeDiscId,customDisc};
}
export function saveDiscDesign(raw,{id=null,name='',design,equip=true},makeId=newDiscId) {
  const collection=normalizeDiscCollection(raw),index=collection.discLibrary.findIndex(d=>d.id===id);
  if(id!==null&&index<0)return {ok:false,profile:raw,reason:'このコマは見つかりません。別のコマとして保存してください。'};
  if(index<0&&collection.discLibrary.length>=DISC_LIBRARY_LIMIT)return {ok:false,profile:raw,reason:'保存できるコマは24個までです。不要なコマを削除してください。'};
  const nextId=index>=0?id:makeId();
  if(!discIdValid(nextId)||(index<0&&collection.discLibrary.some(d=>d.id===nextId)))return {ok:false,profile:raw,reason:'保存できませんでした。もう一度お試しください。'};
  const item={id:nextId,name:cleanDiscText(name,24),design:normalizeCustomDisc({...design,enabled:true})};
  if(index<0)collection.discLibrary.push(item);else collection.discLibrary[index]=item;
  if(equip||collection.activeDiscId===nextId){collection.customDisc={...item.design};collection.activeDiscId=nextId;}
  return {ok:true,id:nextId,profile:{...raw,...collection}};
}
export function equipDiscDesign(raw,id) {
  const collection=normalizeDiscCollection(raw),item=collection.discLibrary.find(d=>d.id===id);
  if(!item)return {ok:false,profile:raw,reason:'コマが見つかりません。'};
  return {ok:true,profile:{...raw,...collection,activeDiscId:id,customDisc:{...item.design,enabled:true}}};
}
export function removeDiscDesign(raw,id) {
  const collection=normalizeDiscCollection(raw),removed=collection.discLibrary.find(d=>d.id===id);
  if(!removed)return {ok:false,profile:raw,reason:'コマが見つかりません。'};
  collection.discLibrary=collection.discLibrary.filter(d=>d.id!==id);
  if(collection.activeDiscId===id){collection.activeDiscId=null;collection.customDisc={...collection.customDisc,enabled:false};}
  return {ok:true,removed,profile:{...raw,...collection}};
}
export function restoreDiscDesign(raw,item) {
  return saveDiscDesign(raw,{name:item.name,design:item.design,equip:false},()=>item.id);
}
