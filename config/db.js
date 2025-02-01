const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  const maskedUri = config.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@');
  console.log('Attempting to connect to MongoDB at:', maskedUri);

  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 10000; // 10 seconds

const connectWithRetry = async (retryCount = 0) => {
  try {
    if (!config.mongoUri) {
      throw new Error('MongoDB URI no está configurado en las variables de entorno');
    }

    console.log(`Intento de conexión ${retryCount + 1} de ${MAX_RETRIES}...`);
    console.log('Configuración de conexión:');
    console.log('- Tiempo máximo de espera para selección de servidor: 30 segundos');
    console.log('- Tiempo máximo de espera para operaciones: 60 segundos');
    console.log('- Tiempo máximo de espera para conexión: 30 segundos');
    console.log('- Frecuencia de heartbeat: 2 segundos');

    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 2000,
      retryWrites: true,
      w: 'majority'
    });

    console.log('✅ MongoDB conectado exitosamente');
    console.log('Base de datos:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);

    const state = mongoose.connection.readyState;
    console.log('Estado de la conexión:', 
      state === 0 ? 'Desconectado' :
      state === 1 ? 'Conectado' :
      state === 2 ? 'Conectando' :
      state === 3 ? 'Desconectando' : 'Estado desconocido'
    );

    // Configurar event listeners para monitorear la conexión
    mongoose.connection.on('disconnected', () => {
      console.log('❌ MongoDB desconectado - Intentando reconectar...');
      setTimeout(() => connectWithRetry(0), RETRY_INTERVAL);
    });

    mongoose.connection.on('error', (err) => {
      console.error('Error en la conexión de MongoDB:', err);
    });

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
      console.error('5. No hay problemas de red o firewalls bloqueando la conexión');
    }

    if (retryCount < MAX_RETRIES) {
      console.log(`Reintentando conexión en ${RETRY_INTERVAL/1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      return connectWithRetry(retryCount + 1);
    } else {
      console.error(`Se alcanzó el máximo número de intentos (${MAX_RETRIES}). Terminando proceso.`);
      process.exit(1);
    }
  }
};

module.exports = () => connectWithRetry(0);