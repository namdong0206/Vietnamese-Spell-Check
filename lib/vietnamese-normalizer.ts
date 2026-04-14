/**
 * VietnameseTextNormalizer
 * A utility class to normalize Vietnamese text according to modern standards.
 */
export class VietnameseTextNormalizer {
  // Tone mark mapping: Old style -> Modern style (New style)
  // New style (Standard): 
  // - oa, oe, uy (at end of syllable): tone on 1st vowel (òa, òe, ùy)
  // - oai, oan, oat, uân, uất, etc. (followed by consonant/vowel): tone on 2nd vowel (oài, oàn, oạt)
  // - qu + vowel: tone on the vowel (quà, quý)
  private static readonly TONE_MAP: Record<string, string> = {
    // Relocate to 1st vowel for oa, oe, uy (if they were on 2nd)
    'hoà': 'hòa', 'hoả': 'hỏa', 'hoạ': 'họa', 'hoá': 'hóa', 'hoè': 'hòe',
    'xoà': 'xòa', 'xoả': 'xỏa', 'xoạ': 'xọa', 'xoá': 'xóa', 'xoè': 'xòe',
    'loà': 'lòa', 'loả': 'lỏa', 'loạ': 'lọa', 'loá': 'lóa', 'loè': 'lòe',
    'oà': 'òa', 'oả': 'ỏa', 'oạ': 'ọa', 'oá': 'óa', 'oè': 'òe',
    'uý': 'úy', 'uỷ': 'ủy', 'uỵ': 'ụy', 'uỳ': 'ùy',
    'huý': 'húy', 'huỷ': 'hủy', 'huỵ': 'hụy', 'huỳ': 'hùy',
    'tuý': 'túy', 'tuỷ': 'tủy', 'tuỵ': 'tụy', 'tuỳ': 'tùy',
    
    // Relocate to 2nd vowel for oat, oan, oai, etc. (if they were on 1st)
    'họat': 'hoạt', 'hóat': 'hoát', 'hòat': 'hoạt',
    'đọan': 'đoạn', 'đóan': 'đoán', 'đòan': 'đoàn',
    'lọat': 'loạt', 'lóat': 'loát', 'lòat': 'loạt',
    'ngòai': 'ngoài', 'ngóai': 'ngoái', 'ngọai': 'ngoại',
    'khỏan': 'khoản', 'khóan': 'khoán', 'khọan': 'khoạn',
    
    // Special cases for 'qu' where the tone should be on the following vowel
    'qúy': 'quý', 'qủy': 'quỷ', 'qụy': 'quỵ', 'qùy': 'quỳ'
  };

  private static readonly TONE_VOWELS: Record<string, { base: string, tone: number }> = {
    'à': { base: 'a', tone: 1 }, 'á': { base: 'a', tone: 2 }, 'ả': { base: 'a', tone: 3 }, 'ã': { base: 'a', tone: 4 }, 'ạ': { base: 'a', tone: 5 },
    'è': { base: 'e', tone: 1 }, 'é': { base: 'e', tone: 2 }, 'ẻ': { base: 'e', tone: 3 }, 'ẽ': { base: 'e', tone: 4 }, 'ẹ': { base: 'e', tone: 5 },
    'ề': { base: 'ê', tone: 1 }, 'ế': { base: 'ê', tone: 2 }, 'ể': { base: 'ê', tone: 3 }, 'ễ': { base: 'ê', tone: 4 }, 'ệ': { base: 'ê', tone: 5 },
    'ì': { base: 'i', tone: 1 }, 'í': { base: 'i', tone: 2 }, 'ỉ': { base: 'i', tone: 3 }, 'ĩ': { base: 'i', tone: 4 }, 'ị': { base: 'i', tone: 5 },
    'ò': { base: 'o', tone: 1 }, 'ó': { base: 'o', tone: 2 }, 'ỏ': { base: 'o', tone: 3 }, 'õ': { base: 'o', tone: 4 }, 'ọ': { base: 'o', tone: 5 },
    'ồ': { base: 'ô', tone: 1 }, 'ố': { base: 'ô', tone: 2 }, 'ổ': { base: 'ô', tone: 3 }, 'ỗ': { base: 'ô', tone: 4 }, 'ộ': { base: 'ô', tone: 5 },
    'ờ': { base: 'ơ', tone: 1 }, 'ớ': { base: 'ơ', tone: 2 }, 'ở': { base: 'ơ', tone: 3 }, 'ỡ': { base: 'ơ', tone: 4 }, 'ợ': { base: 'ơ', tone: 5 },
    'ù': { base: 'u', tone: 1 }, 'ú': { base: 'u', tone: 2 }, 'ủ': { base: 'u', tone: 3 }, 'ũ': { base: 'u', tone: 4 }, 'ụ': { base: 'u', tone: 5 },
    'ỳ': { base: 'y', tone: 1 }, 'ý': { base: 'y', tone: 2 }, 'ỷ': { base: 'y', tone: 3 }, 'ỹ': { base: 'y', tone: 4 }, 'ỵ': { base: 'y', tone: 5 },
  };

  private static readonly VOWEL_TABLE: Record<string, string[]> = {
    'a': ['a', 'à', 'á', 'ả', 'ã', 'ạ'],
    'e': ['e', 'è', 'é', 'ẻ', 'ẽ', 'ẹ'],
    'ê': ['ê', 'ề', 'ế', 'ể', 'ễ', 'ệ'],
    'i': ['i', 'ì', 'í', 'ỉ', 'ĩ', 'ị'],
    'o': ['o', 'ò', 'ó', 'ỏ', 'õ', 'ọ'],
    'ô': ['ô', 'ồ', 'ố', 'ổ', 'ỗ', 'ộ'],
    'ơ': ['ơ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ'],
    'u': ['u', 'ù', 'ú', 'ủ', 'ũ', 'ụ'],
    'y': ['y', 'ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ']
  };

  /**
   * Basic normalization: NFC, whitespace, and punctuation.
   * Does NOT relocate tone marks.
   */
  static basicNormalize(text: string): string {
    if (!text) return text;
    let result = text.normalize('NFC');
    result = result.replace(/\s+/g, ' ').trim();
    result = result.replace(/\s+([,.\!?:;])/g, '$1');
    result = result.replace(/([,.\!?:;])([^\s,.!?:;])/g, '$1 $2');
    return result;
  }

  /**
   * Relocates tone marks to modern standard positions.
   */
  static relocateToneMarks(text: string): string {
    if (!text) return text;
    
    // 1. Apply manual map for specific common cases
    let result = text;
    for (const [old, modern] of Object.entries(this.TONE_MAP)) {
      const regex = new RegExp(`(?<!\\p{L})${old}(?!\\p{L})`, 'gui');
      result = result.replace(regex, (match) => {
        if (match === match.toUpperCase()) return modern.toUpperCase();
        if (match[0] === match[0].toUpperCase()) {
          return modern.charAt(0).toUpperCase() + modern.slice(1);
        }
        return modern;
      });
    }

    // 2. Apply dynamic rules based on vowel sequences and endings
    const vowelChars = 'aàáảãạeèéẻẽẹêềếểễệiìíỉĩịoòóỏõọôồốổỗộơờớởỡợuùúủũụyỳýỷỹỵ';
    const vowelRegex = new RegExp(`[${vowelChars}]`, 'gi');
    
    // Split into words to process each syllable/word
    const words = result.split(/([\s,.\-!?;:()""“”‘’'\[\]{}]+)/);
    const processedWords = words.map(word => {
      if (!word || /^[\s,.\-!?;:()""“”‘’'\[\]{}]+$/.test(word)) return word;
      
      const vowelMatches = word.match(vowelRegex);
      if (!vowelMatches || vowelMatches.length === 0) return word;

      // Identify tone and vowel indices
      let tone = 0;
      let vowelIndices: number[] = [];
      let baseVowels: string[] = [];
      
      for (let i = 0; i < word.length; i++) {
        const char = word[i].toLowerCase();
        if (new RegExp(`[${vowelChars}]`, 'i').test(char)) {
          // Special handling for gi/qu at start: treat as consonant if followed by another vowel
          if (i === 1) {
            const firstChar = word[0].toLowerCase();
            const secondCharBase = this.TONE_VOWELS[char]?.base || char;
            
            if ((firstChar === 'g' && secondCharBase === 'i') || (firstChar === 'q' && secondCharBase === 'u')) {
              let hasVowelAfter = false;
              for (let j = i + 1; j < word.length; j++) {
                if (new RegExp(`[${vowelChars}]`, 'i').test(word[j])) {
                  hasVowelAfter = true;
                  break;
                }
              }
              if (hasVowelAfter) {
                const toneInfo = this.TONE_VOWELS[char];
                if (toneInfo && toneInfo.tone > 0) tone = toneInfo.tone;
                continue; 
              }
            }
          }

          vowelIndices.push(i);
          const toneInfo = this.TONE_VOWELS[char];
          if (toneInfo) {
            baseVowels.push(toneInfo.base);
            if (toneInfo.tone > 0) tone = toneInfo.tone;
          } else {
            baseVowels.push(char);
          }
        }
      }

      if (tone === 0) return word; // No tone to relocate

      const vowelSeq = baseVowels.join('');
      let targetVowelIdxInSeq = -1;

      // New Rule: Diacritic vowel rule (Ă, Â, Ê, Ô, Ơ, Ư)
      const diacriticVowels = 'ăâêôơư';
      let diacriticIndicesInSeq: number[] = [];
      for (let i = 0; i < baseVowels.length; i++) {
        if (diacriticVowels.includes(baseVowels[i])) {
          diacriticIndicesInSeq.push(i);
        }
      }

      if (diacriticIndicesInSeq.length === 1) {
        // Only one diacritic vowel -> tone on it
        targetVowelIdxInSeq = diacriticIndicesInSeq[0];
      } else if (vowelSeq.includes('ươ')) {
        // Special case for 'ươ' -> tone on 'ơ'
        const uoIdx = vowelSeq.indexOf('ươ');
        targetVowelIdxInSeq = uoIdx + 1;
      }
      // Rule 1: Single vowel -> tone on it (already handled by default if we pick index 0)
      else if (vowelIndices.length === 1) {
        targetVowelIdxInSeq = 0;
      } 
      // Rule 2: Three vowels
      else if (vowelIndices.length === 3) {
        const lastChar = word[word.length - 1].toLowerCase();
        const isLastVowel = new RegExp(`[${vowelChars}]`, 'i').test(lastChar);
        if (!isLastVowel) {
          // Ends with consonant -> tone on 3rd vowel (e.g., truyền, thuyền)
          targetVowelIdxInSeq = 2;
        } else {
          // No ending consonant -> tone on 2nd vowel (e.g., khuỷu)
          targetVowelIdxInSeq = 1;
        }
      }
      // Rule 3: iê, yê, uô, ươ -> tone on 2nd vowel
      else if (['iê', 'yê', 'uô', 'ươ'].includes(vowelSeq)) {
        targetVowelIdxInSeq = 1;
      }
      // Rule 4: Ending in o/u (ao, au, âu, eo, êu, iu, ou, ưu) -> tone on 1st vowel
      else if (['ao', 'au', 'âu', 'eo', 'êu', 'iu', 'ou', 'ưu'].includes(vowelSeq)) {
        targetVowelIdxInSeq = 0;
      }
      // Rule 5: Ending in consonant + 2+ vowels -> tone on 2nd vowel
      else if (vowelIndices.length >= 2) {
        const lastChar = word[word.length - 1].toLowerCase();
        const isLastVowel = new RegExp(`[${vowelChars}]`, 'i').test(lastChar);
        if (!isLastVowel) {
          targetVowelIdxInSeq = 1;
        } else {
          // Default for other diphthongs at end of word (like oa, oe, uy) -> 1st vowel
          targetVowelIdxInSeq = 0;
        }
      }

      if (targetVowelIdxInSeq !== -1) {
        const targetVowelIdxInWord = vowelIndices[targetVowelIdxInSeq];
        const currentVowelWithToneIdx = vowelIndices.find(idx => {
          const char = word[idx].toLowerCase();
          return this.TONE_VOWELS[char] && this.TONE_VOWELS[char].tone > 0;
        });

        if (currentVowelWithToneIdx !== targetVowelIdxInWord) {
          let newWordChars = word.split('');
          
          // Remove tone from all vowels
          for (const idx of vowelIndices) {
            const char = word[idx].toLowerCase();
            const toneInfo = this.TONE_VOWELS[char];
            if (toneInfo) {
              const base = toneInfo.base;
              newWordChars[idx] = word[idx] === word[idx].toUpperCase() ? base.toUpperCase() : base;
            }
          }
          
          // Add tone to target vowel
          const baseTarget = newWordChars[targetVowelIdxInWord].toLowerCase();
          const newTarget = this.VOWEL_TABLE[baseTarget][tone];
          newWordChars[targetVowelIdxInWord] = newWordChars[targetVowelIdxInWord] === newWordChars[targetVowelIdxInWord].toUpperCase() ? newTarget.toUpperCase() : newTarget;
          
          return newWordChars.join('');
        }
      }

      return word;
    });

    return processedWords.join('');
  }

  /**
   * Full normalization for dictionary matching.
   */
  static normalize(text: string): string {
    if (!text) return text;
    let result = this.basicNormalize(text);
    result = this.relocateToneMarks(result);
    return result;
  }
}
