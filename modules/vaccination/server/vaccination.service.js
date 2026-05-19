const {
  getNextVCN
} = require("./services/vaccination.record.service");


module.exports = {

  ...require("./services/vaccination.master.service"),
  ...require("./services/vaccination.patient.service"),
  ...require("./services/vaccination.inventory.service"),
  ...require("./services/vaccination.record.service"),
  ...require("./services/vaccination.appointment.service"),
  ...require("./services/vaccination.reminder.service"),
  ...require("./services/vaccination.line.service"),
  ...require("./services/vaccination.dashboard.service"),
  ...require("./services/vaccination.his.service"),
  ...require("./services/vaccination.certificate.service")

};