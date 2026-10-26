const groups={
  "pipes": [
    {
      "key": "pipes-20261026-1",
      "title": "מעטפת U",
      "description": "קולטן בתוך מעטפת גבס משלושה צדדים",
      "src": "assets/choice-pipes-1.svg"
    },
    {
      "key": "pipes-20261026-2",
      "title": "פינת בידוד",
      "description": "קולטן ליד פינה עם קיר בידוד בצורת L",
      "src": "assets/choice-pipes-2.svg"
    },
    {
      "key": "pipes-20261026-3",
      "title": "חתך שכבות",
      "description": "צינור עטוף בשכבות בידוד",
      "src": "assets/choice-pipes-3.svg"
    },
    {
      "key": "pipes-20261026-4",
      "title": "קולטן אנכי",
      "description": "צינור אנכי עם חיפוי ומחברים",
      "src": "assets/choice-pipes-4.svg"
    }
  ],
  "auto": [
    {
      "key": "auto-20261026-1",
      "title": "מסגרת חכמה",
      "description": "מסגרת תחום עם ניצוץ אוטומציה",
      "src": "assets/choice-auto-1.svg"
    },
    {
      "key": "auto-20261026-2",
      "title": "התאמה למבנה",
      "description": "תחום שמתאים את עצמו לקווי הבניין",
      "src": "assets/choice-auto-2.svg"
    },
    {
      "key": "auto-20261026-3",
      "title": "נפח אוטומטי",
      "description": "קופסת תחום תלת ממדית עם ניצוץ",
      "src": "assets/choice-auto-3.svg"
    },
    {
      "key": "auto-20261026-4",
      "title": "מיקוד בתחום",
      "description": "מסגרת עם חצים המתכנסים אל תחום העבודה",
      "src": "assets/choice-auto-4.svg"
    }
  ]
};
export function extraOptions(n){const keys=[n.id,n.label,n.source?.id,n.source?.command].filter(Boolean).map(x=>x.toLowerCase().replace(/[^a-z0-9]/g,''));if(keys.some(x=>['pipes','pipeisolation','d97212b5ab3946b793640cc07ce8a5c0'].includes(x)))return groups.pipes;if(keys.some(x=>['autoscopebox','autoscopeboxes'].includes(x)||x.endsWith('autoscopeboxcommand')))return groups.auto;return [];}
