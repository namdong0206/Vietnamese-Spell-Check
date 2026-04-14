import fs from 'fs';
import path from 'path';
import { VietnameseTextNormalizer } from './vietnamese-normalizer';

let wordSet: Set<string> | null = null;
let loadingPromise: Promise<Set<string>> | null = null;
let maxWordLength = 7; // Increased to handle longer phrases

const DICT_FILE_PATH = '/data/vietnamese_dict.txt';

export async function loadDictionary(): Promise<Set<string>> {
  if (wordSet && wordSet.size > 0) return wordSet;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const newWordSet = new Set<string>();
    
    try {
      console.log(`Attempting to load dictionary from: ${DICT_FILE_PATH}`);
      let content = '';
      if (fs.existsSync(DICT_FILE_PATH)) {
        content = await fs.promises.readFile(DICT_FILE_PATH, 'utf-8');
      } else {
        const relativePath = path.join(process.cwd(), 'data', 'vietnamese_dict.txt');
        if (fs.existsSync(relativePath)) {
          content = await fs.promises.readFile(relativePath, 'utf-8');
        }
      }

      if (content) {
        const words = content.split('\n');
        for (let word of words) {
          const trimmed = word.trim().toLowerCase();
          if (trimmed) {
            // Add original
            const normalized = VietnameseTextNormalizer.normalize(trimmed);
            newWordSet.add(normalized);
            
            // Add space-separated version if it has hyphens
            if (normalized.includes('-')) {
              const spaceVersion = normalized.replace(/-/g, ' ');
              newWordSet.add(spaceVersion);
              
              // Also add individual syllables as valid
              const syllables = normalized.split(/[-\s]+/);
              for (const s of syllables) {
                if (s.length > 0) newWordSet.add(s);
              }
            }
            
            // If it's a multi-word phrase with spaces, also add syllables
            if (normalized.includes(' ')) {
              const syllables = normalized.split(/\s+/);
              for (const s of syllables) {
                if (s.length > 0) newWordSet.add(s);
              }
            }
          }
        }
        console.log(`Dictionary loaded successfully. Total words/syllables: ${newWordSet.size}`);
      }
    } catch (error) {
      console.error(`Failed to load dictionary:`, error);
    }

    wordSet = newWordSet;
    return wordSet;
  })();

  return loadingPromise;
}

// A more comprehensive set of common Vietnamese syllables to act as a fallback
export const COMMON_SYLLABLES = new Set([
  'nhân', 'dân', 'thành', 'phố', 'bảo', 'đảm', 'kiểm', 'tra', 'chính', 'tả',
  'việt', 'nam', 'quốc', 'gia', 'hành', 'chính', 'tự', 'do', 'hạnh', 'phúc',
  'độc', 'lập', 'tự', 'do', 'ngôn', 'ngữ', 'văn', 'bản', 'biên', 'tập',
  'viên', 'báo', 'chí', 'tin', 'tức', 'thời', 'sự', 'phát', 'triển', 'kinh',
  'tế', 'xã', 'hội', 'văn', 'hóa', 'giáo', 'dục', 'y', 'tế', 'an', 'ninh',
  'quốc', 'phòng', 'đảng', 'nhà', 'nước', 'chính', 'phủ', 'ủy', 'ban', 'nhân',
  'dân', 'hội', 'đồng', 'đại', 'biểu', 'trung', 'ương', 'địa', 'phương',
  'tỉnh', 'thành', 'quận', 'huyện', 'thị', 'xã', 'phường', 'thị', 'trấn',
  'theo', 'đó', 'qua', 'công', 'tác', 'nghiệp', 'vụ', 'phòng', 'chủ', 'trì',
  'cùng', 'phối', 'hợp', 'với', 'các', 'đơn', 'vị', 'của', 'tỉnh', 'và', 'cục',
  'bộ', 'đầu', 'tranh', 'chuyên', 'án', 'bắt', 'đối', 'tượng', 'có', 'hành',
  'vi', 'sử', 'dụng', 'mạng', 'máy', 'tính', 'viễn', 'thông', 'phương', 'tiện',
  'điện', 'tử', 'để', 'chiếm', 'đoạt', 'hơn', 'tỷ', 'đồng', 'nhiều', 'bị', 'hại',
  'trên', 'toàn', 'quốc', 'thủ', 'đoạn', 'mới', 'rất', 'tinh', 'vi', 'nhóm',
  'này', 'gồm', 'sinh', 'năm', 'trú', 'tại', 'hồng', 'minh', 'thuận', 'văn',
  'kỷ', 'lê', 'đức', 'thế', 'đắk', 'lắk', 'gia', 'lai', 'hồ', 'chí', 'minh',
  'triệt', 'phá', 'đường', 'dây', 'lừa', 'đảo', 'xuyên', 'quốc', 'gia', 'điện', 'biên',
  'cửa', 'khẩu', 'quốc', 'tế', 'tây', 'trang', 'biên', 'phòng', 'an', 'ninh',
  'phát', 'hiện', 'ngăn', 'chặn', 'xử', 'lý', 'nghiêm', 'vi', 'phạm', 'pháp', 'luật',
  'tội', 'phạm', 'ma', 'túy', 'buôn', 'lậu', 'gian', 'lận', 'thương', 'mại',
  'điều', 'tra', 'xác', 'minh', 'làm', 'rõ', 'cơ', 'quan', 'chức', 'năng',
  'quy', 'định', 'pháp', 'luật', 'nhà', 'nước', 'việt', 'nam', 'dân', 'chủ', 'cộng', 'hòa',
  'độc', 'lập', 'tự', 'do', 'hạnh', 'phúc', 'tổ', 'quốc', 'anh', 'hùng',
  'chiến', 'sĩ', 'công', 'an', 'quân', 'đội', 'biên', 'phòng', 'cảnh', 'sát',
  'giao', 'thông', 'hình', 'sự', 'kinh', 'tế', 'ma', 'túy', 'môi', 'trường',
  'phòng', 'chống', 'tội', 'phạm', 'tệ', 'nạn', 'xã', 'hội', 'trật', 'tự', 'an', 'toàn',
  'dịch', 'vụ', 'doanh', 'nghiệp', 'sản', 'xuất', 'kinh', 'doanh', 'đầu', 'tư',
  'thị', 'trường', 'khách', 'hàng', 'công', 'ty', 'tài', 'chính', 'ngân', 'hàng',
  'thuế', 'phí', 'lệ', 'phí', 'giá', 'cả', 'tiêu', 'dùng', 'lạm', 'phát',
  'tăng', 'trưởng', 'ổn', 'định', 'bền', 'vững', 'hội', 'nhập', 'toàn', 'cầu',
  'vốn', 'vay', 'tín', 'dụng', 'tiết', 'kiệm', 'chi', 'tiêu', 'thu', 'nhập',
  'lao', 'động', 'việc', 'làm', 'tiền', 'lương', 'thu', 'nhập', 'đời', 'sống',
  'nghèo', 'đói', 'giảm', 'nghèo', 'an', 'sinh', 'xã', 'hội', 'bảo', 'hiểm',
  'y', 'tế', 'giáo', 'dục', 'văn', 'hóa', 'thể', 'thao', 'du', 'lịch',
  'nông', 'nghiệp', 'công', 'nghiệp', 'dịch', 'vụ', 'xây', 'dựng', 'giao', 'thông',
  'năng', 'lượng', 'điện', 'nước', 'môi', 'trường', 'tài', 'nguyên', 'khoáng', 'sản',
  'khoa', 'học', 'công', 'nghệ', 'thông', 'tin', 'truyền', 'thông', 'báo', 'chí',
  'xuất', 'bản', 'phát', 'thanh', 'truyền', 'hình', 'internet', 'mạng', 'xã', 'hội',
  'an', 'ninh', 'quốc', 'phòng', 'đối', 'ngoại', 'hợp', 'tác', 'hữu', 'nghị',
  'hòa', 'bình', 'ổn', 'định', 'phát', 'triển', 'bền', 'vững', 'thịnh', 'vượng',
  'dân', 'chủ', 'công', 'bằng', 'văn', 'minh', 'giàu', 'mạnh', 'tự', 'do',
  'hạnh', 'phúc', 'ấm', 'no', 'tươi', 'đẹp', 'vẻ', 'vang', 'hùng', 'cường',
  'tổ', 'chức', 'thực', 'hiện', 'triển', 'khai', 'đẩy', 'mạnh', 'tăng', 'cường',
  'phát', 'huy', 'vai', 'trò', 'trách', 'nhiệm', 'người', 'đứng', 'đầu', 'cấp', 'ủy',
  'chính', 'quyền', 'địa', 'phương', 'đơn', 'vị', 'cơ', 'sở', 'đội', 'ngũ', 'cán', 'bộ'
]);

export function segmentWords(text: string, dict: Set<string>) {
  // Pre-tokenize by whitespace and punctuation, keeping punctuation as separate tokens
  const tokens = text.split(/([\s,.\-!?;:()""“”‘’'\[\]{}]+)/).filter(t => t.length > 0);
  const result: string[] = [];
  
  // If dictionary is empty, just return the tokens as they are
  if (dict.size === 0 && COMMON_SYLLABLES.size === 0) {
    return tokens;
  }

  let i = 0;
  while (i < tokens.length) {
    let found = false;
    
    // Skip punctuation and whitespace for segmentation
    if (/^[\s,.\-!?;:()""“”‘’'\[\]{}]+$/.test(tokens[i])) {
      result.push(tokens[i]);
      i++;
      continue;
    }

    // Longest matching (Greedy)
    for (let len = Math.min(maxWordLength, tokens.length - i); len >= 1; len--) {
      let wordCount = 0;
      let lookAhead = 0;
      let subTokens: string[] = [];
      
      for (let j = i; j < tokens.length; j++) {
        lookAhead++;
        subTokens.push(tokens[j]);
        if (!/^[\s,.\-!?;:()"]+$/.test(tokens[j])) {
          wordCount++;
        }
        if (wordCount === len) break;
      }

      if (wordCount < len) continue;

      const phrase = subTokens.join('').trim().toLowerCase();
      const normalizedPhrase = VietnameseTextNormalizer.normalize(phrase);
      
      if (dict.has(normalizedPhrase) || (len === 1 && COMMON_SYLLABLES.has(normalizedPhrase))) {
        result.push(subTokens.join(''));
        i += lookAhead;
        found = true;
        break;
      }
    }
    
    if (!found) {
      result.push(tokens[i]);
      i++;
    }
  }
  return result;
}

// A map of common errors to their correct forms
export const COMMON_ERRORS: Record<string, string> = {
  'đảm bảo': 'bảo đảm',
  'miền bắc': 'miền Bắc',
  'miền nam': 'miền Nam',
  'miền trung': 'miền Trung',
  'việt nam': 'Việt Nam',
  'trung ương': 'Trung ương',
  'chính phủ': 'Chính phủ',
  'thành phố': 'Thành phố',
  'hà nội': 'Hà Nội',
  'hồ chí minh': 'Hồ Chí Minh',
  'quảng trị': 'Quảng Trị',
  'bộ công an': 'Bộ Công an',
  'công an': 'công an',
  'chuyên án': 'chuyên án',
  'tài sản': 'tài sản',
  'không gian mạng': 'không gian mạng',
  'an ninh mạng': 'an ninh mạng',
  'viễn thông': 'viễn thông',
  'đối tượng': 'đối tượng',
  'hành vi': 'hành vi',
  'chiếm đoạt': 'chiếm đoạt',
  'hại': 'hại',
  'toàn quốc': 'toàn quốc',
  'thủ đoạn': 'thủ đoạn',
  'tinh vi': 'tinh vi',
  'bà mẹ việt nam anh hùng': 'Bà mẹ Việt Nam Anh hùng',
  'anh hùng lực lượng vũ trang nhân dân': 'Anh hùng Lực lượng vũ trang nhân dân',
  'thủ tướng chính phủ': 'Thủ tướng Chính phủ',
  'chủ tịch nước': 'Chủ tịch nước',
  'tổng bí thư': 'Tổng Bí thư',
  'quốc hội': 'Quốc hội',
  'ủy ban nhân dân': 'Ủy ban nhân dân',
  'hội đồng nhân dân': 'Hội đồng nhân dân',
  'mặt trận tổ quốc': 'Mặt trận Tổ quốc',
  'đoàn thanh niên': 'Đoàn Thanh niên',
  'hội liên hiệp phụ nữ': 'Hội Liên hiệp Phụ nữ',
  'liên đoàn lao động': 'Liên đoàn Lao động',
  'viện kiểm sát nhân dân': 'Viện kiểm sát nhân dân',
  'tòa án nhân dân': 'Tòa án nhân dân',
  'ban chấp hành trung ương': 'Ban Chấp hành Trung ương',
  'bộ chính trị': 'Bộ Chính trị',
  'ban bí thư': 'Ban Bí thư',
  'phòng chống': 'phòng, chống',
  'phòng - chống': 'phòng, chống',
  'phòng-chống': 'phòng, chống',
  'phòng ngừa đấu tranh': 'phòng ngừa, đấu tranh',
  'đấu tranh phòng chống': 'đấu tranh, phòng, chống',
  'đảng cộng sản việt nam': 'Đảng Cộng sản Việt Nam',
  'đảng cộng sản': 'Đảng Cộng sản',
  'đảng ta': 'Đảng ta',
  'nhà nước ta': 'Nhà nước ta',
  'chế độ ta': 'Chế độ ta',
  'quân đội nhân dân': 'quân đội nhân dân',
  'công an nhân dân': 'công an nhân dân',
  'lực lượng vũ trang': 'lực lượng vũ trang',
  'đồng chí': 'đồng chí',
  'cán bộ': 'cán bộ',
  'đảng viên': 'đảng viên',
  'quần chúng': 'quần chúng',
  'nhân dân ta': 'nhân dân ta',
  'đất nước ta': 'đất nước ta',
  'dân tộc ta': 'dân tộc ta',
  'tổ quốc ta': 'tổ quốc ta',
  'biên giới': 'biên giới',
  'hải đảo': 'hải đảo',
  'chủ quyền': 'chủ quyền',
  'toàn vẹn lãnh thổ': 'toàn vẹn lãnh thổ',
  'độc lập dân tộc': 'độc lập dân tộc',
  'chủ nghĩa xã hội': 'chủ nghĩa xã hội',
  'đổi mới': 'đổi mới',
  'công nghiệp hóa': 'công nghiệp hóa',
  'hiện đại hóa': 'hiện đại hóa',
  'hội nhập quốc tế': 'hội nhập quốc tế',
  'phát triển bền vững': 'phát triển bền vững',
  'an sinh xã hội': 'an sinh xã hội',
  'giảm nghèo bền vững': 'giảm nghèo bền vững',
  'xây dựng nông thôn mới': 'xây dựng nông thôn mới',
  'đô thị văn minh': 'đô thị văn minh',
  'văn hóa': 'văn hóa',
  'giáo dục': 'giáo dục',
  'y tế': 'y tế',
  'khoa học công nghệ': 'khoa học công nghệ',
  'môi trường': 'môi trường',
  'biến đổi khí hậu': 'biến đổi khí hậu',
  'lãng phí': 'lãng phí',
  'tiêu cực': 'tiêu cực',
  'tự diễn biến': 'tự diễn biến',
  'tự chuyển hóa': 'tự chuyển hóa',
  'nghị quyết': 'nghị quyết',
  'chỉ thị': 'chỉ thị',
  'kết luận': 'kết luận',
  'quyết định': 'quyết định',
  'thông báo': 'thông báo',
  'quy định': 'quy định',
  'kế hoạch': 'kế hoạch',
  'đề án': 'đề án',
  'dự án': 'dự án',
  'báo cáo': 'báo cáo',
  'tờ trình': 'tờ trình',
  'công văn': 'công văn',
  'quỷ': 'quỷ', 'quý': 'quý', 'quỵ': 'quỵ', 'quỳ': 'quỳ'
};

/**
 * Detects misplaced tone marks in Vietnamese text (e.g., "họat" -> "hoạt").
 * Uses the TONE_MAP from VietnameseTextNormalizer for consistency.
 */
function detectMisplacedToneMarks(text: string): { wrong: string, right: string }[] {
  const errors: { wrong: string, right: string }[] = [];
  
  // Split by whitespace and punctuation to check individual words
  const words = text.split(/([\s,.\-!?;:()""“”‘’'\[\]{}]+)/);
  for (const word of words) {
    if (!word || /^[\s,.\-!?;:()""“”‘’'\[\]{}]+$/.test(word)) continue;
    
    const relocated = VietnameseTextNormalizer.relocateToneMarks(word);
    if (relocated !== word) {
      if (!errors.some(e => e.wrong === word)) {
        errors.push({ wrong: word, right: relocated });
      }
    }
  }

  return errors;
}

export async function checkWords(text: string) {
  const dict = await loadDictionary();
  const basicNormalizedText = VietnameseTextNormalizer.basicNormalize(text);
  const normalizedTextForDict = VietnameseTextNormalizer.relocateToneMarks(basicNormalizedText);
  const errors: { wrong: string, right: string }[] = [];
  
  // 1. Check for common errors first (phrases)
  for (const [wrong, right] of Object.entries(COMMON_ERRORS)) {
    const regex = new RegExp(`(?<!\\p{L})${wrong}(?!\\p{L})`, 'gui');
    let match;
    while ((match = regex.exec(basicNormalizedText)) !== null) {
      const matchedText = match[0];
      
      let suggestedRight = right;
      if (matchedText[0] === matchedText[0].toUpperCase() && matchedText[0] !== matchedText[0].toLowerCase()) {
        suggestedRight = suggestedRight.charAt(0).toUpperCase() + suggestedRight.slice(1);
      }
      
      if (matchedText !== suggestedRight && !errors.some(e => e.wrong === matchedText)) {
        errors.push({ wrong: matchedText, right: suggestedRight });
      }
    }
  }

  // 2. Detect misplaced tone marks dynamically
  const toneErrors = detectMisplacedToneMarks(basicNormalizedText);
  toneErrors.forEach(err => {
    if (!errors.some(e => e.wrong === err.wrong)) {
      errors.push(err);
    }
  });

  // 3. Check for unknown words (only if dictionary is loaded)
  if (dict.size > 0) {
    // For dictionary check, we use the version with relocated tone marks
    const tokens = segmentWords(normalizedTextForDict, dict);
    const unknownWords = tokens.filter(token => {
      const cleanToken = token.trim().toLowerCase();
      if (!cleanToken || /^[0-9\W_]+$/.test(cleanToken)) return false;
      
      const normalizedToken = VietnameseTextNormalizer.normalize(cleanToken);
      
      // If it's already in our errors list (as a common error), skip
      if (errors.some(e => e.wrong.toLowerCase() === normalizedToken)) return false;
      
      return !dict.has(normalizedToken) && !COMMON_SYLLABLES.has(normalizedToken);
    });

    unknownWords.forEach(word => {
      if (!errors.some(e => e.wrong === word)) {
        errors.push({ wrong: word, right: '?' });
      }
    });
  }

  return errors;
}
