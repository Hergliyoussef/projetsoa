MicroSanté

Plateforme distribuée de gestion de patients et de rendez-vous médicaux, basée sur une architecture microservices utilisant :

gRPC (synchrone inter-services)

Kafka (asynchrone pour notifications)

REST & GraphQL (façade client via API Gateway)

MongoDB (stockage de chaque service)

Node.js (runtime)

📂 Arborescence

microsante/
├── api-gateway/          # REST + GraphQL (Express + Apollo)
│   ├── index.js
│   └── package.json
│
├── patient-service/      # gRPC Patient+REST+GraphQL+ MongoDB
│   ├── proto/
│   │   └── patient.proto
│   ├── models/
│   │   └── Patient.js
│   ├── index.js
│   └── package.json
│
├── rdv-service/          # gRPC RDV + MongoDB + Kafka producer + REST listing
│   ├── proto/
│   │   └── rdv.proto
│   ├── models/
│   │   └── RendezVous.js
│   ├── index.js
│   └── package.json
│
├── notification-service/ # Kafka 
│   ├── index.js
│   └── package.json
│
├── proto/              
│   ├── patient.proto
│   └── rdv.proto
└── README.md          

🔧 Prérequis

Node.js ≥ 18

MongoDB local (ou Atlas) écoutant sur mongodb://localhost:27017

Apache Kafka & Zookeeper installés

🚀 Installation & démarrage

1. Démarrer MongoDB

mongod --dbpath /path/to/data/db

2. Démarrer Kafka & Zookeeper

# Zookeeper
cd /path/to/kafka
bin/zookeeper-server-start.sh config/zookeeper.properties

# Kafka
bin/kafka-server-start.sh config/server.properties

3. Créer le topic Kafka

bin/kafka-topics.sh --create \  
  --topic rdv_created \  
  --bootstrap-server localhost:9092 \  
  --partitions 1 \  
  --replication-factor 1

4. Installer les dépendances

Ouvre quatre terminaux, un par service :

# API Gateway
cd microsante/api-gateway
npm install

# Patient Service
cd ../patient-service
npm install

# RDV Service
cd ../rdv-service
npm install

# Notification Service
cd ../notification-service
npm install

5. Lancer les microservices

Toujours dans ces quatre terminaux :

# 1) Patient Service (gRPC 50052)
npm start

# 2) RDV Service (gRPC 50051 + HTTP 4000)
npm start

# 3) Notification Service (Kafka consumer)
npm start

# 4) API Gateway (REST/GraphQL sur 3000)
npm start

📋 Endpoints & exemples

API Gateway (port 3000)

POST /patient

{ "id":"p1","name":"Alice","age":30 }

**GET /patient/**id

POST /rdv

{ "patientId":"p1","date":"2025-06-01" }

GraphQL (/graphql)

mutation {
  createPatient(id:"p1", name:"Alice", age:30) { id name age message }
}
mutation {
  createRdv(patientId:"p1", date:"2025-06-01")
}
query {
  getPatient(id:"p1") { id name age message }
}

RDV Service HTTP (port 4000)

GET /rdvs : liste des rendez-vous en JSON.

🧪 Tests rapides

PatientService (localhost:50052)

CreatePatient

GetPatient

REST/GraphQL dans Postman

POST/GET sur /patient,/rdvs
