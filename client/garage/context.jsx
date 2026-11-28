import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const GarageContext = createContext(null);
const ANGLES = ["front", "side", "rear", "detail"];

export function useGarage() {
  const value = useContext(GarageContext);
  if (!value) throw new Error("useGarage");
  return value;
}

async function send(url, options) {
  const response = await fetch(url, Object.assign({ credentials: "same-origin" }, options || {}));
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = null;
  }
  if (!response.ok || !data) {
    const err = new Error("request");
    err.code = data && data.error;
    throw err;
  }
  return data;
}

function fileName(url) {
  const clean = String(url || "").split("?")[0];
  const parts = clean.split("/");
  return parts[parts.length - 1] || "photo";
}

function fromPayload(payload) {
  const car = payload.car || {};
  return {
    photos: (payload.photos || []).map((photo) => ({
      id: String(photo.id),
      src: photo.url,
      angle: photo.angle || "detail",
      onWall: !!photo.is_wall_poster,
      fileName: fileName(photo.url),
    })),
    specs: {
      model: car.title || [car.manufacturer, car.model].filter(Boolean).join(" "),
      year: car.year || "",
      tires: car.tire_size || "",
      engine: car.engine || "",
      mods: car.others || "",
    },
    status: car.model_status === "ready" && car.model_url ? "ready" : "processing",
    modelUrl: car.model_url || null,
    wheel: (payload.parts && payload.parts.wheels) || "stock",
  };
}

function errorText(error) {
  if (error && error.code === "too-big") return "ფოტო 8 მბ-ზე დიდია";
  if (error && error.code === "invalid") return "მხოლოდ სურათები მიიღება";
  return "შენახვა ვერ მოხერხდა";
}

export function GarageProvider({ boot, children }) {
  const [photos, setPhotos] = useState([]);
  const [specs, setSpecsState] = useState({ model: "", year: "", tires: "", engine: "", mods: "" });
  const [status, setStatus] = useState("processing");
  const [modelUrl, setModelUrl] = useState(null);
  const [wheel, setWheelState] = useState("stock");
  const [camera, setCamera] = useState(null);
  const [spin, setSpin] = useState(true);
  const [lightColor, setLightColor] = useState("#ec6c1b");
  const [lightIntensity, setLightIntensity] = useState(70);
  const [lightbox, setLightbox] = useState(null);
  const [error, setError] = useState("");
  const carId = boot.carId;

  const apply = useCallback((payload) => {
    const next = fromPayload(payload);
    setPhotos(next.photos);
    setSpecsState(next.specs);
    setStatus(next.status);
    setModelUrl(next.modelUrl);
    setWheelState(next.wheel);
  }, []);

  useEffect(() => {
    let live = true;
    send("/api/garage/cars/" + carId)
      .then((payload) => {
        if (live) apply(payload);
      })
      .catch(() => {
        if (live) setError("შენახვა ვერ მოხერხდა");
      });
    return () => {
      live = false;
    };
  }, [carId, apply]);

  const run = useCallback((work) => {
    setError("");
    return work().then(apply).catch((err) => {
      setError(errorText(err));
    });
  }, [apply]);

  const addPhotos = useCallback((files) => {
    const images = Array.from(files || []).filter((file) => file.type.indexOf("image/") === 0);
    if (!images.length) return Promise.resolve();
    const body = new FormData();
    images.forEach((file) => body.append("photos", file));
    return run(() => send("/api/garage/cars/" + carId + "/photos", { method: "POST", body }));
  }, [carId, run]);

  const removePhoto = useCallback((id) => {
    return run(() => send("/api/garage/cars/" + carId + "/photos/" + id + "/delete", { method: "POST" }));
  }, [carId, run]);

  const toggleWall = useCallback((photo) => {
    return run(() => send("/api/garage/cars/" + carId + "/photos/" + photo.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_wall_poster: !photo.onWall }),
    }));
  }, [carId, run]);

  const cycleAngle = useCallback((photo) => {
    const index = ANGLES.indexOf(photo.angle);
    const angle = ANGLES[(index + 1) % ANGLES.length] || "detail";
    return run(() => send("/api/garage/cars/" + carId + "/photos/" + photo.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle }),
    }));
  }, [carId, run]);

  const setSpecs = useCallback((next) => {
    return run(() => send("/api/garage/cars/" + carId + "/specs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: next.model,
        year: next.year,
        tire_size: next.tires,
        engine: next.engine,
        others: next.mods,
      }),
    }));
  }, [carId, run]);

  const setWheel = useCallback((partKey) => {
    return run(() => send("/api/garage/cars/" + carId + "/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot: "wheels", part_key: partKey || "stock" }),
    }));
  }, [carId, run]);

  const requestCamera = useCallback((preset) => {
    setCamera({ preset, nonce: Date.now() });
    if (preset !== "wall") setSpin(false);
  }, []);

  const value = useMemo(() => ({
    photos,
    addPhotos,
    removePhoto,
    toggleWall,
    cycleAngle,
    specs,
    setSpecs,
    status,
    modelUrl,
    camera,
    requestCamera,
    spin,
    setSpin,
    lightColor,
    setLightColor,
    lightIntensity,
    setLightIntensity,
    wheel,
    setWheel,
    lightbox,
    openPhoto: setLightbox,
    closePhoto: () => setLightbox(null),
    member: boot.member || { name: "", handle: "" },
    error,
  }), [
    photos, addPhotos, removePhoto, toggleWall, cycleAngle, specs, setSpecs, status, modelUrl,
    camera, requestCamera, spin, lightColor, lightIntensity, wheel, setWheel, lightbox, boot.member, error,
  ]);

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}
