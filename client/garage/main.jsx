import { createRoot } from "react-dom/client";
import { GarageProvider } from "./context.jsx";
import { CameraDock, Lightbox, PhotoPanel, TopBar, TuningPanel } from "./panels.jsx";
import GarageScene from "./scene/garage-scene.jsx";

function GarageApp({ boot }) {
  return (
    <GarageProvider boot={boot}>
      <main className="stage">
        <h1 className="sr-only">ჩემი 3D გარაჟი — Mandraginda.ge</h1>
        <div className="stage-scene">
          <GarageScene />
        </div>
        <div className="stage-ui">
          <TopBar />
          <div className="stage-row">
            <PhotoPanel />
            <TuningPanel />
          </div>
          <div className="stage-dock">
            <CameraDock />
          </div>
        </div>
        <Lightbox />
      </main>
    </GarageProvider>
  );
}

const bootNode = document.getElementById("garage-boot");
const boot = bootNode ? JSON.parse(bootNode.textContent || "{}") : {};
createRoot(document.getElementById("garage-root")).render(<GarageApp boot={boot} />);
