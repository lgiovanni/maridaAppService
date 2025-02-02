require('newrelic');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('../config/config');
const connectDB = require('../config/db');
const errorMiddleware = require('../middlewares/error.middleware');

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Configure body parser before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route handler
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MaridaApp API' });
});

// Conectar a la base de datos
connectDB();

// Rutas
app.use('/api/auth', require('../routes/auth.routes'));
app.use('/api/social-auth', require('../routes/social-auth.routes'));
app.use('/api/rooms', require('../routes/room.routes'));
app.use('/api/posts', require('../routes/post.routes'));

// Middleware de manejo de errores
app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`Servidor corriendo en el puerto ${config.port}`);
});