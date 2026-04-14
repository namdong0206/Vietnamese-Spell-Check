import { NextResponse } from 'next/server';
import { loadDictionary, checkWords } from '@/lib/dictionary';
import { VietnameseTextNormalizer } from '@/lib/vietnamese-normalizer';

// Pre-load dictionary on server start
loadDictionary().catch(err => console.error('Failed to pre-load dictionary:', err));

export async function POST(request: Request) {
  try {
    const { texts } = await request.json();
    if (!texts || !Array.isArray(texts)) return NextResponse.json({ error: 'Texts array is required' }, { status: 400 });

    const dict = await loadDictionary();
    
    const results = await Promise.all(texts.map(async (text) => {
      const errors = await checkWords(text);

      return {
        isSuspicious: errors.length > 0,
        errors: errors
      };
    }));

    return NextResponse.json({ 
      results,
      dictionarySize: dict.size 
    });
  } catch (error) {
    console.error('Dictionary check error:', error);
    return NextResponse.json({ error: 'Failed to check dictionary' }, { status: 500 });
  }
}
