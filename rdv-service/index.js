// rdv-service/index.js

const grpc        = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path        = require('path');
const { Kafka }   = require('kafkajs');
const mongoose    = require('mongoose');
const express     = require('express');

// 1) Connexion MongoDB
mongoose.connect('mongodb://localhost:27017/microsante', {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB (RDV) connectée'))
.catch(err => console.error('❌ Erreur MongoDB (RDV) :', err));

const RendezVous = require('./models/RendezVous');

// 2) Chargement du gRPC proto
const packageDef = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'rdv.proto'),
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
);
const pkg = grpc.loadPackageDefinition(packageDef);
console.log('gRPC packages disponibles (RDV) :', Object.keys(pkg));  // ['rdv']
const rdvProto = pkg.rdv;

// 3) Kafka producer (connexion unique)
const kafka    = new Kafka({ clientId: 'rdv-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();
producer.connect()
  .then(() => console.log('✅ Kafka Producer connecté'))
  .catch(err => console.error('❌ Kafka Producer erreur :', err));

// 4) Implémentation de CreateRdv (gRPC)
async function CreateRdv(call, callback) {
  const { patientId, date } = call.request;
  try {
    // Persist to MongoDB
    await RendezVous.create({ patientId, date });

    // Publish to Kafka
    await producer.send({
      topic: 'rdv_created',
      messages: [{ value: JSON.stringify({ patientId, date }) }]
    });

    callback(null, { message: `Rendez-vous créé pour patient ${patientId}` });
  } catch (err) {
    console.error('❌ Erreur CreateRdv :', err);
    callback({ code: grpc.status.INTERNAL, message: err.message });
  }
}

// 5) Démarrage du serveur gRPC
const grpcServer = new grpc.Server();
grpcServer.addService(rdvProto.RdvService.service, { CreateRdv });
grpcServer.bindAsync(
  '0.0.0.0:50051',
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error('❌ Bind gRPC error :', err);
      return;
    }
    grpcServer.start();
    console.log(`🚀 RDV Service gRPC en écoute sur le port ${port}`);
  }
);

// 6) HTTP REST pour lister les RDV
const app = express();
app.use(express.json());

app.get('/rdvs', async (req, res) => {
  try {
    const all = await RendezVous.find().sort({ createdAt: -1 });
    // pretty-print JSON with 2-space indent
    res
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(all, null, 2));
  } catch (err) {
    console.error('❌ Erreur GET /rdvs :', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(4000, () => {
  console.log('📋 RDV HTTP sur port 4000');
});
