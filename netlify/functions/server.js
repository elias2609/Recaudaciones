// netlify/functions/server.js

const serverless = require('serverless-http')
const express   = require('express')
const cors      = require('cors')
const { Sequelize, DataTypes } = require('sequelize')
const path      = require('path')

// Carga la variable de secreto para administradores
// En Netlify, configúrala en Site settings → Build & deploy → Environment
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'cambiala'

// Inicializa Express
const app = express()
app.use(cors(), express.json())

// Inicializa Sequelize apuntando a /tmp/data.sqlite (efímero)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join('/tmp', 'data.sqlite'),
  logging: false
})

// Define los modelos
const Fund = sequelize.define('Fund', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  targetAmount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
})

const Donation = sequelize.define('Donation', {
  donorName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
})

Fund.hasMany(Donation, { as: 'donations' })
Donation.belongsTo(Fund, { foreignKey: 'FundId' })

// Sincronización (promesa)
const syncPromise = sequelize.sync({ alter: true })
  .then(() => console.log('📦 DB sincronizada'))
  .catch(err => console.error('❌ Error sincronizando DB:', err))

// GET /api/fund?id=1
app.get('/api/fund', async (req, res) => {
  try {
    // Asegura que la BD esté lista
    await syncPromise

    const id = parseInt(req.query.id || '1', 10)
    const fund = await Fund.findByPk(id, {
      include: { model: Donation, as: 'donations' }
    })

    if (!fund) {
      return res.status(404).json({ error: 'Fondo no encontrado' })
    }

    // Calcula totales
    const totalRaised = fund.donations.reduce((sum, d) => sum + d.amount, 0)
    const remaining   = fund.targetAmount - totalRaised

    return res.json({
      fund: {
        id: fund.id,
        name: fund.name,
        description: fund.description,
        targetAmount: fund.targetAmount
      },
      donations: fund.donations,
      account: {
        totalRaised,
        remaining
      }
    })
  } catch (error) {
    console.error('❌ Error en GET /api/fund:', error)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// POST /api/donations
app.post('/api/donations', async (req, res) => {
  try {
    await syncPromise

    // Verifica secreto de administrador
    const secret = req.header('x-admin-secret')
    if (secret !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'No autorizado' })
    }

    const { fundId, donorName, amount } = req.body
    if (!fundId || !donorName || !amount) {
      return res.status(400).json({ error: 'Campos incompletos' })
    }

    // Verifica que el fondo exista
    const fund = await Fund.findByPk(fundId)
    if (!fund) {
      return res.status(404).json({ error: 'Fondo no existe' })
    }

    // Crea la donación
    const donation = await Donation.create({ FundId: fundId, donorName, amount })
    console.log('✅ Donación creada:', donation.toJSON())

    return res.status(201).json({ donation })
  } catch (error) {
    console.error('❌ Error en POST /api/donations:', error)
    return res.status(500).json({ error: 'Error interno al crear donación' })
  }
})

// Middleware global de errores (por si acaso)
app.use((err, _req, res, _next) => {
  console.error('🚨 Error no capturado:', err)
  return res.status(500).json({ error: 'Falla crítica en el servidor' })
})

// Exporta el handler para Netlify
module.exports.handler = serverless(app)