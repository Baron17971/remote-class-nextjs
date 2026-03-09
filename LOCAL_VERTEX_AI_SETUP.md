# הגדרת Vertex AI לוקאלית (מחשב חדש)

המדריך הזה מסביר בדיוק מה צריך לבצע במחשב חדש כדי שהפרויקט יעבוד לוקאלית מול Vertex AI כמו בסביבה הנוכחית.

## 1) דרישות מקדימות

יש להתקין:

- Node.js 20+ (כולל npm)
- Git
- Google Cloud CLI (`gcloud`)

בנוסף, צריך הרשאת גישה לפרויקט ה-GCP שבו האפליקציה עובדת.

## 2) שכפול הפרויקט והתקנת תלויות

```bash
git clone <your-repo-url>
cd remote-class-nextjs
npm install
```

## 3) יצירת `.env.local`

יש ליצור קובץ `.env.local` בשורש הפרויקט עם הערכים הבאים:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
GOOGLE_CLOUD_PROJECT=<your-gcp-project-id>
GOOGLE_CLOUD_LOCATION=global
GOOGLE_GENAI_USE_VERTEXAI=true
```

חשוב:

- לא להגדיר `VERCEL` בסביבה לוקאלית.
- לא להשתמש ב-`GEMINI_API_KEY` או `NEXT_PUBLIC_GEMINI_API_KEY` במסלול הזה.

## 4) אימות Google Cloud ל-ADC לוקאלי

להריץ:

```bash
gcloud auth login
gcloud config set project <your-gcp-project-id>
gcloud auth application-default login
gcloud auth application-default set-quota-project <your-gcp-project-id>
```

## 5) בדיקת API והרשאות

API נדרש ב-GCP:

```bash
gcloud services enable aiplatform.googleapis.com
```

למשתמש שמתחבר לוקאלית צריכות להיות לפחות ההרשאות:

- `roles/aiplatform.user`
- `roles/serviceusage.serviceUsageConsumer`

## 6) בדיקת תקינות ADC

להריץ:

```bash
gcloud auth application-default print-access-token
```

אם מתקבל access token - ה-ADC מוגדר תקין.

## 7) הרצת הפרויקט ובדיקת endpoint

להריץ:

```bash
npm run dev
```

בדיקה מהירה של ה-API (PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -ContentType "application/json" -Body '{"prompt":"כתוב משפט בדיקה קצר"}'
```

תוצאה צפויה: תגובת JSON עם שדה `text`.

## 8) תקלות נפוצות

- `401` / `UNAUTHENTICATED`:
  להריץ שוב `gcloud auth application-default login`.
- `403` / `PERMISSION_DENIED`:
  לבדוק הרשאות IAM על פרויקט GCP.
- `Missing GOOGLE_CLOUD_PROJECT`:
  לבדוק ש-`.env.local` קיים ולהפעיל מחדש `npm run dev`.
- חשבון Google לא נכון:
  להריץ `gcloud auth application-default revoke` ואז להתחבר מחדש.

## הערות

- בלוקאלי האימות מתבצע אוטומטית דרך ADC.
- ב-Vercel האימות מתבצע אוטומטית דרך OIDC + Workload Identity Federation.
- כל הקריאות ל-Vertex AI הן בצד שרת בלבד (`/api/chat`).
