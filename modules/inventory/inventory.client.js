/*************************************************
 * INVENTORY CLIENT (PRODUCTION FIXED VERSION)
 * PATCH: AUTO SHOW LOT ID
 *************************************************/

/* ===============================
   STATE
================================ */
let STOCK_MASTER = [];
let MODE = "edit";
let LOT_DATA = [];
let LOTS = [];
let MASTER_LIST = [];

/* ===============================
   SAFE DOM
================================ */
function el(id){
  return document.getElementById(id);
}

/* ===============================
   SAFE FETCH JSON
================================ */
async function fetchJSON(url, options = {}) {

  if (!url || typeof url !== "string") {
    console.error("❌ Invalid fetch URL:", url);
    throw new Error("Invalid API URL");
  }

  const res = await fetch(url, options);

  let json = {};
  try {
    json = await res.json();
  } catch (e) {
    console.error("❌ JSON parse error:", e);
  }

  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  return json;
}

/* ===============================
   DASHBOARD
================================ */
function hideDashboard(){
  const dash = el("dashboard-card");
  if (dash) dash.classList.add("d-none");
}

function showDashboard(){
  const dash = el("dashboard-card");
  if (dash) dash.classList.remove("d-none");
  el("content-area").innerHTML = "";
}

/* ===============================
   MASTER UI
================================ */
function openMaster(){

  hideDashboard();

  el("content-area").innerHTML = `
    <div class="card shadow-sm border-0" style="border-radius:16px;">
      <div class="card-body">

        <div class="d-flex justify-content-between mb-2">
          <h6>📦 Inventory Master</h6>

          <div>
            <button class="btn btn-sm btn-success" onclick="setAddMode()">➕ เพิ่ม</button>
            <button class="btn btn-sm btn-warning" onclick="setEditMode()">✏️ แก้ไข</button>
          </div>
        </div>

        <table class="table table-sm table-bordered text-center">
          <thead class="table-light">
            <tr>
              <th>ID</th><th>Name</th><th>Size</th><th>Min</th><th>Unit</th><th>Manage</th>
            </tr>
          </thead>
          <tbody id="stock-body"></tbody>
        </table>

        <div class="text-end">
          <button class="btn btn-primary" onclick="saveStock()">💾 Save</button>
        </div>

      </div>
    </div>
  `;

  loadMaster();
}


/* ===============================
   LOT UI
================================ */
function openStock(){

  hideDashboard();

  el("content-area").innerHTML = `
  <div class="card shadow-sm border-0">
    <div class="card-body">
      <div class="d-flex justify-content-between mb-2">
        <h6>📦Stock Movement</h6>
        <button class="btn btn-sm btn-success" onclick="openLotModal()">➕ Add</button>
      </div>

      <table class="table table-sm table-bordered text-center">
        <thead class="table-light">
          <tr>
            <th>Lotid</th>
            <th>Item</th>
            <th>Name</th>
            <th>Qty</th>
            <th>Lot</th>
            <th>Exp</th>
            <th>QR</th>
            <th>Manage</th>
          </tr>
        </thead>
        <tbody id="lot-body"></tbody>
      </table>
    </div>
  </div>

<div class="modal fade" id="lotModal" tabindex="-1">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content shadow-lg border-0 rounded-4">

      <div class="modal-header bg-dark text-white">
        <h6 class="mb-0">📦 Inventory Movement</h6>
        <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>

      <ul class="nav nav-pills nav-fill gap-2 p-3 pb-0">
        <li class="nav-item">
          <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-in">
            ➕ Receive
          </button>
        </li>

        <li class="nav-item">
          <button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-out">
            ➖ Issue
          </button>
        </li>
      </ul>

      <div class="modal-body tab-content">

        <!-- IN -->
        <div class="tab-pane fade show active p-3" id="tab-in">

          <div class="row g-3">

            <div class="col-12">
              <label>Item</label>
              <select id="in_item" class="form-select"></select>
            </div>

            <div class="col-md-6">
              <label>Lot ID (Auto)</label>
              <input id="in_lotid" class="form-control bg-white" readonly>
            </div>

            <div class="col-md-6">
              <label>Date</label>
              <input id="in_date" type="date" class="form-control">
            </div>

            <div class="col-md-6">
              <label>Lot No.</label>
              <input id="in_lot" class="form-control">
            </div>

            <div class="col-md-6">
              <label>Expiry</label>
              <input id="in_exp" type="date" class="form-control">
            </div>

            <div class="col-md-6">
              <label>Qty</label>
              <input id="in_qty" type="number" class="form-control">
            </div>

            <div class="col-md-6">
              <label>Source</label>
              <input id="in_from" class="form-control">
            </div>

            <div class="col-12">
              <label>Provider</label>
              <input id="in_providers" class="form-control">
            </div>

          </div>
        </div>

        <!-- OUT -->
        <div class="tab-pane fade p-3" id="tab-out">

          <div class="row g-3">

            <div class="col-12">
              <label>Select Lot</label>
              <select id="out_lot_select"
                      class="form-select"
                      onchange="fillOutMovement()"></select>
            </div>

            <div class="col-md-6">
              <label>Lot ID</label>
              <input id="out_lotid" class="form-control" readonly>
            </div>

            <div class="col-md-6">
              <label>Item</label>
              <input id="out_item" class="form-control" readonly>
            </div>

            <div class="col-md-6">
              <label>Date</label>
              <input id="out_date" type="date" class="form-control">
            </div>

            <div class="col-md-6">
              <label>Qty</label>
              <input id="out_qty" type="number" class="form-control">
            </div>

          </div>
        </div>

      </div>

      <div class="modal-footer">
        <button class="btn btn-success w-100" onclick="saveMovement()">
          💾 Save Movement
        </button>
      </div>

    </div>
  </div>
</div>
  `;

  loadLots();
}

/* ===============================
   OPEN MODAL + AUTO LOT ID
================================ */
async function openLotModal(){

  const modalEl = el("lotModal");
  const modal = new bootstrap.Modal(modalEl);

  // โหลด dropdown ก่อน
  await loadMasterForIN();

  // โหลด lot สำหรับ OUT
  await loadMovementLots();

  // โหลด running lot id
  const data = await fetchJSON("/api/inventory/movement/next-id");
  

  // set ค่า
  el("in_lotid").value = data.lotId || "";

  // set date
  el("in_date").valueAsDate = new Date();
  el("out_date").valueAsDate = new Date();

  // show modal
  modal.show();
}
/* ===============================
   MASTER DROPDOWN
================================ */
async function loadMasterForIN(){

  try{

    const json = await fetchJSON("/api/inventory/master");

    // รองรับทั้ง array และ {data:[]}
    const data = json.data || [];

    const sel = el("in_item");

    if(!sel){
      console.error("❌ in_item not found");
      return;
    }

    if(!data.length){

      sel.innerHTML = `
        <option value="">
          No Item
        </option>
      `;

      return;
    }

    sel.innerHTML = `
      <option value="">-- Select Item --</option>
      ${data.map(i => `
        <option value="${i.id}">
          ${i.id} | ${i.name}
        </option>
      `).join("")}
    `;

  }catch(err){

    console.error("❌ loadMasterForIN", err);

    const sel = el("in_item");

    if(sel){
      sel.innerHTML = `
        <option value="">
          Load Failed
        </option>
      `;
    }
  }
}

/* ===============================
   LOAD LOTS FOR OUT
================================ */
async function loadMovementLots(){

  const json = await fetchJSON("/api/inventory/movement");

  const data = Array.isArray(json)
    ? json
    : (json.data || []);

  const sel = el("out_lot_select");

  if(!sel) return;

  if(!data.length){

    sel.innerHTML = `
      <option value="">
        No Lot
      </option>
    `;

    return;
  }

  sel.innerHTML = data.map(m => `
  <option value="${m.Lotid}">
    ${m.Lotid} | ${m.Item_id}
  </option>
`).join("");

  fillOutMovement();
}

/* ===============================
   FILL OUT
================================ */
function fillOutMovement(){

  const lotId = el("out_lot_select").value;
  if(!lotId) return;

  const data = MOVEMENT_CACHE.find(x => x.Lotid === lotId);
  if(!data) return;

  el("out_lotid").value = data.Lotid || "";
  el("out_item").value = data.Item_id || "";
}

/* ===============================
   SAVE MOVEMENT
================================ */
async function saveMovement(){

  try{

    const isIN = document.querySelector('#tab-in').classList.contains('active')
          || document.querySelector('#tab-in').classList.contains('show');

    let payload = {};

    /* ===============================
       IN
    ================================ */
    if(isIN){

      payload = {
        Lotid: el("in_lotid").value,
        Item_id: el("in_item").value,
        Date: el("in_date").value,
        Type: "IN",
        Lot: el("in_lot").value,
        Exp: el("in_exp").value,
        Qty: Number(el("in_qty").value || 0),
        From: el("in_from").value,
        Providers: el("in_providers").value
      };

      // VALIDATE
      if(!payload.Item_id){
        return alert("Select Item");
      }

      if(payload.Qty <= 0){
        return alert("Invalid Qty");
      }

    }

    /* ===============================
       OUT
    ================================ */
    else{

      payload = {
        Lotid: el("out_lotid").value,
        Item_id: el("out_item").value,
        Date: el("out_date").value,
        Type: "OUT",
        Qty: Number(el("out_qty").value || 0)
      };

      // VALIDATE
      if(payload.Qty <= 0){
        return alert("Invalid Qty");
      }
    }

    const res = await fetch("/api/inventory/movement",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify(payload)
    });

    const result = await res.json();

    if(!res.ok){
      throw new Error(result.error || "Save failed");
    }

    alert("✅ Saved");

    bootstrap.Modal
      .getInstance(el("lotModal"))
      .hide();

    await loadLots();

  }catch(err){

    console.error("❌ SAVE MOVEMENT", err);

    alert(err.message || "Save error");
  }
}
/* ===============================
   GENERATE LOT ID
================================ */
function generateLotId(){

  const d = new Date();

  return "LOT-" +
    d.getFullYear() +
    String(d.getMonth()+1).padStart(2,"0") +
    String(d.getDate()).padStart(2,"0") +
    "-" +
    String(Date.now()).slice(-4);
}

let INVENTORY_MASTER_MAP = {};
/* ===============================
   LOAD LOT TABLE
================================ */
async function loadLots(){

  const json = await fetchJSON("/api/inventory/movement");

  const data = Array.isArray(json)
    ? json
    : (json.data || []);

  const body = el("lot-body");
  if(!body) return;

  body.innerHTML = data.map(r => {

    const master = INVENTORY_MASTER_MAP?.[r.Item_id];
const name = master?.name ?? "-";

    return `
      <tr>
        <td>${r.Lotid || ""}</td>
        <td>${r.Item_id || ""}</td>
        <td>${name}</td>
        <td>${r.Qty || 0}</td>
        <td>${r.Lot || ""}</td>
        <td>${r.Exp || ""}</td>
        <td>
          ${r.QRCode ? `
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(r.QRCode)}"/>
            <div style="font-size:10px;">${r.QRCode}</div>
          ` : "-"}
        </td>
        <td>
          <button class="btn btn-sm btn-danger"
            onclick="deleteMovement('${r.Lotid}')">
            🗑️ Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");
}
/* ===============================
   MASTER
================================ */
async function loadMaster(){

  const json = await fetchJSON("/api/inventory/master");

  const list = json.data || [];

  STOCK_MASTER = list;

  INVENTORY_MASTER_MAP = {}; // reset

  list.forEach(i => {
    INVENTORY_MASTER_MAP[i.id] = i;
  });

  renderStock();
}

function renderStock(){

  const body = el("stock-body");

  if(!body) return;

  body.innerHTML = STOCK_MASTER.map((i,idx)=>`
    <tr>

      <td>
        <input
          class="form-control form-control-sm"
          value="${i.id || ""}"
          onchange="STOCK_MASTER[${idx}].id=this.value">
      </td>

      <td>
        <input
          class="form-control form-control-sm"
          value="${i.name || ""}"
          onchange="STOCK_MASTER[${idx}].name=this.value">
      </td>

      <td>
        <input
          class="form-control form-control-sm"
          value="${i.size || ""}"
          onchange="STOCK_MASTER[${idx}].size=this.value">
      </td>

      <td>
        <input
          type="number"
          class="form-control form-control-sm"
          value="${i.min_qty || 0}"
          onchange="STOCK_MASTER[${idx}].min_qty=Number(this.value)">
      </td>

      <td>
        <input
          class="form-control form-control-sm"
          value="${i.unit || ""}"
          onchange="STOCK_MASTER[${idx}].unit=this.value">
      </td>

      <td>
        <button
          class="btn btn-danger btn-sm"
          onclick="deleteRow(${idx})">
          🗑️
        </button>
      </td>

    </tr>
  `).join("");
}

function deleteRow(i){
  STOCK_MASTER.splice(i,1);
  renderStock();
}

async function saveStock(){

  try{

    const res = await fetch("/api/inventory/master",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify(STOCK_MASTER)
    });

    const result = await res.json();

    if(!res.ok){
      throw new Error(result.error || "Save failed");
    }

    alert("✅ Saved");

    await loadMaster();

  }catch(err){

    console.error("❌ SAVE STOCK", err);

    alert(err.message || "Save error");
  }
}

/* ===============================
   MODE
================================ */
function setAddMode(){
  STOCK_MASTER.push({
    id:"",
    name:"",
    size:"",
    min_qty:0,
    unit:""
  });
  renderStock();
}

function setEditMode(){
  loadMaster();
}

async function loadNextLotId(){
  const data = await fetchJSON("/api/inventory/movement/next-id");
  

  el("in_lotid").value = data.lotId;
}

async function deleteMovement(lotId){

  try{

    if(!lotId){
      return alert("Lotid missing");
    }

    const ok = confirm(`Delete ${lotId} ?`);
    if(!ok) return;

    const res = await fetch("/api/inventory/movement/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ Lotid: lotId })
    });

    const result = await res.json();

    if(!res.ok){
      throw new Error(result.error || "Delete failed");
    }

    alert("✅ Deleted");

    await loadLots();

  }catch(err){
    console.error("DELETE ERROR", err);
    alert(err.message);
  }
}


async function loadSummary() {

  console.log("📊 loadSummary called");

  const tbody = document.getElementById("dash-body");

  if (!tbody) {
    console.error("❌ dash-body not found (HTML not ready)");
    return;
  }

  try {

    const [master, movement] = await Promise.all([
      fetchJSON("/api/inventory/master"),
      fetchJSON("/api/inventory/movement")
    ]);

    console.log("MASTER RAW:", master);
    console.log("MOVEMENT RAW:", movement);

const mList = master.data || [];
const mvList = movement.data || [];

    if (!mList.length) {
      tbody.innerHTML = `<tr><td colspan="6">❌ No MASTER DATA</td></tr>`;
      return;
    }

    const masterMap = {};
    mList.forEach(r => {

      const id = r.id;
      if (!id) return;

      masterMap[id] = {
        id,
        name: r.name || r[1] || "-",
        size: r.size || r[2] || "-",
        minQty: Number(r.min_qty || r[3] || 0),
        unit: r.unit || r[4] || "-"
      };
    });

    const stockMap = {};

    mvList.forEach(r => {

      const itemId = r.Item_id;
      const type = r.Type || r[3];
      const qty = Number(r.Qty || r[4] || 0);

      if (!itemId) return;

      if (!stockMap[itemId]) stockMap[itemId] = 0;

      if (type === "IN") stockMap[itemId] += qty;
      if (type === "OUT") stockMap[itemId] -= qty;
    });

    const keys = Object.keys(masterMap);

    console.log("MASTER KEYS:", keys);

    if (!keys.length) {
      tbody.innerHTML = `<tr><td colspan="6">❌ MASTER MAP EMPTY</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    keys.forEach(id => {

      const m = masterMap[id];
      const currentQty = stockMap[id] || 0;

      tbody.innerHTML += `
        <tr>
          <td>${m.id}</td>
          <td>${m.name} ${m.size}</td>
          <td>${m.minQty} ${m.unit}</td>
          <td>
            <span class="badge ${currentQty < m.minQty ? 'bg-danger' : 'bg-success'}">
              ${currentQty}
            </span>
          </td>
          <td>
            <button class="btn btn-sm btn-primary"
              onclick="openDetail('${m.id}')">
              Detail
            </button>
          </td>
        </tr>
      `;
    });

  } catch (err) {
    console.error("❌ loadSummary ERROR", err);
  }
}

function openDetail(itemId) {
  loadItemDetail(itemId);
}

async function loadItemDetail(itemId) {
  try {

    const res = await fetchJSON(`/api/inventory/movement?itemId=${itemId}`);

    const data = Array.isArray(res) ? res : (res.data || []);

    renderDetailModal(itemId, data);

  } catch (err) {
    console.error("loadItemDetail error", err);
    alert("โหลด detail ไม่ได้");
  }
}

function renderDetailModal(itemId, data) {

  let rows = data.map(r => `
    <tr>
      <td>${r.Date || r[1] || "-"}</td>
      <td>
        <span class="badge ${r.Type === "IN" || r[3] === "IN" ? "bg-success" : "bg-danger"}">
          ${r.Type || r[3] || "-"}
        </span>
      </td>
      <td>${r.Qty ?? r[4] ?? 0}</td>
      <td>${r.Note || r[5] || "-"}</td>
    </tr>
  `).join("");

  const html = `
    <table class="table table-sm table-bordered">
      <thead class="table-light">
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Qty</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  let modal = document.getElementById("detailModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "detailModal";

    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">

          <div class="modal-header">
            <h6 class="modal-title">📦 Detail: ${itemId}</h6>
            <button class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            ${html}
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(modal);

  } else {
    modal.querySelector(".modal-title").innerText = `📦 Detail: ${itemId}`;
    modal.querySelector(".modal-body").innerHTML = html;
  }

  bootstrap.Modal.getOrCreateInstance(modal).show();
}

/* ===============================
   EXPORT
================================ */
window.openMaster = openMaster;
window.openStock = openStock;
window.openLotModal = openLotModal;
window.saveMovement = saveMovement;
window.fillOutMovement = fillOutMovement;
window.saveStock = saveStock;
window.setAddMode = setAddMode;
window.setEditMode = setEditMode;
window.deleteMovement = deleteMovement;
/* ✅ IMPORTANT ADD THIS */
window.loadSummary = loadSummary;
window.openDetail = openDetail;