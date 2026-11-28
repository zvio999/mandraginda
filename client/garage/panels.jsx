import { useId, useState } from "react";
import { useGarage } from "./context.jsx";
import {
  ArrowLeftIcon,
  CheckIcon,
  CloseIcon,
  ImagePlusIcon,
  LightbulbIcon,
  LockIcon,
  MountainIcon,
  MouseIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PencilIcon,
  RotateIcon,
  TrashIcon,
  WrenchIcon,
} from "./icons.jsx";

const ANGLE_LABELS = { front: "წინა", side: "გვერდითა", rear: "უკანა", detail: "დეტალი" };
const REQUIRED = ["front", "side", "rear"];
const MAX_WALL = 6;
const CAMERA_PRESETS = [
  { id: "front", label: "წინა ხედი" },
  { id: "side", label: "გვერდიდან" },
  { id: "rear", label: "უკანა ხედი" },
  { id: "wall", label: "კედლის პოსტერები" },
];
const LIGHT_COLORS = [
  { id: "orange", label: "ნარინჯისფერი", value: "#ec6c1b" },
  { id: "blue", label: "ელექტრო ლურჯი", value: "#0f7ce1" },
  { id: "white", label: "ცივი თეთრი", value: "#dfe8f3" },
];
const PART_TABS = [
  { id: "wheels", label: "დისკები" },
  { id: "tires", label: "საბურავები" },
  { id: "bumper", label: "ბამპერი" },
  { id: "rack", label: "საბარგული" },
];
const PARTS = {
  wheels: [
    { id: "w1", name: "701 Beadlock", brand: "Method Race", spec: "17x8.5 • ET0", image: "/media/garage/wheel.png", live: true },
    { id: "w2", name: "Steel 8-Spoke", brand: "Demo", spec: "17x8 • ET0", image: "/media/garage/wheel.png", live: true },
    { id: "w3", name: "Machete XD", brand: "KMC", spec: "17x9 • ET-38", image: "/media/garage/wheel.png" },
    { id: "w4", name: "Klassik 6", brand: "Black Rhino", spec: "17x9 • ET-18", image: "/media/garage/wheel.png" },
  ],
  tires: [
    { id: "t1", name: "Mud-Terrain KM3", brand: "BFGoodrich", spec: "35x12.5 R17", image: "/media/garage/tire.png" },
    { id: "t2", name: "Open Country M/T", brand: "Toyo", spec: "37x12.5 R17", image: "/media/garage/tire.png" },
    { id: "t3", name: "Razr MT", brand: "Maxxis", spec: "35x12.5 R17", image: "/media/garage/tire.png" },
    { id: "t4", name: "Trail Grappler", brand: "Nitto", spec: "33x12.5 R17", image: "/media/garage/tire.png" },
  ],
  bumper: [
    { id: "b1", name: "Summit წინა", brand: "ARB", spec: "ფოლადი • ჯალამბარის ბაზით", image: "/media/garage/bumper.png" },
    { id: "b2", name: "XRC Stubby", brand: "Smittybilt", spec: "მოკლე • D-რგოლები", image: "/media/garage/bumper.png" },
    { id: "b3", name: "Trail Stubby", brand: "Rough Country", spec: "LED კუბებით", image: "/media/garage/bumper.png" },
    { id: "b4", name: "Venator", brand: "Fab Fours", spec: "სრული სიგანე", image: "/media/garage/bumper.png" },
  ],
  rack: [
    { id: "r1", name: "Slimline II", brand: "Front Runner", spec: "1255 x 1425 მმ", image: "/media/garage/rack.png" },
    { id: "r2", name: "Pioneer Platform", brand: "Rhino-Rack", spec: "ალუმინი • 1528 მმ", image: "/media/garage/rack.png" },
    { id: "r3", name: "Expedition", brand: "Rival 4x4", spec: "LED ბარის საყრდენი", image: "/media/garage/rack.png" },
    { id: "r4", name: "Trail Rack", brand: "Smittybilt", spec: "გალია • 300 კგ", image: "/media/garage/rack.png" },
  ],
};
const SPEC_FIELDS = [
  { key: "model", label: "მარკა/მოდელი" },
  { key: "year", label: "წელი" },
  { key: "tires", label: "საბურავების ზომა" },
  { key: "engine", label: "ძრავი" },
  { key: "mods", label: "მოდიფიკაციები", multiline: true },
];

function wheelChoice(partKey) {
  if (partKey === "beadlock") return "w1";
  if (partKey === "steel") return "w2";
  return partKey;
}

export function TopBar() {
  const { specs, status, member } = useGarage();
  const ready = status === "ready";
  return (
    <header className="glass topbar">
      <div className="brand-row">
        <a href="/garage" className="brand" aria-label="Mandraginda.ge მთავარი">
          <span className="brand-mark"><MountainIcon /></span>
          <span className="brand-name">MANDRAGINDA<span>.GE</span></span>
        </a>
        <span className="rule" aria-hidden="true" />
        <div className="user-pill">
          <span className="avatar">{(member.name || "?").slice(0, 1)}</span>
          <span className="user-copy">
            <span className="user-name">{member.name}</span>
            <span className="user-handle">{member.handle}</span>
          </span>
          <span className="car-chip">{specs.model || "ავტომობილი"}</span>
        </div>
      </div>
      <div className="top-actions">
        <div role="status" aria-live="polite" className={ready ? "badge ok" : "badge warn"}>
          <span className="ping" />
          <span className={ready ? "" : "pulse"}>{ready ? "3D მოდელი მზადაა" : "მუშავდება 3D მოდელი..."}</span>
        </div>
        <a href="/garage" className="ghost-btn" aria-label="მთავარ გვერდზე დაბრუნება">
          <ArrowLeftIcon />
          <span className="back-label">მთავარ გვერდზე დაბრუნება</span>
        </a>
      </div>
    </header>
  );
}

export function PhotoPanel() {
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <aside className="side left" aria-label="გარაჟის მართვა">
        <button type="button" className="glass collapse-btn" onClick={() => setOpen(true)}>
          <PanelLeftOpenIcon />
          გარაჟის მართვა
        </button>
      </aside>
    );
  }
  return (
    <aside className="side left" aria-label="გარაჟის მართვა">
      <div className="glass panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Garage / 01</span>
            <h2>გარაჟის მართვა</h2>
          </div>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="პანელის ჩაკეცვა">
            <PanelLeftCloseIcon />
          </button>
        </div>
        <div className="panel-body thin-scroll">
          <PhotoSection />
          <SpecsCard />
        </div>
      </div>
    </aside>
  );
}

function PhotoSection() {
  const { photos, addPhotos, removePhoto, toggleWall, cycleAngle, error } = useGarage();
  const [dragging, setDragging] = useState(false);
  const inputId = useId();
  const wallCount = photos.filter((photo) => photo.onWall).length;
  const covered = {};
  photos.forEach((photo) => { covered[photo.angle] = true; });

  return (
    <section className="block" aria-labelledby={inputId + "-title"}>
      <div className="block-title">
        <h3 id={inputId + "-title"}>ჩემი ავტომობილის ფოტოები <span> (კედლის პოსტერები)</span></h3>
        <span className="count">{wallCount}/{MAX_WALL}</span>
      </div>
      <label
        htmlFor={inputId}
        className={dragging ? "drop hot" : "drop"}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addPhotos(event.dataTransfer.files);
        }}
      >
        <span className="drop-icon"><ImagePlusIcon /></span>
        <span className="drop-title">ჩააგდე ფოტოები ან აირჩიე ფაილები</span>
        <span className="drop-note">ატვირთე 4 კუთხის ფოტო (წინა, გვერდითა, უკანა) 3D მოდელის დასამზადებლად</span>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            addPhotos(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <ul className="angles" aria-label="საჭირო კუთხეები">
        {REQUIRED.map((angle) => (
          <li key={angle} className={covered[angle] ? "angle ok" : "angle"}>
            {covered[angle] ? <CheckIcon /> : null}
            {ANGLE_LABELS[angle]}
          </li>
        ))}
      </ul>
      <ul className="photo-grid">
        {photos.map((photo) => (
          <li key={photo.id} className={photo.onWall ? "photo on" : "photo"}>
            <div className="photo-frame">
              <img src={photo.src} alt={(ANGLE_LABELS[photo.angle] || "დეტალი") + " ხედი — " + photo.fileName} />
              <button type="button" className="angle-tag" onClick={() => cycleAngle(photo)}>
                {ANGLE_LABELS[photo.angle] || ANGLE_LABELS.detail}
              </button>
              <button type="button" className="trash" onClick={() => removePhoto(photo.id)} aria-label={"ფოტოს წაშლა: " + photo.fileName}>
                <TrashIcon />
              </button>
            </div>
            <label className="wall-toggle">
              <span>აჩვენე კედელზე</span>
              <button
                type="button"
                role="switch"
                aria-checked={photo.onWall}
                className={photo.onWall ? "switch on" : "switch"}
                disabled={!photo.onWall && wallCount >= MAX_WALL}
                onClick={() => toggleWall(photo)}
              >
                <i />
              </button>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SpecsCard() {
  const { specs, setSpecs } = useGarage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(specs);
  const baseId = useId();

  return (
    <section className="specs" aria-labelledby={baseId + "-title"}>
      <div className="block-title">
        <h3 id={baseId + "-title"}>ავტომობილის მახასიათებლები</h3>
        {editing ? (
          <div className="edit-actions">
            <button type="button" className="icon-btn" aria-label="გაუქმება" onClick={() => { setDraft(specs); setEditing(false); }}>
              <CloseIcon />
            </button>
            <button type="button" className="save-btn" onClick={() => { setSpecs(draft); setEditing(false); }}>
              <CheckIcon size={14} />
              შენახვა
            </button>
          </div>
        ) : (
          <button type="button" className="edit-btn" onClick={() => { setDraft(specs); setEditing(true); }}>
            <PencilIcon />
            რედაქტირება
          </button>
        )}
      </div>
      {editing ? (
        <form className="spec-form" onSubmit={(event) => { event.preventDefault(); setSpecs(draft); setEditing(false); }}>
          {SPEC_FIELDS.map((field) => {
            const id = baseId + "-" + field.key;
            return (
              <label key={field.key} htmlFor={id}>
                <span>{field.label}</span>
                {field.multiline ? (
                  <textarea id={id} rows={2} value={draft[field.key]} onChange={(event) => setDraft(Object.assign({}, draft, { [field.key]: event.target.value }))} />
                ) : (
                  <input id={id} value={draft[field.key]} onChange={(event) => setDraft(Object.assign({}, draft, { [field.key]: event.target.value }))} />
                )}
              </label>
            );
          })}
          <button type="submit" className="sr-only">შენახვა</button>
        </form>
      ) : (
        <dl>
          {SPEC_FIELDS.map((field) => (
            <div key={field.key}>
              <dt>{field.label}</dt>
              <dd>{specs[field.key] || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function TuningPanel() {
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <aside className="side right" aria-label="ტიუნინგი და ნაწილები">
        <button type="button" className="glass collapse-btn" onClick={() => setOpen(true)}>
          <PanelRightOpenIcon />
          ტიუნინგი
        </button>
      </aside>
    );
  }
  return (
    <aside className="side right" aria-label="ტიუნინგი და ნაწილები">
      <div className="glass panel narrow">
        <div className="panel-head">
          <div>
            <span className="kicker">Tuning Studio</span>
            <h2>ტიუნინგი და ნაწილები <span className="soon">მალე</span></h2>
          </div>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="პანელის ჩაკეცვა">
            <PanelRightCloseIcon />
          </button>
        </div>
        <div className="panel-body thin-scroll">
          <PartsBrowser />
          <LightingControls />
        </div>
      </div>
    </aside>
  );
}

function PartsBrowser() {
  const { wheel, setWheel } = useGarage();
  const [tab, setTab] = useState("wheels");
  const [selected, setSelected] = useState(null);
  const installed = wheelChoice(wheel);
  const chosen = PARTS[tab].filter((part) => part.id === selected)[0];
  const canInstall = chosen && chosen.live;

  return (
    <section className="block">
      <div role="tablist" aria-label="ნაწილების კატეგორიები" className="tabs">
        {PART_TABS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={item.id === tab} className={item.id === tab ? "on" : ""} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="part-grid" role="tabpanel">
        {PARTS[tab].map((part) => {
          const isSel = selected === part.id || (!selected && installed === part.id && part.live);
          return (
            <button
              key={part.id}
              type="button"
              aria-pressed={isSel}
              className={isSel ? "part on" : "part"}
              onClick={() => setSelected(selected === part.id ? null : part.id)}
            >
              <span className="part-shot">
                <img src={part.image} alt={part.brand + " " + part.name} />
                {part.live ? null : <span className="lock"><LockIcon /> მალე</span>}
              </span>
              <span className="part-copy">
                <span className="part-brand">{part.brand}</span>
                <span className="part-name">{part.name}</span>
                <span className="part-spec">{part.spec}</span>
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="install"
        disabled={!canInstall}
        onClick={() => {
          if (!canInstall) return;
          setWheel(installed === chosen.id ? "stock" : chosen.id);
          setSelected(null);
        }}
      >
        <WrenchIcon />
        {canInstall ? (installed === chosen.id ? "ქარხნული დისკის დაბრუნება" : "მანქანაზე დამონტაჟება") : "აირჩიე ნაწილი წინასწარი ნახვისთვის"}
      </button>
    </section>
  );
}

function LightingControls() {
  const { lightColor, setLightColor, lightIntensity, setLightIntensity } = useGarage();
  return (
    <section className="lighting" aria-labelledby="lighting-title">
      <div className="block-title">
        <h3 id="lighting-title"><LightbulbIcon /> გარაჟის განათება</h3>
        <span className="live"><i /> აქტიური</span>
      </div>
      <div>
        <span id="light-color-label" className="field-label">ფერი</span>
        <div role="radiogroup" aria-labelledby="light-color-label" className="colors">
          {LIGHT_COLORS.map((color) => {
            const active = color.value === lightColor;
            return (
              <button key={color.id} type="button" role="radio" aria-checked={active} className={active ? "color on" : "color"} onClick={() => setLightColor(color.value)}>
                <i style={{ background: color.value, boxShadow: active ? "0 0 10px " + color.value : "none" }} />
                <span>{color.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <div className="block-title">
          <span id="light-intensity-label" className="field-label">ინტენსივობა</span>
          <span className="percent">{lightIntensity}%</span>
        </div>
        <input
          type="range"
          min="5"
          max="100"
          step="1"
          aria-labelledby="light-intensity-label"
          value={lightIntensity}
          style={{ "--p": lightIntensity + "%" }}
          onChange={(event) => setLightIntensity(Number(event.target.value))}
        />
      </div>
    </section>
  );
}

export function CameraDock() {
  const { camera, requestCamera, spin, setSpin } = useGarage();
  return (
    <div className="glass dock">
      <span className="hint"><MouseIcon /> დაატრიალე მაუსით 360° • Zoom Scroll-ით</span>
      <span className="rule" aria-hidden="true" />
      <div role="group" aria-label="კამერის ხედები" className="views">
        {CAMERA_PRESETS.map((preset) => (
          <button key={preset.id} type="button" aria-pressed={camera && camera.preset === preset.id} className={camera && camera.preset === preset.id ? "view on" : "view"} onClick={() => requestCamera(preset.id)}>
            {preset.label}
          </button>
        ))}
        <button type="button" aria-pressed={spin} className={spin ? "view spin on" : "view spin"} onClick={() => setSpin(!spin)}>
          <RotateIcon spinning={spin} />
          პლატფორმის ტრიალი
        </button>
      </div>
    </div>
  );
}

export function Lightbox() {
  const { lightbox, closePhoto } = useGarage();
  if (!lightbox) return null;
  return (
    <div className="lightbox" onClick={closePhoto} role="presentation">
      <img src={lightbox} alt="" />
    </div>
  );
}
