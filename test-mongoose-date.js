const mongoose = require('mongoose');
const s = new mongoose.Schema({ dob: Date });
const M = mongoose.model('M', s);
const doc = new M();
try {
  doc.dob = new Date("invalid");
  console.log("Cast success:", doc.dob);
} catch (e) {
  console.log("Error:", e.message);
}
