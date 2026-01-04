import storage from './storage.js';
class ThemeManager {
  init() {
    const s = storage.getSettings().theme || {}; this.color=s.color||'indigo'; this.mode=s.mode||'auto'; this.font=s.font||'Pretendard'; this.customFonts=s.customFonts||[];
    this.applyTheme(); this.injectCustomFonts(); this.applyFont(); this.updateUI();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>this.mode==='auto'&&this.applyTheme());
  }
  save(){ storage.updateSettings({theme:{color:this.color, mode:this.mode, font:this.font, customFonts:this.customFonts}}); }
  changeColor(c){ this.color=c; this.save(); this.applyTheme(); this.updateUI(); }
  changeMode(m){ this.mode=m; this.save(); this.applyTheme(); this.updateUI(); }
  changeFont(){ this.font=document.getElementById('font-select').value; this.save(); this.applyFont(); }
  addCustomFont(){
    const css = document.getElementById('custom-font-input').value.trim();
    const nameMatch = css.match(/font-family:\s*['"](.+?)['"]/); if(!nameMatch) return;
    const name = nameMatch[1];
    if(!this.customFonts.some(f=>f.name===name)) this.customFonts.push({name,css});
    this.save(); this.injectCustomFonts(); this.updateUI();
  }
  injectCustomFonts(){ document.getElementById('custom-font-styles').innerHTML=this.customFonts.map(f=>f.css).join(''); }
  applyTheme(){ const r=document.documentElement; r.setAttribute('data-color',this.color); this.mode==='auto'?r.removeAttribute('data-theme'):r.setAttribute('data-theme',this.mode); }
  applyFont(){ document.documentElement.style.setProperty('--font-family',`'${this.font}', sans-serif`); }
  updateUI(){
    document.querySelectorAll('.color-btn').forEach(b=>b.classList.toggle('active',b.dataset.color===this.color));
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===this.mode));
    const select=document.getElementById('font-select'); if(!select)return;
    const fonts=['Pretendard',...this.customFonts.map(f=>f.name)];
    select.innerHTML=fonts.map(f=>`<option value="${f}" ${f===this.font?'selected':''}>${f}</option>`).join('');
  }
}
export default new ThemeManager();
