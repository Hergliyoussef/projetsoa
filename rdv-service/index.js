// rdv-service/index.js

// 1. Imports
const grpc         = require('@grpc/grpc-js');
const protoLoader  = require('@grpc/proto-loader');
const path         = require('path');
const { Kafka }    = require('kafkajs');
const mongoose     = require('mongoose');
const express      = require('express');

// 2. Modèle Mongoose
const rendezVousSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  date:      { type: String, required: true },
  createdAt: { type: Date,   default: Date.now }
});
const RendezVous = mongoose.model('RendezVous', rendezVousSchema);

// 3. Connexion MongoDB
mongoose.connect('mongodb://localhost:27017/microsante', {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connectée à microsante'))
.catch(err => console.error('❌ Erreur MongoDB', err));

// 4. Charger le .proto gRPC
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, '../proto/rdv.proto'),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const rdvProto = grpc.loadPackageDefinition(packageDefinition).rdv;

// 5. Configurer Kafka
const kafka    = new Kafka({ clientId: 'rdv-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();

// 6. Implémenter la méthode gRPC CreateRdv
const createRdv = async (call, callback) => {
  const { patientId, date } = call.request;

  try {
    // 6.a. Sauvegarder en MongoDB
    await RendezVous.create({ patientId, date });

    // 6.b. Envoyer l’événement sur Kafka
    await producer.connect();
    await producer.send({
      topic: 'rdv_created',
      messages: [{ value: JSON.stringify({ patientId, date }) }]
    });

    // 6.c. Répondre au client gRPC
    callback(null, { message: `Rendez-vous créé pour patient ${patientId}` });

  } catch (err) {
    console.error('❌ Erreur dans CreateRdv gRPC:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Échec création du rendez-vous'
    });
  }
};

// 7. Démarrer le serveur gRPC (sans appeler explicitement start())
const grpcServer = new grpc.Server();
grpcServer.addService(rdvProto.RdvService.service, { CreateRdv: createRdv });
grpcServer.bindAsync(
  '0.0.0.0:50051',
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log('🚀 rdv-service gRPC en écoute sur le port 50051');
    // grpcServer.start();  // plus nécessaire
  }
);

// 8. (Optionnel) Exposer une API REST pour lister les RDV
const httpApp = express();
httpApp.use(express.json());

httpApp.get('/rdvs', async (req, res) => {
  try {
    const all = await RendezVous.find().sort({ createdAt: -1 });
    res.json(all);
  } catch (err) {
    console.error('❌ Erreur GET /rdvs:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Lancer le serveur HTTP
httpApp.listen(4000, () => {
  console.log('📋 rdv-service HTTP en écoute sur http://localhost:4000');
});
