import https from "https";
import http from "http";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Directory for downloaded images
const DOWNLOAD_DIR = process.env.IMAGE_DOWNLOAD_DIR || path.join(os.homedir(), "lmstudio-images");

export const webTools = [
  {
    name: "web_search",
    description:
      "Search the web using DuckDuckGo. Returns search results with titles, URLs, and snippets. Use this to find documentation, solutions to errors, or current information.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        max_results: {
          type: "number",
          description: "Maximum results to return (default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_image_search",
    description:
      "Search for images on the web and optionally download them. Use this when the user wants to find or see images.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Image search query",
        },
        max_results: {
          type: "number",
          description: "Maximum results to return (default: 10)",
        },
        download: {
          type: "boolean",
          description: "Download the first image automatically (default: true)",
        },
        download_count: {
          type: "number",
          description: "Number of images to download (default: 1, max: 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_fetch",
    description:
      "Fetch content from a URL. Returns the text content of the page. Useful for reading documentation, APIs, or web pages.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to fetch",
        },
        max_length: {
          type: "number",
          description: "Maximum characters to return (default: 50000)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "web_fetch_image",
    description:
      "Fetch an image from a URL and return it as base64 data. Use this to actually view/display an image from the web.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the image to fetch",
        },
      },
      required: ["url"],
    },
  },
];

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const lib = isHttps ? https : http;
    const parsedUrl = new URL(url);

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": options.acceptType || "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Connection": "keep-alive",
        ...options.headers,
      },
    };

    const request = lib.request(reqOptions, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith("http")) {
          redirectUrl = new URL(redirectUrl, url).toString();
        }
        response.resume();
        return httpRequest(redirectUrl, options).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        if (options.binary) {
          resolve({
            buffer: Buffer.concat(chunks),
            contentType: response.headers["content-type"] || "application/octet-stream",
          });
        } else {
          resolve(Buffer.concat(chunks).toString("utf-8"));
        }
      });
      response.on("error", reject);
    });

    request.on("error", reject);
    request.setTimeout(options.timeout || 30000, () => {
      request.destroy();
      reject(new Error("Request timeout"));
    });

    if (options.body) {
      request.write(options.body);
    }
    request.end();
  });
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function stripHtml(html) {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeHtmlEntities(text);
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

async function duckduckgoSearch(query, maxResults = 10) {
  const results = [];

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    const html = await httpRequest(url, { timeout: 20000 });

    const resultRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*result|$)/gi;

    let match;
    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
      const block = match[1];

      const urlMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>/i) ||
                       block.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"/i) ||
                       block.match(/<a[^>]*class="[^"]*result__url[^"]*"[^>]*href="([^"]+)"/i);

      if (!urlMatch) continue;

      let resultUrl = urlMatch[1];

      if (resultUrl.includes("uddg=")) {
        const uddgMatch = resultUrl.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          resultUrl = decodeURIComponent(uddgMatch[1]);
        }
      }

      if (resultUrl.includes("duckduckgo.com")) continue;

      const titleMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([^<]+)</i) ||
                         block.match(/<h2[^>]*class="[^"]*result__title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)</i);
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : "No title";

      const snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                          block.match(/<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const snippet = snippetMatch ? stripHtml(snippetMatch[1]).slice(0, 200) : "";

      if (title && resultUrl && !resultUrl.includes("duckduckgo")) {
        results.push({
          title: title,
          url: resultUrl,
          snippet: snippet,
        });
      }
    }

    if (results.length === 0) {
      const simpleRegex = /<a[^>]+href="[^"]*uddg=([^"&]+)[^"]*"[^>]*>([^<]+)<\/a>/gi;
      const seen = new Set();

      while ((match = simpleRegex.exec(html)) !== null && results.length < maxResults) {
        const resultUrl = decodeURIComponent(match[1]);
        const title = decodeHtmlEntities(match[2].trim());

        if (seen.has(resultUrl)) continue;
        if (resultUrl.includes("duckduckgo.com")) continue;
        if (title.length < 3) continue;

        seen.add(resultUrl);
        results.push({
          title: title,
          url: resultUrl,
          snippet: "",
        });
      }
    }

  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return results;
}

async function bingImageSearch(query, maxResults = 10) {
  const results = [];

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.bing.com/images/search?q=${encodedQuery}&form=HDRSC2&first=1`;

    const html = await httpRequest(url, { timeout: 20000 });

    // Bing stores image data in data attributes as JSON
    // Look for murl (media URL) which contains the actual image URL
    const imgRegex = /murl&quot;:&quot;(https?:[^&]+?)&quot;/gi;
    const titleRegex = /t&quot;:&quot;([^&]*?)&quot;/gi;

    let match;
    const urls = [];
    const titles = [];

    while ((match = imgRegex.exec(html)) !== null) {
      let imgUrl = match[1].replace(/\\u002f/g, "/").replace(/\\\//g, "/");
      // Decode the URL
      try {
        imgUrl = decodeURIComponent(imgUrl.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        ));
      } catch {}
      urls.push(imgUrl);
    }

    // Also try alternate pattern for image URLs
    if (urls.length === 0) {
      const altRegex = /"murl":"(https?:[^"]+)"/gi;
      while ((match = altRegex.exec(html)) !== null) {
        let imgUrl = match[1].replace(/\\u002f/g, "/").replace(/\\\//g, "/");
        try {
          imgUrl = decodeURIComponent(imgUrl);
        } catch {}
        urls.push(imgUrl);
      }
    }

    // Another fallback - look for direct image links
    if (urls.length === 0) {
      const directRegex = /href="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp)[^"]*)"/gi;
      while ((match = directRegex.exec(html)) !== null && urls.length < maxResults * 2) {
        if (!match[1].includes("bing.com") && !match[1].includes("microsoft.com")) {
          urls.push(match[1]);
        }
      }
    }

    // Build results
    for (let i = 0; i < Math.min(urls.length, maxResults); i++) {
      results.push({
        url: urls[i],
        thumbnail: urls[i],
        title: `Image ${i + 1}`,
        source: new URL(urls[i]).hostname,
      });
    }

  } catch (error) {
    throw new Error(`Image search failed: ${error.message}`);
  }

  return results;
}

export async function handleWebTool(name, args) {
  switch (name) {
    case "web_search": {
      try {
        const results = await duckduckgoSearch(args.query, args.max_results || 10);

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: `No results found for: ${args.query}` }],
          };
        }

        let output = `Search results for: ${args.query}\n${"─".repeat(50)}\n\n`;
        results.forEach((r, i) => {
          output += `${i + 1}. ${r.title}\n`;
          output += `   ${r.url}\n`;
          if (r.snippet) {
            output += `   ${r.snippet}\n`;
          }
          output += "\n";
        });

        return {
          content: [{ type: "text", text: output.trim() }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Search error: ${error.message}` }],
          isError: true,
        };
      }
    }

    case "web_image_search": {
      try {
        const results = await bingImageSearch(args.query, args.max_results || 10);

        if (results.length === 0) {
          return {
            content: [{ type: "text", text: `No images found for: ${args.query}` }],
          };
        }

        let output = `Image search results for: ${args.query}\n${"─".repeat(50)}\n\n`;

        // Download images if requested (default: true)
        const shouldDownload = args.download !== false;
        const downloadCount = Math.min(args.download_count || 1, 5, results.length);
        const downloaded = [];

        if (shouldDownload) {
          await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

          for (let i = 0; i < downloadCount; i++) {
            try {
              const imgUrl = results[i].url;
              const { buffer, contentType } = await httpRequest(imgUrl, {
                timeout: 15000,
                binary: true,
                acceptType: "image/*,*/*;q=0.8",
              });

              // Determine extension
              let ext = "jpg";
              const mime = contentType.split(";")[0].trim();
              const mimeToExt = {
                "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
                "image/webp": "webp", "image/bmp": "bmp",
              };
              if (mimeToExt[mime]) ext = mimeToExt[mime];

              const filename = `${args.query.replace(/[^a-z0-9]/gi, "_")}_${i + 1}_${Date.now()}.${ext}`;
              const filepath = path.join(DOWNLOAD_DIR, filename);
              await fs.writeFile(filepath, buffer);
              downloaded.push(filepath);
            } catch (e) {
              // Skip failed downloads
            }
          }
        }

        if (downloaded.length > 0) {
          output += `Downloaded ${downloaded.length} image(s):\n`;
          for (const fp of downloaded) {
            output += `  ${fp}\n`;
          }
          output += "\n";
        }

        output += `All results:\n`;
        results.forEach((r, i) => {
          output += `${i + 1}. ${r.url}\n`;
        });

        return {
          content: [{ type: "text", text: output.trim() }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Image search error: ${error.message}` }],
          isError: true,
        };
      }
    }

    case "web_fetch": {
      try {
        const html = await httpRequest(args.url, { timeout: 30000 });
        const text = stripHtml(html);
        const maxLength = args.max_length || 50000;

        const truncated = text.length > maxLength
          ? text.slice(0, maxLength) + "\n\n... (truncated)"
          : text;

        return {
          content: [{ type: "text", text: truncated }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Fetch error: ${error.message}` }],
          isError: true,
        };
      }
    }

    case "web_fetch_image": {
      try {
        const { buffer, contentType } = await httpRequest(args.url, {
          timeout: 30000,
          binary: true,
          acceptType: "image/*,*/*;q=0.8",
        });

        // Determine extension from content type or URL
        let ext = "jpg";
        const mimeToExt = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
          "image/svg+xml": "svg",
          "image/bmp": "bmp",
        };

        const mime = contentType.split(";")[0].trim();
        if (mimeToExt[mime]) {
          ext = mimeToExt[mime];
        } else {
          const urlExt = args.url.split(".").pop()?.toLowerCase().split("?")[0];
          if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(urlExt)) {
            ext = urlExt === "jpeg" ? "jpg" : urlExt;
          }
        }

        // Create download directory if it doesn't exist
        await fs.mkdir(DOWNLOAD_DIR, { recursive: true });

        // Generate filename
        const timestamp = Date.now();
        const filename = args.filename || `image_${timestamp}.${ext}`;
        const filepath = path.join(DOWNLOAD_DIR, filename);

        // Save the image
        await fs.writeFile(filepath, buffer);

        return {
          content: [
            {
              type: "text",
              text: `Image downloaded!\n\nSaved to: ${filepath}\nSize: ${buffer.length} bytes\nType: ${mime}\n\nYou can open this file to view the image.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Image fetch error: ${error.message}` }],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Unknown web tool: ${name}`);
  }
}
