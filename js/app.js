// Verdrahtet Module mit dem Router und startet die Navigation, sobald der Login fertig ist.
import { onAppReady } from "./auth.js";
import { registerModule, navigate } from "./router.js";
import { renderDashboard } from "./modules/dashboard.js";
import { renderMitglieder } from "./modules/mitglieder.js";
import { renderBelegungsplan } from "./modules/belegungsplan.js";

registerModule("dashboard", renderDashboard);
registerModule("mitglieder", renderMitglieder);
registerModule("belegungsplan", renderBelegungsplan);
// weitere Module werden hier registriert, sobald sie gebaut sind:
// registerModule("dokumente", renderDokumente);
// registerModule("kasse", renderKasse);
// registerModule("training", renderTraining);
// registerModule("website", renderWebsite);
// registerModule("spielerpaesse", renderSpielerpaesse);
// registerModule("schiri", renderSchiri);
// registerModule("turniere", renderTurniere);
// registerModule("liga", renderLiga);
// registerModule("benutzer", renderBenutzer);

onAppReady(() => navigate());
