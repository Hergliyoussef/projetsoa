const { Kafka } = require('kafkajs');

const kafka    = new Kafka({ clientId: 'notif', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'notif-group' });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'rdv_created', fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const { patientId, date } = JSON.parse(message.value.toString());
      console.log(`🔔 Notification: Rdv confirmé pour ${patientId} le ${date}`);
    }
  });
}

run().catch(console.error);
