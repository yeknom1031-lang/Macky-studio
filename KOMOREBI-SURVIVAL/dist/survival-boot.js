// Report startup failures instead of leaving the start controls disabled forever.
(()=>{'use strict';let failed=false;
function fail(){if(document.documentElement.dataset.gameReady==='true'||failed)return;failed=true;const notice=document.getElementById('bootNotice'),retry=document.getElementById('bootRetry');notice.hidden=false;notice.textContent='ゲームを読み込めませんでした。再読み込みして、もう一度お試しください。';retry.hidden=false;retry.onclick=()=>location.reload();}
addEventListener('error',event=>{if(event.target?.tagName==='SCRIPT'||event instanceof ErrorEvent)fail();},true);
window.addEventListener('load',()=>{if(document.documentElement.dataset.gameReady!=='true')fail();});
})();
