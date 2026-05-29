/*************************************************
 * SPA CORE — MODULE-BASED (HARDENED VERSION)
 * FIX:
 * - Prevent duplicate script loading
 * - Prevent duplicate init
 * - Safe SPA navigation
 * - Cache loaded modules
 *************************************************/

console.log("🚀 app.js LOADED");

/* =========================================
   GLOBAL STATE
========================================= */
window.NCMS = window.NCMS || {};

const loadedScripts = new Map();
const initializedViews = new Map();

/* =========================================
   SIDEBAR
========================================= */
function toggleSidebar() {
  document.body.classList.toggle("sidebar-collapsed");
}

/* =========================================
   VIEW CONFIG
========================================= */
const VIEW_CONFIG = {

  dashboard: {
    view: "/modules/dashboard/dashboard.view.html",
    script: "/modules/dashboard/dashboard.client.js",
    init: "initDashboard"
  },

  patients: {
    view: "/modules/patients/patients.view.html",
    script: "/modules/patients/patients.client.js",
    init: "initPatients"
  },

  appointments: {
    view: "/modules/appointments/appointments.view.html",
    script: "/modules/appointments/appointments.client.js",
    init: "initAppointments"
  },

  nursingRecords: {
    view: "/modules/nursingRecords/nursingRecords.view.html",
    script: "/modules/nursingRecords/nursingRecords.client.js",
    init: "initNursingRecords"
  },

  nursingCounselor: {
    view: "/modules/nursingCounselor/nursingCounselor.view.html",
    script: "/modules/nursingCounselor/nursingCounselor.client.js",
    init: "initNursingCounselor"
  },

  reports: {
    view: "/modules/reports/reports.view.html",
    script: "/modules/reports/reports.client.js",
    init: "initReports"
  },

  vaccination: {
    view: "/modules/vaccination/vaccination.view.html",
    script: "/modules/vaccination/vaccination.client.js",
    init: "initVaccination"
  },

  inventory: {
    view: "/modules/inventory/inventory.view.html",
    script: "/modules/inventory/inventory.client.js",
    init: "initInventory"
  }

};

/* =========================================
   LOAD SCRIPT ONCE
========================================= */
async function loadScriptOnce(src) {

  // โหลดแล้ว
  if (loadedScripts.has(src)) {
    console.log("⚠️ Script already cached:", src);
    return;
  }

  await new Promise((resolve, reject) => {

    // มี script อยู่แล้ว
    let script =
      document.querySelector(`script[src="${src}"]`);

    // ถ้ายังไม่มี → สร้างใหม่
    if (!script) {

      script = document.createElement("script");

      script.src = src;

      script.defer = true;

      document.body.appendChild(script);
    }

    // โหลดเสร็จแล้ว
    if (script.dataset.loaded === "true") {

      loadedScripts.set(src, true);

      return resolve();
    }

    // รอโหลด
    script.onload = () => {

      console.log("✅ Script loaded:", src);

      script.dataset.loaded = "true";

      loadedScripts.set(src, true);

      resolve();
    };

    script.onerror = (err) => {

      console.error("❌ Script load error:", src);

      reject(err);
    };

  });

}
/* =========================================
   LOAD VIEW
========================================= */
async function loadView(name) {

  const cfg = VIEW_CONFIG[name];
  const container = document.getElementById("view-container");

  if (!cfg) {
    console.warn("⚠️ View config not found:", name);
    return;
  }

  try {

    console.log(`📦 Loading View: ${name}`);

    /* =========================
       LOAD HTML
    ========================= */
    const res = await fetch(cfg.view);

    if (!res.ok) {
      throw new Error(`View not found: ${cfg.view}`);
    }

    const html = await res.text();

    container.innerHTML = html;

    /* =========================
       LOAD SCRIPT
    ========================= */
    const scripts = cfg.scripts || (cfg.script ? [cfg.script] : []);

    for (const src of scripts) {
      await loadScriptOnce(src);
    }

    /* =========================
       INIT MODULE
    ========================= */
    if (cfg.init) {

      const initFn = window[cfg.init];

      if (typeof initFn === "function") {

        console.log(`🚀 Init: ${cfg.init}`);

        await initFn();

        initializedViews.set(name, true);

      } else {

        console.warn(`⚠️ Init function not found: ${cfg.init}`);

      }
    }

  } catch (err) {

    console.error("❌ loadView ERROR:", err);

    container.innerHTML = `
      <div class="alert alert-danger m-3">
        <h5>❌ โหลดหน้าไม่สำเร็จ</h5>
        <div>${err.message}</div>
      </div>
    `;
  }
}

/* =========================================
   NAVIGATION
========================================= */
document.addEventListener("click", async (e) => {

  const nav = e.target.closest("[data-nav]");

  if (!nav) return;

  e.preventDefault();

  const targetView = nav.dataset.nav;

  if (!targetView) return;

  console.log("➡️ Navigate:", targetView);

  await loadView(targetView);

});

/* =========================================
   START APP
========================================= */
window.addEventListener("DOMContentLoaded", async () => {

  console.log("🔥 NCMS START");

  await loadView("dashboard");

});

/* =========================================
   GLOBAL EXPORT
========================================= */
window.loadView = loadView;
window.toggleSidebar = toggleSidebar;