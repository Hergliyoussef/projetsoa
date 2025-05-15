// patient-service/index.js
const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');
const mongoose    = require('mongoose');

// 1) Connexion MongoDB
mongoose.connect('mongodb://localhost:27017/microsante')
  .then(() => console.log('✅ MongoDB (Patient) connectée'))
  .catch(err => console.error('❌ MongoDB (Patient) error', err));

const Patient = require('./models/Patient');

// 2) Charger le .proto avec le bon chemin
const packageDef = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'patient.proto'),
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
);

// 3) Charger la définition et inspecter
const pkg = grpc.loadPackageDefinition(packageDef);
console.log('gRPC packages disponibles:', Object.keys(pkg)); 
// ==> tu dois voir ["patient"]

const patientProto = pkg.patient;
if (!patientProto || !patientProto.PatientService) {
  console.error('❌ patientProto.PatientService introuvable ! Vérifie ton .proto et ton chemin.');
  process.exit(1);
}

// 4) Implémenter les méthodes RPC
const CreatePatient = async (call, callback) => {
  const { id, name, age } = call.request;
  try {
    let p = await Patient.findOne({ id });
    if (!p) p = await Patient.create({ id, name, age });
    callback(null, { id: p.id, name: p.name, age: p.age, message: 'Patient créé' });
  } catch (e) {
    callback({ code: grpc.status.INTERNAL, message: e.message });
  }
};

const GetPatient = async (call, callback) => {
  try {
    const p = await Patient.findOne({ id: call.request.id });
    if (!p) return callback({ code: grpc.status.NOT_FOUND, message: 'Patient non trouvé' });
    callback(null, { id: p.id, name: p.name, age: p.age, message: 'OK' });
  } catch (e) {
    callback({ code: grpc.status.INTERNAL, message: e.message });
  }
};

// 5) Démarrer le serveur gRPC
const server = new grpc.Server();
server.addService(patientProto.PatientService.service, { CreatePatient, GetPatient });
server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), () => {
  console.log('🚀 Patient Service gRPC en écoute sur le port 50052');
});
