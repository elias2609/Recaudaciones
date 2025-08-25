// netlify/functions/server.js

// Carga .env en development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express   = require('express')
const cors      = require('cors')
const helmet    = require('helmet')
const morgan    = require('morgan')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const { Sequelize, DataTypes } = require('sequelize')
const path      = require('path')
const serverless = require('serverless-http')

const {
  NODE_ENV = 'production',
  ADMIN_SECRET,
  DATABASE_URL,
  ALLOWED_ORIGINS = ''
} = process.env

// Inicializa Express
const app = express()

// --- Seguridad y performance ---
app.use(helmet())            // cabeceras seguras
app.use(compression())       // gzip
app.use(express.json({ limit: '100kb' }))

// Rate limit: 100 requests / 15 minutos
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde' }
}))

// CORS: solo tu frontend en prod, o cualquier en dev
const origins = NODE_ENV === 'production'
  ? ALLOWED_ORIGINS.split(',') // define en Netlify env VAR como "https://tu-dominio.com"
  : ['*']
app.use(cors({
  origin: origins,
  methods: ['GET','POST','DELETE','PUT','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','x-admin-secret']
}))

// Logging solo en dev
if (NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// Healthcheck
app.get('/', (_req, res) => res.json({ status: 'ok', env: NODE_ENV }))

// --- Configuración de base de datos ---
let sequelize
if (NODE_ENV === 'production') {
  if (!DATABASE_URL) {
    throw new Error('Missing DATABASE_URL in production')
  }
  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    },
    logging: false
  })
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.resolve(__dirname, '../../data.sqlite'),
    logging: console.log
  })
}

// --- Modelos ---
const Fund = sequelize.define('Fund', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name:         { type: DataTypes.STRING,  allowNull: false },
  targetAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  description:  { type: DataTypes.TEXT,    allowNull: true }
}, { tableName: 'funds', timestamps: true })

const Donation = sequelize.define('Donation', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  donorName: { type: DataTypes.STRING,  allowNull: false },
  amount:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'donations', timestamps: true })

Fund.hasMany(Donation, { as: 'donations', foreignKey: 'FundId' })
Donation.belongsTo(Fund,  { foreignKey: 'FundId' })

// --- Sincronización y seed solo en dev ---
async function initDb() {
  if (NODE_ENV !== 'production') {
    await sequelize.sync({ alter: true })
    console.log('📦 DB (dev) sincronizada con alter')
    const [fund] = await Fund.findOrCreate({
      where: { id: 1 },
      defaults: {
        name:         'Recaudación de Fondos',
        targetAmount: 2000,
        description:  'Seed inicial'
      }
    })
    console.log('🌱 Dev seed fund:', fund.toJSON())
  }
}
const dbReady = initDb().catch(err => {
  console.error('❌ Error inicializando DB:', err)
  process.exit(1)
})

// --- Middleware para asegurar DB lista ---
app.use(async (_req, _res, next) => {
  await dbReady
  next()
})

// --- Rutas de la API ---

// Login admin
app.post('/api/admin/login', (req, res) => {
  const { secret } = req.body
  if (!secret)        return res.status(400).json({ error: 'Secreto requerido' })
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  return res.json({ message: 'Autenticación exitosa' })
})

// Obtener fondo + donaciones
app.get('/api/fund', async (req, res) => {
  // deshabilitar caché
  res.set('Cache-Control','no-store, no-cache, must-revalidate')
  const fund = await Fund.findByPk(1, {
    include: { model: Donation, as: 'donations' }
  })
  if (!fund) return res.status(404).json({ error: 'Fondo no encontrado' })

  const totalRaised = fund.donations.reduce((a,b) => a + b.amount, 0)
  const remaining   = fund.targetAmount - totalRaised

  return res.json({
    fund: {
      id: fund.id,
      name: fund.name,
      description: fund.description,
      targetAmount: fund.targetAmount
    },
    donations: fund.donations,
    account: { totalRaised, remaining }
  })
})

// Crear donación
app.post('/api/donations', async (req, res) => {
  if (req.header('x-admin-secret') !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  const { fundId, donorName, amount } = req.body
  if (!fundId || !donorName || !amount) {
    return res.status(400).json({ error: 'Campos inválidos' })
  }
  const fund = await Fund.findByPk(fundId)
  if (!fund) return res.status(404).json({ error: 'Fondo no existe' })
  const donation = await Donation.create({ FundId: fundId, donorName, amount })
  return res.status(201).json({ donation })
})

// Borrar donación
app.delete('/api/donations/:id', async (req, res) => {
  if (req.header('x-admin-secret') !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  const id = parseInt(req.params.id, 10)
  if (!id) return res.status(400).json({ error: 'ID inválido' })

  const donation = await Donation.findByPk(id)
  if (!donation) return res.status(404).json({ error: 'No existe donación' })
  await donation.destroy()
  return res.json({ message: 'Donación eliminada' })
})

// Handler global de errores
app.use((err, _req, res, _next) => {
  console.error('🚨 Error no capturado:', err)
  res.status(500).json({ error: 'Falla crítica en el servidor' })
})

// --- Serverless export ---
const handler = serverless(app, { basePath: '/.netlify/functions/server' })
module.exports.handler = async (event, context) => {
  // recorta el prefijo Netlify
  if (event.path.startsWith('/.netlify/functions/server')) {
    event.path = event.path.replace('/.netlify/functions/server', '') || '/'
  }
  return handler(event, context)
}