'use client';

import { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { VietnameseTextNormalizer } from '@/lib/vietnamese-normalizer';
import { Languages, Copy, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

let aiInstance: GoogleGenAI | null = null;

const GEMINI_MODELS = [
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-2.0-flash'
];

function getAi() {
  if (!aiInstance) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình Gemini API Key. Vui lòng thêm biến môi trường NEXT_PUBLIC_GEMINI_API_KEY trong cài đặt dự án (Vercel/AI Studio) và thực hiện Redeploy.');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export default function SpellingChecker() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkedContent, setCheckedContent] = useState<any>(null);
  const [selectedError, setSelectedError] = useState<any>(null);
  const [manualCorrection, setManualCorrection] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [dictSize, setDictSize] = useState<number | null>(null);

  const generateWithFallback = async (ai: GoogleGenAI, params: any) => {
    let lastError: any = null;
    for (let i = 0; i < GEMINI_MODELS.length; i++) {
      const model = GEMINI_MODELS[i];
      try {
        return await ai.models.generateContent({
          ...params,
          model: model
        });
      } catch (err: any) {
        console.warn(`Model ${model} failed, trying next...`, err);
        lastError = err;
        
        // Notify user about the fallback if there are more models to try
        if (i < GEMINI_MODELS.length - 1) {
          const nextModel = GEMINI_MODELS[i+1];
          showToast(`Model ${model} quá tải, đang chuyển sang ${nextModel}...`, 'error');
        }
      }
    }
    throw lastError || new Error('Tất cả các mô hình Gemini đều không khả dụng hoặc hết hạn mức.');
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const handleEvent = (e: any) => {
      const { wrong, right, target } = e.detail;
      const rect = target.getBoundingClientRect();
      setSelectedError({ 
        wrong, 
        right, 
        top: rect.top + window.scrollY - 10, 
        left: rect.left + window.scrollX 
      });
      setManualCorrection(right === '?' ? '' : right);
    };
    window.addEventListener('error-selected', handleEvent);
    return () => window.removeEventListener('error-selected', handleEvent);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const handleScrape = async () => {
    setLoading(true);
    setError('');
    setCheckedContent(null); // Reset checked content immediately
    setSelectedError(null);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from /api/scrape:', text.substring(0, 200));
        throw new Error('Máy chủ trả về định dạng không hợp lệ. Vui lòng thử lại sau.');
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setData(result);
      setCheckedContent(null);
      setSelectedError(null);
      
      // Auto-check spelling after scraping
      setTimeout(() => {
        handleCheckSpelling(result);
      }, 100);
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const checkSpellingWithGemini = async (items: { wrong: string, context: string }[]) => {
    const ai = getAi();
    const prompt = `
Bạn là một biên tập viên ngôn ngữ tiếng Việt chuyên nghiệp. 
Tôi sẽ cung cấp cho bạn danh sách các từ/cụm từ mà hệ thống từ điển của tôi không nhận diện được (đang nghi ngờ là lỗi).
Nhiệm vụ của bạn là kiểm tra từng từ trong ngữ cảnh đi kèm và xác định trạng thái của chúng.

YÊU CẦU:
1. Trạng thái "correct": Nếu từ đó hoàn toàn đúng chính tả và phù hợp ngữ cảnh.
2. Trạng thái "incorrect": Nếu từ đó sai chính tả hoặc dùng sai từ. Bạn PHẢI cung cấp từ đúng vào phần "right".
3. Trạng thái "unknown": Nếu đó là tên riêng quá lạ, thuật ngữ chuyên môn sâu hoặc bạn không đủ dữ liệu để khẳng định đúng/sai.

DANH SÁCH CẦN KIỂM TRA:
${items.map((item, i) => `${i + 1}. Từ: "${item.wrong}" - Ngữ cảnh: "...${item.context}..."`).join('\n')}
`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  wrong: { type: Type.STRING },
                  status: { 
                    type: Type.STRING, 
                    enum: ["correct", "incorrect", "unknown"],
                    description: "Trạng thái của từ: correct (đúng), incorrect (sai), unknown (không xác định)"
                  },
                  right: { 
                    type: Type.STRING,
                    description: "Từ đúng nếu status là incorrect"
                  }
                },
                required: ["wrong", "status"]
              }
            }
          },
          required: ["results"]
        }
      }
    });
    
    const resultText = response.text || "{}";
    try {
      return JSON.parse(resultText.trim());
    } catch (e) {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      throw e;
    }
  };

  const handleCheckSpelling = async (scrapeData?: any) => {
    const currentData = scrapeData || data;
    if (!currentData || !currentData.blocks) return;
    setLoading(true);
    setError('');
    
    try {
      const textBlocks = currentData.blocks.filter((b: any) => b.type === 'text');
      const textsToCheck = [
        currentData.title,
        currentData.sapo,
        ...textBlocks.map((b: any) => b.content.replace(/<[^>]*>/g, ''))
      ].map(t => t || '');
      
      // 1. Batch pre-check with dictionary
      const dictResponse = await fetch('/api/check-dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: textsToCheck }),
      });

      const dictData = await dictResponse.json();
      const dictResults = dictData.results || [];
      setDictSize(dictData.dictionarySize);

      // 2. Identify unknown words for Gemini check
      const unknownWordsToVerify: { wrong: string, context: string, blockIdx: number, errorIdx: number }[] = [];
      
      dictResults.forEach((res: any, blockIdx: number) => {
        const originalText = textsToCheck[blockIdx];
        res.errors.forEach((err: any, errorIdx: number) => {
          if (err.right === '?') {
            const startIdx = originalText.indexOf(err.wrong);
            if (startIdx !== -1) {
              unknownWordsToVerify.push({
                wrong: err.wrong,
                context: originalText.substring(Math.max(0, startIdx - 30), Math.min(originalText.length, startIdx + err.wrong.length + 30)),
                blockIdx,
                errorIdx
              });
            }
          }
        });
      });

      // 3. Call Gemini if there are unknown words
      if (unknownWordsToVerify.length > 0) {
        try {
          // Limit to 50 words per call to avoid token limits or timeouts
          const geminiResults = await checkSpellingWithGemini(unknownWordsToVerify.slice(0, 50));
          
          geminiResults.results.forEach((gRes: any) => {
            const original = unknownWordsToVerify.find(u => u.wrong === gRes.wrong);
            if (original) {
              const targetBlock = dictResults[original.blockIdx];
              const targetError = targetBlock.errors[original.errorIdx];
              
              if (gRes.status === 'correct') {
                // Remove the error if Gemini says it's correct
                targetBlock.errors[original.errorIdx] = null;
              } else if (gRes.status === 'incorrect' && gRes.right) {
                // Update with Gemini's suggestion
                targetError.right = gRes.right;
              }
              // If 'unknown', keep as '?'
            }
          });

          // Clean up null errors
          dictResults.forEach((res: any) => {
            res.errors = res.errors.filter((e: any) => e !== null);
          });
        } catch (geminiErr) {
          console.error('Gemini check failed:', geminiErr);
          // Fallback: continue with dictionary results only
        }
      }

      const markErrors = (content: string, errors: any[]) => {
        if (!errors || errors.length === 0) return content;
        let marked = content;
        const sorted = [...errors].sort((a, b) => b.wrong.length - a.wrong.length);
        for (const error of sorted) {
          const escaped = error.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          try {
            const regex = new RegExp(`(?<!\\[)(?<!\\p{L})${escaped}(?!\\p{L})(?![^[\\]]*\\])`, 'gui');
            marked = marked.replace(regex, `[${error.wrong} -> ${error.right}]`);
          } catch (e) {
            const regex = new RegExp(`(?<!\\[)(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])(?![^[\\]]*\\])`, 'gi');
            marked = marked.replace(regex, `[${error.wrong} -> ${error.right}]`);
          }
        }
        return marked;
      };

      const titleResult = dictResults[0];
      const sapoResult = dictResults[1];
      const blockResults = dictResults.slice(2);

      const newBlocks = [...currentData.blocks];
      let textBlockIndex = 0;

      for (let i = 0; i < newBlocks.length; i++) {
        if (newBlocks[i].type === 'text') {
          const result = blockResults[textBlockIndex];
          if (result && result.errors && result.errors.length > 0) {
            newBlocks[i] = { 
              ...newBlocks[i], 
              checkedContent: markErrors(newBlocks[i].content, result.errors),
              errors: result.errors
            };
          } else {
            newBlocks[i] = { 
              ...newBlocks[i], 
              checkedContent: newBlocks[i].content,
              errors: []
            };
          }
          textBlockIndex++;
        }
      }

      setCheckedContent({ 
        title: markErrors(currentData.title, titleResult?.errors || []),
        titleErrors: titleResult?.errors || [],
        sapo: markErrors(currentData.sapo, sapoResult?.errors || []),
        sapoErrors: sapoResult?.errors || [],
        blocks: newBlocks 
      });
      showToast('Đã hoàn tất kiểm tra lỗi (Từ điển + AI)');
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: 'fix' | 'fixAll' | 'ignore' | 'ignoreAll') => {
    if (!selectedError || !checkedContent) return;

    const correction = (action === 'fix' || action === 'fixAll') ? manualCorrection : selectedError.right;

    const applyAction = (text: string) => {
      if (!text) return text;
      let newText = text;
      if (action === 'fix' || action === 'fixAll') {
        const regex = new RegExp(`\\[${selectedError.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -> ${selectedError.right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, action === 'fixAll' ? 'g' : '');
        newText = newText.replace(regex, correction);
      } else if (action === 'ignore' || action === 'ignoreAll') {
        const regex = new RegExp(`\\[${selectedError.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -> ${selectedError.right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, action === 'ignoreAll' ? 'g' : '');
        newText = newText.replace(regex, selectedError.wrong);
      }
      return newText;
    };

    const newBlocks = checkedContent.blocks.map((block: any) => {
      if (block.type !== 'text' || !block.checkedContent) return block;
      return { ...block, checkedContent: applyAction(block.checkedContent) };
    });

    setCheckedContent({ 
      ...checkedContent,
      title: applyAction(checkedContent.title),
      sapo: applyAction(checkedContent.sapo),
      blocks: newBlocks 
    });
    setSelectedError(null);
  };

  const handleFixAll = () => {
    if (!checkedContent) return;
    
    const fixText = (text: string) => text.replace(/\[([^\]]+) -> ([^\]]+)\]/g, '$2');
    
    const newBlocks = checkedContent.blocks.map((block: any) => {
      if (block.type !== 'text' || !block.checkedContent) return block;
      return { 
        ...block, 
        checkedContent: fixText(block.checkedContent) 
      };
    });

    setCheckedContent({ 
      ...checkedContent,
      title: fixText(checkedContent.title),
      sapo: fixText(checkedContent.sapo),
      blocks: newBlocks 
    });
    showToast('Đã xử lý toàn bộ lỗi');
  };

  const handleFinish = () => {
    if (!checkedContent) return;
    
    const revertText = (text: string) => text.replace(/\[([^\]]+) -> ([^\]]+)\]/g, '$1');
    
    const newBlocks = checkedContent.blocks.map((block: any) => {
      if (block.type !== 'text' || !block.checkedContent) return block;
      return { 
        ...block, 
        checkedContent: revertText(block.checkedContent) 
      };
    });

    setCheckedContent({ 
      ...checkedContent,
      title: revertText(checkedContent.title),
      sapo: revertText(checkedContent.sapo),
      blocks: newBlocks 
    });
    showToast('Đã khôi phục các lỗi chưa xử lý');
  };

  const checkSpelling = async (text: string) => {
    const ai = getAi();
    const rules = `
#NGỮ CẢNH
Bạn là một biên tập viên kỳ cựu của một tòa soạn báo chí chính thống (như Báo Nhân Dân), có nhiệm vụ rà soát lỗi trong văn bản theo đúng quy chuẩn về chính tả và văn phong báo chí tiếng Việt.
#MỤC TIÊU
Kiểm tra và đánh dấu các lỗi chính tả, lỗi trùng lặp, lỗi văn phong sai quy chuẩn, lỗi tên riêng sai, lỗi ngày tháng – để phục vụ cho biên tập nội dung báo chí chính thống.
#NHIỆM VỤ CỤ THỂ
Đọc kỹ toàn bộ văn bản. Kiểm tra và đánh dấu các lỗi sau:
1. Lỗi trùng lặp: từ/cụm từ/câu/đoạn không cần thiết bị lặp lại.
2. Lỗi chính tả tiếng Việt: lỗi dấu, âm đầu/cuối, từ sai phổ biến.
3. Lỗi văn phong sai chuẩn báo chí: so với quy tắc chuẩn (ví dụ như “bảo đảm” thay vì “đảm bảo”, “miền bắc” thay vì “miền Bắc”...).
4. Lỗi tên riêng: tên cá nhân, địa danh, tổ chức,... viết sai hoặc viết không đúng quy cách chính thống.
5. Lỗi khác: ngày tháng, cách ghi số, cách viết đơn vị, viết hoa không đúng, lặp cấu trúc, dùng sai dấu câu...
#YÊU CẦU KẾT QUẢ
Trả lại toàn bộ văn bản gốc, trong đó:
* Lỗi sai được đánh dấu bằng cấu trúc [từ sai -> từ đúng]
* Không sửa trực tiếp văn bản, chỉ đánh dấu.
* Ví dụ: "bà mẹ Việt nam anh hùng" sẽ thành "[Việt nam anh hùng -> Việt Nam Anh hùng]"
#CHÚ Ý QUAN TRỌNG
* Không thay đổi thông tin, không thêm thắt nội dung mới.
* Phải giữ đúng ngữ cảnh chính trị – báo chí nghiêm túc.
* Đối chiếu theo quy chuẩn văn phong báo chí tiếng Việt.
* Ưu tiên phát hiện các lỗi về: bảo đảm/đảm bảo, miền Bắc/miền bắc, các tên riêng, các lỗi chính tả phổ biến.
`;
    const response = await generateWithFallback(ai, {
      contents: `${rules}\n\n[Kiểm tra văn phong] Đoạn văn: ${text}`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { 
              type: Type.STRING,
              description: "Đoạn văn đã sửa với các từ sai được đánh dấu bằng [từ sai -> từ đúng]"
            },
            errors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  wrong: { type: Type.STRING },
                  right: { type: Type.STRING },
                  context: { type: Type.STRING }
                },
                required: ["wrong", "right"]
              }
            }
          },
          required: ["text", "errors"]
        }
      }
    });
    
    const resultText = response.text || "{}";
    try {
      return JSON.parse(resultText.trim());
    } catch (e) {
      console.error("JSON Parse Error. Raw text:", resultText);
      // Attempt to extract JSON if it's wrapped in something
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw e;
    }
  };

  const renderTextHtml = (text: string) => {
    if (!text) return '';
    // Replace [wrong -> right] with highlighted spans as requested:
    // Bold, Red for wrong word, and suggestion in quotes also in red
    return text.replace(/\[([^\]]+) -> ([^\]]+)\]/g, (match, wrong, right) => {
      return `<span class="relative inline-block cursor-pointer group/error" onclick="window.dispatchEvent(new CustomEvent('error-selected', { detail: { wrong: '${wrong.replace(/'/g, "\\'")}', right: '${right.replace(/'/g, "\\'")}', target: event.target } }))">
        <span class="font-bold text-red-600">${wrong}</span>
        <span class="ml-1 text-red-600">(${right})</span>
      </span>`;
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    // Copy the raw HTML content to preserve formatting (divs, classes, links)
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Đã sao chép ${label}`);
    }).catch(err => {
      console.error('Lỗi khi sao chép:', err);
      showToast('Lỗi khi sao chép', 'error');
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-3xl shadow-xl border border-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-bottom-4 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            )}
            <p className="font-bold">{toast.message}</p>
          </div>
        </div>
      )}

      <div className="mb-8 flex items-center gap-6">
        <div className="relative w-24 h-24 shrink-0 bg-indigo-50 rounded-2xl flex items-center justify-center overflow-hidden border border-indigo-100 shadow-inner">
          {/* Placeholder for the logo provided by user */}
          <Image 
            src="https://picsum.photos/seed/vietnam-news/200/200" 
            alt="Logo" 
            fill
            className="object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <Languages className="w-10 h-10 text-indigo-600 relative z-10" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Kiểm tra lỗi chính tả</h1>
          <p className="text-slate-500 max-w-lg">Dán URL bài viết từ các trang báo chính thống để bắt đầu kiểm tra ngữ pháp và chính tả tự động.</p>
        </div>
      </div>
      
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          placeholder="https://nhandan.vn/..."
        />
        <button 
          onClick={handleScrape} 
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200"
        >
          {loading ? 'Đang xử lý...' : 'Kiểm tra chính tả'}
        </button>
        {data && checkedContent && (
          <div className="flex gap-3">
            <button 
              onClick={handleFixAll} 
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-amber-200"
            >
              Xử lý toàn bộ
            </button>
            <button 
              onClick={handleFinish} 
              className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-slate-200"
            >
              Đã xử lý xong
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 bg-red-50 p-4 rounded-xl mb-6">{error}</p>}
      
      {loading && (
        <div className="mb-6 p-4 bg-indigo-50 text-indigo-700 rounded-xl flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-medium">Đang kiểm tra bằng từ điển cục bộ...</p>
        </div>
      )}
      
      {data && (
        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-6">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tight flex-1">
                <div dangerouslySetInnerHTML={{ __html: checkedContent?.title ? renderTextHtml(checkedContent.title) : data.title }} />
              </h1>
              <button 
                onClick={() => copyToClipboard(checkedContent?.title || data.title, 'Tiêu đề')}
                className="ml-4 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Sao chép tiêu đề"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>
            
            {/* Cover image (Avatar) displayed here, right below the title */}
            {data.avatar && (
              <div className="mb-8 group relative">
                <Image 
                  src={data.avatar.src} 
                  alt={data.avatar.caption || 'Avatar'} 
                  width={800}
                  height={450}
                  className="w-full h-auto rounded-2xl shadow-xl border border-slate-100" 
                  referrerPolicy="no-referrer"
                />
                {data.avatar.caption && (
                  <p className="text-sm text-slate-500 italic mt-3 text-center px-4 font-medium">{data.avatar.caption}</p>
                )}
                <button 
                  onClick={() => copyToClipboard(data.avatar.src, 'Link ảnh đại diện')}
                  className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur shadow-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Sao chép link ảnh"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                </button>
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="text-lg text-slate-700 font-medium leading-relaxed flex-1">
                <div dangerouslySetInnerHTML={{ __html: checkedContent?.sapo ? renderTextHtml(checkedContent.sapo) : data.sapo }} />
              </div>
              <button 
                onClick={() => copyToClipboard(checkedContent?.sapo || data.sapo, 'Sapo')}
                className="ml-4 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Sao chép sapo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>
            <p className="text-sm text-slate-400 font-medium">Tác giả: <span className="text-slate-600">{data.author}</span></p>
          </div>
          
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
            <h2 className="text-2xl font-bold text-slate-800">Nội dung bài viết</h2>
            <button 
              onClick={() => {
                const allContent = (checkedContent?.blocks || data.blocks || [])
                  .filter((b: any) => b.type === 'text' || b.type === 'relate')
                  .map((b: any) => {
                    const content = b.checkedContent || b.content;
                    // Strip HTML for clipboard
                    return content.replace(/<[^>]*>/g, '');
                  })
                  .join('\n\n');
                copyToClipboard(allContent, 'toàn bộ nội dung');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold rounded-xl transition-colors"
              title="Sao chép toàn bộ nội dung"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Sao chép nội dung
            </button>
          </div>
          
          {/* Content displayed as blocks */}
          <div className="space-y-8 mb-12">
            {(checkedContent?.blocks || data.blocks || []).map((block: any, idx: number) => (
              <div key={idx} className="group relative">
                {block.type === 'text' ? (
                  <div className="flex gap-4">
                    <div className="flex-1 prose prose-slate max-w-none text-slate-800 leading-relaxed text-lg">
                      <div dangerouslySetInnerHTML={{ __html: block.checkedContent ? renderTextHtml(block.checkedContent) : block.content }} />
                    </div>
                  </div>
                ) : block.type === 'relate' ? (
                  <div className="my-6 p-4 bg-slate-50 border-l-4 border-indigo-500 rounded-r-xl overflow-hidden">
                    <div className="text-sm text-indigo-600 font-bold mb-2 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      Bài liên quan
                    </div>
                    <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: block.content }} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="relative w-full">
                      <Image 
                        src={block.src} 
                        alt={block.caption || 'Article image'} 
                        width={800}
                        height={450}
                        className="w-full h-auto rounded-2xl shadow-md" 
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => copyToClipboard(block.src, 'Link ảnh')}
                        className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur shadow-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Sao chép link ảnh"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </button>
                    </div>
                    {block.caption && (
                      <p className="text-sm text-slate-500 italic mt-3 text-center px-4 max-w-2xl">{block.caption}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {selectedError && (
            <>
              {/* Overlay to close modal when clicking outside */}
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setSelectedError(null)}
              />
              <div 
                className="absolute p-4 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 w-72"
                style={{ top: `${selectedError.top}px`, left: `${selectedError.left}px` }}
              >
                <h3 className="font-bold text-sm text-slate-900 mb-2">Gợi ý sửa lỗi</h3>
                
                <div className="mb-3">
                  <p className="text-slate-500 text-xs mb-1">Từ gốc:</p>
                  <span className="font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded text-sm block w-fit">{selectedError.wrong}</span>
                </div>

                <div className="mb-4">
                  <p className="text-slate-500 text-xs mb-1">Thay bằng:</p>
                  {selectedError.right === '?' ? (
                    <input 
                      autoFocus
                      type="text"
                      value={manualCorrection}
                      onChange={(e) => setManualCorrection(e.target.value)}
                      placeholder="Nhập từ đúng..."
                      className="w-full px-2 py-1.5 text-sm border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text"
                        value={manualCorrection}
                        onChange={(e) => setManualCorrection(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleAction('fix')} 
                    className={`px-3 py-1.5 text-white rounded-lg text-xs font-medium transition-colors ${
                      manualCorrection.trim() === '' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {manualCorrection.trim() === '' ? 'Xóa' : 'Sửa'}
                  </button>
                  <button 
                    onClick={() => handleAction('fixAll')} 
                    className={`px-3 py-1.5 text-white rounded-lg text-xs font-medium transition-colors ${
                      manualCorrection.trim() === '' ? 'bg-red-800 hover:bg-red-900' : 'bg-slate-800 hover:bg-slate-900'
                    }`}
                  >
                    {manualCorrection.trim() === '' ? 'Xóa toàn bộ' : 'Sửa toàn bộ'}
                  </button>
                  <button onClick={() => handleAction('ignore')} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-xs font-medium">Bỏ qua</button>
                  <button onClick={() => handleAction('ignoreAll')} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-xs font-medium">Bỏ qua hết</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
