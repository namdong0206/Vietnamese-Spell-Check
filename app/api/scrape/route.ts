import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);

    const getBestImageSrc = (img: any) => {
      const dataSrc = img.attr('data-src') || img.attr('data-original') || img.attr('data-lazy-src') || img.attr('data-src-hq');
      const src = img.attr('src');
      
      // If src is base64 or a tiny placeholder, prefer data-src
      if (src && (src.startsWith('data:') || src.includes('placeholder') || src.length < 100) && dataSrc) {
        return dataSrc;
      }
      return dataSrc || src;
    };
    const title = $('h1.article__title.cms-title').text().trim() || $('h1').first().text().trim();
    const sapo = $('div.article__sapo.cms-desc').text().trim() || $('p.sapo').text().trim();
    const author = $('div.article__author').text().trim() || $('.author').text().trim();
    
    // Get content
    const bodyElement = $('div.article__body.zce-content-body.cms-body') || $('.article-content');
    
    // Remove unwanted elements, but KEEP .article-relate as requested
    bodyElement.find('script, style, iframe, .ads, .box-tin-lien-quan, .box-tin-cung-chuyen-muc, .article__author, .author').remove();
    
    const blocks: { type: 'text' | 'image' | 'relate', content?: string, src?: string, caption?: string }[] = [];
    
    bodyElement.children().each((i, el) => {
      const $el = $(el);
      
      if ($el.hasClass('article-relate')) {
        // Preserve related news blocks verbatim
        blocks.push({ type: 'relate', content: $.html($el) });
      } else if ($el.is('p')) {
        const text = $el.text().trim();
        if (text) {
          blocks.push({ type: 'text', content: $el.html() || '' });
        }
      } else if ($el.is('figure') || $el.hasClass('article__image') || $el.hasClass('cms-photo') || $el.hasClass('image')) {
        const img = $el.find('img');
        let src = getBestImageSrc(img);
        if (src && !src.startsWith('http')) {
          src = new URL(src, url).toString();
        }
        const caption = $el.find('.caption, figcaption, .cms-caption').text().trim() || img.attr('alt') || '';
        if (src) {
          blocks.push({ type: 'image', src, caption });
        }
      } else if ($el.is('img')) {
        let src = getBestImageSrc($el);
        if (src && !src.startsWith('http')) {
          src = new URL(src, url).toString();
        }
        const caption = $el.attr('alt') || '';
        if (src) {
          blocks.push({ type: 'image', src, caption });
        }
      } else {
        // Handle other elements as text for now, but strip unwanted tags
        const html = $el.html()?.trim();
        if (html) {
          blocks.push({ type: 'text', content: html });
        }
      }
    });

    // Get avatar/cover image
    let avatarSrc = '';
    let avatarCaption = '';

    // 1. Try specific avatar element
    const avatarElement = $('div.article__avatar, .cms-avatar, .cover-image');
    if (avatarElement.length > 0) {
      const avatarImg = avatarElement.find('img').first();
      avatarSrc = getBestImageSrc(avatarImg) || '';
      avatarCaption = avatarElement.find('.caption, figcaption').text().trim() || avatarImg.attr('alt') || '';
    }

    // 2. Try og:image if no avatar found
    if (!avatarSrc) {
      avatarSrc = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || '';
    }

    // 3. Try first image in content if still no avatar
    if (!avatarSrc && blocks.length > 0) {
      const firstImage = blocks.find(b => b.type === 'image');
      if (firstImage) {
        avatarSrc = firstImage.src || '';
        avatarCaption = firstImage.caption || '';
      }
    }

    if (avatarSrc && !avatarSrc.startsWith('http')) {
      avatarSrc = new URL(avatarSrc, url).toString();
    }
    
    const avatar = avatarSrc ? { src: avatarSrc, caption: avatarCaption } : null;
    
    return NextResponse.json({ title, sapo, author, blocks, avatar });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: 'Failed to scrape URL' }, { status: 500 });
  }
}
