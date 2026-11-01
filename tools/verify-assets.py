#!/usr/bin/env python3
"""素材清單、驗證與驗收報告。
用法：
  python3 tools/verify-assets.py           # 只檢查；有「缺漏／不一致」才以非 0 結束
  python3 tools/verify-assets.py --write   # 同時重新產生 assets/manifest.json 與 ASSET_ACCEPTANCE.md
需求：pillow。
"""
import re, sys, json, hashlib, pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')
THEMES = {'forest': '森林魔法村（3–4 年級）', 'ark': '方舟號（5–6 年級）'}

# 品質門檻（以 2x 手機螢幕、投影 1080p 為準）
MIN_W = {'role': 480, 'card': 240, 'avatar': 128, 'bg': 1600}
# 規劃中尚未有圖的位置 → 「缺漏」
PLANNED = [
    ('ark', 'bg', 'night', 'assets/ark/backgrounds/bg-night.webp', '方舟版夜晚背景（目前各階段共用 bg-cover）'),
    ('ark', 'bg', 'dawn', 'assets/ark/backgrounds/bg-dawn.webp', '方舟版天亮背景（目前各階段共用 bg-cover）'),
    ('forest', 'bg', 'scene-night-16x9', 'assets/forest/backgrounds/bg-night-16x9.webp', '森林夜晚 16:9 高解析場景（現為 1672×466 橫條）'),
    ('forest', 'bg', 'scene-dawn-16x9', 'assets/forest/backgrounds/bg-dawn-16x9.webp', '森林天亮 16:9 高解析場景（現為 1672×469 橫條）'),
]
NOTES = {
    ('ark', 'avatar'): '方舟版保留外星人頭像（使用者決定）；頭像為公開用中性圖，不含角色線索。',
}

def parse_art():
    """從 index.html 的 ART 對照表取出每個素材的宣告。"""
    m = re.search(r'const ART=\{(.*?)\n\};?', HTML, re.S)
    body = m.group(1)
    out = []
    for th in THEMES:
        tm = re.search(th + r':\{(.*?)\n  \}', body, re.S)
        if not tm: continue
        t = tm.group(1)
        for kind in ('role', 'card'):
            km = re.search(kind + r':\{(.*?\})\},?', t, re.S)
            if not km: continue
            for key, src, w, h in re.findall(r"(\w+):\{src:'([^']+)',w:(\d+),h:(\d+)\}", km.group(1)):
                out.append(dict(theme=th, kind=kind, key=key, file=src, declared=(int(w), int(h))))
        am = re.search(r'avatar:\[(.*?)\]', t, re.S)
        if am:
            for i, src in enumerate(re.findall(r"'([^']+)'", am.group(1)), 1):
                out.append(dict(theme=th, kind='avatar', key='%02d' % i, file=src, declared=None))
    # 背景：從 CSS url() 取
    seen = set()
    for src in re.findall(r'url\((assets/[^)]+backgrounds/[^)]+)\)', HTML):
        if src in seen: continue
        seen.add(src)
        th = src.split('/')[1]
        out.append(dict(theme=th, kind='bg', key=pathlib.Path(src).stem.replace('bg-', ''), file=src, declared=None))
    return out

def main():
    write = '--write' in sys.argv
    entries, errors = [], []
    for e in parse_art():
        p = ROOT / e['file']
        vis = 'public' if e['kind'] in ('avatar', 'bg') else 'private-self'
        rec = dict(id='%s/%s/%s' % (e['theme'], e['kind'], e['key']), theme=e['theme'], kind=e['kind'], key=e['key'],
                   file=e['file'], visibility=vis,
                   load='lazy' if e['kind'] in ('role', 'card') else ('css-bg' if e['kind'] == 'bg' else 'lazy'),
                   fallback='emoji' if e['kind'] != 'bg' else 'css-gradient')
        if not p.exists():
            rec.update(status='缺漏', issues=['檔案不存在']); errors.append(rec['id'] + ' 檔案不存在')
            entries.append(rec); continue
        im = Image.open(p); w, h = im.size
        rec.update(width=w, height=h, bytes=p.stat().st_size, sha256=hashlib.sha256(p.read_bytes()).hexdigest()[:16],
                   alpha='A' in im.getbands(), status='通過', issues=[])
        if e['declared'] and e['declared'] != (w, h):
            rec['issues'].append('ART 宣告 %dx%d 與實際 %dx%d 不符' % (*e['declared'], w, h))
            errors.append(rec['id'] + ' 尺寸宣告不一致')
        if w < MIN_W[e['kind']]:
            rec['issues'].append('寬度 %d < 建議 %d（高 DPI 螢幕可能偏糊）' % (w, MIN_W[e['kind']])); rec['status'] = '待修正'
        if e['kind'] == 'bg' and w / h > 2.2:
            rec['issues'].append('橫條 %.1f:1，投影 16:9 需放大約 %.1f 倍' % (w / h, (w / h) / (16 / 9))); rec['status'] = '待修正'
        if e['kind'] == 'avatar' and rec['visibility'] != 'public': errors.append(rec['id'])
        if NOTES.get((e['theme'], e['kind'])): rec['note'] = NOTES[(e['theme'], e['kind'])]
        entries.append(rec)
    for th, kind, key, f, desc in PLANNED:
        if not (ROOT / f).exists():
            entries.append(dict(id='%s/%s/%s' % (th, kind, key), theme=th, kind=kind, key=key, file=f, visibility='public',
                                status='缺漏', issues=[desc]))
    # 隱私結構檢查：身分/技能卡路徑不得出現在 CSS（url()）或 ART 以外
    for m in re.finditer(r'url\((assets/[^)]*(?:role|skill)-[^)]*)\)', HTML):
        errors.append('CSS 引用身分/技能卡：' + m.group(1))
    art_end = HTML.index('const ART=')
    for m in re.finditer(r'assets/\w+/cards/(?:role|skill)-\w+\.webp', HTML):
        if not (art_end <= m.start() <= art_end + 4000):
            errors.append('ART 以外引用卡片：' + m.group(0))
    # 孤兒檔
    ref = {x['file'] for x in entries}
    for f in sorted((ROOT / 'assets').rglob('*.webp')):
        rel = str(f.relative_to(ROOT))
        if rel not in ref: errors.append('未被引用的素材：' + rel)
    total = sum(x.get('bytes', 0) for x in entries)
    cnt = {s: sum(1 for x in entries if x['status'] == s) for s in ('通過', '待修正', '缺漏')}
    print('素材 %d 件，共 %.2f MB｜通過 %d／待修正 %d／缺漏 %d' % (len(entries), total / 1048576, cnt['通過'], cnt['待修正'], cnt['缺漏']))
    for x in errors: print('  ✗', x)
    if write:
        (ROOT / 'assets' / 'manifest.json').write_text(json.dumps(dict(
            about='由 tools/verify-assets.py --write 產生；請勿手改。visibility：private-self＝僅本人手機；public＝可上投影。',
            themes=THEMES, summary=cnt, total_bytes=total, assets=entries), ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        lines = ['# 素材驗收報告', '', '> 由 `python3 tools/verify-assets.py --write` 自動產生。', '',
                 '**總計 %d 件 / %.2f MB　通過 %d　待修正 %d　缺漏 %d**' % (len(entries), total / 1048576, cnt['通過'], cnt['待修正'], cnt['缺漏']), '']
        for st, mark in (('缺漏', '❌'), ('待修正', '⚠️'), ('通過', '✅')):
            rows = [x for x in entries if x['status'] == st]
            lines += ['## %s %s（%d）' % (mark, st, len(rows)), '']
            if not rows: lines += ['（無）', ''] ; continue
            if st == '通過':
                grp = {}
                for x in rows: grp.setdefault((x['theme'], x['kind']), []).append(x)
                lines += ['| 主題 | 類型 | 數量 | 可見對象 | 容量 |', '|---|---|---|---|---|']
                for (th, k), xs in grp.items():
                    lines.append('| %s | %s | %d | %s | %.0f KB |' % (th, k, len(xs), '僅本人' if xs[0]['visibility'] == 'private-self' else '公開', sum(i['bytes'] for i in xs) / 1024))
                lines.append('')
            else:
                lines += ['| 素材 | 尺寸 | 說明 |', '|---|---|---|']
                for x in rows:
                    sz = '%d×%d' % (x['width'], x['height']) if 'width' in x else '—'
                    lines.append('| `%s` | %s | %s |' % (x['id'], sz, '；'.join(x['issues'])))
                lines.append('')
        lines += ['## 隱私與結構檢查', '',
                  '- 身分卡／技能卡路徑只出現在 `ART` 對照表，CSS 與其他程式未引用：%s' % ('通過' if not [e for e in errors if '引用' in e] else '**不通過**'),
                  '- 公開畫面只使用 `avatar`、`bg`（見 `visibility`）；實際請求由 `tests/browser.js` 驗證',
                  '- 無未被引用的素材檔：%s' % ('通過' if not [e for e in errors if '未被引用' in e] else '**不通過**'),
                  '- 備註：靜態網站無法阻止圖片被下載，保密靠「不告知」：只有本人的畫面會請求自己的卡片。', '']
        for k, v in NOTES.items(): lines.append('- ' + v)
        (ROOT / 'ASSET_ACCEPTANCE.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
        print('已寫入 assets/manifest.json、ASSET_ACCEPTANCE.md')
    sys.exit(1 if errors else 0)

main()
