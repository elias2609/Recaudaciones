// netlify/functions/server.js
const serverless = require('serverless-http')
const express   = require('express')
const cors      = require('cors')
const { Sequelize, DataTypes } = require('sequelize')
const path      = require('path')

const app = express()
app.use(cors(), express.json())

// ---- Configura tu BD (ojo con persistencia en Functions) ----
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join('/tmp', 'data.sqlite') // efímero
})

// Modelos
const Fund = sequelize.define('Fund', { /* … */ })
const Donation = sequelize.define('Donation', { /* … */ })
Fund.hasMany(Donation)
Donation.belongsTo(Fund)

// Sincroniza al inicio
sequelize.sync({ alter: true })

// Rutas API
app.get('/api/fund', async (_req, res) => {
  const fund = await Fund.findByPk(1, { include: Donation })
  // … lógica igual que antes …
  res.json({ /* fund, donations, accounts */ })
})

app.post('/api/donations', async (req, res) => {
  // … lógica protegida con x-admin-secret …
})

// Exporta el handler para Netlify
module.exports.handler = serverless(app)