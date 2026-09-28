import {optionsFor} from './icon-options.js';
export const themes=[
 {id:'original',name:'Hoek המקורי',en:'ORIGINAL',description:'האייקונים הקיימים, כחול כהה וסגול. נקודת המוצא של הסרגל שלך.',icon:'original'},
 {id:'blueprint',name:'שרטוט אדריכלי',en:'BLUEPRINT',description:'קווים כחולים, פינות ישרות ורשת שרטוט. כיוון טכני ומדויק.',icon:'line'},
 {id:'minimal',name:'מינימליסטי',en:'ESSENTIAL',description:'שחור ולבן, כפתורים קומפקטיים וסמלים קוויים. פחות עומס.',icon:'line'},
 {id:'color',name:'צבע לפי תחום',en:'COLOR CODED',description:'סמלים דו־גוניים וצבע מזהה לכל קבוצה. קל להתמצא בין תחומי עבודה.',icon:'symbol'},
 {id:'dark',name:'סטודיו כהה',en:'NIGHT STUDIO',description:'משטח כהה וכפתורים אופקיים. אייקונים בהירים עם ניגודיות גבוהה.',icon:'symbol'}
];
const sampleIds=['lot-line-walls','scopebox-views','bathroom-setup'];
const palette=['#6b317f','#1966b3','#197b67','#be5932','#7b4db3','#9f4679','#327d9b'];
export function syncTheme(state){const theme=themes.find(t=>t.id===state.theme)||themes[0];document.body.dataset.theme=theme.id;const label=document.querySelector('#theme-current');if(label)label.textContent=theme.name;document.querySelectorAll('.panel').forEach(el=>{const panels=state.nodes.filter(n=>n.type==='panel');const index=panels.findIndex(n=>n.id===el.dataset.node);el.style.setProperty('--panel-color',palette[Math.max(0,index)%palette.length])});}
export function themeDialogHTML(state,seed){return themes.map(t=>`<button class="theme-choice ${state.theme===t.id?'selected':''}" type="button" data-choose-theme="${t.id}" aria-label="בחירת ערכת ${t.name}"><div class="theme-preview preview-${t.id}" aria-hidden="true">${sampleIds.map((id,i)=>{const n=seed.nodes.find(n=>n.id===id),option=optionsFor(n).find(o=>o.key===t.icon);return `<div class="preview-tool"><img src="${option.src}" alt=""><span>${['Lot Line','Scope Box','Bathroom'][i]}</span></div>`}).join('')}</div><div class="theme-copy"><small>${t.en}</small><h3>${t.name}${state.theme===t.id?' ✓':''}</h3><p>${t.description}</p></div></button>`).join('');}
export function setTheme(state,id){const theme=themes.find(t=>t.id===id);if(!theme)throw Error('Unknown theme');state.theme=id;state.themeIntroSeen=true;for(const n of state.nodes){const option=optionsFor(n).find(o=>o.key===theme.icon);if(option){n.icon=option.src;n.iconChoice=option.key}}}
