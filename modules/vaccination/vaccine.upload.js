/*****************************************************************
 * VACCINE UPLOAD MODULE (CLEAN VERSION)
 *****************************************************************/

window.uploadVaccines = [];

/* =========================
   OPEN MODAL
========================= */
window.openUploadVaccineModal = function () {
  const el = document.getElementById("uploadVaccineModal");
  if (!el) return;
  new bootstrap.Modal(el).show();
};

/* =========================
   READ EXCEL
========================= */
window.readVaccineExcel = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheet =
        workbook.Sheets[workbook.SheetNames[0]];

      const json = XLSX.utils.sheet_to_json(sheet);

      window.uploadVaccines = json
        .map((r) => ({
          code: String(
            r["รหัสยา"] ||
            r["Code"] ||
            r["code"] ||
            ""
          ).trim(),

          name: String(
            r["ชื่อยา"] ||
            r["Name"] ||
            r["name"] ||
            ""
          ).trim(),
        }))
        .filter((v) => v.code && v.name);

      renderUploadTable();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "อ่านไฟล์ไม่สำเร็จ",
      });
    }
  };

  reader.readAsArrayBuffer(file);
};

/* =========================
   RENDER TABLE (WITH SEARCH FIX)
========================= */
window.renderUploadTable = function () {
  const tbody = document.getElementById("uploadVaccineTable");
  const keyword =
    document.getElementById("searchUploadVaccine")?.value?.toLowerCase() || "";

  if (!tbody) return;

  let data = window.uploadVaccines || [];

  if (keyword) {
    data = data.filter(
      (v) =>
        v.code.toLowerCase().includes(keyword) ||
        v.name.toLowerCase().includes(keyword)
    );
  }

  if (!data.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center text-muted">
          ไม่มีข้อมูล
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data
    .map(
      (v) => `
    <tr>
      <td class="text-center">
        <input type="checkbox"
               class="vac-check"
               data-code="${v.code}"
               checked>
      </td>
      <td>${v.code}</td>
      <td>${v.name}</td>
    </tr>
  `
    )
    .join("");
};

/* =========================
   TOGGLE ALL
========================= */
window.toggleAllVaccines = function (el) {
  document.querySelectorAll(".vac-check").forEach((c) => {
    c.checked = el.checked;
  });
};

/* =========================
   SAVE (ONLY ONE VERSION)
========================= */
window.saveSelectedVaccines = async function () {
  try {
    const checked = document.querySelectorAll(".vac-check:checked");

    if (!checked.length) {
      return Swal.fire({
        icon: "warning",
        title: "กรุณาเลือกรายการ",
      });
    }

    const selected = [];

    checked.forEach((chk) => {
      const code = chk.dataset.code;

      const row = window.uploadVaccines.find((v) => v.code === code);

      if (row) {
        selected.push({
          code: row.code,
          name: row.name,
        });
      }
    });

    const res = await fetch("/api/vaccination/master/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selected),
    });

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || "save failed");
    }

    Swal.fire({
      icon: "success",
      title: "นำเข้าข้อมูลสำเร็จ",
      timer: 1200,
      showConfirmButton: false,
    });

    bootstrap.Modal
      .getInstance(document.getElementById("uploadVaccineModal"))
      ?.hide();

    window.uploadVaccines = [];

    if (typeof loadVaccineMaster === "function") {
      await loadVaccineMaster();
    }

    if (typeof loadVaccineMasterTab === "function") {
      await loadVaccineMasterTab();
    }
  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: err.message || "นำเข้าไม่สำเร็จ",
    });
  }
};