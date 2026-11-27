import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import GarageScene from "./scene.jsx";

const SPEC_FIELDS = [
  ["year", "year", "year"],
  ["fuel_type", "fuel", "fuel"],
  ["engine", "engine", "engine"],
  ["category", "category", "category"],
  ["gearbox", "gearbox", "gearbox"],
  ["drive", "drive", "driveWheels"],
  ["doors", "doors", "doors"],
  ["winch", "yesno", "winch"],
  ["portal_axle", "yesno", "portalAxle"],
  ["axle_lock", "axle", "axleLock"],
  ["tire_size", "tireSize", "tireSize"],
  ["tier_type", "tireType", "tireType"],
];

function labelOf(options, group, value) {
  const list = (options && options[group]) || [];
  for (let i = 0; i < list.length; i += 1) {
    if (String(list[i].value) === String(value)) return list[i].label;
  }
  return value || "";
}

async function send(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error("request");
  return response.json();
}

function App({ boot }) {
  const labels = boot.labels;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [preset, setPreset] = useState("front");
  const [focus, setFocus] = useState(null);
  const [light, setLight] = useState(0.85);
  const [lightbox, setLightbox] = useState(null);
  const [specs, setSpecs] = useState(null);

  function apply(next) {
    setData(next);
    setSpecs(next.car);
  }

  useEffect(function () {
    send("/api/garage/cars/" + boot.carId)
      .then(apply)
      .catch(function () { setError(labels.saveFailed); });
  }, [boot.carId]);

  function refresh(promise) {
    setError("");
    promise.then(apply).catch(function () { setError(labels.saveFailed); });
  }

  function uploadPhotos(event) {
    const files = event.target.files;
    if (!files || !files.length) return;
    const body = new FormData();
    for (let i = 0; i < files.length; i += 1) body.append("photos", files[i]);
    refresh(send("/api/garage/cars/" + boot.carId + "/photos", { method: "POST", body: body }));
    event.target.value = "";
  }

  function togglePoster(photo) {
    refresh(send("/api/garage/cars/" + boot.carId + "/photos/" + photo.id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_wall_poster: !photo.is_wall_poster }),
    }));
  }

  function removePhoto(photo) {
    refresh(send("/api/garage/cars/" + boot.carId + "/photos/" + photo.id + "/delete", { method: "POST" }));
  }

  function saveSpecs(event) {
    event.preventDefault();
    refresh(send("/api/garage/cars/" + boot.carId + "/specs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(specs),
    }));
  }

  function chooseWheel(key) {
    refresh(send("/api/garage/cars/" + boot.carId + "/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot: "wheels", part_key: key }),
    }));
  }

  const car = data ? data.car : null;
  const posters = data ? data.posters : [];
  const wheel = data && data.parts ? data.parts.wheels : "stock";
  const presets = [
    ["front", labels.presetFront],
    ["side", labels.presetSide],
    ["rear", labels.presetRear],
    ["posters", labels.presetPosters],
  ];
  const wheels = [
    ["stock", labels.wheelStock],
    ["beadlock", labels.wheelBeadlock],
    ["steel", labels.wheelSteel],
  ];

  return (
    <div className="studio">
      <header className="studio-bar">
        <a href="/garage">{labels.garage}</a>
        <strong>{car ? car.title : labels.view3d}</strong>
        <span>{car && car.model_url ? labels.modelReady : labels.modelPending}</span>
      </header>
      <div className="studio-body">
        <aside className="glass">
          <h2>{labels.photos}</h2>
          <label className="upload">
            {labels.uploadPhotos}
            <input type="file" accept="image/*" multiple onChange={uploadPhotos} />
          </label>
          <div className="photo-list">
            {(data ? data.photos : []).map(function (photo) {
              return (
                <figure key={photo.id}>
                  <button type="button" onClick={function () { setLightbox(photo.url); }}>
                    <img src={photo.url} alt="" />
                  </button>
                  <label>
                    <input type="checkbox" checked={photo.is_wall_poster} onChange={function () { togglePoster(photo); }} />
                    {labels.wallPoster}
                  </label>
                  <button type="button" className="text" onClick={function () { removePhoto(photo); }}>{labels.removePhoto}</button>
                </figure>
              );
            })}
          </div>
          {specs ? (
            <form onSubmit={saveSpecs}>
              <h2>{labels.specs}</h2>
              <p className="make">{[specs.manufacturer, specs.model].filter(Boolean).join(" ")}</p>
              <label>{labels.carName}
                <input value={specs.title || ""} onChange={function (event) { setSpecs(Object.assign({}, specs, { title: event.target.value })); }} />
              </label>
              {SPEC_FIELDS.map(function (field) {
                const options = boot.options[field[1]] || [];
                return (
                  <label key={field[0]}>{labels[field[2]]}
                    <select value={specs[field[0]] || ""} onChange={function (event) {
                      const next = Object.assign({}, specs);
                      next[field[0]] = event.target.value;
                      setSpecs(next);
                    }}>
                      <option value="">{labels.choose}</option>
                      {options.map(function (item) {
                        return <option key={item.value} value={item.value}>{item.label}</option>;
                      })}
                    </select>
                  </label>
                );
              })}
              <button className="gold" type="submit">{labels.save}</button>
            </form>
          ) : null}
          {error ? <p className="studio-error">{error}</p> : null}
        </aside>
        <div className="stage">
          {data ? (
            <GarageScene
              light={light}
              preset={preset}
              focus={focus}
              wheelStyle={wheel}
              modelUrl={car.model_url}
              posters={posters}
              pendingLabel={labels.modelPending}
              onFocus={function (next) {
                setPreset("posters");
                setFocus(next);
                setLightbox(next.photo.url);
              }}
            />
          ) : null}
        </div>
        <aside className="glass">
          <h2>{labels.view3d}</h2>
          <div className="preset-row">
            {presets.map(function (item) {
              return (
                <button
                  key={item[0]}
                  type="button"
                  className={preset === item[0] && !focus ? "gold" : ""}
                  onClick={function () { setFocus(null); setPreset(item[0]); }}
                >{item[1]}</button>
              );
            })}
          </div>
          <label className="slider">{labels.studioLight}
            <input type="range" min="0.25" max="1.6" step="0.05" value={light} onChange={function (event) { setLight(Number(event.target.value)); }} />
          </label>
          <h2>{labels.tuning}</h2>
          <p>{labels.wheels}</p>
          <div className="preset-row">
            {wheels.map(function (item) {
              return (
                <button key={item[0]} type="button" className={wheel === item[0] ? "gold" : ""} onClick={function () { chooseWheel(item[0]); }}>
                  {item[1]}
                </button>
              );
            })}
          </div>
          {car ? <p className="status-line">{labelOf(boot.options, "category", car.category)}</p> : null}
        </aside>
      </div>
      {lightbox ? (
        <div className="lightbox" onClick={function () { setLightbox(null); }}>
          <img src={lightbox} alt="" />
        </div>
      ) : null}
    </div>
  );
}

const bootNode = document.getElementById("garage-boot");
const rootNode = document.getElementById("garage-root");
if (bootNode && rootNode) {
  createRoot(rootNode).render(<App boot={JSON.parse(bootNode.textContent)} />);
}
