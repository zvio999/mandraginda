const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const { open } = require("./db");
const { hashPassword } = require("./auth");
const { homeDefaults, saveHome } = require("./home");

const root = path.join(__dirname, "..");
const mediaDir = path.join(root, "public", "media");
const xmlPath = path.join(root, "mandraginda.WordPress.2026-11-25.xml");

const DESIGN_FILES = {
  "https://mandraginda.ge/wp-content/uploads/2024/08/mainlogo1.png": "mainlogo1.png",
  "https://mandraginda.ge/wp-content/uploads/2024/09/main2.jpg": "main2.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/eventmain1.jpg": "eventmain1.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/eventmain2.jpg": "eventmain2.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/eventmain3.jpg": "eventmain3.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/paralaxmain1.jpg": "paralaxmain1.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/wranglermain1.jpg": "wranglermain1.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/10/amboli.jpg": "amboli.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/08/waitingpartners-1.jpg": "waitingpartners-1.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/08/waitingpartners-2.jpg": "waitingpartners-2.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/08/channels4_profile.jpg": "channels4_profile.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/ycoment2.jpg": "ycoment2.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/ycoment3.jpg": "ycoment3.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/maingalerea1.jpg": "maingalerea1.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/maingalerea2.jpg": "maingalerea2.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/maingalerea3.jpg": "maingalerea3.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/maingalerea4.jpg": "maingalerea4.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/maingalerea5.jpg": "maingalerea5.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/09/maingalerea6.jpg": "maingalerea6.jpg",
  "https://mandraginda.ge/wp-content/uploads/2025/01/Leonardo_Phoenix_09_A_breathtaking_highangle_ultrahighdefiniti_2.jpg": "article-offroad.jpg",
  "https://mandraginda.ge/wp-content/uploads/2024/08/Ford-Bronco-Recall-2021-2022.jpg": "article-ford.jpg",
};

function text(node) {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return text(node[0]);
  if (typeof node === "object") {
    if (node.__cdata != null) return String(node.__cdata);
    if (node["#text"] != null) return String(node["#text"]);
  }
  return "";
}

function unserializeList(value) {
  if (!value) return "";
  if (!String(value).startsWith("a:")) return String(value);
  const out = [];
  const re = /s:\d+:"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = re.exec(value))) out.push(match[1].replace(/\\"/g, '"'));
  return out.join(", ");
}

function cleanHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .trim();
}

function excerptFrom(html) {
  const plain = cleanHtml(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 180 ? plain.slice(0, 177) + "…" : plain;
}

function metaMap(item) {
  const map = {};
  const metas = item.postmeta || [];
  for (const meta of metas) {
    const key = text(meta.meta_key);
    const value = text(meta.meta_value);
    if (key) map[key] = value;
  }
  return map;
}

function requestBuffer(url, redirects) {
  return new Promise((resolve, reject) => {
    const lib = url.indexOf("https:") === 0 ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 4) {
        res.resume();
        requestBuffer(new URL(res.headers.location, url).toString(), redirects + 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(res.statusCode + " " + url));
        return;
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout " + url));
    });
    req.on("error", reject);
  });
}

async function download(url, filename) {
  const dest = path.join(mediaDir, filename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return "/media/" + filename;
  fs.writeFileSync(dest, await requestBuffer(url, 0));
  return "/media/" + filename;
}

function extractMapImage() {
  const homeHtml = path.join(root, "tmp", "home.html");
  const dest = path.join(mediaDir, "georgia.jpg");
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return;
  if (!fs.existsSync(homeHtml)) return;
  const html = fs.readFileSync(homeHtml, "utf8");
  const match = html.match(/loadData\(\s*'(data:image\/[^']+)'/);
  if (!match) return;
  const b64 = match[1].split(",")[1];
  fs.writeFileSync(dest, Buffer.from(b64, "base64"));
}

async function localizeHtml(html, attachments) {
  let out = cleanHtml(html);
  const urls = [];
  const urlRe = /https?:\/\/mandraginda\.ge\/wp-content\/uploads\/[^"' )\s]+/g;
  let urlMatch;
  while ((urlMatch = urlRe.exec(out))) urls.push(urlMatch[0].replace(/&amp;/g, "&"));
  const unique = [...new Set(urls)];
  for (const url of unique) {
    const clean = url.split("?")[0];
    const base = path.basename(clean).replace(/[^a-zA-Z0-9._-]/g, "");
    try {
      const local = await download(clean, base);
      out = out.split(url).join(local);
    } catch {
      /* keep the live URL while the old site is online */
    }
  }
  return out;
}

async function run() {
  if (!fs.existsSync(xmlPath)) {
    console.log("Export file not found, skipping import.");
    return;
  }
  fs.mkdirSync(mediaDir, { recursive: true });
  extractMapImage();

  const xml = fs.readFileSync(xmlPath, "utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: "__cdata",
    removeNSPrefix: true,
    isArray: (name) => ["item", "postmeta", "category", "author"].includes(name),
  });
  const doc = parser.parse(xml);
  const items = doc.rss.channel.item || [];

  const attachments = {};
  for (const item of items) {
    if (text(item.post_type) !== "attachment") continue;
    attachments[text(item.post_id)] = text(item.attachment_url);
  }

  const db = await open();
  const user = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  if (!user) {
    const { salt, hash } = hashPassword("mandraginda");
    db.prepare("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)").run("admin", hash, salt);
  }

  const removedMembers = {
    ditoiosava: true,
    Roki2002: true,
    shashank: true,
    test: true,
    zviad: true,
    "Gio-Xasa": true,
    Vaxolob: true,
  };
  const membersImported = db.prepare("SELECT value FROM settings WHERE key = 'members_imported'").get();
  if (!membersImported) {
    const insertMember = db.prepare("INSERT INTO members (username, email, display_name) VALUES (?, ?, ?)");
    const authors = doc.rss.channel.author || [];
    for (const author of authors) {
      const username = text(author.author_login);
      if (!username || removedMembers[username]) continue;
      insertMember.run(username, text(author.author_email), text(author.author_display_name));
    }
    db.prepare("INSERT INTO settings (key, value) VALUES ('members_imported', '1')").run();
  }
  const pruned = db.prepare("SELECT value FROM settings WHERE key = 'members_pruned'").get();
  if (!pruned) {
    const removeMember = db.prepare("DELETE FROM members WHERE username = ?");
    Object.keys(removedMembers).forEach((username) => removeMember.run(username));
    db.prepare("INSERT INTO settings (key, value) VALUES ('members_pruned', '1')").run();
  }

  const imported = db.prepare("SELECT value FROM settings WHERE key = 'imported'").get();
  if (imported) {
    console.log("Content already imported.");
    db.close();
    return;
  }

  for (const [url, name] of Object.entries(DESIGN_FILES)) {
    try {
      await download(url, name);
      process.stdout.write(".");
    } catch (error) {
      console.log("\nskip", name, error.message);
    }
  }
  console.log("\nDesign images saved.");

  const pageKeep = new Set(["privacy-policy", "terms-and-conditions"]);
  const insertPage = db.prepare(
    "INSERT INTO pages (slug, title, body, status, updated_at) VALUES (?, ?, ?, 'publish', ?)"
  );
  const insertPost = db.prepare(
    "INSERT INTO posts (slug, title, excerpt, body, image, published_at, status) VALUES (?, ?, ?, ?, ?, ?, 'publish')"
  );
  const insertCar = db.prepare(`INSERT INTO cars
    (slug, title, manufacturer, model, year, tire_size, tier_type, fuel_type, engine, axle_lock, others, image, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'publish')`);

  for (const item of items) {
    const type = text(item.post_type);
    const status = text(item.status);
    const slug = text(item.post_name);
    const title = text(item.title).replace(/&amp;/g, "&");
    if (status !== "publish" || !slug) continue;
    if (/jojobet/i.test(title) || /jojobet/i.test(slug)) continue;

    if (type === "page" && pageKeep.has(slug)) {
      const body = await localizeHtml(text(item.encoded));
      insertPage.run(slug, title, body, text(item.post_date) || new Date().toISOString());
    }

    if (type === "post") {
      const metas = metaMap(item);
      let image = "";
      const thumb = attachments[metas._thumbnail_id];
      if (thumb) {
        try {
          image = await download(thumb, "post-" + slug.slice(0, 40) + path.extname(thumb.split("?")[0]));
        } catch {
          image = thumb;
        }
      } else if (slug.startsWith("off-road")) {
        image = "/media/article-offroad.jpg";
      } else if (slug === "ford") {
        image = "/media/article-ford.jpg";
      }
      const body = await localizeHtml(text(item.encoded));
      insertPost.run(slug, title, excerptFrom(body), body, image, (text(item.post_date) || "").slice(0, 10));
    }

    if (type === "car") {
      const metas = metaMap(item);
      let image = "";
      const carImage = attachments[metas.car_image] || attachments[metas._thumbnail_id];
      if (carImage) {
        try {
          image = await download(carImage, "car-" + slug.slice(0, 40) + path.extname(carImage.split("?")[0]));
        } catch {
          image = carImage;
        }
      }
      insertCar.run(
        slug,
        title,
        metas.manufacturer || "",
        metas.model || "",
        metas.year || "",
        metas.tire_size || "",
        metas.tier_type || "",
        metas.fuel_type || "",
        metas.engine || "",
        unserializeList(metas["axle-lock"]),
        unserializeList(metas.others),
        image
      );
    }
  }

  saveHome(db, homeDefaults);
  db.prepare("INSERT INTO settings (key, value) VALUES ('imported', '1')").run();
  const counts = {
    pages: db.prepare("SELECT COUNT(*) AS n FROM pages").get().n,
    posts: db.prepare("SELECT COUNT(*) AS n FROM posts").get().n,
    cars: db.prepare("SELECT COUNT(*) AS n FROM cars").get().n,
  };
  console.log("Imported", counts);
  db.close();
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { run };
