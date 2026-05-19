/*****************************************************************
 * dashboard.client.js (CLEAN FIXED VERSION)
 *****************************************************************/

console.log("📊 dashboard.client.js LOADED");
let followerData = [];
/*****************************************************************
 * INIT
 *****************************************************************/
async function initDashboard() {

  // 🔥 FIX: รอ DOM render
  setTimeout(async () => {
    await loadLineUIDTable();
    await loadPatients();
    await loadFollowers();
  }, 100);

}

document.addEventListener("DOMContentLoaded", initDashboard);
window.initDashboard = initDashboard;

/*****************************************************************
 * UTIL
 *****************************************************************/
function formatThaiDateShort(isoDate) {
  if (!isoDate) return "-";

  const date = new Date(isoDate);

  return date.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

const btn = document.getElementById("reportsBtn");
const sub = document.getElementById("reportsSub");

btn.addEventListener("click", () => {
  sub.style.display = sub.style.display === "block" ? "none" : "block";
});

// ไปหน้า inventory
function goInventory(){
  loadView("inventory");
}


async function loadLineUIDTable() {
  try {
    const res = await fetch("/api/dashboard/lineuid");
    const json = await res.json();

    const tbody = document.getElementById("followTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!json.success || !Array.isArray(json.data)) {
      tbody.innerHTML =
        "<tr><td colspan='7'>โหลดข้อมูลไม่สำเร็จ</td></tr>";
      return;
    }

    if (json.data.length === 0) {
      tbody.innerHTML =
        "<tr><td colspan='7' class='text-muted'>ไม่พบข้อมูล</td></tr>";
      return;
    }

    // 🔥 เก็บ data สำหรับ search
    followerData = json.data;

    renderFollowerTable(followerData);

  } catch (err) {
    console.error("❌ loadLineUIDTable error:", err);
  }
}

function renderFollowerTable(data) {
  const tbody = document.getElementById("followTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  data.forEach(row => {
    tbody.innerHTML += `
      <tr id="row-${row.rowIndex}">
        <td>${row.cid}</td>
        <td>${row.name} ${row.lname}</td>

        <td>
          <img src="${row.pictureUrl || '/assets/images/LOGO.png'}"
               style="width:45px;height:45px;border-radius:50%;">
        </td>

        <td>${row.displayName}</td>
        <td>${row.userId}</td>

        <td>
          <span class="badge bg-success">
            ${row.status || "Active"}
          </span>
        </td>

        <td>
          <button 
            class="btn btn-sm btn-danger delete-btn"
            data-rowindex="${row.rowIndex}">
            Delete
          </button>
        </td>
      </tr>
    `;
  });
}
/*****************************************************************
 * LOAD FOLLOWERS
 *****************************************************************/


async function loadFollowers() {
  try {
    const res = await fetch("/api/followlist");
    const result = await res.json();

    if (!result.success) return;

    const select = document.getElementById("lineSelect");
    if (!select) return;

    select.innerHTML = '<option value="">-- เลือก LINE UID --</option>';

    result.data.forEach(item => {
      const option = document.createElement("option");

      option.value = item.userId;
      option.textContent = `${item.displayName} (${item.userId})`;

      option.dataset.displayname = item.displayName;
      option.dataset.userid = item.userId;
      option.dataset.status = item.eventType || "follow";
      option.dataset.picture = item.picture || "";
      option.dataset.pictureurl = item.pictureUrl || "";

      select.appendChild(option);
    });

  } catch (err) {
    console.error("loadFollowers error:", err);
  }
}

/*****************************************************************
 * LOAD PATIENTS
 *****************************************************************/
async function loadPatients() {
  try {
    const res = await fetch("/api/patients/list");
    const result = await res.json();

    const select = document.getElementById("patientSelect");
    if (!select) return;

    select.innerHTML =
      '<option value="">-- เลือกผู้ป่วย --</option>';

    const patients = result.data || result;
    if (!Array.isArray(patients)) return;

    patients.forEach(p => {
      const option = document.createElement("option");

      option.value = p.CID;
      option.textContent =
        `${p.CID} - ${p.NAME} ${p.LNAME}`;

      option.dataset.name  = p.NAME;
      option.dataset.lname = p.LNAME;

      select.appendChild(option);
    });

  } catch (err) {
    console.error("❌ loadPatients error:", err);
  }
}

/*****************************************************************
 * AUTO FILL
 *****************************************************************/
document.addEventListener("change", function (e) {

  // PATIENT
  if (e.target?.id === "patientSelect") {

    const selected =
      e.target.options[e.target.selectedIndex];
    if (!selected) return;

    document.getElementById("p_name").value =
      selected.dataset.name || "";

    document.getElementById("p_lname").value =
      selected.dataset.lname || "";

    document.getElementById("p_cid").value =
      e.target.value || "";
  }

  // LINE
  if (e.target?.id === "lineSelect") {

    const selected =
      e.target.options[e.target.selectedIndex];
    if (!selected) return;

    const pictureUrl =
      selected.dataset.pictureurl || "";

    document.getElementById("l_displayName").value =
      selected.dataset.displayname || "";

    document.getElementById("l_userId").value =
      selected.dataset.userid || "";

    document.getElementById("l_status").value =
      selected.dataset.status || "";

    document.getElementById("l_picture").value =
      selected.dataset.picture || "";

    document.getElementById("l_pictureUrl").value =
      pictureUrl;

    // PREVIEW IMAGE
    const img = document.getElementById("linePreview");

    if (pictureUrl && pictureUrl.startsWith("http")) {
      img.src = pictureUrl;

      img.onerror = () => {
        img.src = "/assets/images/LOGO.png";
      };

      img.style.display = "inline-block";
    } else {
      img.src = "/assets/images/LOGO.png";
      img.style.display = "inline-block";
    }
  }
});

/*****************************************************************
 * SAVE
 *****************************************************************/
document.addEventListener("submit", async function (e) {

  if (!e.target.matches("#addFollowerForm")) return;

  e.preventDefault();

  const payload = {
    cid: document.getElementById("p_cid").value,
    name: document.getElementById("p_name").value,
    lname: document.getElementById("p_lname").value,
    userId: document.getElementById("l_userId").value,
    displayName: document.getElementById("l_displayName").value,
    status: document.getElementById("l_status").value,
    picture: document.getElementById("l_picture").value,
    pictureUrl: document.getElementById("l_pictureUrl").value
  };

  const res = await fetch("/api/lineuid/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = await res.json();

  if (json.success) {

    await Swal.fire({
      icon: "success",
      title: "บันทึกสำเร็จ",
      text: "เชื่อม LINE UID เรียบร้อยแล้ว",
      timer: 1500,
      showConfirmButton: false
    });

    const modalEl = document.getElementById("addFollowerModal");

    if (document.activeElement) {
      document.activeElement.blur();
    }

    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();

    loadLineUIDTable();
  }

});

/*****************************************************************
 * DELETE
 *****************************************************************/
/*****************************************************************
 * DELETE (REAL DELETE)
 *****************************************************************/
document.addEventListener("click", async function (e) {

  const btn = e.target.closest(".delete-btn");
  if (!btn) return;

  const rowIndex = btn.dataset.rowindex;

  const confirm = await Swal.fire({
    title: "ยืนยันการลบ?",
    text: "ลบจริงในระบบ",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบ"
  });

  if (!confirm.isConfirmed) return;

  try {

    const res = await fetch(`/api/lineuid/delete/${rowIndex}`, {
  method: "DELETE"
});
    const json = await res.json();

    if (!json.success) throw new Error(json.message);

    document.getElementById(`row-${rowIndex}`)?.remove();

    Swal.fire({
      icon: "success",
      title: "ลบสำเร็จ",
      timer: 1200,
      showConfirmButton: false
    });

  } catch (err) {
    console.error("❌ DELETE ERROR:", err);

    Swal.fire({
      icon: "error",
      title: "ลบไม่สำเร็จ"
    });
  }

});

document.addEventListener("input", function (e) {

  if (e.target.id !== "searchFollower") return;

  const keyword = e.target.value.toLowerCase().trim();

  const filtered = followerData.filter(item =>
    (item.name || "").toLowerCase().includes(keyword) ||
    (item.lname || "").toLowerCase().includes(keyword) ||
    (item.displayName || "").toLowerCase().includes(keyword)
  );

  renderFollowerTable(filtered);

});


/*************************************************
 * DASHBOARD MODULE
 *************************************************/

/*************************************************
 * DASHBOARD MODULE
 *************************************************/

(() => {

if(window.__DASHBOARD_MODULE_LOADED__){
  console.warn("⚠️ dashboard.client.js already loaded");
  return;
}

window.__DASHBOARD_MODULE_LOADED__ = true;

console.log("📊 dashboard.client.js LOADED");

/*************************************************
 * INIT
 *************************************************/
window.initDashboard = async function(){

  console.log("🚀 initDashboard");

  try{

    // โหลด dashboard data ตรงนี้

  }catch(err){

    console.error("❌ initDashboard:", err);

  }

};

})();