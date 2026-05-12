import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTema, getStoredTema } from "./lib/theme";

// Applica subito il tema dall'ultima scelta locale, prima del primo render,
// così non si vede il flash arancio se l'utente ha scelto un preset diverso.
applyTema(getStoredTema(), false);

createRoot(document.getElementById("root")!).render(<App />);
