// rdv-service/models/RendezVous.js
const mongoose = require('mongoose');

const rendezVousSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  date:      { type: String, required: true },
  createdAt: { type: Date,   default: Date.now }
});

module.exports = mongoose.model('RendezVous', rendezVousSchema);
