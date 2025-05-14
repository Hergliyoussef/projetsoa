const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// 1. Charger le fichier .proto
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, '../proto/rdv.proto'),
  { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true }
);
const rdvProto = grpc.loadPackageDefinition(packageDefinition).rdv;

// 2. Créer le client gRPC vers rdv-service
const rdvClient = new rdvProto.RdvService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// 3. Initialiser Express
const app = express();
// n’appliquer express.json() **que** sur la route /rdv
app.use('/rdv', express.json());

// 4. Route REST
app.post('/rdv', (req, res) => {
  const { patientId, date } = req.body;
  rdvClient.CreateRdv({ patientId, date }, (err, response) => {
    if (err) {
      console.error('gRPC error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

// 5. Schéma GraphQL
const typeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    createRdv(patientId: String!, date: String!): String!
  }
`;

// 6. Résolveurs GraphQL
const resolvers = {
  Mutation: {
    createRdv: async (_, { patientId, date }) => {
      return new Promise((resolve, reject) => {
        rdvClient.CreateRdv({ patientId, date }, (err, response) => {
          if (err) {
            console.error('gRPC error:', err);
            return reject(new Error('Échec création RDV'));
          }
          resolve(response.message);
        });
      });
    }
  }
};

// 7. Lancer Apollo Server avec introspection et playground
async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    playground: true
  });

  await server.start();
  server.applyMiddleware({ app });  // montera le routeur GraphQL sur /graphql

  app.listen(3000, () => {
    console.log('✅ API Gateway lancé sur http://localhost:3000');
    console.log('➡️  Explorer GraphQL : http://localhost:3000/graphql');
  });
}

startServer();
