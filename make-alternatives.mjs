import fs from 'node:fs';
const p=d=>`<path d="${d}"/>`,r=(x,y,w,h,rad=1)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rad}"/>`,c=(x,y,rad)=>`<circle cx="${x}" cy="${y}" r="${rad}"/>`;
const sheet=r(6,3,20,26,2),room=r(4,5,24,22),grid=r(5,4,22,24)+p('M5 12h22M5 20h22M13 4v24'),house=p('M3 14 16 3l13 11M7 12v16h18V12'),cube=p('m16 3 12 7v13l-12 7L4 23V10l12-7ZM4 10l12 7 12-7M16 17v13'),layers=p('m3 10 13-7 13 7-13 7-13-7Zm0 7 13 7 13-7M3 24l13 7 13-7'),list=p('M5 7h2m5 0h14M5 15h2m5 0h14M5 23h2m5 0h14'),tag=p('M4 4h12l13 13-12 12L4 16Z')+c(10,10,1.5),check=p('m18 23 4 4 8-10'),plus=p('M23 16v12m-6-6h12'),arrow=p('M15 23h14m-5-5 5 5-5 5'),spark=p('m23 2 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z'),eye=p('M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16Z')+c(16,16,4),shield=p('M16 3 28 7v9c0 7-7 12-12 14C11 28 4 23 4 16V7Z'),search=c(13,13,9)+p('m20 20 9 9'),gear=p('m13 3-1 4-4 2-4-1-2 5 3 3-1 5 4 3 4-1 4 3 5-2 1-4 4-2 2-5-3-3 1-4-4-3-4 1Z')+c(15,15,5),link=p('m13 9 3-3a7 7 0 0 1 10 10l-4 4M19 23l-3 3A7 7 0 0 1 6 16l4-4M11 21l10-10'),ruler=r(3,10,26,12)+p('M8 10v6m5-6v4m6-4v6m5-6v4');
// Each pair uses two different metaphors, not just recoloring the package icon.
const D={
'HoekAIStatus':['שרת מחובר',r(4,5,24,9,2)+r(4,18,24,9,2)+c(9,9.5,1)+c(9,22.5,1),p('M18 10h6m-6 13h6'),'חיבור פעיל',link,check],
'lot-line-walls':['גבול במבט על',r(5,5,22,22)+p('M10 10v12h12'),p('M4 2v28'),'קיר על קו מגרש',p('m5 10 17-6 5 4v18l-17 5-5-4V10Zm0 0 5 4 17-6M10 14v17'),p('M2 29 29 20')],
'scopebox-views':['מסגרת עם צירי מבט',r(8,8,16,16)+p('M2 8V2h6m16 0h6v6M2 24v6h6m16 0h6v-6'),p('M16 3v26M3 16h26'),'קופסה ומבט',cube,eye.replaceAll('16','16')],
'common-area-fill':['שטח משותף בתוכנית',room+p('M4 15h24M14 5v10M18 15v12'),p('M6 18l9 7m-9-3 5 4m-1-10 5 4'),'אזור מודגש',r(3,3,11,11)+r(18,3,11,11)+r(3,18,11,11),r(18,18,11,11)],
'toposolid':['קווי גובה',p('M2 25q14-26 28 0M6 25q10-19 20 0M10 25q6-12 12 0M14 25q2-5 4 0'),p('M25 3v7m-3-4h6'),'קרקע תלת־ממדית',p('m2 21 10-14 7 8 5-4 6 10-14 9Z'),p('m2 21 14 4 14-4M12 7l4 18 3-10')],
'dwg-to-model':['שרטוט הופך לנפח',r(2,3,12,14)+p('M5 7h6m-6 4h3M19 18l6-3 5 3v9l-5 3-6-3Zm0 0 6 3 5-3m-5 3v9'),p('M5 22v5h9m-4-4 4 4-4 4'),'מודל עם ניצוץ',cube,spark],
'bathroom-setup':['מבט על חדר רחצה',room+p('M4 18h10v9M19 9h6v8h-6ZM21 17v6'),p('m7 22 4-4m-4 0 4 4'),'אמבט וזרם מים',p('M3 17h26v4a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6ZM7 27v3m18-3v3M7 17V6a3 3 0 0 1 6 0'),p('M11 9h8m-6 3v2m4-2v2')],
'apt-params':['בניין והגדרות',r(4,3,17,26)+p('M8 8h3m4 0h3M8 14h3m4 0h3M8 20h3'),p('M18 19h12m-12 7h12M22 16v6m5 1v6'),'פרמטרים במבנה',house,p('M10 17h12m-12 6h12M14 14v6m5 0v6')],
'apt-mark':['בחירת דירה',house,check],'apt-num-rooms':['דירה לחדרים',p('M3 4h10v11H3ZM19 18h10v11H19ZM3 20h10v9H3Z'),p('M19 5h9v8m-4-4 4 4 3-4M8 15v5'),'מספור תוכנית',room+p('M16 5v22M16 16h12'),p('M8 11h3v9M20 11h4v3h-4v3h4')],
'apt-numbering':['מספור בסדר מעגלי',p('M9 6a12 12 0 0 1 18 10M23 27A12 12 0 0 1 5 16'),p('M9 2v6H3m20 22v-6h6M13 11h4v12m-4 0h8'),'בניין ממוספר',r(5,3,22,26)+p('M5 12h22M5 21h22'),p('M10 7h3m5 0h4M10 17h3m5 0h4M10 26h3m5 0h4')],
'apt-tags':['תג על תוכנית',room+p('M4 16h12V5'),tag],'apt-sale-plan':['דירה על גיליון',sheet+p('m10 14 6-5 6 5v10H10Z'),p('M10 26h12'),'גיליון עם בית',p('M4 3h16v26H4ZM8 7h8m-8 4h4'),house],
'floor-sale-plan':['קומה על גיליון',sheet+r(10,9,12,12)+p('M16 9v12M10 15h12'),p('M10 25h12'),'ערימת תוכניות',p('M3 3h20v22H3ZM8 29h21V8M3 13h20M13 3v22'),p('M8 8h1m9 0h1M8 18h1m9 0h1')],
'sale-dimensions':['מידות בתוכנית',r(7,7,18,18),p('M2 7v18m-2-18h4m-4 18h4M7 30h18m-18-2v4m18-4v4'),'סרגל וגיליון',sheet,ruler],
'kitchen-layout':['מטבח במבט על',p('M3 6h26v9H12v14H3Z')+r(17,8,8,5)+c(7.5,20,2),p('M3 2h26'),'רצף ארונות',r(3,11,26,17)+p('M12 11v17M21 11v17M3 7h26')+c(7,20,1)+c(16,20,1)+c(25,20,1),p('M3 3h6m4 0h6m4 0h6')],
'fire-door-tags':['דלת עם סימון אש',p('M4 28V4h17v24M8 28V8h9v20')+c(14,18,1),p('M25 13c-6 6-5 13 0 14 7 0 8-6 3-10l-1 4c-3-2-2-5-2-8Z'),'תג עם אש',tag,p('M18 13c-5 5-5 10 0 11 5 0 6-4 2-8l-1 3Z')],
'room-dimensions':['חדר עם קווי מידה',r(7,7,21,21),p('M2 7v21m-2-21h4m-4 21h4M7 2h21m-21-2v4m21-4v4'),'מידות בשני צירים',p('M5 4v23h23M10 4v18h18'),p('M14 6h13m-4-3 4 3-4 3M6 13v11m-3-4 3 4 3-4')],
'dimension-selected':['בחירה ומידות חכמות',ruler,spark],'lists':['רשימה לפי שלבים',list,p('M26 5v22m-3-3 3 3 3-3'),'תיקיית רשימות',p('M3 9V5h10l4 4h12v20H3Z'),p('M8 15h16M8 20h16M8 25h10')],
'list-setup':['רשימה והגדרות',list,gear],'list-survey':['רשימה לבדיקה',list,search],'list-bind':['טבלה וקישור',grid,link],'list-schedules':['לוח נתונים',grid,p('M2 2h28'),'גיליון טבלה',sheet+r(10,10,12,14)+p('M10 15h12M10 20h12M16 10v14'),p('M10 6h12')],
'list-sheets':['מפעל גיליונות',p('M2 2h17v22H2ZM7 28h18V7'),plus],'list-tags':['רשימה עם תג',list,tag],'cw-sheets':['חזית קיר מסך',grid+p('M20 4v24'),p('M2 30h28'),'חזית על גיליון',sheet+r(10,9,12,15)+p('M14 9v15M18 9v15M10 14h12M10 19h12'),p('M10 6h12')],
'legend-claude':['רשימה חכמה',list,spark],'mamad-check':['מעטפת מוגנת',shield,p('m10 16 4 4 8-9'),'חדר ממוגן',room+p('M8 9h16v14H8Z'),check],
'publish-sheets':['גיליון לייצוא',sheet,arrow],'publish-views':['מבט לייצוא',eye,arrow],'schedule-xlsx':['טבלה לאקסל',grid,p('m18 18 11 11m0-11L18 29'),'קובץ נתונים',sheet+p('M10 8h12m-12 5h12'),p('m11 19 10 8m0-8-10 8')],
'robot-check':['מודל ובקרת ייצוא',cube,check],'audit-view':['מבט בבדיקה',eye,search],'verify-install':['חבילה מאומתת',cube,check],'color-tabs':['שלוש לשוניות',r(3,7,8,22,2)+r(12,4,8,25,2)+r(21,7,8,22,2),p('M6 12h2m7-3h2m7 3h2'),'מניפת צבעים',p('M3 3h10v26H3ZM13 10l10-7 6 9-16 12M13 24l15-4 2 9H13'),c(8,24,1)],
'registry':['תיקיית פרויקט',p('M3 9V5h10l4 4h12v20H3Z'),p('M9 15h15M9 22h15M14 12v6m5 1v6'),'כרטיס הגדרות',r(4,3,24,26,2)+p('M8 9h16M8 16h16M8 23h16'),p('M13 6v6m7 1v6m-8 1v6')],
'stairs-check':['גרם מדרגות נבדק',p('M3 28v-7h7v-7h7V7h7V3'),check],'standards-audit':['תקן מאומת',sheet+list,check],'standards-fix':['תקן לתיקון',sheet+p('M10 8h12M10 13h8'),p('m13 25 10-10 5 5-10 10-6 1Z')]
};
// Complete paired alternatives for action-oriented tools with a second, dominant action metaphor.
const second={
'apt-mark':['אישור קבוצת דירות',r(3,3,11,11)+r(18,3,11,11)+r(3,18,11,11),check],
'apt-tags':['תווית דירה',tag,p('m15 18 4-4 5 4v6h-9Z')],
'dimension-selected':['צירים עם עוזר',p('M4 4v24h24M9 23l12-12'),spark],
'list-setup':['מסמך עם מחוונים',sheet,p('M10 10h12M10 17h12M10 24h12M14 7v6m5 1v6m-6 1v6')],
'list-survey':['לוח עם זכוכית מגדלת',r(3,3,18,24)+p('M7 8h10M7 13h6'),c(22,22,6)+p('m27 27 4 4')],
'list-bind':['חיבור שני מסמכים',r(2,3,11,17)+r(19,12,11,17),p('M7 25h7v-8h10m-4-4 4 4-4 4')],
'list-sheets':['שכפול גיליון',r(4,3,18,23)+p('M10 30h18V9'),plus],
'list-tags':['תג ממוספר',tag,p('M13 16h9M13 20h9M16 13v10m4-10v10')],
'legend-claude':['תהליך עם עוזר',p('M3 4h8v8H3ZM3 21h8v8H3ZM21 21h8v8h-8ZM7 12v5h18v4'),spark],
'publish-sheets':['ערימת גיליונות ושליחה',p('M3 3h18v21H3ZM8 29h18V10'),p('M13 18h16m-6-6 6 6-6 6')],
'publish-views':['מסגרת מבט ושליחה',r(3,4,25,22)+p('M3 10h25M8 7h1m3 0h1'),p('M16 19h14m-5-5 5 5-5 5')],
'robot-check':['קישור לניתוח מבני',p('M4 28V5h23v23M4 5l23 23M27 5 4 28M4 17h23'),check],
'audit-view':['מסגרת ביקורת',r(3,3,21,21)+p('M7 9h12M7 15h7'),c(23,23,6)+p('m27 27 4 4')],
'verify-install':['מגן התקנה',shield,p('M16 8v14m-5-5 5 5 5-5')],
'stairs-check':['מדרגות ומרווח ראש',p('M3 28h7v-6h7v-6h7v-6h6'),p('M3 13 23 3M6 14v9m-2-3 2 3 2-3')],
'standards-audit':['רשימת אישורים',p('M14 7h14M14 16h14M14 25h14'),p('m3 6 3 3 5-6m-8 12 3 3 5-6m-8 12 3 3 5-6')],
'standards-fix':['מפתח תקן',list,p('M24 15a6 6 0 0 0-7 7L8 29l-4-4 10-9a6 6 0 0 0 7-7l-4 4 3 3Z')]
};
const seed=JSON.parse(fs.readFileSync('dist/seed.json','utf8'));const catalog={};
function svg(body,accent,mode){const ink='#0d1021',plum='#6b317f';return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><g transform="translate(4 4)" fill="none" stroke="${ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${mode==='symbol'?`<g fill="#ece1f1">${body}</g>`:body}<g stroke="${plum}" stroke-width="2.2">${accent}</g></g></svg>`}
// Overlay objects are intentionally scaled into a corner to keep both meanings readable.
const overlay=new Set([eye,tag,gear,search,link,ruler,house,list]);
const accent=a=>overlay.has(a)?`<g transform="translate(13 13) scale(.58)"><rect x="-2" y="-2" width="36" height="36" rx="5" fill="white" stroke="none"/>${a}</g>`:a;
for(const n of seed.nodes.filter(n=>n.type==='button'||n.type==='dropdown')){const d=D[n.id];if(!d)throw Error('Missing '+n.id);const b=d.length===6?d.slice(3):second[n.id];if(!b)throw Error('Missing second '+n.id);const options=[{key:'original',title:'מקורי',description:'האייקון מחבילת 3.9.3',src:n.icon}];for(const [mode,shape,title] of [['line',d.slice(0,3),'קווי'],['symbol',b,'סמלי']]){const file=`assets/alt-${n.id}-${mode}.svg`;fs.writeFileSync('dist/'+file,svg(shape[1],accent(shape[2]),mode));options.push({key:mode,title,description:shape[0],src:file});}catalog[n.id]=options;}
fs.writeFileSync('dist/icon-catalog.js','export const catalog = '+JSON.stringify(catalog,null,2)+';\n');
console.log(`Generated ${Object.keys(catalog).length*2} alternatives for ${Object.keys(catalog).length} tools and dropdowns.`);
