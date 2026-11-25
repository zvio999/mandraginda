const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const ejs = require("ejs");
const { open } = require("./lib/db");
const { run } = require("./lib/import");
const { hashPassword, verifyPassword } = require("./lib/auth");
const { getHome, saveHome } = require("./lib/home");

const root = path.join(__dirname);
const uploadDir = path.join(root, "public", "media", "uploads");
const sessions = new Map();
const reserved = new Set(["admin", "cars", "car", "contact", "news", "media", "css", "js", "send-email"]);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".jpg";
    cb(null, Date.now() + "-" + Math.random().toString(16).slice(2) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype));
  },
});

function cookieId(req) {
  const raw = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith("sid="));
  return raw ? decodeURIComponent(raw.slice(4)) : "";
}

function setSession(res, data) {
  const id = crypto.randomBytes(24).toString("hex");
  sessions.set(id, data);
  res.setHeader("Set-Cookie", "sid=" + id + "; HttpOnly; Path=/; SameSite=Lax");
  return id;
}

function slugify(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u10A0-\u10FF]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

function cleanHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function field(value) {
  return String(value || "").trim();
}

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(root, "views"));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.static(path.join(root, "public")));

let db;

app.use((req, res, next) => {
  const id = cookieId(req);
  req.session = sessions.get(id) || null;
  req.sid = id;
  res.locals.home = getHome(db);
  res.locals.current = req.path;
  res.locals.title = "mandraginda – off-road";
  next();
});

function requireAdmin(req, res, next) {
  if (!req.session) return res.redirect("/admin/login");
  next();
}

function renderAdmin(req, res, view, data, title) {
  const unread = db.prepare("SELECT COUNT(*) AS n FROM messages WHERE is_read = 0").get().n;
  ejs.renderFile(path.join(root, "views", "admin", view + ".ejs"), data || {}, (error, body) => {
    if (error) return res.status(500).send("Template error");
    const flash = req.session ? req.session.flash : "";
    if (req.session) req.session.flash = "";
    res.render("admin/layout", { title: title || "Control panel", body, current: req.path, flash, unread });
  });
}

function uniqueSlug(table, slug, id) {
  let candidate = reserved.has(slug) ? slug + "-page" : slug;
  let n = 2;
  while (true) {
    const row = db.prepare("SELECT id FROM " + table + " WHERE slug = ?").get(candidate);
    if (!row || Number(row.id) === Number(id)) return candidate;
    candidate = slug + "-" + n++;
  }
}

app.get("/", (req, res) => {
  const posts = db.prepare("SELECT * FROM posts WHERE status = 'publish' ORDER BY published_at DESC LIMIT 4").all();
  res.render("home", { posts });
});

app.get("/cars", (req, res) => {
  const cars = db.prepare("SELECT * FROM cars WHERE status = 'publish' ORDER BY title").all();
  res.locals.title = "Cars – mandraginda";
  res.render("cars", { cars });
});

app.get("/car/:slug", (req, res) => {
  const car = db.prepare("SELECT * FROM cars WHERE slug = ? AND status = 'publish'").get(req.params.slug);
  if (!car) return res.status(404).render("404");
  res.locals.title = car.title + " – mandraginda";
  res.render("car", { car });
});

app.get("/news", (req, res) => {
  const posts = db.prepare("SELECT * FROM posts WHERE status = 'publish' ORDER BY published_at DESC").all();
  res.locals.title = "News – mandraginda";
  res.render("news", { posts });
});

app.get("/contact", (req, res) => {
  res.locals.title = "Contact – mandraginda";
  res.render("contact", { sent: req.query.sent === "1" });
});

app.post("/contact", (req, res) => {
  if (field(req.body.company)) return res.redirect("/contact?sent=1");
  const name = field(req.body.name);
  const email = field(req.body.email);
  const body = field(req.body.body);
  if (!name || !email || !body) return res.redirect("/contact");
  db.prepare("INSERT INTO messages (name, email, phone, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, 0)").run(
    name,
    email,
    field(req.body.phone),
    body,
    new Date().toISOString().slice(0, 16).replace("T", " ")
  );
  res.redirect("/contact?sent=1");
});

app.get("/send-email", (req, res) => res.redirect("/contact"));

app.get("/admin/login", (req, res) => {
  if (req.session) return res.redirect("/admin");
  res.render("admin/login", { error: "" });
});

app.post("/admin/login", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(field(req.body.username));
  if (!user || !verifyPassword(String(req.body.password || ""), user.salt, user.password_hash)) {
    return res.status(401).render("admin/login", { error: "Those details do not match." });
  }
  setSession(res, { userId: user.id, flash: "" });
  res.redirect("/admin");
});

app.post("/admin/logout", (req, res) => {
  if (req.sid) sessions.delete(req.sid);
  res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; Max-Age=0");
  res.redirect("/admin/login");
});

app.get("/admin", requireAdmin, (req, res) => {
  renderAdmin(req, res, "dashboard", {
    counts: {
      cars: db.prepare("SELECT COUNT(*) AS n FROM cars").get().n,
      posts: db.prepare("SELECT COUNT(*) AS n FROM posts").get().n,
      pages: db.prepare("SELECT COUNT(*) AS n FROM pages").get().n,
      messages: db.prepare("SELECT COUNT(*) AS n FROM messages WHERE is_read = 0").get().n,
    },
    messages: db.prepare("SELECT * FROM messages ORDER BY id DESC LIMIT 5").all(),
  }, "Dashboard");
});

app.get("/admin/homepage", requireAdmin, (req, res) => {
  renderAdmin(req, res, "homepage", { home: getHome(db) }, "Homepage");
});

app.post("/admin/homepage", requireAdmin, (req, res) => {
  const current = getHome(db);
  const body = req.body;
  const stats = current.stats.map((stat, i) => ({
    label: field(body["stat_label_" + i]) || stat.label,
    value: Number(body["stat_value_" + i]) || 0,
    suffix: body["stat_suffix_" + i] != null ? String(body["stat_suffix_" + i]) : stat.suffix,
  }));
  const events = current.events.map((event, i) => ({
    ...event,
    kicker: field(body["event_kicker_" + i]),
    title: field(body["event_title_" + i]),
    text: field(body["event_text_" + i]),
  }));
  const why = current.why.map((item, i) => ({
    title: field(body["why_title_" + i]),
    text: field(body["why_text_" + i]),
  }));
  const regions = current.regions.map((region, i) => ({
    name: field(body["region_name_" + i]) || region.name,
    value: Number(body["region_value_" + i]) || 0,
  }));
  saveHome(db, {
    ...current,
    phone: field(body.phone),
    phoneHref: field(body.phoneHref),
    email: field(body.email),
    saleEmail: field(body.saleEmail),
    heroTitle: field(body.heroTitle),
    heroText: field(body.heroText),
    heroButton: field(body.heroButton),
    heroLink: field(body.heroLink),
    tripsLabel: field(body.tripsLabel),
    trips: Number(body.trips) || 0,
    eventsEyebrow: field(body.eventsEyebrow),
    eventsTitle: field(body.eventsTitle),
    eventsText: field(body.eventsText),
    whyEyebrow: field(body.whyEyebrow),
    whyTitle: field(body.whyTitle),
    whyText: field(body.whyText),
    experienceEyebrow: field(body.experienceEyebrow),
    experienceTitle: field(body.experienceTitle),
    experienceText: field(body.experienceText),
    ctaTitle: field(body.ctaTitle),
    ctaText: field(body.ctaText),
    newsTitle: field(body.newsTitle),
    newsText: field(body.newsText),
    stats,
    events,
    why,
    regions,
  });
  req.session.flash = "Homepage saved.";
  res.redirect("/admin/homepage");
});

app.get("/admin/cars", requireAdmin, (req, res) => {
  renderAdmin(req, res, "cars", { cars: db.prepare("SELECT * FROM cars ORDER BY title").all() }, "Cars");
});

app.get("/admin/cars/new", requireAdmin, (req, res) => {
  renderAdmin(req, res, "car-form", { car: {} }, "New car");
});

app.get("/admin/cars/:id", requireAdmin, (req, res) => {
  const car = db.prepare("SELECT * FROM cars WHERE id = ?").get(req.params.id);
  if (!car) return res.redirect("/admin/cars");
  renderAdmin(req, res, "car-form", { car }, "Edit car");
});

function saveCar(req, res) {
  const id = req.params.id ? Number(req.params.id) : null;
  const existing = id ? db.prepare("SELECT * FROM cars WHERE id = ?").get(id) : null;
  const title = field(req.body.title);
  if (!title) return res.redirect(id ? "/admin/cars/" + id : "/admin/cars/new");
  const slug = uniqueSlug("cars", slugify(req.body.slug || title), id);
  const image = req.file ? "/media/uploads/" + req.file.filename : existing ? existing.image : "";
  const values = [
    slug,
    title,
    field(req.body.manufacturer),
    field(req.body.model),
    field(req.body.year),
    field(req.body.tire_size),
    field(req.body.tier_type),
    field(req.body.fuel_type),
    field(req.body.engine),
    field(req.body.axle_lock),
    field(req.body.others),
    image,
    req.body.status === "draft" ? "draft" : "publish",
  ];
  if (existing) {
    db.prepare(`UPDATE cars SET slug=?, title=?, manufacturer=?, model=?, year=?, tire_size=?, tier_type=?, fuel_type=?, engine=?, axle_lock=?, others=?, image=?, status=? WHERE id=?`).run(
      ...values,
      id
    );
  } else {
    db.prepare(`INSERT INTO cars (slug, title, manufacturer, model, year, tire_size, tier_type, fuel_type, engine, axle_lock, others, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      ...values
    );
  }
  req.session.flash = "Car saved.";
  res.redirect("/admin/cars");
}

app.post("/admin/cars", requireAdmin, upload.single("image"), saveCar);
app.post("/admin/cars/:id", requireAdmin, upload.single("image"), saveCar);
app.post("/admin/cars/:id/delete", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM cars WHERE id = ?").run(req.params.id);
  req.session.flash = "Car deleted.";
  res.redirect("/admin/cars");
});

app.get("/admin/posts", requireAdmin, (req, res) => {
  renderAdmin(req, res, "posts", { posts: db.prepare("SELECT * FROM posts ORDER BY published_at DESC").all() }, "Articles");
});

app.get("/admin/posts/new", requireAdmin, (req, res) => {
  renderAdmin(req, res, "post-form", { post: { published_at: new Date().toISOString().slice(0, 10) } }, "New article");
});

app.get("/admin/posts/:id", requireAdmin, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.redirect("/admin/posts");
  renderAdmin(req, res, "post-form", { post }, "Edit article");
});

function savePost(req, res) {
  const id = req.params.id ? Number(req.params.id) : null;
  const existing = id ? db.prepare("SELECT * FROM posts WHERE id = ?").get(id) : null;
  const title = field(req.body.title);
  if (!title) return res.redirect("/admin/posts");
  const slug = uniqueSlug("posts", slugify(req.body.slug || title), id);
  const image = req.file ? "/media/uploads/" + req.file.filename : existing ? existing.image : "";
  const body = cleanHtml(req.body.body);
  const excerpt = field(req.body.excerpt) || body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  const published = field(req.body.published_at) || new Date().toISOString().slice(0, 10);
  const status = req.body.status === "draft" ? "draft" : "publish";
  if (existing) {
    db.prepare("UPDATE posts SET slug=?, title=?, excerpt=?, body=?, image=?, published_at=?, status=? WHERE id=?").run(
      slug, title, excerpt, body, image, published, status, id
    );
  } else {
    db.prepare("INSERT INTO posts (slug, title, excerpt, body, image, published_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      slug, title, excerpt, body, image, published, status
    );
  }
  req.session.flash = "Article saved.";
  res.redirect("/admin/posts");
}

app.post("/admin/posts", requireAdmin, upload.single("image"), savePost);
app.post("/admin/posts/:id", requireAdmin, upload.single("image"), savePost);
app.post("/admin/posts/:id/delete", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
  req.session.flash = "Article deleted.";
  res.redirect("/admin/posts");
});

app.get("/admin/pages", requireAdmin, (req, res) => {
  renderAdmin(req, res, "pages", { pages: db.prepare("SELECT * FROM pages ORDER BY title").all() }, "Pages");
});

app.get("/admin/pages/new", requireAdmin, (req, res) => {
  renderAdmin(req, res, "page-form", { page: {} }, "New page");
});

app.get("/admin/pages/:id", requireAdmin, (req, res) => {
  const page = db.prepare("SELECT * FROM pages WHERE id = ?").get(req.params.id);
  if (!page) return res.redirect("/admin/pages");
  renderAdmin(req, res, "page-form", { page }, "Edit page");
});

app.post("/admin/pages", requireAdmin, (req, res) => savePage(req, res));
app.post("/admin/pages/:id", requireAdmin, (req, res) => savePage(req, res));

function savePage(req, res) {
  const id = req.params.id ? Number(req.params.id) : null;
  const title = field(req.body.title);
  if (!title) return res.redirect("/admin/pages");
  const slug = uniqueSlug("pages", slugify(req.body.slug || title), id);
  const status = req.body.status === "draft" ? "draft" : "publish";
  const body = cleanHtml(req.body.body);
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  if (id) {
    db.prepare("UPDATE pages SET slug=?, title=?, body=?, status=?, updated_at=? WHERE id=?").run(slug, title, body, status, now, id);
  } else {
    db.prepare("INSERT INTO pages (slug, title, body, status, updated_at) VALUES (?, ?, ?, ?, ?)").run(slug, title, body, status, now);
  }
  req.session.flash = "Page saved.";
  res.redirect("/admin/pages");
}

app.post("/admin/pages/:id/delete", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM pages WHERE id = ?").run(req.params.id);
  req.session.flash = "Page deleted.";
  res.redirect("/admin/pages");
});

app.get("/admin/messages", requireAdmin, (req, res) => {
  db.prepare("UPDATE messages SET is_read = 1").run();
  renderAdmin(req, res, "messages", { messages: db.prepare("SELECT * FROM messages ORDER BY id DESC").all() }, "Messages");
});

app.post("/admin/messages/:id/delete", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM messages WHERE id = ?").run(req.params.id);
  req.session.flash = "Message deleted.";
  res.redirect("/admin/messages");
});

app.get("/admin/password", requireAdmin, (req, res) => {
  renderAdmin(req, res, "password", { error: "" }, "Password");
});

app.post("/admin/password", requireAdmin, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  if (!user || !verifyPassword(String(req.body.current || ""), user.salt, user.password_hash)) {
    return renderAdmin(req, res, "password", { error: "Current password is wrong." }, "Password");
  }
  const next = String(req.body.next || "");
  if (next.length < 8) {
    return renderAdmin(req, res, "password", { error: "Use at least 8 characters." }, "Password");
  }
  const { salt, hash } = hashPassword(next);
  db.prepare("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?").run(hash, salt, user.id);
  req.session.flash = "Password changed.";
  res.redirect("/admin/password");
});

app.get("/:slug", (req, res, next) => {
  if (reserved.has(req.params.slug)) return next();
  const page = db.prepare("SELECT * FROM pages WHERE slug = ? AND status = 'publish'").get(req.params.slug);
  if (page) {
    res.locals.title = page.title + " – mandraginda";
    return res.render("page", { page });
  }
  const post = db.prepare("SELECT * FROM posts WHERE slug = ? AND status = 'publish'").get(req.params.slug);
  if (post) {
    res.locals.title = post.title + " – mandraginda";
    return res.render("post", { post });
  }
  res.status(404).render("404");
});

run()
  .then(async () => {
    require("fs").mkdirSync(uploadDir, { recursive: true });
    db = await open();
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log("Mandraginda is running at http://localhost:" + port);
      console.log("Control panel: http://localhost:" + port + "/admin");
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
