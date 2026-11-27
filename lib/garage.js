const fs = require("fs");
const path = require("path");
const multer = require("multer");

const root = path.join(__dirname, "..");
const photoRoot = path.join(root, "public", "uploads", "garage", "photos");
const modelRoot = path.join(root, "public", "uploads", "garage", "models");
const specFields = ["title", "year", "engine", "fuel_type", "category", "gearbox", "drive", "doors", "winch", "portal_axle", "tire_size", "tier_type", "axle_lock", "others"];
const wheelKeys = { stock: true, beadlock: true, steel: true };

function ensureDirs() {
  fs.mkdirSync(photoRoot, { recursive: true });
  fs.mkdirSync(modelRoot, { recursive: true });
}

function diskPath(publicPath) {
  const rel = String(publicPath || "").replace(/^\/+/, "").replace(/\\/g, "/");
  if (!rel || rel.indexOf("..") >= 0) return "";
  if (rel.indexOf("uploads/garage/") !== 0 && rel.indexOf("media/uploads/") !== 0) return "";
  const full = path.resolve(root, "public", rel);
  const pub = path.resolve(root, "public") + path.sep;
  if (full.indexOf(pub) !== 0) return "";
  return full;
}

function removeFile(publicPath) {
  const full = diskPath(publicPath);
  if (!full) return;
  try {
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (error) {}
}

function removeCarAssets(db, car) {
  if (!db || !car) return;
  const photos = db.prepare("SELECT path FROM member_car_photos WHERE car_id = ?").all(car.id);
  photos.forEach(function (photo) { removeFile(photo.path); });
  db.prepare("DELETE FROM member_car_photos WHERE car_id = ?").run(car.id);
  db.prepare("DELETE FROM garage_parts WHERE car_id = ?").run(car.id);
  removeFile(car.model_path);
}

function photoPublicPath(memberId, filename) {
  return "/uploads/garage/photos/" + memberId + "/" + filename;
}

function modelPublicPath(memberId, carId) {
  return "/uploads/garage/models/" + memberId + "/" + carId + "/car.glb";
}

function now() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function carPayload(db, car) {
  const photos = db.prepare("SELECT id, path, is_wall_poster FROM member_car_photos WHERE car_id = ? ORDER BY id").all(car.id);
  const parts = db.prepare("SELECT slot, part_key FROM garage_parts WHERE car_id = ?").all(car.id);
  const chosen = { wheels: "stock" };
  parts.forEach(function (part) { chosen[part.slot] = part.part_key; });
  const wall = photos.filter(function (photo) { return Number(photo.is_wall_poster) === 1; }).map(function (photo) {
    return { id: photo.id, url: photo.path };
  });
  if (!wall.length && car.image) wall.push({ id: 0, url: car.image });
  return {
    car: {
      id: car.id,
      title: car.title,
      manufacturer: car.manufacturer,
      model: car.model,
      year: car.year,
      engine: car.engine,
      fuel_type: car.fuel_type,
      category: car.category,
      gearbox: car.gearbox,
      drive: car.drive,
      doors: car.doors,
      winch: car.winch,
      portal_axle: car.portal_axle,
      tire_size: car.tire_size,
      tier_type: car.tier_type,
      axle_lock: car.axle_lock,
      others: car.others,
      image: car.image,
      model_status: car.model_status || "",
      model_url: car.model_status === "ready" && car.model_path ? car.model_path : "",
    },
    photos: photos.map(function (photo) {
      return { id: photo.id, url: photo.path, is_wall_poster: Number(photo.is_wall_poster) === 1 };
    }),
    posters: wall,
    parts: chosen,
  };
}

function ownCar(db, memberId, carId) {
  return db.prepare("SELECT * FROM member_cars WHERE id = ? AND member_id = ?").get(Number(carId), memberId);
}

function runApply(stmt, params) {
  stmt.run.apply(stmt, params);
}

function register(app, deps) {
  const db = deps.db;
  const field = deps.field;
  ensureDirs();

  function photoUpload(req, res, next) {
    const member = res.locals.member;
    const storage = multer.diskStorage({
      destination: function (request, file, cb) {
        const dir = path.join(photoRoot, String(member.id));
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: function (request, file, cb) {
        const ext = path.extname(file.originalname || "").toLowerCase().replace(/[^.a-z0-9]/g, "") || ".jpg";
        cb(null, Date.now() + "-" + Math.random().toString(16).slice(2) + ext);
      },
    });
    multer({
      storage: storage,
      limits: { fileSize: 8 * 1024 * 1024, files: 12 },
      fileFilter: function (request, file, cb) {
        cb(null, /^image\//.test(file.mimetype || ""));
      },
    }).array("photos", 12)(req, res, function (err) {
      if (!err) return next();
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      res.status(400).json({ error: tooBig ? "too-big" : "invalid" });
    });
  }

  app.get("/garage/cars/:id/studio", deps.requireMember, function (req, res) {
    const car = ownCar(db(), res.locals.member.id, req.params.id);
    if (!car) return res.redirect("/garage");
    const t = res.locals.t;
    const keys = ["saveFailed", "garage", "view3d", "modelReady", "modelPending", "photos", "uploadPhotos", "wallPoster", "removePhoto", "specs", "carName", "choose", "save", "studioLight", "presetFront", "presetSide", "presetRear", "presetPosters", "tuning", "wheels", "wheelStock", "wheelBeadlock", "wheelSteel", "year", "fuel", "engine", "category", "gearbox", "driveWheels", "doors", "winch", "portalAxle", "axleLock", "tireSize", "tireType"];
    const labels = {};
    keys.forEach(function (key) { labels[key] = t[key]; });
    res.locals.title = t.view3d + " – mandraginda";
    res.render("garage-studio", {
      boot: JSON.stringify({
        carId: car.id,
        options: deps.formOptions(res.locals.lang),
        labels: labels,
      }).replace(/</g, "\\u003c"),
    });
  });

  app.get("/api/garage/cars/:id", deps.requireMember, function (req, res) {
    const car = ownCar(db(), res.locals.member.id, req.params.id);
    if (!car) return res.status(404).json({ error: "missing" });
    res.json(carPayload(db(), car));
  });

  app.post("/api/garage/cars/:id/photos", deps.requireMember, photoUpload, function (req, res) {
    const database = db();
    const car = ownCar(database, res.locals.member.id, req.params.id);
    if (!car) return res.status(404).json({ error: "missing" });
    const files = req.files || [];
    files.forEach(function (file) {
      const stored = photoPublicPath(res.locals.member.id, file.filename);
      database.prepare("INSERT INTO member_car_photos (car_id, member_id, path, is_wall_poster, created_at) VALUES (?, ?, ?, 1, ?)").run(
        car.id,
        res.locals.member.id,
        stored,
        now()
      );
    });
    if (files.length && car.model_status !== "ready") {
      database.prepare("UPDATE member_cars SET model_status = ? WHERE id = ? AND member_id = ?").run("pending_3d", car.id, res.locals.member.id);
    }
    res.json(carPayload(database, ownCar(database, res.locals.member.id, car.id)));
  });

  app.post("/api/garage/cars/:id/photos/:photoId", deps.requireMember, function (req, res) {
    const database = db();
    const car = ownCar(database, res.locals.member.id, req.params.id);
    if (!car) return res.status(404).json({ error: "missing" });
    const photo = database.prepare("SELECT * FROM member_car_photos WHERE id = ? AND car_id = ? AND member_id = ?").get(
      Number(req.params.photoId),
      car.id,
      res.locals.member.id
    );
    if (!photo) return res.status(404).json({ error: "missing" });
    const flag = req.body && (req.body.is_wall_poster === false || req.body.is_wall_poster === 0 || req.body.is_wall_poster === "0") ? 0 : 1;
    database.prepare("UPDATE member_car_photos SET is_wall_poster = ? WHERE id = ?").run(flag, photo.id);
    res.json(carPayload(database, car));
  });

  app.post("/api/garage/cars/:id/photos/:photoId/delete", deps.requireMember, function (req, res) {
    const database = db();
    const car = ownCar(database, res.locals.member.id, req.params.id);
    if (!car) return res.status(404).json({ error: "missing" });
    const photo = database.prepare("SELECT * FROM member_car_photos WHERE id = ? AND car_id = ? AND member_id = ?").get(
      Number(req.params.photoId),
      car.id,
      res.locals.member.id
    );
    if (!photo) return res.status(404).json({ error: "missing" });
    removeFile(photo.path);
    database.prepare("DELETE FROM member_car_photos WHERE id = ?").run(photo.id);
    res.json(carPayload(database, car));
  });

  app.post("/api/garage/cars/:id/specs", deps.requireMember, function (req, res) {
    const database = db();
    const car = ownCar(database, res.locals.member.id, req.params.id);
    if (!car) return res.status(404).json({ error: "missing" });
    const body = req.body || {};
    const sets = [];
    const params = [];
    specFields.forEach(function (key) {
      if (body[key] === undefined || body[key] === null) return;
      const value = field(body[key]).slice(0, 200);
      if (key === "title" && !value) return;
      sets.push(key + " = ?");
      params.push(value);
    });
    if (sets.length) {
      params.push(car.id, res.locals.member.id);
      const stmt = database.prepare("UPDATE member_cars SET " + sets.join(", ") + " WHERE id = ? AND member_id = ?");
      runApply(stmt, params);
    }
    res.json(carPayload(database, ownCar(database, res.locals.member.id, car.id)));
  });

  app.post("/api/garage/cars/:id/parts", deps.requireMember, function (req, res) {
    const database = db();
    const car = ownCar(database, res.locals.member.id, req.params.id);
    if (!car) return res.status(404).json({ error: "missing" });
    const slot = field(req.body && req.body.slot);
    const partKey = field(req.body && req.body.part_key);
    if (slot !== "wheels" || !wheelKeys[partKey]) return res.status(400).json({ error: "invalid" });
    database.prepare("INSERT OR REPLACE INTO garage_parts (car_id, member_id, slot, part_key, created_at) VALUES (?, ?, ?, ?, ?)").run(
      car.id,
      res.locals.member.id,
      slot,
      partKey,
      now()
    );
    res.json(carPayload(database, car));
  });

  app.get("/admin/garage", deps.requireAdmin, function (req, res) {
    const database = db();
    const cars = database.prepare(
      "SELECT c.*, m.username, m.display_name, m.email FROM member_cars c LEFT JOIN members m ON m.id = c.member_id WHERE c.model_status != '' OR c.image != '' OR EXISTS (SELECT 1 FROM member_car_photos p WHERE p.car_id = c.id) ORDER BY CASE c.model_status WHEN 'pending_3d' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END, c.id DESC"
    ).all();
    const photos = database.prepare("SELECT * FROM member_car_photos ORDER BY id").all();
    const byCar = {};
    photos.forEach(function (photo) {
      if (!byCar[photo.car_id]) byCar[photo.car_id] = [];
      byCar[photo.car_id].push(photo);
    });
    cars.forEach(function (car) { car.photos = byCar[car.id] || []; });
    deps.renderAdmin(req, res, "garage-3d", { cars: cars }, "3D garage");
  });

  app.get("/admin/garage/:id/photos.zip", deps.requireAdmin, function (req, res) {
    const database = db();
    const car = database.prepare("SELECT * FROM member_cars WHERE id = ?").get(Number(req.params.id));
    if (!car) return res.redirect("/admin/garage");
    let archiver;
    try {
      archiver = require("archiver");
    } catch (error) {
      return res.status(500).send("ZIP is unavailable.");
    }
    const files = [];
    if (car.image) files.push(car.image);
    database.prepare("SELECT path FROM member_car_photos WHERE car_id = ? ORDER BY id").all(car.id).forEach(function (photo) {
      files.push(photo.path);
    });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=\"car-" + car.id + "-photos.zip\"");
    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("error", function () {
      if (!res.headersSent) res.status(500);
      res.end();
    });
    archive.pipe(res);
    const used = {};
    files.forEach(function (publicPath, index) {
      const full = diskPath(publicPath);
      if (!full || !fs.existsSync(full) || used[full]) return;
      used[full] = true;
      archive.file(full, { name: String(index + 1) + "-" + path.basename(full) });
    });
    archive.finalize();
  });

  app.post("/admin/garage/:id/model", deps.requireAdmin, function (req, res) {
    const database = db();
    const car = database.prepare("SELECT * FROM member_cars WHERE id = ?").get(Number(req.params.id));
    if (!car) return res.redirect("/admin/garage");
    const dir = path.join(modelRoot, String(car.member_id), String(car.id));
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, "car.glb");
    multer({
      storage: multer.diskStorage({
        destination: function (request, file, cb) { cb(null, dir); },
        filename: function (request, file, cb) { cb(null, "upload.glb"); },
      }),
      limits: { fileSize: 40 * 1024 * 1024 },
      fileFilter: function (request, file, cb) {
        cb(null, path.extname(file.originalname || "").toLowerCase() === ".glb");
      },
    }).single("model")(req, res, function (err) {
      const uploaded = path.join(dir, "upload.glb");
      if (err || !req.file) {
        req.session.flash = err && err.code === "LIMIT_FILE_SIZE" ? "The model must be under 40 MB." : "Choose a .glb file.";
        return res.redirect("/admin/garage");
      }
      let header = Buffer.alloc(4);
      try {
        const fd = fs.openSync(uploaded, "r");
        fs.readSync(fd, header, 0, 4, 0);
        fs.closeSync(fd);
      } catch (error) {
        header = Buffer.alloc(0);
      }
      if (header.toString() !== "glTF") {
        try { fs.unlinkSync(uploaded); } catch (error) {}
        req.session.flash = "That file is not a GLB model.";
        return res.redirect("/admin/garage");
      }
      try {
        if (fs.existsSync(target)) fs.unlinkSync(target);
        fs.renameSync(uploaded, target);
      } catch (error) {
        req.session.flash = "The model could not be saved.";
        return res.redirect("/admin/garage");
      }
      database.prepare("UPDATE member_cars SET model_status = ?, model_path = ? WHERE id = ?").run(
        "ready",
        modelPublicPath(car.member_id, car.id),
        car.id
      );
      req.session.flash = "3D model is live for this car.";
      res.redirect("/admin/garage");
    });
  });
}

module.exports = { register, removeCarAssets, ensureDirs };
