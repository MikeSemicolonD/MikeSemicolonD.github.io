#!/usr/bin/env node
// Regenerates feed.xml from posts.json. Run with: node generate-feed.js
// No npm dependencies — uses only Node built-ins.

const fs = require('fs');
const path = require('path');

const CHANNEL = {
  title: 'Mike :D',
  link: 'https://mikesemicolond.github.io/',
  selfLink: 'https://mikesemicolond.github.io/feed.xml',
  description: 'Feed of Mike :D',
  language: 'en-us',
  image: {
    url: 'https://mikesemicolond.github.io/favicon.ico',
    title: 'Logo',
    link: 'https://mikesemicolond.github.io/',
    width: 32,
    height: 32,
  },
};

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(s) {
  // CDATA can't legally contain "]]>" — split it across two sections if present.
  return '<![CDATA[' + String(s).replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
}

function renderItem(item) {
  const permaLink = item.guidIsPermaLink === true ? 'true' : 'false';
  let out = '\t<item>\n';
  out += `\t\t<title>${escapeXml(item.title)}</title>\n`;
  out += `\t\t<link>${escapeXml(item.link)}</link>\n`;
  out += `\t\t<guid isPermaLink="${permaLink}">${escapeXml(item.guid)}</guid>\n`;
  out += `\t\t<pubDate>${escapeXml(item.pubDate)}</pubDate>\n`;
  if (item.description != null) {
    out += `\t\t<description>\n\t\t${cdata(item.description)}\n\t\t</description>\n`;
  }
  if (item.contentHtml != null) {
    out += `\t\t<content:encoded>\n\t\t${cdata(item.contentHtml)}\n\t\t</content:encoded>\n`;
  }
  if (item.media) {
    const m = item.media;
    out += `\t\t<media:content height="${m.height}" width="${m.width}" medium="image" type="${escapeXml(m.type)}" url="${escapeXml(m.url)}">\n`;
    if (m.thumbnailUrl) {
      out += `\t\t\t<media:thumbnail height="${m.thumbnailHeight}" width="${m.thumbnailWidth}" url="${escapeXml(m.thumbnailUrl)}"/>\n`;
    }
    if (m.credit) out += `\t\t\t<media:credit>${escapeXml(m.credit)}</media:credit>\n`;
    if (m.text)   out += `\t\t\t<media:text>${escapeXml(m.text)}</media:text>\n`;
    out += `\t\t</media:content>\n`;
  }
  out += '\t</item>\n';
  return out;
}

function generateFeed(posts) {
  const sorted = [...posts].sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  let xml = '';
  xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<?xml-stylesheet href="./feed.xsl" type="text/xsl"?>\n';
  xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:slash="http://purl.org/rss/1.0/modules/slash/" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/">\n';
  xml += '<script src="xslt-polyfill.min.js"\n   xmlns="http://www.w3.org/1999/xhtml"></script>\n';
  xml += '<channel>\n';
  xml += `\t<title>${escapeXml(CHANNEL.title)}</title>\n`;
  xml += `\t<link>${escapeXml(CHANNEL.link)}</link>\n`;
  xml += `\t<atom:link rel="self" type="application/rss+xml" href="${escapeXml(CHANNEL.selfLink)}"/>\n`;
  xml += `\t<description>${escapeXml(CHANNEL.description)}</description>\n`;
  xml += `\t<language>${escapeXml(CHANNEL.language)}</language>\n`;
  if (sorted.length > 0) {
    xml += `\t<lastBuildDate>${escapeXml(sorted[0].pubDate)}</lastBuildDate>\n`;
  }
  xml += '\t<image>\n';
  xml += `\t\t<url>${escapeXml(CHANNEL.image.url)}</url>\n`;
  xml += `\t\t<title>${escapeXml(CHANNEL.image.title)}</title>\n`;
  xml += `\t\t<link>${escapeXml(CHANNEL.image.link)}</link>\n`;
  xml += `\t\t<width>${CHANNEL.image.width}</width>\n`;
  xml += `\t\t<height>${CHANNEL.image.height}</height>\n`;
  xml += '\t</image>\n';
  for (const item of sorted) xml += renderItem(item);
  xml += '</channel>\n';
  xml += '</rss>\n';
  return xml;
}

function main() {
  const root = __dirname;
  const postsPath = path.join(root, 'posts.json');
  const feedPath  = path.join(root, 'feed.xml');

  let posts;
  try {
    posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
  } catch (e) {
    console.error('Failed to read posts.json:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(posts)) {
    console.error('posts.json must contain an array of items.');
    process.exit(1);
  }

  const xml = generateFeed(posts);

  let existing = '';
  try { existing = fs.readFileSync(feedPath, 'utf8'); } catch {}

  // Normalize line endings before comparing so CRLF↔LF doesn't cause spurious writes
  if (existing.replace(/\r\n/g, '\n') === xml) {
    console.log('feed.xml unchanged.');
    return;
  }

  fs.writeFileSync(feedPath, xml, 'utf8');
  console.log(`Wrote feed.xml (${posts.length} item${posts.length === 1 ? '' : 's'}).`);
}

main();
