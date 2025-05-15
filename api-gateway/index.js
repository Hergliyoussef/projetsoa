const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Charger les .proto partagés
const rdvDef = protoLoader.loadSync(path.join(__dirname, '../proto/rdv.proto'));
const rdvProto = grpc.loadPackageDefinition(rdvDef).rdv;
const patientDef = protoLoader.loadSync(path.join(__dirname, '../proto/patient.proto'));
const patientProto = grpc.loadPackageDefinition(patientDef).patient;

// Instancier les clients gRPC
const rdvClient = new rdvProto.RdvService('localhost:50051', grpc.credentials.createInsecure());
const patientClient = new patientProto.PatientService('localhost:50052', grpc.credentials.createInsecure());

const app = express();
// parsing JSON uniquement sur les routes REST
app.use('/rdv', express.json());
app.use('/patient', express.json());

// REST: créer un patient
app.post('/patient', (req, res) => {
  patientClient.CreatePatient(req.body, (err, resp) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(resp);
  });
});
// REST: récupérer un patient
app.get('/patient/:id', (req, res) => {
  patientClient.GetPatient({ id: req.params.id }, (err, resp) => {
    if (err) return res.status(404).json({ error: err.message });
    res.json(resp);
  });
});
// REST: créer un RDV
app.post('/rdv', (req, res) => {
  rdvClient.CreateRdv(req.body, (err, resp) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(resp);
  });
});

// GraphQL schema
const typeDefs = gql`
  type Patient { id: String!, name: String!, age: Int!, message: String }
  type Rdv     { message: String! }

  type Query {
    getPatient(id: String!): Patient
  }
  type Mutation {
    createPatient(id: String!, name: String!, age: Int!): Patient
    createRdv(patientId: String!, date: String!): String
  }
`;

// GraphQL resolvers
const resolvers = {
  Query: {
    getPatient: (_, { id }) =>
      new Promise((resolve, reject) =>
        patientClient.GetPatient({ id }, (err, resp) =>
          err ? reject(err) : resolve(resp)
        )
      )
  },
  Mutation: {
    createPatient: (_, args) =>
      new Promise((resolve, reject) =>
        patientClient.CreatePatient(args, (err, resp) =>
          err ? reject(err) : resolve(resp)
        )
      ),
    createRdv: (_, { patientId, date }) =>
      new Promise((resolve, reject) =>
        rdvClient.CreateRdv({ patientId, date }, (err, resp) =>
          err ? reject(err) : resolve(resp.message)
        )
      )
  }
};

async function start() {
  const server = new ApolloServer({ typeDefs, resolvers, introspection: true, playground: true });
  await server.start();
  server.applyMiddleware({ app });
  app.listen(3000, () => {
    console.log('API Gateway lancé sur http://localhost:3000');
    console.log('GraphQL disponible sur http://localhost:3000/graphql');
  });
}

start();
