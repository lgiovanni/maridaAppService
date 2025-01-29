const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    if (!config.mongoUri) {
      throw new Error('MongoDB URI no está configurado en las variables de entorno');
    }

    console.log('Intentando conectar a MongoDB...');
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('MongoDB conectado exitosamente');
    console.log('Base de datos:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);
  } catch (error) {
    console.error('Error detallado conectando a MongoDB:');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Stack:', error.stack);
    
    if (error.name === 'MongooseServerSelectionError') {
      console.error('No se pudo conectar al servidor de MongoDB. Verifique:');
      console.error('1. La URL de conexión es correcta');
      console.error('2. Las credenciales son correctas');
      console.error('3. El servidor de MongoDB está accesible');
      console.error('4. La IP de Vercel está en la lista blanca de MongoDB Atlas');
    }

    process.exit(1);
  }
};

module.exports = connectDB;