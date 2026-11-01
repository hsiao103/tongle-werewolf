// 瀏覽器測試：隱私（誰載入了哪些圖）、圖片缺失回退、對比度掃描。
// 需求：playwright（NODE_PATH 指到全域 node_modules 亦可）。用法：node tests/browser.js [--shots=目錄]
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join(__dirname,'..');
const shotsArg=(process.argv.find(a=>a.startsWith('--shots='))||'').slice(8);
if(shotsArg)fs.mkdirSync(shotsArg,{recursive:true});
const MIME={'.html':'text/html;charset=utf-8','.webp':'image/webp','.md':'text/plain','.json':'application/json'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';const f=path.join(ROOT,u);
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end();}
  r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
const fails=[];const ok=(c,m)=>{if(!c){fails.push(m);console.log('  ✗',m);}};
const SETUP=`
mode='host';newGame('1234');G.settings.narrate=false;G.settings.sound=false;G.theme=__THEME__;H.fill(8);startGame();
const roles=['seer','wolf','witch','villager','hunter','villager','wolf','villager'];
G.players.forEach((p,i)=>{p.role=roles[i];p.name=['小米','阿寶','豆豆','妮妮','皮皮','阿福','咪咪','布丁'][i];});
G.players[0].cards=['peek','save','mute','blur'];G.players[2].cards=['blur'];G.players[7].alive=false;G.players[7].deathCause='vote';G.players[3].shield=true;
window.__show=(kind,idx,phase,extra)=>{G.phase=phase;G.round=2;if(extra)extra();
  if(kind==='screen'){mode='screen';V=screenView();}else{mode='player';V=viewFor(G.players[idx]);}
  ui={};C.render();return true;};`;
const EX={
 dawn:()=>{G.dawn={deaths:[{id:G.players[7].id,name:'布丁',cause:'wolf'}]};},
 talk:()=>{G.speakerQ=G.players.map(p=>p.id).slice(0,4);G.speaker=G.players[0].id;},
 vote:()=>{G.vote={votes:{[G.players[0].id]:G.players[3].id,[G.players[1].id]:G.players[3].id},guess:{},cardC:{},blur:{},log:[],quick:false};},
 voteResult:()=>{G.voteRes={outcome:'out',name:'妮妮',counts:[{id:G.players[3].id,name:'妮妮',n:3}],guesses:[]};},
 end:()=>{G.winner='good';}
};
const CONTRAST=()=>{
  const lum=c=>{c=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
  const parse=s=>{const m=s.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};
  const bgOf=el=>{const st=[];for(let e=el;e;e=e.parentElement){const c=parse(getComputedStyle(e).backgroundColor);if(c.a>0)st.push(c);}
    let cur=[8,16,36];for(const c of st.reverse())cur=[c.r*c.a+cur[0]*(1-c.a),c.g*c.a+cur[1]*(1-c.a),c.b*c.a+cur[2]*(1-c.a)];return cur;};
  const out=[];
  document.querySelectorAll('body *').forEach(el=>{
    const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join('');if(!t)return;
    const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return;
    const c=parse(cs.color);let op=1;for(let e=el;e;e=e.parentElement)op*=parseFloat(getComputedStyle(e).opacity);
    const bg=bgOf(el);const fg=[0,1,2].map(i=>[c.r,c.g,c.b][i]*c.a*op+bg[i]*(1-c.a*op));
    const L1=lum(fg),L2=lum(bg),cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
    if(cr<4.5)out.push(el.tagName+'.'+el.className+'|'+t.slice(0,16)+' cr='+cr.toFixed(1));});
  return [...new Set(out)];};
(async()=>{
  await new Promise(r=>srv.listen(0,r));const base='http://localhost:'+srv.address().port;
  const browser=await chromium.launch();
  async function mk(theme,vp){
    const ctx=await browser.newContext({viewport:vp});const page=await ctx.newPage();const reqs=[];
    await page.route('**/*',r=>{const u=r.request().url();if(!u.startsWith(base))return r.abort();reqs.push(u.slice(base.length+1));r.continue();});
    page.on('pageerror',e=>{fails.push('pageerror '+e.message);});
    await page.addInitScript(()=>{window.Peer=function(){};});
    await page.goto(base+'/index.html');await page.evaluate(SETUP.replace('__THEME__',JSON.stringify(theme)));
    return {ctx,page,reqs};
  }
  const RA=/assets\/\w+\/(role|skill)-(\w+)\.webp/;
  for(const theme of ['forest','ark']){
    console.log('== 主題',theme);
    // 手機：每個身分只載入自己的身分卡
    for(const [i,role] of [[0,'seer'],[1,'wolf'],[2,'witch'],[3,'villager'],[4,'hunter']]){
      const t=await mk(theme,{width:390,height:844});
      await t.page.evaluate(i=>__show('player',i,'reveal'),i);await t.page.waitForTimeout(300);
      const roleReq=t.reqs.filter(x=>/\/role-/.test(x)).map(x=>x.match(/role-(\w+)/)[1]);
      ok(roleReq.length>=1&&roleReq.every(r=>r===role),`${theme}/${role}: 只應載入自己的身分卡，實際 ${roleReq}`);
      if(shotsArg)await t.page.screenshot({path:path.join(shotsArg,`${theme}-role-${role}.png`)});
      await t.ctx.close();
    }
    // 技能卡：只載入自己持有的
    let t=await mk(theme,{width:390,height:844});
    await t.page.evaluate(()=>__show('player',2,'night'));await t.page.waitForTimeout(300);
    const sk=t.reqs.filter(x=>/skill-/.test(x)).map(x=>x.match(/skill-(\w+)/)[1]);
    ok(sk.every(s=>s==='blur'),`${theme}: 女巫只持有 blur，實際載入 ${sk}`);
    await t.ctx.close();
    // 投影／觀眾畫面：不得出現身分卡或技能卡（請求與 DOM 皆然）
    t=await mk(theme,{width:1920,height:1080});
    for(const ph of ['lobby','reveal','night','dawn','talk','vote','voteResult','end']){
      await t.page.evaluate(([ph,ex])=>__show('screen',0,ph,ex?eval('('+ex+')'):null),[ph,EX[ph]?EX[ph].toString():null]);
      await t.page.waitForTimeout(150);
      const dom=await t.page.evaluate(()=>document.body.innerHTML.replace(/<script[\s\S]*?<\/script>/g,''));
      ok(!RA.test(dom),`${theme}/screen/${ph}: DOM 不得含身分/技能卡路徑`);
      if(shotsArg)await t.page.screenshot({path:path.join(shotsArg,`${theme}-screen-${ph}.png`)});
    }
    ok(!t.reqs.some(x=>RA.test(x)),`${theme}: 投影畫面不得請求身分/技能卡`);
    await t.ctx.close();
    // 圖片缺失回退：封鎖全部 webp，仍要有可讀的 emoji 與角色名
    t=await mk(theme,{width:390,height:844});await t.page.route('**/*.webp',r=>r.abort());
    await t.page.evaluate(()=>__show('player',2,'reveal'));await t.page.waitForTimeout(500);
    const fb=await t.page.evaluate(()=>({imgs:document.querySelectorAll('.rolecard img').length,txt:document.querySelector('.rolecard').innerText}));
    ok(fb.imgs===0&&fb.txt.length>0,`${theme}: 圖片失敗後應回退為文字/emoji（img=${fb.imgs}）`);
    await t.ctx.close();
    // 對比度：主持台／玩家／規則
    t=await mk(theme,{width:1100,height:1300});
    await t.page.evaluate(th=>{mode='host';newGame('1234');G.settings.narrate=false;G.settings.sound=false;G.theme=th;H.fill(8);go('lobby');renderHost();},theme);
    const scans={lobby:null,
      vote:()=>{startGame();G.phase='vote';G.round=2;G.vote={votes:{},guess:{},cardC:{},blur:{},log:[],quick:false};go('vote');renderHost();},
      playerVote:()=>{G.players.forEach((q,i)=>{q.role=['seer','wolf','witch','villager','hunter','villager','wolf','villager'][i];});G.players[0].cards=['peek','save','mute','blur'];mode='player';go('reveal');V=viewFor(G.players[0]);ui={};C.render();V=viewFor(G.players[0]);G.phase='vote';V=viewFor(G.players[0]);C.render();},
      rules:()=>{showRules();}};
    for(const [k,fn] of Object.entries(scans)){
      if(fn)await t.page.evaluate(fn);await t.page.waitForTimeout(250);
      const bad=await t.page.evaluate(CONTRAST);
      ok(bad.length===0,`${theme}/對比度/${k}: ${bad.slice(0,4).join('; ')}`);
    }
    await t.ctx.close();
  }
  await browser.close();srv.close();
  if(fails.length){console.error('FAIL browser tests:',fails.length);process.exit(1);}
  console.log('PASS browser');
})().catch(e=>{console.error(e);process.exit(1);});
