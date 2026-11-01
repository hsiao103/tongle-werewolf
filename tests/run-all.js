// 依序執行全部測試；任一失敗則以非 0 結束。
const {spawnSync}=require('child_process'),path=require('path');
let bad=0;
for(const f of ['sim-games.js','sim-security.js','sim-ui.js','browser.js']){
  console.log('\n▶',f);const r=spawnSync(process.execPath,[path.join(__dirname,f)],{stdio:'inherit',env:process.env});
  if(r.status!==0){bad++;}
}
console.log(bad?`\n✗ ${bad} 組測試失敗`:'\n✓ 全部通過');process.exit(bad?1:0);
