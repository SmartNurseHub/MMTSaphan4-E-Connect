/* =========================================================
   uploadHISZip
========================================================= */
async function uploadHISZip(file){

  console.log("📦 HIS ZIP:", file.originalname);

  const zip =
    new AdmZip(file.buffer);

  const entries =
    zip.getEntries();

  let drugRows = [];
  let personalRows = [];

  /* =====================================
     READ FILES
  ===================================== */

  for(const entry of entries){

    const name =
      entry.entryName.toUpperCase();

    console.log("📄 FILE:", name);

    const buffer =
      entry.getData();

    const text =
      iconv.decode(buffer,"tis620");

    const lines =
      text.split(/\r?\n/);

    /* =====================================
       DRUG_OPD
    ===================================== */

    if(name.includes("DRUG_OPD")){

      drugRows = lines
        .filter(x=>x.trim())
        .map(line=>{

          const cols =
            line.split("|");

          return {

            HN:cols[0],
            PID:cols[1],
            DATE_SERV:cols[2],
            DNAME:cols[18]

          };

        });

      console.log("💉 DRUG_OPD:", drugRows.length);

    }

    /* =====================================
       PERSONAL
    ===================================== */

    if(name.includes("PERSONAL")){

      personalRows = lines
        .filter(x=>x.trim())
        .map(line=>{

          const cols =
            line.split("|");

          return {

            CID:cols[1],
            PID:cols[3],
            PRENAME:cols[13],
            NAME:cols[14],
            LNAME:cols[15],
            HN:cols[0],
            SEX:cols[5],
            BIRTH:cols[6],
            TELEPHONE:cols[17],
            MOBILE:cols[18]

          };

        });

      console.log("👤 PERSONAL:", personalRows.length);

    }

  }

  /* =====================================
     LOAD VaccineMaster
  ===================================== */

  const vaccines =
    await getVaccineMaster();

  /* =====================================
     JOIN DATA
  ===================================== */

  const preview = [];

  for(const d of drugRows){

    const person =
      personalRows.find(
        p => String(p.PID) === String(d.PID)
      );

    if(!person) continue;

    const vaccine =
      vaccines.find(v =>

        String(v.name || "")
          .trim()
          .toLowerCase()

        ===

        String(d.DNAME || "")
          .trim()
          .toLowerCase()

      );

    if(!vaccine) continue;

    preview.push({

      selected:true,

      PID:d.PID,

      CID:person.CID,

      NAME:person.NAME,

      LNAME:person.LNAME,

      HN:person.HN,

      DNAME:d.DNAME,

      VaccineCode:vaccine.code,

      VaccineName:vaccine.TH_Name,

      DateService:d.DATE_SERV

    });

  }

  console.log("✅ MATCH:", preview.length);

  return preview;

}