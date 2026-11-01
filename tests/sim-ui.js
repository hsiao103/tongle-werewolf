const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
let code=scripts[scripts.length-1].replace(/^boot\(\);\s*$/m,'');
const S={T:1e12};
const el=()=>({style:{},dataset:{},classList:{toggle(){}},appendChild(){},remove(){},set innerHTML(v){this._h=v;},get innerHTML(){return this._h;},set textContent(v){},querySelectorAll(){return[]}});
const root=el(),dm=el(),toast=el();
const doc={body:{className:''},querySelector:s=>s==='#app'?root:s==='#dm'?dm:toast,querySelectorAll:()=>[],createElement:()=>el(),getElementById:()=>null,activeElement:null,addEventListener(){}};
const ctx={console,document:doc,location:{search:'',href:'http://x/y',protocol:'https:'},localStorage:{getItem(){return null},setItem(){}},
 URLSearchParams,setInterval:()=>0,setTimeout:()=>0,clearTimeout(){},Date:{now:()=>S.T},S,Math,JSON,Object,Array,Promise,String,Number,Peer:function(){},window:{},fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve({value:12345})})};
vm.createContext(ctx);
const test=`
for(const k of ['forest','ark'])for(const t of RULE_TABS){const h=rulesBody(t[0],k);if(!h||h.includes('undefined'))throw new Error('rules '+k+t[0]);}console.log('rules tabs ok');menu();if(!(document.querySelector('#app')._last.includes('wtc')&&document.querySelector('#app')._last.includes('vcn')))throw new Error('menu footer missing');

mode='host';newGame('1234');go('lobby');
const errs=[];
for(let g=0;g<30;g++){
  newGame('1234');roomCode='1234';G.settings.narrate=false;G.settings.sound=false;G.theme=g%2?'ark':'forest';G.settings.edge=g%3===0;
  H.fill(6+g%7);startGame();
  let steps=0;
  while(G.phase!=='end'&&steps<20000){
    S.T+=300;steps++;
    try{tick();viewFor(G.players[0]);V=viewFor({id:'x'},true);screenHTML(V);peeking=G.round%2===0;consoleHTML();lockHTML();screenHTML(screenView());
      G.players.forEach(p=>{const vv=viewFor(p);V=vv;playerHTML();
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
console.log(errs.length?errs.slice(0,5).join('\\n'):'ALL 30 GAMES REACHED END WITHOUT ERRORS');
`;
try{vm.runInContext(code+'\n'+test,ctx);}catch(e){console.error('FAIL',e.message);process.exit(1)}
if(vm.runInContext('errs.length',ctx)){console.error('FAIL');process.exit(1)}console.log('PASS sim-ui');
