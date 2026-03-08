'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sprout, BookOpen, Wheat, Sparkles, Download, FileEdit, CheckCircle2, AlertCircle, Loader2, PlusCircle, Pointer, MessageCircleQuestion, Presentation, Upload, FileText, FileCode, FileDown, Layout, ArrowLeft, ArrowRight, Save, FolderOpen, Trash2, X, User, Users, Lock, LogOut, Settings, KeyRound, Settings2, ChevronDown, ChevronUp, Cpu, Network, Clock, Rocket } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  insertPlan,
  listPlans,
  removePlan,
  restoreSession,
  signInWithPassword,
  signOutSession,
  signUpWithPassword,
  updatePlanVisibility,
  updateUserMetadata,
} from './lib/supabaseRest';
import homeBg from './assets/home_bg.png';

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

// Helper component to render simple Markdown links [text](url)
const MarkdownText = ({ text, className = "" }: { text: string; className?: string }) => {
  if (!text) return null;
  
  // Regular expression to match [text](url)
  const parts = text.split(/(\[.*?\]\(.*?\))/g);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [_, linkText, url] = match;
          return (
            <a 
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lilac-300 hover:text-lilac-400 underline decoration-lilac-300/30 underline-offset-4 transition-colors font-bold inline-flex items-center gap-1 mx-1"
              onClick={(e) => e.stopPropagation()}
            >
              {linkText}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
};

const PHASES = {
  harish: {
    id: 'harish',
    title: 'חריש',
    subtitle: 'הכנת הקרקע - פתיחת שיעור',
    duration: '10 דקות',
    goal: 'יצירת עניין מקדים וגירוי הסקרנות לקראת הנושא החדש.',
    color: 'harish-blue',
    theme: {
      border: 'border-white/20 hover:border-harish-blue',
      bgHeader: 'bg-harish-blue',
      bgLight: 'bg-white/5',
      text: 'text-white',
      ring: 'focus-within:ring-harish-blue/20'
    },
    ideas: [
      'שאלת טריוויה או חידה ב-Kahoot',
      'ניסוי ביתי קטן או צילום תופעה',
      'סקר דילמות קצר',
      'שיתוף ציטוט של דמות משמעותית'
    ],
    toolsPlaceholder: 'לדוגמה: Kahoot, Google Forms, WhatsApp',
    icon: Sprout
  },
  zria: {
    id: 'zria',
    title: 'זריעה',
    subtitle: 'הקנייה פעילה ועבודה - לב השיעור',
    duration: '30-40 דקות',
    goal: 'הקנייה קצרה ע"י המורה ולאחריה עבודה אקטיבית של התלמידים (עצמאית או בקבוצות).',
    color: 'sage-green',
    theme: {
      border: 'border-white/20 hover:border-sage-green',
      bgHeader: 'bg-sage-green',
      bgLight: 'bg-white/5',
      text: 'text-white',
      ring: 'focus-within:ring-sage-green/20'
    },
    ideas: [
      'הקנייה בעזרת מצגת או סרטון קצר',
      'עבודה פעילה בחדרים נפרדים (Breakout rooms)',
      'עבודה עצמית או בזוגות על משימה ממוקדת',
      'בדיקת קשב ומתן תפקידים לתלמידים'
    ],
    toolsPlaceholder: 'לדוגמה: Mentimeter, Zoom Rooms, Nearpod',
    icon: BookOpen
  },
  katzir: {
    id: 'katzir',
    title: 'קציר',
    subtitle: 'הצגת תוצרים וסיכום - סוף השיעור',
    duration: '10 דקות',
    goal: 'הצגת תוצרי עבודת התלמידים במליאה, רפלקציה וסיכום של השיעור על ידי התלמידים.',
    color: 'lilac-300',
    theme: {
      border: 'border-white/20 hover:border-lilac-300',
      bgHeader: 'bg-lilac-300',
      bgLight: 'bg-white/5',
      text: 'text-white',
      ring: 'focus-within:ring-lilac-300/20'
    },
    ideas: [
      'הצגת תוצרים במליאה מנציגי הקבוצות',
      'לוח Padlet לרפלקציה וסיכום',
      'מתודת Think-Pair-Square-Share',
      'מתן מטלת "חריש" לשיעור הבא'
    ],
    toolsPlaceholder: 'לדוגמה: Padlet, Google Slides, Linoit',
    icon: Wheat
  }
};

const PHASE_TITLE_LIGHT_COLORS: Record<string, string> = {
  harish: '#8FA7E6',
  zria: '#7C8A6D',
  katzir: '#CCA1C6'
};

const SUBJECTS = [
  'מתמטיקה', 'אנגלית', 'שפה ועברית', 'מדעים', 'היסטוריה',
  'גיאוגרפיה', 'אזרחות', 'תנ״ך', 'ספרות', 'פיזיקה',
  'כימיה', 'ביולוגיה', 'מחשבים וסייבר', 'חינוך גופני',
  'אמנות', 'מוזיקה', 'חינוך/כישורי חיים', 'ייעוץ',
  'חינוך פיננסי', 'ערבית', 'ביוטכנולוגיה', 'צרפתית',
  'אומנות', 'תיאטרון', 'אחר'
];

const ENTRY_TICKETS = [
  { title: 'הפוסט החסר', description: 'אם השיעור הקודם היה סרטון בטיקטוק או ביוטיוב – איך הייתם קוראים לו, ואיזו מוזיקה הייתה מתנגנת ברקע?' },
  { title: 'נכון או לא נכון', description: 'על הלוח יופיע משפט מהחומר הקודם. כתבו אם הוא נכון או לא נכון, והוסיפו נימוק קצר.' },
  { title: 'במילה אחת בלבד', description: 'באיזו מילה אחת הייתם מתארים את התחושה שלכם לגבי הנושא שנלמד היום?' },
  { title: 'המומחה האורח', description: 'אילו הייתה לכם הזדמנות לראיין מומחה לנושא של היום – מה הייתה השאלה הראשונה שהייתם שואלים?' },
  { title: 'שליפת ידע מהירה', description: 'כתבו שלושה מושגים שעולים לכם בראש כשאתם שומעים את נושא השיעור.' },
  { title: 'הקשר האישי', description: 'מתי לאחרונה נתקלתם בנושא הזה בבית, ברחוב, ברשת או בחדשות?' },
  { title: 'תיקון טעות', description: 'על הלוח מופיעה טעות. מצאו אותה וכתבו מה צריך להיות נכון.' },
  { title: 'סולם מוכנות 1–5', description: 'עד כמה אתם מרגישים מוכנים לשיעור היום? 1 – הראש עדיין במיטה, 5 – מוכן/ה לטרוף את החומר' },
  { title: 'מה למדתי מאז', description: 'האם מאז השיעור הקודם חשבתם על משהו שלמדנו? כתבו מחשבה, שאלה או תובנה קצרה.' },
  { title: 'האתגר המקדים', description: 'הנה חידה או תרגיל קטן שקשורים לשיעור של היום. נסו לנחש איך פותרים, עוד לפני שלמדנו.' },
  { title: 'מה בתמונה?', description: 'הציגו תמונה הקשורה לנושא השיעור ובקשו: מה אתם רואים? מה לדעתכם הקשר לנושא שנלמד היום?' },
  { title: 'ניבוי שיעור', description: 'לפי כותרת השיעור בלבד – מה לדעתכם נלמד היום?' },
  { title: 'אני כבר יודע/ת ש...', description: 'כתבו דבר אחד שאתם כבר יודעים על הנושא.' },
  { title: 'אני חושב/ת ש...', description: 'השלימו את המשפט: "אני חושב/ת שהנושא הזה חשוב כי..."' },
  { title: 'שאלת פתיחה מסקרנת', description: 'כתבו שאלה אחת שמסקרן אתכם לבדוק היום.' },
  { title: 'דירוג ביטחון', description: 'עד כמה אתם בטוחים בידע הקודם שלכם בנושא? נמוך / בינוני / גבוה, והסבירו במילה או שתיים.' },
  { title: 'מושג ומדוע', description: 'כתבו מושג אחד מהשיעור הקודם והסבירו למה בחרתם דווקא בו.' },
  { title: 'חיבור לעולם האמיתי', description: 'איפה לדעתכם הנושא הזה פוגש את החיים האמיתיים?' },
  { title: 'מה לא ברור לי עדיין', description: 'לפני שמתחילים – מהו דבר אחד מהחומר הקודם שעדיין לא יושב לכם טוב?' },
  { title: 'בחירה מהירה', description: 'מה הכי מתאים לנושא של היום: תופעה, תהליך, בעיה, פתרון או ויכוח? נמקו בקצרה.' }
];

const EXIT_TICKETS = [
  { title: 'מדרגות ההבנה', description: 'סמנו על גרם מדרגות: איפה אתם נמצאים עכשיו בהבנת החומר – בתחילת הדרך, באמצע, או כמעט למעלה?' },
  { title: 'התקצירן', description: 'כתבו משפט אחד שמסכם את השיעור למישהו שלא היה בכיתה.' },
  { title: 'מה הציק לי?', description: 'מה היה הרגע שבו הרגשתם הכי הרבה קושי, בלבול או חוסר ודאות?' },
  { title: 'מכתב לעצמי', description: 'כתבו לעצמכם עצה אחת לשיעור הבא שתעזור לכם להצליח יותר.' },
  { title: 'האימוג\'י המלמד', description: 'בחרו אימוג’י שמתאר את רמת ההבנה שלכם היום, והסבירו למה.' },
  { title: 'שאלה למבחן', description: 'נסחו שאלת בונוס אפשרית על סמך מה שלמדנו היום.' },
  { title: 'דלת פתוחה', description: 'כתבו דבר אחד שעזר לכם להבין היום, ודבר אחד שהייתם משנים בשיעור.' },
  { title: 'הקשר בין-תחומי', description: 'איך הנושא של היום מתחבר למקצוע אחר שאתם לומדים?' },
  { title: 'הערת שוליים', description: 'כתבו עובדה אחת מעניינת, מפתיעה או חדשה שלמדתם היום.' },
  { title: 'פיצוח מושג המפתח', description: 'מהו לדעתכם מושג המפתח של השיעור? כתבו אותו והדגישו אותו.' },
  { title: 'שלושה דברים', description: 'כתבו: דבר אחד חדש שלמדתי, דבר אחד שהבנתי טוב, ודבר אחד שאני עדיין רוצה לשאול.' },
  { title: 'כותרת לשיעור', description: 'תנו לשיעור של היום כותרת קצרה ומדויקת.' },
  { title: 'המשפט שהייתי זוכר/ת', description: 'אם מותר לקחת מהשיעור רק משפט אחד – מה הוא יהיה?' },
  { title: 'לפני ואחרי', description: 'לפני השיעור חשבתי ש..., ועכשיו אני מבין/ה ש...' },
  { title: 'שאלת המשך', description: 'איזו שאלה חדשה נולדה לכם בעקבות מה שלמדנו היום?' },
  { title: 'מדד בהירות', description: 'עד כמה החומר ברור לכם עכשיו? 1 – כמעט לא ברור, 5 – ברור מאוד. הוסיפו הסבר קצר.' },
  { title: 'יישום', description: 'איפה אפשר להשתמש במה שלמדנו היום?' },
  { title: 'טעות שנמנעת עכשיו', description: 'מהי טעות שכנראה לא תעשו יותר אחרי השיעור הזה?' },
  { title: 'מושג אחד להסביר לחבר', description: 'בחרו מושג אחד מהשיעור והסבירו אותו במשפט פשוט.' },
  { title: 'השלמת משפט', description: 'הדבר הכי חשוב שאני לוקח/ת מהשיעור היום הוא...' }
];

const PEDAGOGY_METHODS = [
  {
    category: 'מהלך השיעור (למידה פעילה)',
    methods: [
      {
        title: 'מודל ה-TPS (Think-Pair-Share)',
        description: 'Think (חשוב): כל תלמיד חושב לבד במשך דקה. Pair (הזדווג): שיתוף בן/בת הזוג. Share (שתף): שיתוף המליאה כולה.',
        extra: 'ה-S הנוספת (Square/Solo): שני זוגות חוברים לרביעייה לפני השיתוף במליאה.'
      },
      {
        title: '"שולחן עגול" (Round Table)',
        description: 'דף אחד ועט אחד במרכז הקבוצה. המורה נותן משימה, התלמידים מעבירים את הדף בסבב וכל אחד מוסיף רעיון אחד.',
        extra: 'מחייב הקשבה (כדי לא לחזור על דברים) ושיתוף פעולה מלא.'
      },
      {
        title: '"ג׳יגסו" (Jigsaw - שיטת התצרף)',
        description: 'הכיתה מחולקת לקבוצות אם. כל חבר מקבל תת-נושא, נפגש עם "מומחים" אחרים לאותו נושא, וחוזר ללמד את קבוצת האם.',
        extra: 'אי אפשר להשלים את התמונה בלי אף חבר בקבוצה.'
      },
      {
        title: '"הליכת גלריה" (Gallery Walk)',
        description: 'תולים פוסטרים עם שאלות/גרפים. התלמידים מסתובבים בזוגות בין התחנות, דנים ומוסיפים תגובות על גבי הפוסטר.',
        extra: 'מתודה אקטיבית שמוציאה את התלמידים מהכיסאות.'
      },
      {
        title: '"קרוסלה" (Rotating Stations)',
        description: 'בכל תחנה משימה קצרה. בכל 3-5 דקות נשמע צלצול והקבוצות עוברות לתחנה הבאה.',
        extra: 'יוצר קצב אנרגטי וגבוה בשיעור.'
      },
      {
        title: '"מפגש פסגה" (Four Corners)',
        description: 'ארבע פינות בכיתה (מסכים מאוד, מסכים, מתנגד, מתנגד מאוד). תלמידים הולכים לפינה המייצגת את דעתם ודנים.',
        extra: 'לבירור עמדות או פתרון בעיות.'
      },
      {
        title: '"דג בתוך צנצנת" (Fishbowl)',
        description: '4-5 כיסאות במעגל פנימי ("הצנצנת") והשאר בחיצוני. רק מי שבפנים מדבר. חיצוני יכול להחליף פנימי כדי להשתתף.',
        extra: 'מייצר הקשבה פעילה ודיון מסודר מאוד.'
      },
      {
        title: '"מספרים מתערבבים" (Numbered Heads Together)',
        description: 'בכל קבוצה ממוספרים (1-4). המורה קורא למספר אקראי (למשל: "כל מספר 3 לענות!").',
        extra: 'כולם חייבים לוודא שכולם הבינו, כי לא יודעים מי ייקרא לענות.'
      },
      {
        title: 'שישה כובעי חשיבה',
        description: 'כל קבוצה או חבר בוחנים את הנושא דרך "כובע" אחר: עובדות, רגשות, ביקורת, אופטימיות, יצירתיות, ניהול תהליך.',
        extra: 'מצוין לניתוח עמוק ומאוזן של סוגיה.'
      },
      {
        title: 'משחק תפקידים',
        description: 'כל קבוצה מייצגת דמות, גורם, תא, מוסד או מדינה ופועלת מתוך נקודת המבט הזו.',
        extra: 'מתאים מאוד לסוגיות חברתיות, מדעיות ואתיות.'
      },
      {
        title: 'חפש את הטעות',
        description: 'הקבוצה מקבלת טקסט, פתרון או תרשים עם טעויות מכוונות, ועליה לאתר ולתקן אותן.',
        extra: 'מעורר מעורבות וחשיבה ביקורתית.'
      },
      {
        title: 'משימת הישרדות קבוצתית',
        description: 'הקבוצה צריכה להגיע להסכמה על סדר עדיפויות, בחירה בין אפשרויות או פתרון בתנאי לחץ.',
        extra: 'מעולה להנמקה, קבלת החלטות ושיח.'
      },
      {
        title: 'תעלומת חקר',
        description: 'הקבוצה מקבלת רמזים, קטעי מידע או "עדויות", וצריכה לפתור תעלומה או להגיע למסקנה.',
        extra: 'יוצר מתח, עניין וחשיבה אנליטית.'
      },
      {
        title: 'בניית תוצר חזותי',
        description: 'הקבוצה יוצרת אינפוגרפיקה, פוסטר, ציר זמן, דגם, קומיקס או תרשים.',
        extra: 'מתאים ללומדים חזותיים ולתוצר מסכם.'
      },
      {
        title: 'אתגר זמן',
        description: 'הקבוצה מקבלת משימה עם מגבלת זמן ברורה.',
        extra: 'מעלה אנרגיה, מיקוד ושיתוף פעולה במשימות קצרות.'
      },
      {
        title: 'ניתוח מקרה',
        description: 'הקבוצה מקבלת מקרה אמיתי או דמיוני, מזהה את הבעיה, מנתחת אפשרויות ומציעה פתרון.',
        extra: 'מצוין במדעים, חינוך, רפואה ואזרחות.'
      },
      {
        title: 'קוביית שאלות',
        description: 'הקבוצה מטילה קובייה עם סוגי שאלות: תאר, השווה, הסבר, נתח, דמיין, הערך.',
        extra: 'כך כל קבוצה מעבדת את הנושא מזווית אחרת.'
      },
      {
        title: 'טיעון–ראיה–הסבר',
        description: 'הקבוצה נדרשת לנסח טענה, להביא ראיה ולבנות הסבר.',
        extra: 'מעולה לעבודת חקר, ניתוח מקורות או נימוק מדעי.'
      },
      {
        title: 'אתגר "בנה ולמד"',
        description: 'הקבוצה מקבלת חומרים (וירטואליים או פיזיים) וצריכה לבנות דגם, פתרון או המחשה.',
        extra: 'מתאים למשימות STEM וחשיבה יצירתית.'
      },
    ]
  },
  {
    category: 'סיכום ורפלקציה',
    methods: [
      {
        title: 'מודל ה-3-2-1',
        description: '3 דברים חדשים שלמדתי, 2 דברים שעניינו אותי, 1 שאלה שנותרה פתוחה.',
        extra: 'המודל הקלאסי והיעיל ביותרלסיכום.'
      },
      {
        title: '"הציוץ האחרון"',
        description: 'סיכום השיעור ב-280 תווים בלבד (כמו ציוץ ב-X) בתוספת האשטאג יצירתי.',
        extra: 'יצירתי ומתחבר לעולם התוכן של התלמידים.'
      },
      {
        title: 'רמזור ההבנה',
        description: '🟢 ירוק: הבנתי הכל. 🟡 צהוב: הבנתי רוב, צריך תרגול. 🔴 אדום: עדיין מבולבל.',
        extra: 'מהיר ומספק חיווי מיידי למורה.'
      },
      {
        title: 'שיטת ה-SMS',
        description: '"דמיינו שאתם שולחים וואטסאפ למישהו בבית. ספרו לו במשפט אחד: מה עשינו היום ומה היה הכי מעניין?"',
        extra: 'מפשט את החומר לרמה של תקשורת יומיומית.'
      },
      {
        title: 'כרטיס "היהלום והבוץ"',
        description: 'היהלום: רעיון אחד שנצץ לך. הבוץ: משהו שהיה לא ברור או שנתקעת בו.',
        extra: 'מאפשר למורה לזהות "בורות" בלמידה.'
      },
      {
        title: 'המזוודה והפח',
        description: 'למזוודה: מושג שלוקחים להמשך הדרך. לפח: מחשבה מעכבת שהחלטת להיפטר ממנה.',
        extra: 'עוזר בניקיון רגשי ותודעתי לקראת השיעור הבא.'
      },
      {
        title: 'האשטאג השיעור (#)',
        description: 'מתן 3 האשטאגים לשיעור של היום (למשל: #קיפול_זה_הכל).',
        extra: 'קליט ומהיר.'
      },
      {
        title: 'שיטת "הפוסט-איט" האנונימי',
        description: 'כתיבת דבר אחד שהובן ודבר אחד שלא הובן על פתק דביק והדבקתו על הלוח.',
        extra: 'מאפשר כנות ללא חשש מביקורת.'
      }
    ]
  }
];

const GRADES = [
  'כיתה א׳', 'כיתה ב׳', 'כיתה ג׳', 'כיתה ד׳', 'כיתה ה׳', 'כיתה ו׳',
  'כיתה ז׳', 'כיתה ח׳', 'כיתה ט׳', 'כיתה י׳', 'כיתה י״א', 'כיתה י״ב'
];

interface SavedPlan {
  id: string;
  user_id?: string;
  is_public?: boolean;
  date: string;
  lessonDetails: any;
  planData: any;
  advancedOptions?: any;
}

interface UserProfile {
  id: string;
  name: string;
  email?: string;
  password?: string;
  isUnlimited?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('harish');
  const [currentStep, setCurrentStep] = useState<'home' | 'setup' | 'editor'>('home');
  const [isLoading, setIsLoading] = useState<string | boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<string | boolean>(false);
  const [isSlideLoading, setIsSlideLoading] = useState(false);
  const [isConceptsLoading, setIsConceptsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLibsReady, setIsLibsReady] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isDiffLoading, setIsDiffLoading] = useState<string | boolean>(false);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [isSavedPlansModalOpen, setIsSavedPlansModalOpen] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    useAITools: false,
    useDifferential: false
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [authInput, setAuthInput] = useState({ name: '', email: '', password: '' });
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [isPlansLoading, setIsPlansLoading] = useState(false);
  const [plansTab, setPlansTab] = useState<'mine' | 'public'>('mine');
  const [isPedagogyModalOpen, setIsPedagogyModalOpen] = useState(false);
  const [unsharingPlanId, setUnsharingPlanId] = useState<string | null>(null);
  const [sessionGenerations, setSessionGenerations] = useState(0);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterAgeGroup, setFilterAgeGroup] = useState('');

  const checkSessionQuota = () => {
    if (userProfile?.isUnlimited) return true;
    return sessionGenerations < 10;
  };

  const incrementSessionQuota = () => {
    if (!userProfile?.isUnlimited) {
      setSessionGenerations(prev => prev + 1);
    }
  };

  const checkWeeklyQuota = () => {
    if (userProfile?.isUnlimited) return true;
    
    const now = new Date();
    const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    
    const weeklyPlans = savedPlans.filter(plan => {
      const planTime = parseInt(plan.id);
      return !isNaN(planTime) && planTime > oneWeekAgo && plan.user_id === userProfile?.id;
    });
    
    return weeklyPlans.length < 3;
  };

  const fetchPlans = async (targetUserId?: string, token?: string) => {
    const userId = targetUserId || userProfile?.id;
    const authToken = token || accessToken;
    if (!userId || !authToken) { return; }
    setIsPlansLoading(true);
    try {
      const data = await listPlans(userId, authToken);
      const transformedPlans: SavedPlan[] = data.map(p => ({
        id: p.id,
        user_id: p.user_id,
        is_public: p.is_public,
        date: p.date,
        lessonDetails: p.lesson_details,
        planData: p.plan_data,
        advancedOptions: p.advanced_options
      }));
      setSavedPlans(transformedPlans);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
    } finally {
      setIsPlansLoading(false);
    }
  };



  const applyPromoCode = async (code: string) => {
    if (code.trim() === 'REMOTE-VIP-2024') {
      try {
        if (!accessToken) throw new Error('Missing auth session');
        await updateUserMetadata(accessToken, { is_unlimited: true });
        
        setUserProfile(prev => prev ? { ...prev, isUnlimited: true } : null);
        setSuccessMsg('קוד הופעל בהצלחה! יש לך כעת גישה ללא הגבלה. ✨');
        setPromoCode('');
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (err: any) {
        setErrorMsg('שגיאה בעדכון הפרופיל: ' + err.message);
      }
    } else {
      setErrorMsg('קוד הטבה לא תקין.');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };



  const [lessonDetails, setLessonDetails] = useState({
    subject: '',
    topic: '',
    ageGroup: '',
    duration: '60 דקות',
    additionalContext: '',
    slideTopics: ''
  });

  const [planData, setPlanData] = useState({
    harish: { activity: '', tools: '', suggestions: [] as any[], details: '', differentiation: '' },
    zria: { activity: '', tools: '', suggestions: [] as any[], details: '', differentiation: '' },
    katzir: { activity: '', tools: '', suggestions: [] as any[], details: '', differentiation: '' }
  });

  const activePhaseTitleColor = PHASE_TITLE_LIGHT_COLORS[activeTab] || '#7C8A6D';

  const hasLastPlan = (Object.values(planData) as any[]).some((phase) =>
    Boolean(
      phase.activity?.trim() ||
      phase.tools?.trim() ||
      phase.details?.trim() ||
      phase.differentiation?.trim() ||
      (Array.isArray(phase.suggestions) && phase.suggestions.length > 0)
    )
  );

  useEffect(() => {
    // Plans are loaded from Supabase only (no plan persistence in localStorage).
    restoreSession().then((session) => {
      if (session?.user) {
        const fullName = typeof session.user.user_metadata?.full_name === 'string' ? session.user.user_metadata.full_name : '';
        const email = typeof session.user.email === 'string' ? session.user.email : undefined;
        const name = fullName || email || 'משתמש';
        const isUnlimited = !!session.user.user_metadata?.is_unlimited;
        setAccessToken(session.accessToken);
        setUserProfile({ id: session.user.id, name, email, isUnlimited });
        setIsAuthenticated(true);
        setCurrentStep('setup');
        fetchPlans(session.user.id, session.accessToken);
      } else {
        setAccessToken(null);
        setUserProfile(null);
        setIsAuthenticated(false);
        setSavedPlans([]);
        setCurrentStep('home');
      }
    });

    const loadScript = (id: string, src: string) => new Promise((resolve) => {
      if (document.getElementById(id)) return resolve(true);
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.onload = () => resolve(true);
      document.body.appendChild(script);
    });

    Promise.all([
      loadScript('jszip-script', 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/libs/jszip.min.js'),
      loadScript('pdfjs-script', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js'),
      loadScript('mammoth-script', 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js')
    ]).then(() => {
      if ((window as any).pdfjsLib) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      }
      loadScript('pptxgenjs-script', 'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.min.js').then(() => {
        setIsLibsReady(true);
      });
    });

  }, []);

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLessonDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileLoading(true);
    setErrorMsg('');

    try {
      let extractedText = '';
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (['txt', 'csv', 'md'].includes(ext || '')) {
        extractedText = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsText(file);
        });
      } 
      else if (['docx'].includes(ext || '')) {
        if (!(window as any).mammoth) throw new Error("ספריית קריאת קבצי Word עדיין נטענת ברקע, נסה שוב בעוד מספר שניות.");
        const arrayBuffer = await file.arrayBuffer();
        const result = await (window as any).mammoth.extractRawText({ arrayBuffer });
        extractedText = result.value;
      } 
      else if (['pdf'].includes(ext || '')) {
        if (!(window as any).pdfjsLib) throw new Error("ספריית קריאת קבצי PDF עדיין נטענת ברקע, נסה שוב בעוד מספר שניות.");
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await (window as any).pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
        extractedText = fullText;
      } 
      else if (['pptx'].includes(ext || '')) {
        if (!(window as any).JSZip) throw new Error("ספריית קריאת המצגות עדיין נטענת ברקע, נסה שוב בעוד מספר שניות.");
        const arrayBuffer = await file.arrayBuffer();
        const zip = await (window as any).JSZip.loadAsync(arrayBuffer);
        let fullText = '';
        const slideRegex = /ppt\/slides\/slide\d+\.xml/;
        for (const relativePath in zip.files) {
          if (slideRegex.test(relativePath)) {
            const xmlContent = await zip.files[relativePath].async('text');
            const matches = xmlContent.match(/<a:t>([\s\S]*?)<\/a:t>/g);
            if (matches) {
                fullText += matches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ') + '\n';
            }
          }
        }
        extractedText = fullText;
      } 
      else {
        throw new Error('פורמט קובץ לא נתמך. אנא העלו PDF, Word (docx), PPTX, או TXT.');
      }

      if (!extractedText.trim()) {
        throw new Error('לא נמצא טקסט קריא בקובץ זה.');
      }

      setLessonDetails(prev => ({
        ...prev,
        additionalContext: prev.additionalContext ? prev.additionalContext + '\n\n--- תוכן מהקובץ (' + file.name + ') ---\n' + extractedText : '--- תוכן מהקובץ (' + file.name + ') ---\n' + extractedText
      }));

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "שגיאה בקריאת הקובץ. אנא ודא שהקובץ תקין.");
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsFileLoading(false);
      e.target.value = '';
    }
  };

  const handlePlanChange = (phaseId: string, field: string, value: any) => {
    setPlanData(prev => ({
      ...prev,
      [phaseId]: { ...(prev as any)[phaseId], [field]: value }
    }));
  };

  const resetPlan = () => {
    setLessonDetails({ subject: '', topic: '', ageGroup: '', duration: '60 דקות', additionalContext: '', slideTopics: '' });
    setAdvancedOptions({ useAITools: false, useDifferential: false });
    setShowAdvancedOptions(false);
    setPlanData({
      harish: { activity: '', tools: '', suggestions: [], details: '', differentiation: '' },
      zria: { activity: '', tools: '', suggestions: [], details: '', differentiation: '' },
      katzir: { activity: '', tools: '', suggestions: [], details: '', differentiation: '' }
    });
    setActiveTab('harish');
    setSessionGenerations(0);
    setCurrentStep('setup');
    setErrorMsg('');
  };

  const saveCurrentPlan = async (isPublic: boolean) => {
    setShowSaveMenu(false);
    if (!lessonDetails.subject || !lessonDetails.topic) {
      setErrorMsg('יש למלא מקצוע ונושא כדי לשמור את המערך');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    
    if (!isAuthenticated || !userProfile || !accessToken) {
      setErrorMsg('יש להתחבר כדי לשמור מערכים בענן');
      return;
    }

    const planId = Date.now().toString();
    const dateStr = new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    try {
      await insertPlan({
        id: planId,
        user_id: userProfile.id,
        is_public: isPublic,
        lesson_details: lessonDetails,
        plan_data: planData,
        advanced_options: advancedOptions,
        date: dateStr
      }, accessToken);
      
      const newPlan: SavedPlan = {
        id: planId,
        user_id: userProfile.id,
        is_public: isPublic,
        date: dateStr,
        lessonDetails,
        planData,
        advancedOptions
      };
      
      setSavedPlans(prev => [newPlan, ...prev]);
      setSuccessMsg(isPublic ? 'המערך נשמר ושותף בקהילה! 🌐' : 'המערך נשמר כפרטי בהצלחה! 🔒');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Error saving plan:', err);
      setErrorMsg('שגיאה בשמירת המערך: ' + err.message);
    }
  };

  const loadPlan = (plan: SavedPlan) => {
    setLessonDetails({ ...plan.lessonDetails, slideTopics: plan.lessonDetails.slideTopics || '' });
    setAdvancedOptions(plan.advancedOptions || { useAITools: false, useDifferential: false });
    setPlanData(plan.planData);
    setCurrentStep('editor');
    setIsSavedPlansModalOpen(false);
    setSessionGenerations(0);
  };

  const deletePlan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const planToDelete = savedPlans.find(p => p.id === id);
    if (!planToDelete) return;

    if (planToDelete.user_id !== userProfile?.id) {
       alert('אין לך הרשאה למחוק מערך ציבורי של מורה אחר.');
       return;
    }

    if (window.confirm('האם אתה בטוח שברצונך למחוק מערך זה? המחיקה היא לצמיתות.')) {
      try {
        if (!accessToken) throw new Error('Missing auth session');
        await removePlan(id, accessToken);
        setSavedPlans(prev => prev.filter(p => p.id !== id));
      } catch (err: any) {
        console.error('Error deleting plan:', err);
        alert('שגיאה במחיקה: ' + err.message);
      }
    }
  };

  // -------------- AI GENERATION FUNCTIONS -------------- //

  const getErrorMessage = (error: any) => {
    try {
      const errorStr = error?.message || String(error);
      if (errorStr.includes('503') || errorStr.includes('UNAVAILABLE') || errorStr.includes('high demand')) {
        return "המודל חווה עומס כרגע. אנא נסה שוב בעוד מספר דקות.";
      }
      return error?.message || "שגיאה בתקשורת עם שרת ה-AI. נסה שוב בעוד רגע.";
    } catch (e) {
      return "שגיאה בתקשורת עם שרת ה-AI. נסה שוב בעוד רגע.";
    }
  };

  const generateFullPlanAI = async () => {
    if (!checkWeeklyQuota()) {
      setErrorMsg('הגעת למכסה השבועית של 3 מערכים. לגישה ללא הגבלה, הזינו קוד הטבה בפרופיל המורה.');
      setTimeout(() => setErrorMsg(''), 6000);
      return;
    }

    if (!checkSessionQuota()) {
      setErrorMsg('הגעת למכסה של 10 בנייות או שינויי AI בשיעור זה. לגישה ללא הגבלה, הזינו קוד הטבה בפרופיל המורה.');
      setTimeout(() => setErrorMsg(''), 6000);
      return;
    }

    if (!lessonDetails.topic || !lessonDetails.subject || !lessonDetails.ageGroup) {
      setErrorMsg("אנא מלא מקצוע, נושא ושכבת גיל כדי לייצר מערך.");
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setIsLoading('all');
    setErrorMsg('');
    
    const contextAddition = lessonDetails.additionalContext 
      ? `\nהתבסס באופן ישיר על חומרי העזר הבאים שהוזנו על ידי המורה:\n"""\n${lessonDetails.additionalContext}\n"""\n` 
      : '';

    const promptText = `אתה מומחה פדגוגי. בנה מערך שיעור סינכרוני מלא לפי מודל חז"ק.
      מקצוע: ${lessonDetails.subject} | נושא השיעור: ${lessonDetails.topic} | כיתה: ${lessonDetails.ageGroup} | משך: ${lessonDetails.duration}
      ${contextAddition}
      הגדרת השלבים: חריש: הכנת הקרקע טרום השיעור. זריעה: הקנייה על ידי המורה, ולאחריה עבודה אקטיבית. קציר: הצגת תוצרים וסיכום.
      חובה עבור שלב ה"חריש": הצע פעילויות מעוררות סקרנות המבוססות על ויזואליה וכלים מתקדמים. לדוגמה: הצגת תמונה או אינפוגרפיקה ושאילת שאלות עליה, חידות מסקרנות, או שימוש ב-Gemini/NotebookLM ליצירת תוכן ויזואלי/טקסטואלי שמגרה את המחשבה (למשל: אינפוגרפיקה על יישומי PCR, או שלבי התפתחות לפי אריקסון ללא מילים).
      חובה: עבור כל שלב, הצע בדיוק 3 אפשרויות שונות. כל פעילות צריכה להיות קצרה וממוקדת (2-3 משפטים) ולכלול הצעה לכלים טכנולוגיים קונקרטיים.
      חובה על קישורים: בכל פעם שאתה ממליץ על כלי דיגיטלי או על סרטון (חפש סרטונים איכותיים ופופולריים), צרף קישור חי בפורמט Markdown: [שם הכלי/הסרטון](URL). ודא שהקישורים תקינים.
      ${advancedOptions.useAITools ? "חובה עליך לשלב בהצעות כלי פיצוח טכנולוגיים מתקדמים מאוד כגון Gemini (ליצירת תוכן חכם), NotebookLM (לניתוח מאגרי מידע), מחוללי תמונות (Midjourney/DALL-E), סביבות Canva AI ופלטפורמות משחוק. תן עדיפות עליונה לכלים אלו על פני כלים בסיסיים." : "שלב רעיונות יצירתיים יחד עם כלים טכנולוגיים מתאימים."}
      ${advancedOptions.useDifferential ? "חובה עליך לבנות כל הצעה כפעילות דיפרנציאלית: הצע פעילות בסיס, ולאחריה ציין בקצרה משפט של פתרון פיגום לתלמידים מתקשים (הנגשה/הקלה) ומשפט נוסף כאתגר הרחבה לתלמידים מתקדמים, כדי לתת מענה לשונות." : ""}
      החזר בפורמט JSON בלבד. כתוב בטקסט פשוט בלבד ללא תגיות HTML בשום צורה.`;

    try {
      if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        throw new Error("מפתח API חסר. אנא ודא שהגדרת את NEXT_PUBLIC_GEMINI_API_KEY.");
      }

      const response = await genAI.models.generateContent({
        model: process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3-flash-preview",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              harish: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { activity: { type: Type.STRING }, tools: { type: Type.STRING } } } },
              zria: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { activity: { type: Type.STRING }, tools: { type: Type.STRING } } } },
              katzir: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { activity: { type: Type.STRING }, tools: { type: Type.STRING } } } }
            },
            required: ["harish", "zria", "katzir"]
          }
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        const generatedData = JSON.parse(jsonText);
        setPlanData({
          harish: { activity: generatedData.harish?.[0]?.activity || '', tools: generatedData.harish?.[0]?.tools || '', suggestions: (generatedData.harish || []).map((s:any) => ({...s, differentiation: s.differentiation || ''})), details: '', differentiation: generatedData.harish?.[0]?.differentiation || '' },
          zria: { activity: generatedData.zria?.[0]?.activity || '', tools: generatedData.zria?.[0]?.tools || '', suggestions: (generatedData.zria || []).map((s:any) => ({...s, differentiation: s.differentiation || ''})), details: '', differentiation: generatedData.zria?.[0]?.differentiation || '' },
          katzir: { activity: generatedData.katzir?.[0]?.activity || '', tools: generatedData.katzir?.[0]?.tools || '', suggestions: (generatedData.katzir || []).map((s:any) => ({...s, differentiation: s.differentiation || ''})), details: '', differentiation: generatedData.katzir?.[0]?.differentiation || '' }
        });
        setActiveTab('harish');
    setSessionGenerations(0);
        setCurrentStep('editor');
      } else {
        throw new Error("לא התקבלה תשובה מה-AI.");
      }
      incrementSessionQuota();
    } catch (error: any) {
      console.error("Error:", error);
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const generatePhaseAI = async (phaseId: string) => {
    if (!checkWeeklyQuota()) {
      setErrorMsg('הגעת למכסה השבועית של 3 מערכים. לגישה ללא הגבלה, הזינו קוד הטבה בפרופיל המורה.');
      setTimeout(() => setErrorMsg(''), 6000);
      return;
    }

    if (!checkSessionQuota()) {
      setErrorMsg('הגעת למכסה של 10 בנייות או שינויי AI בשיעור זה. לגישה ללא הגבלה, הזינו קוד הטבה בפרופיל המורה.');
      setTimeout(() => setErrorMsg(''), 6000);
      return;
    }

    if (!lessonDetails.topic || !lessonDetails.subject || !lessonDetails.ageGroup) {
      setErrorMsg("כדי לקבל הצעות מדויקות, מלא קודם את נושא השיעור, המקצוע והכיתה במסך 'פרטי השיעור'.");
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    setIsLoading(phaseId);
    setErrorMsg('');
    const phaseConfig = (PHASES as any)[phaseId];
    
    const contextAddition = lessonDetails.additionalContext 
      ? `\nהתבסס באופן ישיר על חומרי העזר הבאים שהוזנו על ידי המורה:\n"""\n${lessonDetails.additionalContext}\n"""\n` 
      : '';

    const promptText = `אתה מומחה פדגוגי. הצע 3 אפשרויות שונות ומגוונות לשלב ה"${phaseConfig.title}" במערך שיעור סינכרוני.
      מקצוע: ${lessonDetails.subject} | נושא השיעור: ${lessonDetails.topic} | כיתה: ${lessonDetails.ageGroup} | מטרת השלב הזה היא: ${phaseConfig.goal}. 
      ${contextAddition}
      ${phaseId === 'harish' ? 'דגש מיוחד לשלב ה"חריש": הצע פעילויות ויזואליות ומעוררות סקרנות. לדוגמה: הצגת תמונה או אינפוגרפיקה ושאילת שאלות עליה, חידות מסקרנות, או שימוש בכלים כמו Gemini ו-NotebookLM ליצירת תוכן חכם (למשל: "אינפוגרפיקה ללא מילים המתארת את שלבי התפתחות אריקסון" או "חידה ויזואלית על יישומי PCR").' : ''}
      עבור כל אפשרות, כתוב תיאור פעילות פרקטי וברור של 2-3 משפטים בלבד והצע 1-3 כלים טכנולוגיים קונקרטיים.
      חובה על קישורים: בכל המלצה על כלי או סרטון (בחר סרטונים איכותיים עם הרבה צפיות), צרף קישור חי בפורמט Markdown: [שם הכלי/הסרטון](URL).
      ${advancedOptions.useAITools ? "חובה עליך לשלב בהצעות כלי פיצוח טכנולוגיים מתקדמים מאוד כגון Gemini, NotebookLM, מחוללי תמונות (Midjourney/DALL-E), סביבות Canva AI ופלטפורמות משחוק. תן עדיפות עליונה לכלים אלו." : "שלב רעיונות יצירתיים יחד עם כלים טכנולוגיים מתאימים."}
      ${advancedOptions.useDifferential ? "חובה עליך לבנות כל הצעה כפעילות דיפרנציאלית: הצע פעילות בסיס, ולאחריה ציין בקצרה משפט של פתרון פיגום לתלמידים מתקשים (הנגשה/הקלה) ומשפט נוסף כאתגר הרחבה לתלמידים מתקדמים, כדי לתת מענה לשונות." : ""}
      החזר בפורמט JSON בלבד (מערך של options). כתוב בטקסט פשוט בלבד ללא תגיות HTML בשום צורה.`;

    try {
      const response = await genAI.models.generateContent({
        model: process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3-flash-preview",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { activity: { type: Type.STRING }, tools: { type: Type.STRING }, differentiation: { type: Type.STRING } } } } },
            required: ["options"]
          }
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        const generatedData = JSON.parse(jsonText);
        const newOptions = (generatedData.options || []).map((s) => ({...s, differentiation: s.differentiation || ''}));
        setPlanData(prev => ({
          ...prev, [phaseId]: { 
            ...(prev as any)[phaseId], 
            activity: newOptions[0]?.activity || (prev as any)[phaseId].activity, 
            tools: newOptions[0]?.tools || (prev as any)[phaseId].tools, 
            differentiation: newOptions[0]?.differentiation || (prev as any)[phaseId].differentiation || '',
            suggestions: newOptions, 
            details: '' 
          }
        }));
        incrementSessionQuota();
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const generateActivityDetailsAI = async (phaseId: string) => {
    if (!checkSessionQuota()) {
      setErrorMsg('הגעת למכסה של 10 בנייות או שינויי AI בשיעור זה. לגישה ללא הגבלה, הזינו קוד הטבה בפרופיל המורה.');
      setTimeout(() => setErrorMsg(''), 6000);
      return;
    }
    const activity = (planData as any)[phaseId].activity;
    if (!activity) {
      setErrorMsg("אנא כתוב או בחר פעילות לפני בקשת הסבר.");
      setTimeout(() => setErrorMsg(''), 4000); return;
    }
    setIsDetailLoading(phaseId);
    setErrorMsg('');
    const phaseConfig = (PHASES as any)[phaseId];
    
    const contextAddition = lessonDetails.additionalContext 
      ? `\nלצורך ההסבר, תוכל להתייחס לחומרי העזר הבאים של השיעור:\n"""\n${lessonDetails.additionalContext}\n"""\n` 
      : '';

    const promptText = `אתה מומחה פדגוגי. המורה בחר את הפעילות הבאה לשלב "${phaseConfig.title}": "${activity}"
      ${contextAddition}
      ספק הוראות ביצוע ב-3 עד 4 נקודות קצרות וענייניות בעזרת מקפים (-). התייחס ספציפית לכלי הטכנולוגי שמוצע ואיך להפעיל אותו טכנית.
      בלי הקדמות וסיכומים, ובלי תגיות HTML בכלל. החזר את התשובה בפורמט JSON בשדה "details".`;

    try {
      const response = await genAI.models.generateContent({
        model: process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3-flash-preview",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.OBJECT, properties: { details: { type: Type.STRING } }, required: ["details"] }
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        const generatedData = JSON.parse(jsonText);
        handlePlanChange(phaseId, 'details', generatedData.details);
        incrementSessionQuota();
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const generateDifferentiationAI = async (phaseId: string) => {
    if (!checkSessionQuota()) {
      setErrorMsg('הגעת למכסה של 10 בנייות או שינויי AI בשיעור זה. לגישה ללא הגבלה, הזינו קוד הטבה בפרופיל המורה.');
      setTimeout(() => setErrorMsg(''), 6000);
      return;
    }
    const activity = (planData as any)[phaseId].activity;
    if (!activity) {
      setErrorMsg("אנא כתוב או בחר פעילות לפני בקשת התאמה.");
      setTimeout(() => setErrorMsg(''), 4000); return;
    }
    setIsDiffLoading(phaseId);
    setErrorMsg('');
    const phaseConfig = (PHASES as any)[phaseId];
    
    const contextAddition = lessonDetails.additionalContext 
      ? `\nבהתאמה, תוכל להתייחס לחומרי העזר הבאים:\n"""\n${lessonDetails.additionalContext}\n"""\n` 
      : '';

    const promptText = `אתה מומחה פדגוגי. המורה בחר את הפעילות הבאה לשלב "${phaseConfig.title}": "${activity}"
      ${contextAddition}
      הצעה התאמות דיפרנציאליות ספציפיות לפעילות הזו:
      1. משפט אחד של "פיגום" (Scaffolding) לתלמידים מתקשים - איך להנגיש להם את הפעילות הספציפית הזו.
      2. משפט אחד של "אתגר" (Challenge) לתלמידים מתקדמים - איך להעמיק להם את הפעילות הספציפית הזו.
      כתוב בטקסט פשוט, קולח ומקצועי, ללא כותרות, ללא מספור וללא תגיות HTML. החזר בפורמט JSON בשדה "differentiation".`;

    try {
      const response = await genAI.models.generateContent({
        model: process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3-flash-preview",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: { type: Type.OBJECT, properties: { differentiation: { type: Type.STRING } }, required: ["differentiation"] }
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        const generatedData = JSON.parse(jsonText);
        handlePlanChange(phaseId, 'differentiation', generatedData.differentiation);
        incrementSessionQuota();
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsDiffLoading(false);
    }
  };

  const unsharePlan = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const planToUnshare = savedPlans.find(p => p.id === id);
    if (!planToUnshare) return;
    if (!planToUnshare.is_public) return;

    if (planToUnshare.user_id !== userProfile?.id) {
      alert('אין לך הרשאה להסיר שיתוף של מערך שאינו שלך.');
      return;
    }

    try {
      if (!accessToken) throw new Error('Missing auth session');
      setUnsharingPlanId(id);
      await updatePlanVisibility(id, false, accessToken);
      setSavedPlans(prev => prev.map(p => (p.id === id ? { ...p, is_public: false } : p)));
      setSuccessMsg('המערך הוסר משיתוף ציבורי.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Error unsharing plan:', err);
      setErrorMsg('שגיאה בהסרת השיתוף: ' + err.message);
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setUnsharingPlanId(null);
    }
  };

  // ייצור מצגת PowerPoint (PPTX) אמתית
  const generateSlideConceptsAI = async () => {
    if (!checkSessionQuota()) {
      setErrorMsg('הגעת למכסה של 10 בנייות או שינויי AI בשיעור זה. לגישה ללא הגבלה, הזינו קוד הטבה בפרופיל המורה.');
      setTimeout(() => setErrorMsg(''), 6000);
      return;
    }
    if (!lessonDetails.topic) {
      setErrorMsg("אנא מלאו את נושא השיעור כדי לקבל הצעות.");
      return;
    }
    setIsConceptsLoading(true);
    setErrorMsg('');
    try {
      const prompt = `אתה מומחה פדגוגי. הצע 5-8 מושגי מפתח או נושאים מרכזיים שחובה לכלול במצגת על הנושא הבא:
        נושא: ${lessonDetails.topic} | מקצוע: ${lessonDetails.subject} | כיתה: ${lessonDetails.ageGroup}
        החזר את המושגים כרשימה מופרדת בפסיקים בלבד, ללא מספור וללא הקדמות. כתוב בעברית.`;

      const response = await genAI.models.generateContent({
        model: process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3-flash-preview",
        contents: prompt,
      });

      const concepts = response.text?.trim();
      if (concepts) {
        setLessonDetails(prev => ({
          ...prev,
          slideTopics: prev.slideTopics ? `${prev.slideTopics}, ${concepts}` : concepts
        }));
        incrementSessionQuota();
      }
    } catch (error: any) {
      console.error("Concepts Error:", error);
      setErrorMsg(getErrorMessage(error));
    } finally {
      setIsConceptsLoading(false);
    }
  };

  const generatePresentationPptx = async () => {
    if (!checkSessionQuota()) {
      setErrorMsg('הגעת למכסה של 10 בנייות או שינויי AI בשיעור זה. לגישה ללא הגבלה, הזינו קוד הטבה בפרופיל המורה.');
      setTimeout(() => setErrorMsg(''), 6000);
      return;
    }

    if (!isLibsReady || !(window as any).PptxGenJS) {
      setErrorMsg("מערכת ייצור המצגות עדיין נטענת... נסה שוב בעוד רגע.");
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (!lessonDetails.topic || !lessonDetails.subject || !lessonDetails.ageGroup) {
      setErrorMsg("אנא מלא מקצוע, נושא וכיתה במסך 'פרטי השיעור' כדי לחולל מצגת.");
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setIsSlideLoading(true);
    setErrorMsg('');
    
    const contextAddition = lessonDetails.additionalContext 
      ? `\nהשתמש בחומרי העזר הבאים כבסיס לתוכן שיופיע במצגת:\n"""\n${lessonDetails.additionalContext}\n"""\n` 
      : '';

    const topicsAddition = lessonDetails.slideTopics
      ? `\nהשקפים צריכים לעסוק בנושאים/מושגים הבאים (לפי הסדר): ${lessonDetails.slideTopics}\n`
      : '\nבחר באופן אוטומטי 10 נושאים/מושגים מרכזיים הקשורים לנושא השיעור.\n';

    const promptText = `אתה מומחה ליצירת תוכן למצגות. כתוב תוכן ל-10 שקפים עבור שיעור בנושא ${lessonDetails.topic} (מקצוע: ${lessonDetails.subject}, כיתה: ${lessonDetails.ageGroup}).
      ${contextAddition}
      ${topicsAddition}
      חוקים:
      - המשפטים בשקפים חייבים להיות תמציתיים וקצרים מאוד (עד 10 מילים למשפט).
      - צור בדיוק 10 שקפים.
      החזר מערך JSON שבו כל שקף מכיל:
      1. title: כותרת השקף.
      2. content: מערך של 3-4 נקודות קצרות שיופיעו בשקף.`;

    try {
      const response = await genAI.models.generateContent({
        model: process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-3-flash-preview",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["title", "content"]
            }
          }
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        const slidesData = JSON.parse(jsonText);
        
        let pres = new (window as any).PptxGenJS();
        pres.rtlMode = true; 
        pres.layout = 'LAYOUT_16x9';

        let slideTitle = pres.addSlide();
        slideTitle.background = { color: "0F172A" };
        slideTitle.addText(lessonDetails.topic, { 
          x: "10%", y: "35%", w: "80%", fontSize: 54, bold: true, color: "38BDF8", align: "center", rtlMode: true
        });
        slideTitle.addText(`${lessonDetails.subject}  |  ${lessonDetails.ageGroup}`, { 
          x: "10%", y: "60%", w: "80%", fontSize: 24, color: "F8FAFC", align: "center", rtlMode: true
        });

        slidesData.forEach((s: any) => {
          let slide = pres.addSlide();
          slide.background = { color: "F8FAFC" }; 
          
          slide.addText(s.title, { 
            x: "5%", y: "8%", w: "90%", fontSize: 36, bold: true, color: "0F172A", align: "right", rtlMode: true
          });
          
          slide.addShape(pres.ShapeType.line, { x: "5%", y: "18%", w: "90%", h: 0, line: { color: "38BDF8", width: 3 } });

          let bulletPoints = s.content.map((text: string) => ({ 
            text: text, 
            options: { bullet: true, fontSize: 24, color: "333333", breakLine: true, rtlMode: true, align: "right" } 
          }));
          
          slide.addText(bulletPoints, { 
            x: "5%", y: "25%", w: "90%", h: "60%", align: "right", valign: "top", lineSpacing: 48, rtlMode: true
          });
        });

        let slideEnd = pres.addSlide();
        slideEnd.background = { color: "0F172A" };
        slideEnd.addText("שאלות?", { 
          x: "10%", y: "40%", w: "80%", fontSize: 60, bold: true, color: "38BDF8", align: "center", rtlMode: true
        });
        slideEnd.addText("מוכנים? עוברים לעבודה פעילה!", { 
          x: "10%", y: "60%", w: "80%", fontSize: 28, color: "F8FAFC", align: "center", rtlMode: true
        });

        pres.writeFile({ fileName: `מצגת_${lessonDetails.topic}.pptx` });
      }
    } catch (error) {
      console.error("Error generating PPTX:", error);
      setErrorMsg(getErrorMessage(error));
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setIsSlideLoading(false);
    }
  };

  // -------------- DOWNLOAD FUNCTIONS -------------- //

  const downloadPdf = () => {
    // In iframe environments like AI Studio, window.print() can sometimes be blocked.
    // Opening a new window and printing from there is more reliable.
    const printWindow = window.open('', '_blank');
    
    const content = document.getElementById('printable-area')?.innerHTML;
    if (!content) {
      setErrorMsg("לא נמצא תוכן להדפסה.");
      return;
    }

    if (!printWindow) {
      // Fallback to direct print if popup is blocked
      window.print();
      return;
    }
    
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('');

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>מערך שיעור - מודל חז"ק</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&display=swap" rel="stylesheet">
          ${styles}
          <style>
            body { 
              font-family: "Heebo", sans-serif; 
              background: white !important; 
              padding: 40px !important; 
              direction: rtl;
            }
            #printable-area { display: block !important; }
            .no-print { display: none !important; }
            @media print {
              body { padding: 0 !important; }
              .no-print { display: none !important; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div id="printable-area">
            ${content}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                // We don't close immediately to allow the print dialog to stay open
                window.onafterprint = () => window.close();
              }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printPlan = () => {
    window.print();
  };

  const downloadPlan = () => {
    const element = document.createElement("a");
    const fileContent = `מערך שיעור סינכרוני - מודל חז"ק
==================================
מקצוע: ${lessonDetails.subject || '-'} | נושא: ${lessonDetails.topic || '-'} | כיתה: ${lessonDetails.ageGroup || '-'}
----------------------------------
🟢 שלב ה'חריש' (טרום שיעור)
פעילות:
${planData.harish.activity || 'טרם הוזנה פעילות'}
כלים: ${planData.harish.tools || '-'}${planData.harish.details ? `\n\nהסבר מפורט:\n${planData.harish.details}` : ''}
----------------------------------
🔵 שלב ה'זריעה' (הקנייה פעילה)
פעילות:
${planData.zria.activity || 'טרם הוזנה פעילות'}
כלים: ${planData.zria.tools || '-'}${planData.zria.details ? `\n\nהסבר מפורט:\n${planData.zria.details}` : ''}
----------------------------------
🟠 שלב ה'קציר' (עיבוד ותרגול)
פעילות:
${planData.katzir.activity || 'טרם הוזנה פעילות'}
כלים: ${planData.katzir.tools || '-'}${planData.katzir.details ? `\n\nהסבר מפורט:\n${planData.katzir.details}` : ''}`;

    const file = new Blob([fileContent], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `מערך_חזק_${lessonDetails.topic || 'שיעור'}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const downloadLatex = () => {
    const escapeLatex = (text: string) => {
      if (!text) return '';
      return text.replace(/%/g, '\\%').replace(/\$/g, '\\$').replace(/&/g, '\\&').replace(/#/g, '\\#').replace(/_/g, '\\_').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\\\ \n');
    };

    const latexContent = `\\documentclass[11pt, a4paper]{article}
% --- UNIVERSAL PREAMBLE BLOCK ---
\\usepackage[a4paper, top=2.5cm, bottom=2.5cm, left=2cm, right=2cm]{geometry}
\\usepackage{fontspec}
\\usepackage[hebrew, bidi=basic, provide=*]{babel}
\\babelprovide[import, onchar=ids fonts]{hebrew}
\\babelprovide[import, onchar=ids fonts]{english}
\\babelfont{rm}{Noto Sans}
\\babelfont[hebrew]{rm}{Noto Sans Hebrew}
\\usepackage{enumitem}
\\setlist[itemize]{label=-}

\\begin{document}

\\begin{center}
{\\Huge \\textbf{מערך שיעור סינכרוני - מודל חז"ק}} \\\\[0.6cm]
{\\Large \\textbf{נושא:} ${escapeLatex(lessonDetails.topic) || '-'} \\quad|\\quad \\textbf{מקצוע:} ${escapeLatex(lessonDetails.subject) || '-'} \\quad|\\quad \\textbf{כיתה:} ${escapeLatex(lessonDetails.ageGroup) || '-'}} \\\\[0.3cm]
{\\large \\textbf{משך השיעור:} ${escapeLatex(lessonDetails.duration) || '-'}}
\\end{center}

\\vspace{1cm}

\\section*{שלב ה'חריש' (טרום שיעור)}
\\textbf{פעילות:}
${escapeLatex(planData.harish.activity) || 'טרם הוזנה פעילות'}

\\vspace{0.2cm}
\\textbf{כלים:} ${escapeLatex(planData.harish.tools) || '-'}
${planData.harish.details ? `\\\\ \\\\ \\textbf{הסבר מפורט:}\\\\ ${escapeLatex(planData.harish.details)}` : ''}

\\vspace{0.5cm}
\\hrule
\\vspace{0.5cm}

\\section*{שלב ה'זריעה' (הקנייה פעילה)}
\\textbf{פעילות:}
${escapeLatex(planData.zria.activity) || 'טרם הוזנה פעילות'}

\\vspace{0.2cm}
\\textbf{כלים:} ${escapeLatex(planData.zria.tools) || '-'}
${planData.zria.details ? `\\\\ \\\\ \\textbf{הסבר מפורט:}\\\\ ${escapeLatex(planData.zria.details)}` : ''}

\\vspace{0.5cm}
\\hrule
\\vspace{0.5cm}

\\section*{שלב ה'קציר' (עיבוד ותרגול)}
\\textbf{פעילות:}
${escapeLatex(planData.katzir.activity) || 'טרם הוזנה פעילות'}

\\vspace{0.2cm}
\\textbf{כלים:} ${escapeLatex(planData.katzir.tools) || '-'}
${planData.katzir.details ? `\\\\ \\\\ \\textbf{הסבר מפורט:}\\\\ ${escapeLatex(planData.katzir.details)}` : ''}

\\end{document}`;

    const element = document.createElement("a");
    const file = new Blob([latexContent], {type: 'application/x-tex;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `מערך_חזק_${lessonDetails.topic || 'שיעור'}.tex`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div dir="rtl" className="min-h-screen font-sans selection:bg-lilac-300/30 selection:text-lilac-200 antialiased text-white" style={{background: 'linear-gradient(135deg, #0f0a1a 0%, #1a1025 40%, #0d1520 100%)'}}>
      
      {currentStep === 'home' ? (
        <section className="relative isolate min-h-screen overflow-hidden flex flex-col lg:flex-row" style={{background: `linear-gradient(135deg, rgba(15,10,26,0.88) 0%, rgba(26,16,37,0.82) 40%, rgba(13,21,32,0.90) 100%), url(${homeBg.src}) center/cover no-repeat`}}>
          {/* ── Ambient orbs ── */}
          <div className="home-orb home-orb-primary" style={{opacity: 0.7}}></div>
          <div className="home-orb home-orb-secondary" style={{opacity: 0.6}}></div>
          <div className="home-orb home-orb-accent" style={{opacity: 0.5}}></div>

          {/* ── Grid overlay ── */}
          <div className="home-grid-pattern absolute inset-0 pointer-events-none" style={{opacity: 0.3}}></div>

          {/* ══════════════════════════════════════════
              LEFT PANEL — Branding + Phase Showcase
          ══════════════════════════════════════════ */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-16 lg:py-0 min-h-[52vh] lg:min-h-screen">

            {/* Logo badge */}
            <div className="reveal-up mb-10">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-lilac-400/30 bg-white/5 backdrop-blur-sm">
                <div className="w-7 h-7 rounded-xl bg-lilac-300 flex items-center justify-center shadow-lg shadow-lilac-300/40">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="text-xs font-semibold tracking-[0.18em] text-lilac-200 uppercase">סטודיו לתכנון שיעור מקוון</span>
              </div>
            </div>

            {/* Main heading */}
            <div className="reveal-up reveal-delay-1 space-y-4 mb-8">
              <h1 className="text-5xl md:text-6xl xl:text-7xl font-serif font-semibold leading-[1.05] tracking-tight text-white">
                מודל חז״ק
                <br />
                <span className="gradient-title">להוראה</span>
                <span className="text-white"> מרחוק</span>
              </h1>
              {/* Shimmer divider */}
              <div className="h-px w-40 shimmer-line rounded-full mt-5"></div>
              <p className="text-slate-400 text-base md:text-lg max-w-sm leading-relaxed font-medium mt-4">
                צור שיעורים סינכרוניים מיטביים בכל תחום דעת בעזרת AI בתוך דקות.
              </p>
            </div>

            {/* Phase showcase — 3 floating cards */}
            <div className="reveal-up reveal-delay-2 flex gap-5 flex-wrap">

              <div className="phase-float-1 flex flex-col items-center gap-3 px-7 py-5 rounded-3xl border border-harish-blue/40 bg-harish-blue/10 backdrop-blur-sm shadow-xl shadow-harish-blue/10 min-w-[110px]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-harish-blue/20 border border-harish-blue/30">
                  <Sprout size={28} className="text-harish-blue" style={{color: "#ffffff"}} />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-white leading-none">חריש</p>
                  <p className="text-xs text-slate-400 mt-1.5">טרום שיעור</p>
                </div>
              </div>

              <div className="phase-float-2 flex flex-col items-center gap-3 px-7 py-5 rounded-3xl border border-sage-green/40 bg-sage-green/10 backdrop-blur-sm shadow-xl shadow-green-900/20 min-w-[110px]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-sage-green/20 border border-sage-green/30">
                  <BookOpen size={28} style={{color: "#ffffff"}} />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-white leading-none">זריעה</p>
                  <p className="text-xs text-slate-400 mt-1.5">לב השיעור</p>
                </div>
              </div>

              <div className="phase-float-3 flex flex-col items-center gap-3 px-7 py-5 rounded-3xl border border-lilac-300/40 bg-lilac-300/10 backdrop-blur-sm shadow-xl shadow-lilac-900/20 min-w-[110px]">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-lilac-300/20 border border-lilac-300/30">
                  <Wheat size={28} style={{color: "#ffffff"}} />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-white leading-none">קציר</p>
                  <p className="text-xs text-slate-400 mt-1.5">סיכום ורפלקציה</p>
                </div>
              </div>

            </div>

            {/* Stats row */}
            <div className="reveal-up reveal-delay-3 flex gap-8 mt-10">
              {[
                { value: '3', label: 'שלבי הוראה' },
                { value: 'AI', label: 'בינה מלאכותית' },
                { value: '∞', label: 'אפשרויות' },
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-2xl font-serif font-semibold text-white">{stat.value}</p>
                  <p className="text-[13px] text-slate-300 font-semibold mt-0.5 uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════
              RIGHT PANEL — Auth Card
          ══════════════════════════════════════════ */}
          <div className="relative z-10 flex items-center justify-center px-6 py-12 lg:py-0 lg:w-[440px] lg:min-h-screen">
            {/* Subtle glow behind card */}
            <div className="absolute inset-0 lg:inset-auto lg:w-[500px] lg:h-[500px] lg:rounded-full" style={{background: 'radial-gradient(circle, rgba(185,136,177,0.12) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none'}}></div>

            {/* Auth Card */}
            <div className="reveal-up reveal-delay-1 w-full max-w-sm lg:max-w-none relative">
              {/* Card */}
              <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-2xl shadow-black/40 p-8 overflow-hidden">

                {/* Inner glow top */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-lilac-300/50 to-transparent"></div>

                {/* Card Header */}
                <div className="text-center mb-7">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg shadow-lilac-500/20" style={{background: 'linear-gradient(135deg, #B988B1 0%, #8D648A 100%)'}}>
                    <KeyRound size={24} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-semibold text-white">ברוכים הבאים</h2>
                  <p className="text-slate-400 text-sm mt-1">התחברו כדי להמשיך לתכנון</p>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-2xl border border-white/10 p-1 mb-6 bg-white/5">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${authMode === 'login' ? 'bg-lilac-300 text-white shadow-lg shadow-lilac-500/20' : 'text-slate-400 hover:text-white'}`}
                  >כניסה</button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${authMode === 'signup' ? 'bg-lilac-300 text-white shadow-lg shadow-lilac-500/20' : 'text-slate-400 hover:text-white'}`}
                  >יצירת חשבון</button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setAuthError('');
                    setAuthLoading(true);
                    try {
                      if (authMode === 'signup') {
                        if (!authInput.name.trim()) { setAuthError('יש להזין שם מלא'); setAuthLoading(false); return; }
                        await signUpWithPassword(authInput.email, authInput.password, authInput.name.trim());
                        setAuthError('נשלח אימות לאימייל שלך! אשר ואז היכנס.');
                      } else {
                        const session = await signInWithPassword(authInput.email, authInput.password);
                        const fullName = typeof session.user.user_metadata?.full_name === 'string' ? session.user.user_metadata.full_name : '';
                        const email = typeof session.user.email === 'string' ? session.user.email : undefined;
                        const name = fullName || email || 'משתמש';
                        const isUnlimited = !!session.user.user_metadata?.is_unlimited;
                        setAccessToken(session.accessToken);
                        setUserProfile({ id: session.user.id, name, email, isUnlimited });
                        setIsAuthenticated(true);
                        fetchPlans(session.user.id, session.accessToken);
                        setCurrentStep('setup');
                      }
                    } catch (err: any) {
                      const msg = err?.message || '';
                      if (msg.includes('Invalid login credentials')) setAuthError('אימייל או סיסמה שגויים');
                      else if (msg.includes('User already registered')) setAuthError('משתמש עם אימייל זה כבר קיים');
                      else if (msg.includes('Password should be at least')) setAuthError('הסיסמה חייבת להכיל לפחות 6 תווים');
                      else if (msg.includes('email rate limit exceeded')) setAuthError('חרגת מגבול ניסיונות המייל. נא להמתין כ-15 דקות ולנסות שוב.');
                      else setAuthError(msg || 'אירעה שגיאה, נסה שוב');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  {/* Name — signup only */}
                  {authMode === 'signup' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">שם מלא</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-lilac-300/70 pointer-events-none"><User size={16} /></span>
                        <input
                          type="text"
                          value={authInput.name}
                          onChange={(e) => setAuthInput(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="הקלד את שמך המלא..."
                          className="auth-glass-input w-full pr-11 pl-4 py-3.5 rounded-2xl outline-none font-medium placeholder:text-slate-200 text-sm transition-all"
                          style={{background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white'}}
                          onFocus={e => e.target.style.borderColor = 'rgba(185,136,177,0.5)'}
                          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                        />
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">אימייל</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-lilac-300/70 pointer-events-none"><User size={16} /></span>
                      <input
                        type="email"
                        value={authInput.email}
                        onChange={(e) => setAuthInput(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                        required
                        className="auth-glass-input w-full pr-11 pl-4 py-3.5 rounded-2xl outline-none font-medium placeholder:text-slate-200 text-sm transition-all"
                        style={{background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white'}}
                        onFocus={e => e.target.style.borderColor = 'rgba(185,136,177,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">סיסמה</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-lilac-300/70 pointer-events-none"><Lock size={16} /></span>
                      <input
                        type="password"
                        value={authInput.password}
                        onChange={(e) => setAuthInput(prev => ({ ...prev, password: e.target.value }))}
                        placeholder={authMode === 'signup' ? 'לפחות 6 תווים' : 'הסיסמה שלך...'}
                        required
                        className="auth-glass-input w-full pr-11 pl-4 py-3.5 rounded-2xl outline-none font-medium placeholder:text-slate-200 text-sm transition-all"
                        style={{background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'white'}}
                        onFocus={e => e.target.style.borderColor = 'rgba(185,136,177,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                      />
                    </div>
                  </div>

                  {/* Error / success message */}
                  {authError && (
                    <p className={`text-sm font-medium text-center py-2.5 px-4 rounded-xl ${authError.includes('נשלח') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{authError}</p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="pulse-glow w-full mt-2 disabled:opacity-60 active:scale-[0.98] text-white py-3.5 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
                    style={{background: 'linear-gradient(135deg, #B988B1 0%, #8D648A 100%)'}}
                  >
                    {authLoading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                    {authMode === 'login' ? 'כניסה למערכת' : 'יצירת חשבון'}
                  </button>
                </form>

                {/* Card footer */}
                <p className="text-center text-xs text-slate-200 mt-6">נוצר ע״י ענת ברון לוביש</p>

                {/* Inner glow bottom */}
                <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sage-green/30 to-transparent"></div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
      {/* Top Navbar */}
      <header className="bg-slate-900/80 border-b border-white/10 px-10 py-5 flex items-center justify-between backdrop-blur-xl sticky top-0 z-50 shadow-2xl transition-all duration-300">
        {/* Left: Management */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={resetPlan}
            className="group flex items-center gap-3 px-6 py-2.5 bg-lilac-500 text-white hover:bg-lilac-600 rounded-2xl text-sm font-bold transition-all shadow-lg shadow-lilac-500/20 active:scale-95"
          >
            <PlusCircle size={18} className="group-hover:rotate-90 transition-transform" /> 
            <span className="hidden lg:inline">מערך חדש</span>
          </button>
          
          <button 
            onClick={() => setIsSavedPlansModalOpen(true)}
            className="flex items-center gap-3 px-6 py-2.5 bg-white/5 border border-white/10 text-slate-300 hover:border-lilac-400 hover:text-white rounded-2xl text-sm font-bold transition-all active:scale-95"
          >
            <FolderOpen size={18} />
            <span className="hidden lg:inline">הספרייה שלי</span>
          </button>
        </div>

        {/* Center: Brand */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none sm:pointer-events-auto">
          <h1 className="text-2xl font-bold text-white font-serif tracking-tight leading-none">מודל חז"ק להוראה מרחוק</h1>
          <p className="text-sm text-lilac-100 font-bold uppercase tracking-widest mt-2 hidden sm:block text-center">נוצר ע"י ענת ברון לוביש</p>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Consolidated Actions Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className={`flex items-center gap-3 px-6 py-2.5 ${showActionsMenu ? 'bg-sage-green text-white' : 'bg-sage-green/10 text-sage-green'} border border-sage-green/20 hover:bg-sage-green hover:text-white rounded-2xl text-sm font-bold transition-all shadow-sm active:scale-95`}
            >
              <Rocket size={19} /> 
              <span>פעולות</span>
              <ChevronDown size={12} className={`transition-transform ${showActionsMenu ? 'rotate-180' : ''}`} />
            </button>

            {showActionsMenu && (
              <>
                <div className="absolute top-full mt-3 right-0 w-64 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-white/5 mb-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">שמירה ושיתוף</p>
                  </div>
                  <div className="space-y-1">
                    <button onClick={() => { saveCurrentPlan(false); setShowActionsMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-right transition-all group/item">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover/item:bg-blue-500 group-hover/item:text-white transition-colors"><Lock size={14} /></div>
                      <span className="text-xs font-bold text-white">שמור כפרטי</span>
                    </button>
                    <button onClick={() => { saveCurrentPlan(true); setShowActionsMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-right transition-all group/item">
                      <div className="w-7 h-7 rounded-lg bg-sage-green/10 text-sage-green flex items-center justify-center group-hover/item:bg-sage-green group-hover/item:text-white transition-colors"><Users size={14} /></div>
                      <span className="text-xs font-bold text-white">שמור ושתף בקהילה</span>
                    </button>
                  </div>

                  <div className="px-3 py-2 border-b border-white/5 my-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ייצוא קבצים</p>
                  </div>
                  <div className="space-y-1">
                    <button onClick={() => { downloadPdf(); setShowActionsMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-right transition-all group/item">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center group-hover/item:bg-red-500 group-hover/item:text-white transition-colors"><FileDown size={14} /></div>
                      <span className="text-xs font-bold text-white">ייצוא ל-PDF</span>
                    </button>
                    <button onClick={() => { downloadPlan(); setShowActionsMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-right transition-all group/item">
                      <div className="w-7 h-7 rounded-lg bg-slate-500/10 text-slate-400 flex items-center justify-center group-hover/item:bg-slate-500 group-hover/item:text-white transition-colors"><FileText size={14} /></div>
                      <span className="text-xs font-bold text-white">ייצוא לקובץ טקסט</span>
                    </button>
                    <button onClick={() => { downloadLatex(); setShowActionsMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-right transition-all group/item">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover/item:bg-indigo-500 group-hover/item:text-white transition-colors"><FileCode size={14} /></div>
                      <span className="text-xs font-bold text-white">קובץ LaTeX</span>
                    </button>
                  </div>
                </div>
                <div className="fixed inset-0 z-[55]" onClick={() => setShowActionsMenu(false)}></div>
              </>
            )}
          </div>

          <div className="w-px h-5 bg-white/10 mx-1 hidden md:block"></div>

          {userProfile && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-lilac-300 p-2 rounded-2xl transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-lilac-500/20 text-lilac-300 flex items-center justify-center"><User size={18} /></div>
                <span className="text-sm font-bold text-slate-200 hidden lg:block">{userProfile.name}</span>
              </button>
              
              <button
                onClick={async () => {
                  await signOutSession(accessToken);
                  setAccessToken(null);
                  setUserProfile(null);
                  setIsAuthenticated(false);
                  setSavedPlans([]);
                  setCurrentStep('home');
                }}
                title="יציאה"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-lilac-500/20 to-transparent"></div>
            
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-6 left-6 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-10">
              <X size={20} />
            </button>

            <div className="relative p-10 pt-16 space-y-8">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-3xl bg-lilac-500/20 text-lilac-300 flex items-center justify-center shadow-lg border border-lilac-500/20">
                  <User size={40} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white">{userProfile?.name}</h3>
                  <p className="text-slate-400 font-medium">{userProfile?.email}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-medium">סטטוס מנוי:</span>
                    <span className={`font-bold ${userProfile?.isUnlimited ? 'text-lilac-300' : 'text-white'}`}>
                      {userProfile?.isUnlimited ? 'ללא הגבלה ✨' : 'רגיל (עד 3 בשבוע)'}
                    </span>
                  </div>
                  {!userProfile?.isUnlimited && (
                    <div className="pt-2">
                       <div className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mb-2">שימוש השבוע:</div>
                       <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full bg-lilac-300 rounded-full`} style={{ width: `${Math.min(100, (savedPlans.filter(p => parseInt(p.id) > Date.now() - 7*24*60*60*1000).length / 3) * 100)}%` }}></div>
                       </div>
                       <div className="flex justify-between text-[10px] mt-1 font-bold">
                          <span className="text-lilac-300">{savedPlans.filter(p => parseInt(p.id) > Date.now() - 7*24*60*60*1000).length} / 3</span>
                          <span className="text-slate-500">שיעורים נוצרו</span>
                       </div>
                    </div>
                  )}
                </div>

                {!userProfile?.isUnlimited && (
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-[0.2em] px-1">הזן קוד הטבה</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="למשל: MAALOT-VIP"
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-lilac-500/50 transition-all font-mono tracking-widest"
                      />
                      <button 
                        onClick={() => applyPromoCode(promoCode)}
                        className="bg-lilac-500 hover:bg-lilac-400 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg active:scale-95"
                      >
                        הפעל
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center font-medium">יש לכם קוד? הזינו אותו כאן כדי לקבל "יד חופשית" והסרת מגבלות.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      <main className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        
        {currentStep === 'setup' ? (
          /* STEP 1: SETUP */
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {hasLastPlan && (
              <div className="flex justify-start">
                <button
                  onClick={() => setCurrentStep('editor')}
                  className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-200 font-semibold transition-all"
                >
                  חזרה לתכנון <ArrowLeft size={18} />
                </button>
              </div>
            )}
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-semibold text-white font-serif tracking-tight">הגדרות <span className="text-lilac-300">השיעור</span></h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed font-medium">
                הגדירו את הבסיס לשיעור שלכם והעלו חומרי עזר. ה-AI ישתמש במידע זה כדי לבנות מערך שיעור מותאם אישית.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
              <div className="p-8 md:p-12">
                <div className="mb-10">
                  <h2 className="text-3xl font-semibold text-white font-serif flex items-center gap-3 mb-2">
                    <FileEdit size={32} className="text-lilac-300"/> פרטי השיעור
                  </h2>
                  <p className="text-slate-400 font-medium">הגדירו את הבסיס לשיעור שלכם וה-AI יעזור לכם לבנות את השאר.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">מקצוע *</label>
                    <select 
                      name="subject" value={lessonDetails.subject} onChange={handleDetailsChange}
                      className="w-full p-4 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-lilac-400/20 focus:border-lilac-400/50 transition-all bg-black/20 backdrop-blur-md font-medium text-white appearance-none shadow-sm"
                    >
                      <option value="" disabled className="bg-slate-800 text-slate-300">בחר מקצוע...</option>
                      {SUBJECTS.map(subj => <option key={subj} value={subj} className="bg-slate-800 text-white">{subj}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">נושא השיעור *</label>
                    <input 
                      name="topic" value={lessonDetails.topic} onChange={handleDetailsChange}
                      placeholder="לדוגמה: משוואות ממעלה שנייה"
                      className="w-full p-4 border border-white/10 bg-white/5 rounded-2xl outline-none focus:ring-4 focus:ring-lilac-400/20 focus:border-lilac-400/50 transition-all font-medium text-white shadow-sm placeholder:text-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">שכבת גיל / כיתה *</label>
                    <select 
                      name="ageGroup" value={lessonDetails.ageGroup} onChange={handleDetailsChange}
                      className="w-full p-4 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-lilac-400/20 focus:border-lilac-400/50 transition-all bg-black/20 backdrop-blur-md font-medium text-white appearance-none shadow-sm"
                    >
                      <option value="" disabled className="bg-slate-800 text-slate-300">בחר כיתה...</option>
                      {GRADES.map(grade => <option key={grade} value={grade} className="bg-slate-800 text-white">{grade}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">משך השיעור (דקות) *</label>
                    <select 
                      name="duration" value={lessonDetails.duration} onChange={handleDetailsChange}
                      className="w-full p-4 border border-white/10 rounded-2xl outline-none focus:ring-4 focus:ring-lilac-400/20 focus:border-lilac-400/50 transition-all bg-black/20 backdrop-blur-md font-medium text-white appearance-none shadow-sm"
                    >
                      <option value="45 דקות">45 דקות</option>
                      <option value="60 דקות">60 דקות</option>
                      <option value="90 דקות">90 דקות (שיעור כפול)</option>
                    </select>
                  </div>
                </div>

                {/* אזור העלאת חומרים */}
                <div className="mt-12 bg-white/5 rounded-[2rem] p-8 border border-white/10 relative">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <div>
                      <label className="text-lg font-semibold text-white flex items-center gap-3 font-serif">
                        <BookOpen size={24} className="text-lilac-300"/> תוכן נוסף / חומרי עזר
                      </label>
                      <p className="text-sm text-slate-300 font-medium mt-1">
                        הדביקו טקסט או העלו קבצים כדי שה-AI יתבסס עליהם.
                      </p>
                    </div>
                    <label className={`cursor-pointer border border-white/10 text-slate-200 px-6 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-3 transition-all shadow-sm w-fit ${isFileLoading ? 'bg-white/5 opacity-50 cursor-not-allowed' : 'bg-white/5 hover:border-lilac-400 hover:text-white hover:bg-white/10'}`}>
                      {isFileLoading ? <Loader2 size={20} className="text-lilac-300 animate-spin" /> : <Upload size={20} className="text-lilac-300" />} 
                      {isFileLoading ? 'קורא קובץ...' : 'העלה קובץ'}
                      <input 
                        type="file" 
                        accept=".txt,.csv,.md,.pdf,.docx,.pptx" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={isFileLoading} 
                      />
                    </label>
                  </div>
                  
                  <textarea 
                    name="additionalContext" 
                    value={lessonDetails.additionalContext} 
                    onChange={handleDetailsChange}
                    placeholder="הדבק או הקלד תוכן נוסף כאן..."
                    className={`w-full p-6 border border-white/10 bg-white/5 rounded-2xl outline-none focus:ring-4 focus:ring-lilac-400/20 focus:border-lilac-400/50 transition-all min-h-[180px] resize-y bg-white/5 text-base font-medium text-white shadow-inner placeholder:text-slate-300 ${isFileLoading ? 'opacity-50' : ''}`}
                    disabled={isFileLoading}
                  ></textarea>
                </div>

                <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6">
                  <button 
                    onClick={generateFullPlanAI}
                    disabled={isLoading === 'all'}
                    className="bg-lilac-300 hover:bg-lilac-400 disabled:bg-lilac-200 text-white px-10 py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 shadow-xl shadow-lilac-200/20 transition-all hover:scale-[1.05] active:scale-95 group"
                  >
                    {isLoading === 'all' ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                    צור מערך מלא ב-AI
                  </button>
                  <button 
                    onClick={() => {
                      if (lessonDetails.subject && lessonDetails.topic) {
                        setCurrentStep('editor');
                      } else {
                        setErrorMsg('אנא מלאו מקצוע ונושא כדי להמשיך');
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-12 py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 shadow-xl shadow-slate-100 transition-all hover:scale-[1.05] active:scale-95 group"
                  >
                    המשך לתכנון ידני <ArrowLeft size={24} className="group-hover:translate-x-[-4px] transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: EDITOR */
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-start">
              <button 
                onClick={() => setCurrentStep('setup')}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-200 font-semibold transition-all"
              >
                <ArrowRight size={18} /> חזרה להגדרות
              </button>
            </div>
            {/* Intro & Cards Selection */}
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-semibold text-white font-serif tracking-tight">תכנון שיעור <span className="transition-colors duration-300" style={{ color: activePhaseTitleColor }}>חז״ק</span></h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed font-medium">
                  מודל חז״ק נועד להפוך את הלמידה מרחוק מפאסיבית לפעילה. 
                  שלושת השלבים מבטיחים מעורבות מתמדת של התלמידים.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.values(PHASES).map((phase) => (
                  <button
                    key={phase.id}
                    onClick={() => setActiveTab(phase.id)}
                    
                    className={`p-8 rounded-[2rem] border bg-white/5 backdrop-blur-md transition-all flex flex-col items-center justify-center text-center gap-4 group relative overflow-hidden
                      ${activeTab === phase.id ? phase.theme.border + ' shadow-xl shadow-lilac-200/20 scale-[1.02] ring-4 ring-opacity-10 ' + phase.theme.ring.replace('focus-within:', '') : 'border-white/10 shadow-sm hover:border-white/20 hover:shadow-md hover:bg-white/10'}
                    `}
                  >
                    <div className={`p-4 rounded-2xl transition-all ${activeTab === phase.id ? phase.theme.bgHeader + ' text-white shadow-lg' : 'bg-white/5 text-slate-400 group-hover:bg-lilac-300/20 group-hover:text-lilac-300'}`}>
                      <phase.icon size={32} />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-xl font-serif ${activeTab === phase.id ? 'text-white' : 'text-slate-300'}`}>{phase.title}</h3>
                      <p className="text-sm text-slate-400 mt-1 font-medium">{phase.subtitle}</p>
                    </div>
                    {(planData as any)[phase.id].activity && (
                      <div className="absolute top-4 left-4 bg-sage-green text-white p-1 rounded-full shadow-sm">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Content Area */}
            <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
              
              {errorMsg && (
                <div className="bg-lilac-100/20 text-lilac-400 p-4 flex items-center justify-center gap-3 text-sm font-semibold border-b border-white/10">
                  <AlertCircle size={20} /> {errorMsg}
                </div>
              )}

          {activeTab === 'harish' || activeTab === 'zria' || activeTab === 'katzir' ? (
            // Phase Editor Views
            <div>
              {/* Colored Header */}
              <div className={`${(PHASES as any)[activeTab].theme.bgHeader} p-8 text-white flex justify-between items-center relative overflow-hidden`}>
                <div className="relative z-10">
                  <h2 className="text-3xl font-semibold flex items-center gap-3 font-serif">
                    שלב ה{(PHASES as any)[activeTab].title} <span className="text-white/60 font-sans text-xl">/</span> {(PHASES as any)[activeTab].subtitle.split(' - ')[0]}
                  </h2>
                  <p className="text-base font-medium opacity-90 mt-2 max-w-2xl">
                    {(PHASES as any)[activeTab].subtitle.split(' - ')[1]} • {(PHASES as any)[activeTab].duration}
                  </p>
                </div>

                <button 
                  onClick={() => setIsPedagogyModalOpen(true)}
                  className="relative z-10 flex items-center gap-3 px-6 py-3 bg-white/90 hover:bg-white text-slate-900 rounded-2xl text-sm font-bold border-2 border-lilac-400/50 transition-all shadow-2xl hover:scale-[1.05] active:scale-95 group"
                >
                  <Sparkles size={18} className="group-hover:rotate-12 transition-transform text-lilac-600" />
                  <span>מאגר פדגוגי להעשרה</span>
                </button>
                <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12">
                  {React.createElement((PHASES as any)[activeTab].icon, { size: 160 })}
                </div>
              </div>

              <div className="p-8 md:p-12 space-y-10">
                {/* Goal Box */}
                <div className={`${(PHASES as any)[activeTab].theme.bgLight} text-slate-200 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border-white/10 text-base font-semibold border border-current/10 shadow-sm`}>
                  <span className="uppercase tracking-widest text-xs opacity-60 block mb-1">המטרה הפדגוגית</span>
                  {(PHASES as any)[activeTab].goal}
                </div>
                
                {/* Presentation PPTX Button - ONLY IN ZRIA */}
                {activeTab === 'zria' && (
                  <div className="bg-slate-800 p-8 rounded-[2rem] shadow-xl shadow-lilac-200/5 border border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-sage-green/10 blur-[100px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-sage-green/20"></div>
                    <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                      <div className="max-w-xl">
                        <h4 className="text-2xl font-semibold text-white flex items-center gap-3 font-serif">
                          <Presentation size={32} className="text-sage-green" /> מצגת הקנייה חכמה
                        </h4>
                        <p className="text-slate-400 font-medium mt-2">המערכת תייצר עבורכם מצגת PowerPoint מקצועית (10 שקפים) המבוססת על נושאי השיעור, מוכנה להצגה או לעריכה נוספת.</p>
                      </div>
                      <button 
                        onClick={generatePresentationPptx}
                        disabled={isSlideLoading}
                        className="bg-sage-green hover:bg-sage-green/90 text-white px-8 py-4 rounded-2xl font-semibold flex items-center gap-3 shadow-xl shadow-sage-green/20 transition-all hover:scale-[1.05] active:scale-95 disabled:opacity-50 whitespace-nowrap text-lg"
                      >
                        {isSlideLoading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
                        {isSlideLoading ? 'מכין קובץ...' : 'חולל מצגת עכשיו'}
                      </button>
                    </div>
                    
                    <div className="mt-8 bg-white/5 p-6 rounded-2xl border border-white/10 relative z-10">
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">
                          דגשים ספציפיים לשקפים (אופציונלי)
                        </label>
                        <button 
                          onClick={generateSlideConceptsAI}
                          disabled={isConceptsLoading || !lessonDetails.topic}
                          className="text-sm font-semibold bg-sage-green/20 text-white hover:bg-sage-green/30 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 border border-sage-green/30 shadow-sm"
                        >
                          {isConceptsLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          הצע מושגים רלוונטיים
                        </button>
                      </div>
                      <textarea 
                        name="slideTopics"
                        value={lessonDetails.slideTopics}
                        onChange={handleDetailsChange}
                        placeholder="לדוגמה: הגדרה, דוגמה ראשונה, תרגיל כיתה, סיכום ביניים..."
                        className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-sage-green/50 focus:border-sage-green transition-all min-h-[100px] placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                )}

                {/* AI Generator Button inside Phase */}
                <div className="flex justify-end pt-4">
                  <button 
                    onClick={() => generatePhaseAI(activeTab)}
                    disabled={isLoading === activeTab || !lessonDetails.subject || !lessonDetails.topic}
                    className="bg-lilac-300 hover:bg-lilac-400 text-white font-semibold px-8 py-3.5 rounded-2xl flex items-center gap-3 shadow-xl shadow-lilac-200/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {isLoading === activeTab ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20} className="text-lilac-100 group-hover:rotate-12 transition-transform" />}
                    {isLoading === activeTab ? 'חושב...' : 'AI ✨ הצע רעיונות לשלב זה'}
                  </button>
                </div>

                {/* Suggestions Cards (if exist) */}
                {(planData as any)[activeTab].suggestions?.length > 0 && (
                  <div className="mb-12 p-8 bg-white/5 rounded-[2rem] border border-white/10 shadow-inner">
                    <h4 className="text-lg font-semibold text-white mb-6 flex items-center gap-3 font-serif">
                      <Sparkles size={24} className="text-lilac-300" /> בחרו את הכיוון המועדף עליכם:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(planData as any)[activeTab].suggestions.map((opt: any, idx: number) => {
                        const isSelected = (planData as any)[activeTab].activity === opt.activity;
                        return (
                          <div 
                            key={idx}
                            onClick={() => {
                              handlePlanChange(activeTab, 'activity', opt.activity);
                              handlePlanChange(activeTab, 'tools', opt.tools);
                              handlePlanChange(activeTab, 'details', '');
                            }}
                            className={`cursor-pointer border p-6 rounded-2xl transition-all relative flex flex-col h-full ${
                              isSelected 
                                ? 'border-lilac-400 bg-white/10 shadow-xl shadow-black/40 scale-[1.02] z-10' 
                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:shadow-md opacity-80 hover:opacity-100'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-4">
                              <div className={`font-semibold text-xs uppercase tracking-widest ${isSelected ? 'text-lilac-300' : 'text-slate-400'}`}>אפשרות {idx + 1}</div>
                              {isSelected ? <CheckCircle2 size={24} className="text-sage-green" /> : <div className="w-6 h-6 rounded-full border border-white/10"></div>}
                            </div>
                            <div className="text-base text-slate-200 font-medium leading-relaxed mb-6 flex-grow">
                              <MarkdownText text={opt.activity} />
                            </div>
                            <div className="text-xs text-lilac-300 font-semibold bg-white/10 px-3 py-1.5 rounded-xl inline-flex items-center gap-2 w-fit">
                              <Pointer size={14} /> {opt.tools}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Activity Editor */}
                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">תיאור הפעילות הנבחרת *</label>
                  <div className={`relative border border-white/10 rounded-2xl overflow-hidden transition-all bg-white/5 shadow-sm focus-within:ring-4 focus-within:ring-lilac-400/20 focus-within:border-lilac-400/50`}>
                    <textarea 
                      value={(planData as any)[activeTab].activity}
                      onChange={(e) => handlePlanChange(activeTab, 'activity', e.target.value)}
                      placeholder="תאר את הפעילות שתתבצע בשלב זה..."
                      className="w-full p-6 min-h-[160px] outline-none resize-y text-white bg-transparent font-medium text-lg placeholder:text-slate-300"
                    />
                  </div>
                  
                  <div className="mt-4">
                    <button 
                      onClick={() => generateActivityDetailsAI(activeTab)}
                      disabled={isDetailLoading === activeTab || !(planData as any)[activeTab].activity}
                      className="text-sm font-semibold text-lilac-300 hover:text-lilac-400 flex items-center gap-2 transition-all hover:translate-x-[-4px] disabled:opacity-50"
                    >
                      {isDetailLoading === activeTab ? <Loader2 size={18} className="animate-spin" /> : <MessageCircleQuestion size={18} />}
                      {isDetailLoading === activeTab ? 'מכין הסבר מפורט...' : 'איך מבצעים את זה בפועל? (בקש הסבר מפורט מה-AI)'}
                    </button>
                    
                    {(planData as any)[activeTab].details && (
                      <div className="mt-6 p-8 bg-white/5 border border-white/10 shadow-inner rounded-2xl text-base text-slate-200 leading-relaxed whitespace-pre-wrap relative overflow-hidden font-medium">
                        <div className="absolute top-0 right-0 w-2 h-full bg-lilac-300"></div>
                        <strong className="block text-white mb-4 flex items-center gap-3 font-serif text-xl">
                          <MessageCircleQuestion size={24} className="text-lilac-300" /> מדריך לביצוע הפעילות:
                        </strong>
                        <MarkdownText text={(planData as any)[activeTab].details} />
                      </div>
                    )}
                  </div>
                </div>

                
                {/* Differentiation & Adaptation Section */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="bg-lilac-400/20 p-2 rounded-lg">
                      <Network size={18} className="text-lilac-300" />
                    </div>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <h4 className="text-base font-bold text-white mb-0.5">דיפרנציאליות והתאמה פדגוגית</h4>
                          <p className="text-xs text-slate-200 font-semibold tracking-wide">התאמה למתקשים ואתגר למתקדמים</p>
                        </div>
                        <button
                          onClick={() => generateDifferentiationAI(activeTab)}
                          disabled={isDiffLoading === activeTab}
                          className="flex items-center gap-2 px-4 py-2 bg-lilac-500/20 hover:bg-lilac-500/30 text-lilac-200 rounded-xl text-xs font-extrabold border-2 border-lilac-500/40 transition-all shadow-lg hover:scale-[1.05] active:scale-95 disabled:opacity-50"
                        >
                          {isDiffLoading === activeTab ? (
                            <div className="w-4 h-4 border-2 border-lilac-300 border-t-transparent rounded-full animate-spin" />
                          ) : <Sparkles size={14} />}
                          ✨ חולל התאמה (AI)
                        </button>
                      </div>
                  </div>
                  <div className="relative border border-white/5 rounded-2xl overflow-hidden transition-all bg-white/[0.02] hover:bg-white/[0.04]">
                    <textarea 
                      value={(planData as any)[activeTab].differentiation}
                      onChange={(e) => handlePlanChange(activeTab, 'differentiation', e.target.value)}
                      placeholder="הזן כאן הנחיות לדיפרנציאליות (למשל: 'למתקשים - ניתן להשתמש בקידוד צבעים...')"
                      className="w-full p-5 min-h-[90px] outline-none resize-none text-slate-300 bg-transparent font-medium text-sm italic placeholder:text-slate-500 leading-relaxed"
                    />
                  </div>
                </div>

                {/* Tools Editor */}
                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest">כלים טכנולוגיים מומלצים</label>
                  <input 
                    value={(planData as any)[activeTab].tools}
                    onChange={(e) => handlePlanChange(activeTab, 'tools', e.target.value)}
                    placeholder={(PHASES as any)[activeTab].toolsPlaceholder}
                    className={`w-full p-4 border border-white/10 rounded-2xl outline-none transition-all bg-black/20 backdrop-blur-md font-medium text-white focus:ring-4 focus:ring-lilac-200/10 focus:border-white/20 shadow-sm`}
                  />
                </div>

                {/* Fixed Ideas Box (fallback) */}
                {(planData as any)[activeTab].suggestions?.length === 0 && (
                  <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 shadow-inner">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-3 font-serif">
                      💡 רעיונות להשראה:
                    </h4>
                    <ul className="text-base text-slate-300 space-y-3 font-medium">
                      {(PHASES as any)[activeTab].ideas.map((idea: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className={`mt-2 w-2 h-2 rounded-full ${(PHASES as any)[activeTab].theme.bgHeader} shrink-0 shadow-sm`}></div>
                          {idea}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            </div>
          ) : null}
          </div>
        </div>
      )}
    </main>

      </>
      )}
      {/* Printable Area (Used for PDF Rendering) */}
      <div id="printable-area" dir="rtl" className="hidden p-12 bg-slate-50 font-sans" style={{ color: '#1e293b' }}>
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-l from-indigo-900 via-purple-900 to-slate-900 text-white p-8 rounded-[1.5rem] shadow-md mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-lilac-400/20 blur-2xl rounded-full -ml-10 -mb-10"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-serif font-bold mb-1 opacity-95">מודל חז"ק להוראה מרחוק</h1>
                <h2 className="text-xl font-medium opacity-90">{lessonDetails.topic || 'נושא השיעור'}</h2>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-center">
                <span className="block text-xs uppercase tracking-widest opacity-80 mb-1">משך זמן</span>
                <span className="font-bold text-lg">{lessonDetails.duration || '-'}</span>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium border border-white/10">
                📚 {lessonDetails.subject || 'מקצוע'}
              </span>
              <span className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-medium border border-white/10">
                👥 {lessonDetails.ageGroup || 'כיתה'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-10 px-4">
          
          {/* Harish */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
            <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
                <Sprout size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">שלב ה'חריש'</h3>
                <p className="text-slate-500 font-medium">פתיחת שיעור - יצירת עניין וסקרנות ({PHASES.harish.duration})</p>
              </div>
            </div>
            <div className="space-y-5 flexflex-col text-slate-700">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">מה עושים?</span>
                <div className="text-lg font-medium text-slate-800">
                  <MarkdownText text={planData.harish.activity} />
                </div>
              </div>
              <p className="flex items-center gap-2 font-medium">
                <span className="text-slate-400">כלים:</span> 
                <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-lg text-sm">{planData.harish.tools || '-'}</span>
              </p>
              
              {planData.harish.differentiation && (
                <div className="mt-4 pt-4 border-t border-slate-100 italic text-slate-500 bg-slate-50/50 p-4 rounded-xl text-sm leading-relaxed">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">דיפרנציאליות והתאמה:</span>
                  {planData.harish.differentiation}
                </div>
              )}
              {planData.harish.details && (
                <div className="mt-4 pt-5 border-t border-slate-100">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">איך מבצעים בפועל?</span>
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-600">
                    <MarkdownText text={planData.harish.details} />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Zria */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
            <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl">
                <BookOpen size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">שלב ה'זריעה'</h3>
                <p className="text-slate-500 font-medium">הקנייה ועבודה פעילה - לב השיעור ({PHASES.zria.duration})</p>
              </div>
            </div>
            <div className="space-y-5 text-slate-700">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">מה עושים?</span>
                <p className="text-lg font-medium">{planData.zria.activity || 'טרם הוזנה פעילות'}</p>
              </div>
              <p className="flex items-center gap-2 font-medium">
                <span className="text-slate-400">כלים:</span> 
                <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg text-sm">{planData.zria.tools || '-'}</span>
              </p>
              
              {planData.zria.differentiation && (
                <div className="mt-4 pt-4 border-t border-slate-100 italic text-slate-500 bg-slate-50/50 p-4 rounded-xl text-sm leading-relaxed">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">דיפרנציאליות והתאמה:</span>
                  {planData.zria.differentiation}
                </div>
              )}
              {planData.zria.details && (
                <div className="mt-4 pt-5 border-t border-slate-100">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">איך מבצעים בפועל?</span>
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-600">{planData.zria.details}</div>
                </div>
              )}
            </div>
          </section>

          {/* Katzir */}
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
            <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="bg-purple-50 text-purple-600 p-3 rounded-2xl">
                <Wheat size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">שלב ה'קציר'</h3>
                <p className="text-slate-500 font-medium">רפלקציה וסיכום - סוף השיעור ({PHASES.katzir.duration})</p>
              </div>
            </div>
            <div className="space-y-5 text-slate-700">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">מה עושים?</span>
                <p className="text-lg font-medium">{planData.katzir.activity || 'טרם הוזנה פעילות'}</p>
              </div>
              <p className="flex items-center gap-2 font-medium">
                <span className="text-slate-400">כלים:</span> 
                <span className="text-purple-600 bg-purple-50 px-3 py-1 rounded-lg text-sm">{planData.katzir.tools || '-'}</span>
              </p>
              
              {planData.katzir.differentiation && (
                <div className="mt-4 pt-4 border-t border-slate-100 italic text-slate-500 bg-slate-50/50 p-4 rounded-xl text-sm leading-relaxed">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">דיפרנציאליות והתאמה:</span>
                  {planData.katzir.differentiation}
                </div>
              )}
              {planData.katzir.details && (
                <div className="mt-4 pt-5 border-t border-slate-100">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">איך מבצעים בפועל?</span>
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-600">{planData.katzir.details}</div>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-sm border border-slate-200">
            <Sparkles size={16} className="text-purple-500" />
            <span className="text-slate-700 text-base font-bold">נוצר באמצעות מחולל חז״ק - ע״י ענת ברון לוביש</span>
          </div>
        </div>

      </div>


      {/* Pedagogy Appendix Modal */}
      {isPedagogyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#1a1625] rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-lilac-400/10 to-transparent">
              <div>
                <h2 className="text-3xl font-serif font-bold text-white flex items-center gap-4">
                  <div className="bg-lilac-400 p-3 rounded-2xl shadow-lg shadow-lilac-400/20">
                    <Sparkles size={28} className="text-white" />
                  </div>
                  מאגר מתודות פדגוגיות להעשרת השיעור
                </h2>
                <p className="text-slate-400 mt-2 font-medium">כלים מעשיים ללמידה פעילה, שיתופית ומשמעותית</p>
              </div>
              <button 
                onClick={() => setIsPedagogyModalOpen(false)} 
                className="p-3 hover:bg-white/10 rounded-full transition-all text-slate-300 border border-white/5 hover:border-white/20 shadow-inner"
              >
                <X size={28} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1 space-y-12 bg-transparent custom-scrollbar">
              {PEDAGOGY_METHODS.map((cat, catIdx) => (
                <div key={catIdx} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-gradient-to-l from-lilac-400/50 to-transparent"></div>
                    <h3 className="text-xl font-bold text-lilac-300 uppercase tracking-widest">{cat.category}</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-lilac-400/50 to-transparent"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cat.methods.map((m, mIdx) => (
                      <div key={mIdx} className="group bg-white/[0.03] p-6 rounded-3xl border border-white/5 hover:border-lilac-400/30 transition-all hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-lilac-400/5">
                        <h4 className="text-lg font-bold text-white mb-3 group-hover:text-lilac-300 transition-colors flex items-center gap-2">
                           <div className="w-1.5 h-6 bg-lilac-400 rounded-full"></div>
                           {m.title}
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed mb-4 font-medium opacity-90">{m.description}</p>
                        {m.extra && (
                          <div className="bg-lilac-400/10 p-4 rounded-2xl border border-lilac-400/10">
                            <p className="text-xs text-lilac-200 font-bold flex items-center gap-2 italic">
                              <CheckCircle2 size={14} /> {m.extra}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 bg-white/5 border-t border-white/5 text-center">
              <p className="text-slate-500 text-xs font-medium tracking-wide">💡 טיפ: שלבו את המתודות בתיאור הפעילות בשיעור כדי ליצור למידה דינמית יותר</p>
            </div>
          </div>
        </div>
      )}

      {/* Saved Plans Modal */}
            {/* Success Floating Message */}
      {successMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-sage-green text-white px-8 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border border-white/20">
            <CheckCircle2 size={24} />
            {successMsg}
          </div>
        </div>
      )}

      {isSavedPlansModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-4">
                <div className="bg-lilac-500/20 p-3 rounded-2xl text-lilac-300 shadow-lg">
                  <FolderOpen size={28} />
                </div>
                <h2 className="text-3xl font-serif font-bold text-white">מאגר המערכים</h2>
              </div>
              <button onClick={() => { setIsSavedPlansModalOpen(false); setFilterSubject(''); setFilterAgeGroup(''); }} className="p-3 hover:bg-white/10 rounded-full transition-all text-slate-300 border border-white/5 hover:border-white/20">
                <X size={28} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex p-2 bg-white/5 mx-8 mt-6 rounded-2xl border border-white/10">
              <button 
                onClick={() => setPlansTab('mine')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${plansTab === 'mine' ? 'bg-lilac-500 text-white shadow-lg shadow-lilac-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                <User size={16} /> המערכים שלי
              </button>
              <button 
                onClick={() => setPlansTab('public')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${plansTab === 'public' ? 'bg-lilac-500 text-white shadow-lg shadow-lilac-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                <Users size={16} /> שיתופי קהילה
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 px-8 mt-4">
              <select 
                value={filterSubject} 
                onChange={(e) => setFilterSubject(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-lilac-400 transition-all appearance-none"
              >
                <option value="" className="bg-slate-800 text-slate-300">כל המקצועות</option>
                {SUBJECTS.map(subj => <option key={subj} value={subj} className="bg-slate-800 text-white">{subj}</option>)}
              </select>
              <select 
                value={filterAgeGroup} 
                onChange={(e) => setFilterAgeGroup(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-lilac-400 transition-all appearance-none"
              >
                <option value="" className="bg-slate-800 text-slate-300">כל הכיתות</option>
                {GRADES.map(grade => <option key={grade} value={grade} className="bg-slate-800 text-white">{grade}</option>)}
                <option value="חינוך מיוחד" className="bg-slate-800 text-white">חינוך מיוחד</option>
                <option value="אחר" className="bg-slate-800 text-white">אחר</option>
              </select>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-transparent custom-scrollbar">
              {isPlansLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 size={40} className="text-lilac-300 animate-spin" />
                  <p className="text-slate-400 font-medium">טוען מערכים מהענן...</p>
                </div>
              ) : (
                <>
                  {savedPlans.filter(p => {
                    const isTabMatch = plansTab === 'mine' ? p.user_id === userProfile?.id : p.is_public;
                    const isSubjectMatch = filterSubject ? p.lessonDetails.subject === filterSubject : true;
                    const isAgeGroupMatch = filterAgeGroup ? p.lessonDetails.ageGroup === filterAgeGroup : true;
                    return isTabMatch && isSubjectMatch && isAgeGroupMatch;
                  }).length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                      <FolderOpen size={64} className="mx-auto mb-6 opacity-10" />
                      <p className="text-lg font-medium">{plansTab === 'mine' ? 'לא נמצאו מערכים התואמים לחיפוש.' : 'לא נמצאו מערכים ציבוריים התואמים לחיפוש.'}</p>
                      {plansTab === 'mine' && <p className="text-sm opacity-60 mt-2">נסו לשנות את אפשרויות הסינון.</p>}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {savedPlans.filter(p => {
                        const isTabMatch = plansTab === 'mine' ? p.user_id === userProfile?.id : p.is_public;
                        const isSubjectMatch = filterSubject ? p.lessonDetails.subject === filterSubject : true;
                        const isAgeGroupMatch = filterAgeGroup ? p.lessonDetails.ageGroup === filterAgeGroup : true;
                        return isTabMatch && isSubjectMatch && isAgeGroupMatch;
                      }).map(plan => (
                        <div key={plan.id} onClick={() => loadPlan(plan)} className="relative group bg-white/5 p-4 rounded-[1.6rem] border border-white/10 hover:border-lilac-400 shadow-sm hover:shadow-2xl hover:shadow-lilac-500/10 cursor-pointer transition-all flex justify-between items-center overflow-hidden">
                          {plan.is_public && plansTab === 'mine' && (
                            <div className="absolute top-0 left-0 bg-sage-green/20 text-white px-3 py-1 rounded-br-2xl text-[10px] font-bold border-b border-r border-sage-green/20">
                              שיתוף ציבורי פעיל
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                             <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-inner ${plansTab === 'mine' ? 'bg-lilac-500/10 text-lilac-300' : 'bg-sage-green/10 text-sage-green'}`}>
                                {plansTab === 'mine' ? <FileText size={22} /> : <Users size={22} />}
                             </div>
                              <div>
                                <h3 className="font-bold text-lg text-white group-hover:text-lilac-300 transition-colors">{plan.lessonDetails.topic}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="text-xs font-bold text-slate-400 border border-white/5 bg-white/5 py-0.5 px-2 rounded-lg">{plan.lessonDetails.subject}</span>
                                   <span className="text-xs font-bold text-slate-400 border border-white/5 bg-white/5 py-0.5 px-2 rounded-lg">{plan.lessonDetails.ageGroup}</span>
                                   <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1"><Clock size={10} /> {plan.date}</span>
                                </div>
                             </div>
                          </div>
                          
                          {plansTab === 'mine' && (
                            <div className="flex items-center gap-2">
                              {plan.is_public && (
                                <button
                                  onClick={(e) => unsharePlan(plan.id, e)}
                                  disabled={unsharingPlanId === plan.id}
                                  className="px-3 py-2 text-xs font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all disabled:opacity-60"
                                  title="הסר משיתוף ציבורי"
                                >
                                  {unsharingPlanId === plan.id ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Loader2 size={12} className="animate-spin" />
                                      מסיר...
                                    </span>
                                  ) : (
                                    'הסר משיתוף'
                                  )}
                                </button>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePlan(plan.id, e);
                                }} 
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all shadow-sm" 
                                title="מחק מערך"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Modal Footer */}
            <div className="p-6 bg-white/5 border-t border-white/10 text-center">
               <p className="text-xs text-slate-500 font-medium tracking-wide">💡 בלחיצה על מערך הוא ייטען לעורך בגרסתו האחרונה</p>
            </div>
          </div>
        </div>

       )}
    </div>
  );
}
