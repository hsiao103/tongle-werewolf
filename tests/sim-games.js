const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
let code=scripts[scripts.length-1].replace(/^boot\(\);\s*$/m,'');
const S={T:1e12};
const el=()=>({style:{},dataset:{},classList:{toggle(){}},appendChild(){},remove(){},set innerHTML(v){this._h=v;},get innerHTML(){return this._h;},set textContent(v){},querySelectorAll(){return[]}});
const root=el(),dm=el(),toast=el();
const doc={body:{className:''},querySelector:s=>s==='#app'?root:s==='#dm'?dm:toast,querySelectorAll:()=>[],createElement:()=>el(),getElementById:()=>null,activeElement:null,addEventListener(){}};
const ctx={console,document:doc,location:{search:'',href:'http://x/y',protocol:'https:'},localStorage:{getItem(){return null},setItem(){}},
 URLSearchParams,setInterval:()=>0,setTimeout:()=>0,clearTimeout(){},Date:{now:()=>S.T},S,Math,JSON,Object,Array,Promise,String,Number,Peer:function(){},window:{}};
vm.createContext(ctx);
const test=`
const RA=/(role|skill)-[a-z]+[.]webp/,RAG=/role-[a-z]+[.]webp/g,SKG=/skill-[a-z]+[.]webp/g;
function audHTMLsafe(){const keep=V;V=viewFor({id:'x'},true);const h=audHTML();V=keep;return h;}

mode='host';newGame('1234');go('lobby');
const errs=[];
for(let g=0;g<30;g++){
  newGame('1234');roomCode='1234';G.settings.narrate=false;G.settings.sound=false;G.theme=g%2?'ark':'forest';G.settings.edge=g%3===0;G.settings.audOnly=g%2===0;
  H.fill(6+g%7);startGame();
  let steps=0;
  while(G.phase!=='end'&&steps<20000){
    S.T+=300;steps++;
    try{tick();viewFor(G.players[0]);V=viewFor({id:'x'},true);screenHTML(V);peeking=G.round%2===0;consoleHTML();lockHTML();screenHTML(screenView());
      {const h=screenHTML(screenView());if(RA.test(h))throw new Error('role art on public screen');if(RA.test(JSON.stringify(screenView())))throw new Error('role art path in screen payload');if(G.phase==='vote'&&!(h.includes('第 '+G.round+' 夜')&&h.includes('預判')))throw new Error('vote screen missing round/guess');if(G.phase==='voteResult'&&G.settings.audOnly&&G.voteRes.guesses.length&&!h.includes('全員預判'))throw new Error('result missing guesses');if(G.phase==='voteResult'&&!G.settings.audOnly&&h.includes('全員預判'))throw new Error('guess leaked in shared mode');if(G.phase==='vote'&&!G.settings.audOnly&&(h.includes('猜✔')||h.includes('猜…')||h.includes('票 ')))throw new Error('progress leaked in shared mode');if(G.phase==='vote'&&JSON.stringify(viewFor(G.players[0])).match(/"liveCounts":\{/))throw new Error('live counts to player');if(false)throw new Error('result missing guesses');if(G.phase==='vote'&&G.players.some(x=>!x.alive)&&!h.includes('死掉'))throw new Error('dead not shown');if(G.phase==='vote')S.seenVote=(S.seenVote||0)+1;if(G.phase==='voteResult')S.seenRes=(S.seenRes||0)+1;}
      G.players.forEach(p=>{const vv=viewFor(p);V=vv;{const ph=playerHTML();const own=p.role?('role-'+p.role+'.webp'):'';(ph.match(SKG)||[]).forEach(m=>{const k=m.slice(6,-5);if(!p.cards.includes(k))throw new Error('skill art for card not owned '+m);S.skillArt=(S.skillArt||0)+1;});(ph.match(RAG)||[]).forEach(m=>{if(m!==own)throw new Error('role art leaked to non-owner '+m);S.ownerArt=(S.ownerArt||0)+1;});if(RA.test(audHTMLsafe()))throw new Error('role art in aud view');}
        const js=JSON.stringify(vv);
        G.players.forEach(q=>{if(q.id!==p.id&&js.includes(q.tok))throw new Error('token leak');});
        if(G.aud.length===0&&G.phase!=='end'&&vv.players.some(x=>x.role))throw new Error('role leak to player');});
      const sj=JSON.stringify(screenView());
      G.players.forEach(q=>{if(sj.includes(q.tok))throw new Error('token leak to screen');if(G.phase!=='end'&&screenView().players.some(x=>x.role))throw new Error('role leak to screen');});}
    catch(e){errs.push(g+':'+e.stack);break;}
  }
  if(G.phase!=='end')errs.push('game '+g+' stuck at '+G.phase+' round '+G.round);
  else{ V=viewFor({id:'x'},true);screenHTML(V); }
}
console.log('owner-role-art renders',S.ownerArt,'skill-art renders',S.skillArt,'vote screens',S.seenVote,'result screens',S.seenRes);console.log(errs.length?errs.slice(0,5).join('\\n'):'ALL 30 GAMES REACHED END WITHOUT ERRORS');
`;
vm.runInContext(code+'\n'+test,ctx);
if(vm.runInContext('errs.length',ctx)){console.error('FAIL');process.exit(1)}console.log('PASS sim-games');
