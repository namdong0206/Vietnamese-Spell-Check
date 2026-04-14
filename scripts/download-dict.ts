import axios from 'axios';
import fs from 'fs';
import path from 'path';

const DICTIONARY_URLS = [
  'https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet74K.txt',
  'https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet39K.txt',
  'https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet22K.txt',
  'https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet11K.txt',
  'https://raw.githubusercontent.com/undertheseanlp/underthesea/master/underthesea/dictionary/vietnamese_dictionary.txt',
  'https://raw.githubusercontent.com/vunb/vietnamese-wordlist/master/vietnamese-wordlist.txt',
  'https://raw.githubusercontent.com/HoNgocDuc/vietnamese-dictionary/master/vietnamese-dictionary.txt',
  'https://raw.githubusercontent.com/HoNgocDuc/vietnamese-dictionary/master/dict.txt',
  'https://raw.githubusercontent.com/vntk/vntk/master/lib/dictionary/vietnamese-dictionary.txt'
];

const VSEC_URLS = [
  'https://huggingface.co/datasets/vsec/raw/main/vsec.json',
  'https://huggingface.co/datasets/vsec/resolve/main/vsec.json',
  'https://raw.githubusercontent.com/VinAIResearch/VSEC/main/vsec.json',
  'https://raw.githubusercontent.com/VinAIResearch/VSEC/main/data/vsec.json'
];

const DICT_FILE_PATH = path.join(process.cwd(), 'data', 'vietnamese_dict.txt');

async function downloadDictionaries() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('Downloading dictionaries...');
  const allWords = new Set<string>();

  // 1. Download standard text dictionaries
  for (const url of DICTIONARY_URLS) {
    console.log(`Attempting to download from: ${url}`);
    try {
      const response = await axios.get(url, { timeout: 30000 });
      const words = response.data.split('\n');
      for (let word of words) {
        const trimmed = word.trim().toLowerCase();
        if (trimmed && !trimmed.startsWith('#')) {
          // Some dictionaries have definitions after a tab or semicolon
          const cleanWord = trimmed.split(/[\t;]/)[0].trim();
          if (cleanWord) allWords.add(cleanWord);
        }
      }
      console.log(`Downloaded from ${url}. Current total: ${allWords.size}`);
    } catch (error: any) {
      console.error(`Failed to download from ${url}: ${error.message} ${error.response?.status || ''}`);
    }
  }

  // 2. Try to download VSEC dataset
  for (const url of VSEC_URLS) {
    console.log(`Attempting to download VSEC from: ${url}`);
    try {
      const response = await axios.get(url, { timeout: 30000 });
      if (Array.isArray(response.data)) {
        for (const item of response.data) {
          if (item.correct) allWords.add(item.correct.toLowerCase());
        }
        console.log(`Downloaded VSEC from ${url}. Current total: ${allWords.size}`);
        break; // Stop if successful
      }
    } catch (error: any) {
      console.error(`Failed to download VSEC from ${url}: ${error.message} ${error.response?.status || ''}`);
    }
  }

  const dictContent = Array.from(allWords).join('\n');
  fs.writeFileSync(DICT_FILE_PATH, dictContent);
  console.log(`Dictionary saved to ${DICT_FILE_PATH}. Total words: ${allWords.size}`);
}

downloadDictionaries().catch(console.error);
