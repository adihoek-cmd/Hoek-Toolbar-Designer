# לקלוד — מה להחזיר בסיום תיקוני Hoek Ribbon

המשך את התיקונים לפי ה־Publish האחרון שכבר קיבלת ממני. בסיום, החזר חבילת התקנה ודוח מובנה כדי שאוכל לייבא את הדיווחים ל־Hoek Ribbon Studio, להשוות כל דיווח להערה המקורית ולבדוק את הכלים ב־Revit.

## כללי העבודה והדיווח

- אל תסמן כלי כ״נבדק ותקין״ בשמי. `fixed` משמעו שאתה מדווח שהתיקון מומש; האישור הסופי נשאר שלי לאחר בדיקה ב־Revit.
- התייחס לכל כפתור בנפרד. אם לא השלמת את כל הבקשה, דווח `partial`; אם לא תיקנת, דווח `not_fixed`. כתוב מה נשאר ומדוע. אל תכניס כפתורים שלא טופלו רק כדי לסמן אותם כמתוקנים.
- העתק במדויק את `state.nodes[].id` מה־Publish לשדה `nodeId`. אל תמציא מזהים ואל תשתמש בשם הכפתור במקום מזהה. אם לא מצאת מזהה, רשום זאת ב־MD כבעיה פתוחה, בלי להוסיף רשומה מומצאת ל־JSON.
- העתק את `notes` המקורי ל־`originalNote` ואת `fix` המקורי ל־`originalFix`, כולל עברית ושורות חדשות. שדה ריק נשאר מחרוזת ריקה. אל תנסח מחדש את ההערה המקורית.
- תאר ב־`claimedFix` מה שינית בפועל, איך זה עונה לבקשה ומה השתנה בהתנהגות. הפרד בין שינוי בקוד, הצלחת build ובדיקה שבוצעה בפועל בתוך Revit.
- לכל `fixed` כתוב לפחות צעד בדיקה אחד ב־`testSteps`, כולל הכנה, פעולה ותוצאה צפויה. כתוב מקרי קצה רלוונטיים.
- ב־`testsPerformed` כתוב רק בדיקות שביצעת ואת תוצאותיהן. אם לא בדקת ב־Revit, אמור זאת מפורשות; הצלחת build אינה בדיקת Revit. אל תמציא תוצאות.
- אל תשנה את הערותיי, בחירות האייקונים, סדר הכפתורים או הסטטוסים האישיים כדי להציג השלמה. הדוח מיובא כתוספת למעקב, לא כגיבוי שמחליף את התכנון שלי.

## הקבצים שעליך למסור

1. ZIP של חבילת ההתקנה המעודכנת, עם גרסת DLL מדויקת, קובצי המקור הדרושים לבנייה, manifest וקובץ הוראות התקנה/חזרה לגרסה קודמת. צרף SHA-256 של ה־ZIP וה־DLL בדוח הסיכום.
2. `hoek-repair-report.json` בפורמט המדויק שלהלן, UTF-8, ללא הערות JSON וללא עטיפת Markdown.
3. `REPAIR-SUMMARY.md` המסכם מה תוקן, מה חלקי, מה לא תוקן, קבצים ששונו, בדיקות שבוצעו, מגבלות וצעדי בדיקה ידניים. ציין בו במפורש איזו חבילה צריך להתקין לפני בדיקת כלים אלה.

## פורמט JSON — גרסה 1

הדוגמה היא תבנית בלבד. החלף את תיאורי הדוגמה בפרטים אמיתיים. השתמש רק במזהי כלים קיימים מה־Publish. שדות הרשימות נדרשים גם כשהם ריקים.

```json
{
  "format": "hoek-repair-report",
  "version": 1,
  "reportId": "UNIQUE-REPORT-ID",
  "publishId": "COPY-PUBLISH-ID-IF-PRESENT",
  "packageVersion": "ACTUAL-NEW-PACKAGE-VERSION",
  "generatedAt": "2026-10-23T12:00:00Z",
  "items": [
    {
      "nodeId": "lot-line-walls",
      "result": "fixed",
      "originalNote": "העתק כאן את notes המקורי, ללא שינוי",
      "originalFix": "העתק כאן את fix המקורי, ללא שינוי",
      "claimedFix": "תיאור קונקרטי של השינוי שיושם בפועל",
      "testSteps": [
        "הכנת מודל לבדיקה; הפעולה לביצוע; התוצאה המדויקת הצפויה"
      ],
      "testsPerformed": [
        "ציין בדיקה שבוצעה בפועל ואת תוצאתה, או במפורש שלא נבדק בתוך Revit"
      ],
      "remainingIssues": [],
      "changedFiles": ["relative/path/to/changed-file.cs"]
    }
  ]
}
```

- `reportId`: מזהה ייחודי קבוע לכל מסירה, למשל UUID. ייבוא חוזר של אותו דוח לא מאפס את הבדיקות שלי. דוח מתוקן חייב מזהה חדש ותאריך מסירה חדש.
- `publishId`: העתק את השדה מהשורש של מפרט ה־Publish. אם ה־Publish הקודם אינו מכיל אותו, השתמש ב־`""`; אל תמציא מזהה. במקרה זה האפליקציה תציג שהציטוט המקורי טרם אומת מול Publish שמור.
- `packageVersion`: גרסת החבילה שאתה מוסר, לא גרסת האפליקציה ולא הגרסה הקודמת.
- `generatedAt`: מועד המסירה האמיתי בפורמט ISO 8601 עם אזור זמן, לדוגמה UTC עם `Z`. אל תעתיק את תאריך הדוגמה. דוח ישן יותר לא ידרוס דיווח חדש יותר על אותו כלי.
- `result`: אחד בלבד מתוך `fixed`, `partial`, `not_fixed`.
- רשומה אחת לכל `nodeId` בדוח. אם היו כמה תקלות לאותו כפתור, פרט את כולן באותה רשומה והשתמש ב־`partial` אם משהו נשאר פתוח.
- אל תכלול HTML, קוד להרצה, סיסמאות, טוקנים או קבצים מקומיים מלאים ב־JSON. תוכנו הוא טקסט תיעודי בלבד.

## לפני המסירה

בדוק שה־JSON תקין, שאין מזהי כפתורים כפולים, שכל המזהים תואמים ל־Publish, ושכל `fixed` כולל הוראות בדיקה. ודא שהגרסה בדוח היא אותה גרסה שב־ZIP וב־DLL. החזר את שלושת הקבצים יחד; אין צורך לשנות ישירות את מסד הנתונים או את אתר התכנון.

## איך אקלוט את המסירה באפליקציה

בתפריט ⋯ אבחר ״ייבוא דוח תיקונים מקלוד״ ואבחר את קובץ ה־JSON. האפליקציה מציגה תצוגה מקדימה; רק אישור הקליטה מוסיף את הדיווחים. כלים שדווחו כ־`fixed` יקבלו סימן ״תוקן — יש לבדוק״. בלחיצה על דוח התיקון אוכל לראות את ההערה המקורית, טענת התיקון והוראות הבדיקה, ואז לאשר ״בדקתי ותקין״ או ״עדיין דורש תיקון״. ייבוא הדוח אינו מתקין את התוסף ב־Revit.


## Per-button version and concise change summary
For each changed button in actual.nodes, Claude MUST send both changedInVersion (e.g. "3.9.9") and changeSummary (1–500 characters, preferably one short Hebrew sentence describing the actual change). changedInVersion is the version where that specific change first shipped, and must not exceed packageVersion. Preserve these fields on unchanged buttons in subsequent full deliveries. Omit both only if no verified change history is known; never invent history. These fields appear in the button card and editor and do not affect layout matching.

For behavioral fixes, also push hoek-repair-report. Each changed item should include fixedInVersion and changeSummary alongside the full claimedFix, originalNote, originalFix and testSteps. fixedInVersion is the first version containing the fix; packageVersion is the reported package. Existing reports without these fields remain supported: the card displays packageVersion and an excerpt of claimedFix. A report never automatically marks a button tested/OK.

Example item additions: {"fixedInVersion":"3.9.9","changeSummary":"תוקן חישוב המידות ונשמר מיקום הכפתור בקבוצת התכנון."}. For actual.nodes use changedInVersion instead of fixedInVersion.
