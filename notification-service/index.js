const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'notif-service', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'notif-group' });

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'rdv_created', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const { patientId, date } = JSON.parse(message.value.toString());
      console.log(`Notification : Rendez-vous confirmé pour patient ${patientId} le ${date}`);
    }
  });
};

run().catch(console.error);

