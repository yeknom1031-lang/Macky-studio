import {normalizeProfile} from './progression.js';
export const ONLINE_URL='https://irodory.yeknom1031.workers.dev/';
export function createOnlineClient({onState,onStatus,onError,getJoinOptions=()=>({})}) {
  let socket=null,retry=null,pulse=null,stopped=true,attempt=0,pendingJoin=false,lastPong=0,generation=0;
  function clear(){clearTimeout(retry);clearInterval(pulse);retry=pulse=null;}
  function stop(){stopped=true;generation++;clear();socket?.close(1000,'終了');socket=null;}
  function send(action,input={}){if(socket?.readyState!==1){onError('再接続中です。少しお待ちください');return false;}socket.send(JSON.stringify({action,...input}));return true;}
  function dial(){
    clear();if(stopped)return;pendingJoin=true;const gen=generation;
    onStatus(attempt?'再接続しています…':'接続しています…',false);
    const url=new URL('/api/socket',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    const ws=socket=new WebSocket(url);
    ws.onopen=()=>{if(gen!==generation)return;attempt=0;lastPong=Date.now();onStatus('オンライン',true);pulse=setInterval(()=>{if(Date.now()-lastPong>40000){ws.close();return;}if(ws.readyState===1)ws.send('ping');},15000);};
    ws.onmessage=event=>{
      if(gen!==generation)return;if(event.data==='pong'){lastPong=Date.now();return;}
      let data;try{data=JSON.parse(event.data);}catch{return;}
      if(data.error){onError(data.error);return;}
      onState(data);
      if(pendingJoin){pendingJoin=false;send('join',{...getJoinOptions(),protocol:2});}
    };
    ws.onclose=event=>{
      if(gen!==generation||stopped)return;clear();
      if(event.code===4001){stop();onStatus('別のタブで接続中',false);onError('別のタブでオンライン対戦を開きました。このタブではホームに戻ってください。');return;}
      onStatus('接続が切れました。復帰中…',false);retry=setTimeout(dial,Math.min(8000,700*2**Math.min(attempt++,4)));
    };
    ws.onerror=()=>{};
  }
  return {
    async session(name){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
      try{
        const response=await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(name===undefined?{}:{name}),signal:controller.signal});
        if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('オンライン版のURLから遊んでください');
        const data=await response.json();if(!response.ok)throw new Error(data.error||'接続できませんでした');return data;
      }finally{clearTimeout(timer);}
    },
    connect(){stop();stopped=false;attempt=0;pendingJoin=true;dial();},
    send,stop,connected:()=>socket?.readyState===1
  };
}
export function mergeOnlineLedger(value,ledger) {
  const profile=normalizeProfile(value);
  if(!ledger||typeof ledger.id!=='string'||! /^[a-zA-Z0-9-]{1,64}$/.test(ledger.id)||!['earned','played','wins','draws'].every(k=>Number.isSafeInteger(ledger[k])&&ledger[k]>=0))return profile;
  const previous=profile.onlineLedger[ledger.id]??{earned:0,played:0,wins:0,draws:0};
  profile.coins=Math.min(1000000000,profile.coins+Math.max(0,ledger.earned-previous.earned));
  for(const k of ['played','wins','draws'])profile.stats[k]+=Math.max(0,ledger[k]-previous[k]);
  profile.onlineLedger[ledger.id]=Object.fromEntries(['earned','played','wins','draws'].map(k=>[k,Math.max(previous[k],ledger[k])]));
  return profile;
}
