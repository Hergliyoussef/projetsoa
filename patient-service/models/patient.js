const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  age:       { type: Number, required: true },
  createdAt: { type: Date,   default: Date.now }
});

module.exports = mongoose.model('Patient', patientSchema);
