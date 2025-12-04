import React, { useState, useRef, useEffect } from 'react';
import { 
  HeartPulse, Send, FileText, 
  Stethoscope, Quote
} from 'lucide-react';
import { MOCK_FATWAS } from './constants';
import { ChatMessage, Fatwa } from './types';

// حساب تشابه الكلمات (Levenshtein distance)
// يساعد في البحث عن كلمات مشابهة حتى لو كانت مختلفة قليلاً
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
};

// حساب درجة التشابه بين كلمتين (0-1)
const similarityScore = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
};

// تطبيع النص العربي الشامل: إزالة التشكيل وتوحيد جميع الأشكال المختلفة
// هذا ينطبق على كل جزء من الفتوى
const normalizeArabic = (text: string): string[] => {
  if (!text) return [];
  
  const normalized = text
    .toLowerCase()
    .normalize('NFKD')
    // إزالة جميع الحركات والتشكيل
    .replace(/[\u064B-\u0652\u0640]/g, '')
    // توحيد جميع أشكال الألف (ا أ إ آ)
    .replace(/[أإآ]/g, 'ا')
    // توحيد الألف المقصورة (ى) مع الياء (ي)
    .replace(/ى/g, 'ي')
    // توحيد التاء المربوطة (ة) مع الهاء (ه)
    .replace(/ة/g, 'ه')
    // إزالة أي حروف غير عربية (ليبقى فقط الحروف والأرقام والمسافات)
    .replace(/[^\u0600-\u06FF0-9\s]/g, ' ')
    // تقسيم حسب المسافات والحروف المتعددة
    .split(/\s+/)
    .filter(Boolean);
  
  return normalized;
};

// قاموس مرادفات شامل للكلمات الطبية والشرعية الشائعة
const SYNONYMS: Record<string, string[]> = {
  'اجهاض': ['اسقاط', 'انهاء حمل', 'اسقاط جنين', 'abortion', 'terminate'],
  'اسقاط': ['اجهاض', 'انهاء حمل', 'abortion'],
  'حمل': ['حامل', 'حاملة', 'pregnancy', 'pregnant'],
  'جنين': ['fetus', 'foetus', 'embryo'],
  'تلقيح': ['اخصاب', 'اطفال الانابيب', 'حقن مجهري', 'ivf', 'icsi', 'artificial insemination'],
  'اخصاب': ['تلقيح', 'ivf', 'اطفال الانابيب', 'fertilization'],
  'كلوي': ['كلي', 'كلى', 'كلية', 'renal', 'kidney', 'kidneys'],
  'كلى': ['كلية', 'كلوي', 'كلي', 'renal', 'kidney'],
  'عضو': ['اعضاء', 'زراعة اعضاء', 'نقل اعضاء', 'transplant', 'organ'],
  'اعضاء': ['عضو', 'زراعة اعضاء', 'نقل اعضاء', 'organs'],
  'تجميل': ['جراحه تجميليه', 'بوتوكس', 'فيلر', 'rhinoplasty', 'plastic surgery', 'cosmetic'],
  'خنثى': ['تصحيح الجنس', 'تصحيح نوع الجنس', 'intersex', 'hermaphrodite'],
  'تحويل': ['تغيير الجنس', 'تحول جنسي', 'gender reassignment', 'sex change'],
  'لقاح': ['تطعيم', 'vaccine', 'كورونا', 'covid'],
  'كورونا': ['covid', 'كوفيد', 'كوفيد19', 'فيروس كورونا', 'coronavirus'],
  'صيام': ['صوم', 'ramadan', 'fasting', 'سيام'],
  'صوم': ['صيام', 'fasting', 'ramadan'],
  'غسيل': ['غسيل كلى', 'dialysis', 'تصفية', 'hemodialysis'],
  'كحول': ['معقم', 'alcohol', 'ethanol'],
  'موت': ['وفاة', 'death', 'دماغي', 'brain death'],
  'دماغي': ['موت دماغي', 'brain death', 'brain stem'],
  'اعاشة': ['انعاش', 'resuscitation', 'life support', 'ventilator'],
  'انعاش': ['اعاشة', 'resuscitation', 'cpr'],
  'بويضة': ['بويضات', 'egg', 'oocyte', 'ovum'],
  'سرطان': ['ورم', 'cancer', 'malignancy', 'tumour'],
  'ضرر': ['ضرر', 'harm', 'damage', 'injury'],
  'ضرورة': ['ضرورة', 'necessity', 'medical emergency'],
  'حرام': ['محرم', 'forbidden', 'unlawful', 'haram'],
  'حلال': ['جائز', 'permitted', 'lawful', 'halal'],
  'جائز': ['حلال', 'permitted', 'allowed', 'lawful'],
  'مشروط': ['conditional', 'بشروط', 'conditions'],
};

const expandWithSynonyms = (words: string[]): string[] => {
  const expanded = new Set<string>();
  
  // أضف الكلمات الأصلية
  words.forEach(w => expanded.add(w));
  
  // لكل كلمة، ابحث عن مرادفاتها
  for (const word of words) {
    // ابحث عن الكلمة في قاموس المرادفات
    if (SYNONYMS[word]) {
      // أضف جميع المرادفات (بعد تطبيعها)
      for (const syn of SYNONYMS[word]) {
        const normalized = normalizeArabic(syn);
        normalized.forEach(n => expanded.add(n));
        expanded.add(syn.toLowerCase());
      }
    }
  }
  
  return Array.from(expanded);
};

// خوارزميات بحث محلية دقيقة + مرنة - توازن ذكي
const scoreFatwa = (query: string, fatwa: Fatwa): number => {
  // تطبيع الاستعلام
  const queryNormalized = normalizeArabic(query);
  
  // إذا كان الاستعلام إنجليزي، ابحث عنه مباشرة
  const queryLower = query.toLowerCase().trim();
  const isEnglish = /^[a-z\s]+$/i.test(queryLower);
  
  // تطبيع جميع حقول الفتوى
  const titleNormalized = normalizeArabic(fatwa.title);
  const questionNormalized = normalizeArabic(fatwa.question || '');
  const contextNormalized = normalizeArabic(fatwa.medical_context || '');
  const tagsNormalized = normalizeArabic((fatwa.tags || []).join(' '));
  const rulingNormalized = normalizeArabic(fatwa.ruling || '');
  
  // النصوص الأصلية (للبحث الدقيق)
  const contextEnglish = (fatwa.medical_context || '').toLowerCase();
  const tagsEnglish = ((fatwa.tags || []).join(' ')).toLowerCase();
  
  let score = 0;
  let hasDirectMatch = false; // هل وجدنا تطابق دقيق؟

  if (isEnglish && queryLower.length > 0) {
    // ====== البحث الإنجليزي ======
    
    // 1️⃣ التطابق الدقيق الكامل (أعلى أولوية)
    if (contextEnglish.includes(queryLower)) {
      score += 20;
      hasDirectMatch = true;
    }
    if (tagsEnglish.includes(queryLower)) {
      score += 15;
      hasDirectMatch = true;
    }
    
    // 2️⃣ البحث عن كل كلمة على حدة
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length === 0) return 0;
    
    let directMatchesCount = 0;
    for (const word of queryWords) {
      // تطابق دقيق؟
      if (contextEnglish.includes(word)) {
        score += 12;
        directMatchesCount++;
      } else if (tagsEnglish.includes(word)) {
        score += 10;
        directMatchesCount++;
      }
    }
    
    // إذا وجدنا تطابقات دقيقة، قلل الاعتماد على التشابه الضعيف
    hasDirectMatch = directMatchesCount > 0;
    
    // 3️⃣ المرونة: البحث عن تشابه (لكن فقط لو لم نجد تطابقات دقيقة قوية)
    if (!hasDirectMatch) {
      const allContextWords = contextEnglish.split(/[\s,()/-]+/);
      for (const word of queryWords) {
        for (const contextWord of allContextWords) {
          if (contextWord.length > 2) {
            const similarity = similarityScore(word, contextWord);
            // 0.78+ = مرن لكن ليس جداً
            if (similarity > 0.78) {
              score += 3 + (2 * similarity);
            }
          }
        }
      }
    }
  } else {
    // ====== البحث العربي ======
    
    if (!queryNormalized.length) return 0;
    
    let directMatchesCount = 0;
    
    // 1️⃣ البحث الدقيق أولاً
    for (const queryWord of queryNormalized) {
      if (queryWord.length < 2) continue;
      
      if (contextNormalized.includes(queryWord)) {
        score += 14;
        directMatchesCount++;
      } else if (titleNormalized.includes(queryWord)) {
        score += 11;
        directMatchesCount++;
      } else if (tagsNormalized.includes(queryWord)) {
        score += 9;
        directMatchesCount++;
      } else if (questionNormalized.includes(queryWord)) {
        score += 7;
        directMatchesCount++;
      }
    }
    
    hasDirectMatch = directMatchesCount > 0;
    
    // 2️⃣ المرونة: تشابه الكلمات (فقط لو لم نجد تطابقات قوية)
    if (!hasDirectMatch) {
      for (const queryWord of queryNormalized) {
        if (queryWord.length < 2) continue;
        
        // بحث متشابه في السياق الطبي
        for (const contextWord of contextNormalized) {
          if (contextWord.length > 2) {
            const similarity = similarityScore(queryWord, contextWord);
            if (similarity > 0.80) { // عتبة معقولة
              score += 3 + (2 * similarity);
            }
          }
        }
        
        // بحث متشابه في الوسوم
        for (const tagWord of tagsNormalized) {
          if (tagWord.length > 2) {
            const similarity = similarityScore(queryWord, tagWord);
            if (similarity > 0.80) {
              score += 2 + (1.5 * similarity);
            }
          }
        }
      }
    }
    
    // 3️⃣ إذا لم نجد شيء إطلاقاً، ابحث في باقي الحقول
    if (score === 0) {
      for (const queryWord of queryNormalized) {
        if (rulingNormalized.includes(queryWord)) {
          score += 2;
        }
      }
    }
  }

  return score || 0;
};

// البحث عن جميع الفتاوى المطابقة (ليس فتوى واحدة فقط)
const findAllMatchingFatwas = (query: string, fatwas: Fatwa[]): Fatwa[] => {
  const scored = fatwas.map(f => ({
    fatwa: f,
    score: scoreFatwa(query, f)
  }));

  // العتبة الذكية: الفتاوى التي بها تطابقات دقيقة أعلى (حتى لو درجتها = 7)
  // والفتاوى بدون تطابقات دقيقة تحتاج درجة أعلى (9+)
  return scored
    .filter(item => item.score > 3) // عتبة منخفضة: نرجع أي شيء مرتبط نوعاً ما
    .sort((a, b) => b.score - a.score)
    .map(item => item.fatwa)
    .slice(0, 5); // نرجع أفضل 5 نتائج فقط (لا نغرق المستخدم)
};

export const App: React.FC = () => {
  // State
  const [allFatwas] = useState<Fatwa[]>(MOCK_FATWAS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const isEmergency = false; 
  const [isLoading, setIsLoading] = useState(false);
  
  // مرجع لحاوية الرسائل نفسها
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle Sending Message - بحث محلي فقط داخل الفتاوى
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      isEmergency,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      let matchedFatwaIds: string[] = [];
      let botResponseText = '';

      const matchedFatwas = findAllMatchingFatwas(text, allFatwas);
      if (matchedFatwas.length > 0) {
        matchedFatwaIds = matchedFatwas.map(f => f.id);
        const count = matchedFatwas.length;
        if (count === 1) {
          botResponseText = 'ها هي الفتوى عزيزي الطبيب';
        } else {
          botResponseText = `ها هي ${count} فتاوى مرتبطة بسؤالك من مصادر متعددة:`;
        }
      } else {
        botResponseText = 'عذرًا، لم أجد فتوى مطابقة لهذا السؤال في قاعدة البيانات الحالية.';
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: botResponseText,
        isEmergency,
        relatedFatwaIds: matchedFatwaIds,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: 'عذرًا، حدث خطأ غير متوقَّع.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 text-slate-800 font-tajawal overflow-hidden">
      
      {/* --- HEADER --- */}
      <header className="px-5 py-4 bg-white border-b border-gray-100 shadow-sm flex items-center justify-center relative z-20">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50">
              <Stethoscope className="w-6 h-6 text-teal-700" />
            </div>
            <h1 className="text-2xl font-bold font-amiri text-gray-900 leading-none">الطــبيب الفقيــه</h1>
          </div>
          <span className="text-sm text-teal-600 font-ruqaa opacity-90 tracking-wide transform -translate-y-2">
            (بين الطب والشريعة)
          </span>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>

        {/* CHAT AREA */}
        <section className="flex-1 flex flex-col relative z-10 w-full mx-auto max-w-lg md:max-w-2xl">
          {/* Messages List */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-3 md:p-5 space-y-6 pb-64 scrollbar-hide"
          >
            
            {/* Welcome State (Mobile Compact) */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center mt-2 px-2">
                
                <div className="w-full space-y-6 animate-in fade-in zoom-in duration-700">
                  
                  {/* Hero Icon */}
                  <div className="flex justify-center">
                    <div className="bg-gradient-to-tr from-teal-50 to-white p-4 rounded-full shadow-sm ring-1 ring-gray-100">
                       <HeartPulse className="w-10 h-10 text-teal-600" />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-800 font-amiri">السلام عليكم دكتور</h2>
                    <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                    صلّ على سيدنا النبي ﷺ خير معلم الناس الخير.
                    </p>
                  </div>

                  {/* Quotes Section (Compact for Mobile) */}
                  <div className="grid grid-cols-1 gap-3 w-full">
                     {/* Imam Al-Shafi'i */}
                     <div className="relative overflow-hidden bg-white p-4 rounded-xl border border-teal-100 shadow-sm text-right">
                        <Quote className="absolute -bottom-2 -left-2 w-12 h-12 text-teal-50 opacity-50 rotate-12" />
                        <p className="text-gray-800 font-amiri text-base font-medium leading-relaxed mb-2 relative z-10">
                            "لا أعلم علمًا بعد الحلال والحرام أنبل من الطب"
                        </p>
                        <span className="text-xs font-bold text-teal-600 block relative z-10">- الإمام الشافعي</span>
                     </div>

                     {/* Abu Bakr Al-Razi */}
                     <div className="relative overflow-hidden bg-white p-4 rounded-xl border border-blue-100 shadow-sm text-right">
                        <Quote className="absolute -bottom-2 -left-2 w-12 h-12 text-blue-50 opacity-50 rotate-12" />
                        <p className="text-gray-800 font-amiri text-base font-medium leading-relaxed mb-2 relative z-10">
                             "عليّ أن أتسلح بالعلم؛ لأجابه هذا العدو البغيض الذي يفتك ببنيان الله المقدس"
                        </p>
                        <span className="text-xs font-bold text-teal-600 block relative z-10">- أبو بكر الرازي</span>
                     </div>
                  </div>
                  
                </div>
              </div>
            )}

            {messages.map((msg) => {
              // الحصول على جميع الفتاوى المطابقة
              const fatwas = (msg.relatedFatwaIds || [])
                .map(id => allFatwas.find(f => f.id === id))
                .filter((f): f is Fatwa => f !== undefined);
              
              return (
                <div key={msg.id} className={`flex w-full flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  
                    {/* User Message Bubble */}
                    {msg.role === 'user' && (
                       <div className="bg-teal-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-md max-w-[85%]">
                         <p className="text-base">{msg.text}</p>
                       </div>
                    )}

                    {/* Bot Message Container */}
                    {msg.role === 'model' && (
                      <div className="w-full animate-in slide-in-from-bottom-2 duration-500">
                        
                        {/* 1. Simple Text Response (Intro or Error) */}
                        {fatwas.length === 0 && (
                          <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 text-gray-800 max-w-[90%] mb-2">
                             <p className="text-sm leading-relaxed">{msg.text}</p>
                          </div>
                        )}

                        {/* 2. Intro Message (when showing multiple fatwas) */}
                        {fatwas.length > 0 && (
                          <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 text-gray-800 max-w-[90%] mb-3">
                             <p className="text-sm leading-relaxed">{msg.text}</p>
                          </div>
                        )}

                        {/* 3. Fatwa Cards (One or Multiple) */}
                        {fatwas.map((fatwa, index) => (
                          <div key={fatwa.id} className="w-full rounded-xl shadow-md overflow-hidden border border-gray-200 bg-white mb-3">
                            
                            {/* Card Header */}
                            <div className="px-4 py-3 border-b flex justify-between items-center bg-gradient-to-r from-teal-50 to-blue-50 border-gray-100">
                               <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-teal-600" />
                                  <span className="text-xs font-bold text-teal-700">
                                    فتوى {fatwas.length > 1 ? `${index + 1} من ${fatwas.length}` : 'تفصيلية'}
                                  </span>
                               </div>
                               <span className="text-[11px] text-teal-700 bg-white/70 px-2 py-1 rounded font-semibold">
                                 {fatwa.source}
                               </span>
                            </div>

                            {/* Card Body - FULL INFO */}
                            <div className="p-4 space-y-4">
                              
                              {/* Title */}
                              <h3 className="font-bold text-lg font-amiri leading-snug text-gray-900 border-r-4 border-teal-600 pr-3">
                                {fatwa.title}
                              </h3>
                              
                              {/* Question Section */}
                              <div className="bg-amber-50/50 rounded p-3 border border-amber-100/50">
                                <p className="text-xs font-bold text-amber-800 mb-2">❓ السؤال:</p>
                                <p className="text-sm text-amber-900 leading-relaxed">
                                  {fatwa.question}
                                </p>
                              </div>

                              {/* Medical Context (if available) */}
                              {fatwa.medical_context && (
                                <div className="bg-blue-50/50 rounded p-3 border border-blue-100/50">
                                  <p className="text-xs font-bold text-blue-800 mb-2">🏥 السياق الطبي:</p>
                                  <p className="text-sm text-blue-900 leading-relaxed font-mono">
                                    {fatwa.medical_context}
                                  </p>
                                </div>
                              )}

                              {/* Ruling Section - FULL TEXT */}
                              <div className="bg-green-50/50 rounded p-4 border-l-4 border-green-600">
                                <p className="text-xs font-bold mb-3 text-green-800">✅ الحكم الشرعي والتفصيل:</p>
                                <p className="text-sm leading-8 whitespace-pre-wrap text-gray-800 font-medium">
                                  {fatwa.ruling}
                                </p>
                              </div>

                              {/* Verdict Tag */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-600">الحكم النهائي:</span>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                  fatwa.verdict === 'PERMITTED' ? 'bg-green-100 text-green-800' :
                                  fatwa.verdict === 'FORBIDDEN' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {fatwa.verdict === 'PERMITTED' && '✓ جائز'}
                                  {fatwa.verdict === 'FORBIDDEN' && '✗ محرم'}
                                  {fatwa.verdict === 'CONDITIONAL' && '◎ مشروط'}
                                </span>
                              </div>

                              {/* Tags */}
                              {fatwa.tags && fatwa.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {fatwa.tags.map((tag, i) => (
                                    <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}

            {isLoading && (
               <div className="flex justify-start w-full">
                 <div className="bg-white px-3 py-2 rounded-xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-1">
                   <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                   <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                   <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                 </div>
               </div>
            )}
          </div>

          {/* Input Area (Mobile Optimized & Lifted) */}
          <div className="absolute bottom-0 w-full px-3 pt-3 pb-16 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
            <div className="bg-white rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-gray-100 p-1.5 flex items-center gap-2 w-full">
              
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="سل ما تريد أو اكتب الكلمة المفتاحية"
                className="flex-1 bg-transparent border-none focus:ring-0 px-4 text-gray-700 placeholder-gray-400 text-base h-10 font-tajawal"
                disabled={isLoading}
              />

              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${
                  inputText.trim() && !isLoading
                    ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md rotate-0' 
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                <Send className={`w-4 h-4 ${document.dir === 'rtl' ? 'rotate-180 mr-0.5' : ''}`} />
              </button>
            </div>
            
            {/* Signature Footer - UPDATED FONT & TEXT */}
            <div className="text-center mt-5 mb-0">
              <p className="text-[13px] text-gray-600 font-amiri leading-relaxed opacity-90">
               (أخوكم وابنكم، محمد محمود الفيومي، كلية طب بنين القاهرة - جامعة الأزهر الشريف)
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
