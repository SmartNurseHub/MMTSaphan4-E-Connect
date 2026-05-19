let excelData = [];

/* =========================
   HANDLE EXCEL
========================= */
function handleExcelUpload() {
  const file = document.getElementById("excelFile")?.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheet =
      workbook.Sheets[workbook.SheetNames[0]];

    let json = XLSX.utils.sheet_to_json(sheet);

    excelData = json
      .map((r) => ({
        code: String(r.Code || r.code || "").trim(),
        name: String(r.Name || r.name || "").trim(),
      }))
      .filter((v) => v.code && v.name);

    renderExcelPreview();
  };

  reader.readAsArrayBuffer(file);
}

/* =========================
   RENDER
========================= */
function renderExcelPreview() {
  const div = document.getElementById("excelPreview");
  if (!div) return;

  div.innerHTML = `
    <table class="table table-sm table-bordered">
      <thead>
        <tr>
          <th>
            <input type="checkbox" onclick="toggleAll(this)" checked>
          </th>
          <th>Code</th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        ${excelData
          .map(
            (r, i) => `
          <tr>
            <td>
              <input type="checkbox"
                     class="vac-check"
                     value="${i}"
                     checked>
            </td>
            <td>${r.code}</td>
            <td>${r.name}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

/* =========================
   TOGGLE ALL
========================= */
function toggleAll(el) {
  document.querySelectorAll(".vac-check").forEach((c) => {
    c.checked = el.checked;
  });
}

/* =========================
   SAVE (FIXED)
========================= */
async function saveSelectedVaccines() {
  const checked = document.querySelectorAll(".vac-check:checked");

  if (!checked.length) {
    return Swal.fire({
      icon: "warning",
      title: "กรุณาเลือกข้อมูล",
    });
  }

  const selected = [];

  checked.forEach((c) => {
    const index = Number(c.value);
    const row = excelData[index];

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
    throw new Error(result.error);
  }

  Swal.fire({
    icon: "success",
    title: "สำเร็จ",
    timer: 1200,
    showConfirmButton: false,
  });

  if (typeof loadVaccineMasterTab === "function") {
    await loadVaccineMasterTab();
  }
}

