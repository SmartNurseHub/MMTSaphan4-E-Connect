/*****************************************************************

* lineUID.service.js
  *****************************************************************/

const {
readRows,
appendRow,
updateRow,
deleteRow
} = require("@config/google");

const SHEET = "LineUID";

/* =========================================================
GET LIST
========================================================= */

exports.getLineUIDList = async () => {

try {

```
const rows = await readRows(SHEET);

if (!rows || rows.length <= 1) return [];

return rows.slice(1).map((r, i) => ({
  rowIndex: i + 2,
  timestamp: r[0] || "",
  cid: r[1] || "",
  name: r[2] || "",
  lname: r[3] || "",
  userId: r[4] || "",
  displayName: r[5] || "",
  pictureUrl: r[6] || "",
  status: r[7] || "",
  phone: r[8] || ""
}));
```

} catch (err) {

```
console.error("❌ getLineUIDList:", err);
throw err;
```

}

};

/* =========================================================
FIND USER
========================================================= */

exports.findLineUser = async (userId) => {

try {

```
const rows =
  await exports.getLineUIDList();

const found =
  rows.find(r => r.userId === userId);

if (found) {

  return {
    found: true,
    data: found
  };

}

return {
  found: false
};
```

} catch (err) {

```
console.error(
  "❌ findLineUser:",
  err
);

return {
  found: false
};
```

}

};

/* =========================================================
ADD USER
========================================================= */

let isSaving = false;

exports.addLineUID = async (data) => {

if (isSaving) {
console.log("⚠️ SKIP: already saving");
return;
}

isSaving = true;

try {

```
const rows = await readRows(SHEET);

const exists =
  rows.find(r => r[4] === data.userId);

if (exists) {

  console.log(
    "⚠️ DUPLICATE SKIPPED:",
    data.userId
  );

  return;
}

await appendRow(SHEET, [

  new Date().toISOString(),

  data.cid || "",
  data.name || "",
  data.lname || "",

  data.userId || "",

  data.displayName || "",
  data.pictureUrl || "",

  data.status || "ACTIVE",

  data.phone || ""

]);

console.log(
  "✅ INSERT SUCCESS:",
  data.userId
);
```

} catch (err) {

```
console.error(
  "❌ addLineUID:",
  err
);

throw err;
```

} finally {

```
isSaving = false;
```

}

};

/* =========================================================
UPDATE USER
========================================================= */

exports.updateLineUID = async ({
userId,
displayName,
pictureUrl
}) => {

try {

```
const rows = await readRows(SHEET);

for (let i = 1; i < rows.length; i++) {

  if (rows[i][4] === userId) {

    rows[i][0] =
      new Date().toISOString();

    rows[i][5] =
      displayName || rows[i][5];

    rows[i][6] =
      pictureUrl || rows[i][6];

    await updateRow(
      SHEET,
      i + 1,
      rows[i]
    );

    console.log(
      "✅ UPDATE UID:",
      userId
    );

    return true;
  }
}

return false;
```

} catch (err) {

```
console.error(
  "❌ updateLineUID:",
  err
);

return false;
```

}

};

/* =========================================================
DELETE
========================================================= */

exports.deleteLineUID = async (rowIndex) => {

if (!rowIndex || rowIndex < 2) {
throw new Error("Invalid rowIndex");
}

console.log(
"🗑️ DELETE:",
rowIndex
);

await deleteRow(
SHEET,
rowIndex
);

console.log(
"✅ DELETE SUCCESS:",
rowIndex
);

};
