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
mode='host';roomCode='1234';newGame('1234');go('lobby');
const mk=()=>{const h={};return {open:true,sent:[],send(m){this.sent.push(m)},on(e,f){h[e]=f},emit(e,d){h[e]&&h[e](d)}}};
const a=mk(),b=mk(),scr=mk();hostConn(a);hostConn(b);hostConn(scr);
a.emit('data',{t:'hello',name:'A'});
const pa=G.players[0];
b.emit('data',{t:'hello',name:'B',tok:pa.id});   // 用公開 id 冒用 → 應該被當成新玩家
if(G.players.length!==2||pa.conn!==a)throw new Error('spoof by public id succeeded');
b.emit('data',{t:'hello',name:'B2',tok:pa.tok});  // 用 A 的 token（僅 A 本人知道）→ 才會重連
if(pa.conn!==b)throw new Error('token rebind failed');
scr.emit('data',{t:'hello',screen:true});
if(G.screens.length!==1||!scr.sent.some(m=>m.t==='state'&&m.screen))throw new Error('screen not registered');
const ss=JSON.stringify(scr.sent);if(G.players.some(p=>ss.includes(p.tok)))throw new Error('token in screen payload');
`;
try{vm.runInContext(code+'\n'+test,ctx);console.log('PASS sim-security');}catch(e){console.error('FAIL',e.message);process.exit(1)}
