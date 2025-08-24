// server.js
require('dotenv').config(); // carga ADMIN_SECRET desde .env

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa SQLite en data.sqlite (en la misma carpeta)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'data.sqlite'),
  logging: false
});

// Define los modelos
const Fund = sequelize.define('Fund', {
  title: { type: DataTypes.STRING, allowNull: false },
  photoUrl: { type: DataTypes.STRING, allowNull: false },
  goalAmount: { type: DataTypes.FLOAT, allowNull: false }
});

const Donation = sequelize.define('Donation', {
  donorName: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.FLOAT, allowNull: false }
});

const Account = sequelize.define('Account', {
  bankName: { type: DataTypes.STRING, allowNull: false },
  accountNumber: { type: DataTypes.STRING, allowNull: false },
  beneficiaryName: { type: DataTypes.STRING, allowNull: false }
});

// Relaciones
Fund.hasMany(Donation, { onDelete: 'CASCADE' });
Donation.belongsTo(Fund);

// Sincroniza y seed antes de arrancar Express
; (async () => {
  try {
    await sequelize.sync({ alter: true });

    // Crea el registro Fund[id=1] si no existe
    await Fund.findOrCreate({
      where: { id: 1 },
      defaults: {
        title: 'Recaudación de Fondos',
        photoUrl: 'https://via.placeholder.com/600x200',
        goalAmount: 2000
      }
    });

    // Crea la cuenta[id=1] si no existe
    await Account.findOrCreate({
      where: { id: 1 },
      defaults: {
        bankName: 'Banco Ejemplo',
        accountNumber: '1234-5678-9012-3456',
        beneficiaryName: 'Organización A'
      }
    });

    // Arranca el servidor cuando la BD ya esté lista
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`API escuchando en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error inicializando la BD o servidor:', err);
    process.exit(1);
  }
})();

// Rutas API

// GET /api/fund
app.get('/api/fund', async (req, res) => {
  try {
    const fund = await Fund.findByPk(1, { include: Donation });
    if (!fund) {
      return res.status(404).json({ error: 'Recaudación no encontrada' });
    }

    const donations = fund.Donations || [];
    const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
    const accounts = await Account.findAll();

    return res.json({
      fund: {
        title: fund.title,
        photoUrl: fund.photoUrl,
        goalAmount: fund.goalAmount,
        totalDonated
      },
      donations: fund.Donations.map(d => ({
        id: d.id,          // <–– añade esta línea
        donorName: d.donorName,
        amount: d.amount
      })),


      accounts
    });
  } catch (err) {
    console.error('Error en GET /api/fund:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { secret } = req.body;
  if (secret === process.env.ADMIN_SECRET) {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Secreto inválido' });
});

// POST /api/donations (protegida con x-admin-secret)
app.post('/api/donations', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { donorName, amount } = req.body;
    const donation = await Donation.create({
      donorName,
      amount,
      FundId: 1
    });
    return res.status(201).json(donation);
  } catch (err) {
    console.error('Error en POST /api/donations:', err);
    res.status(400).json({ error: 'Datos de donación inválidos' });
  }
});
// DELETE /api/donations/:id  — protegido con x-admin-secret
app.delete('/api/donations/:id', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { id } = req.params;
  const donation = await Donation.findByPk(id);
  if (!donation) {
    return res.status(404).json({ error: 'Donación no encontrada' });
  }

  await donation.destroy();
  // 204 No Content es apropiado para DELETE exitosos sin cuerpo de respuesta
  res.status(204).send();
});

//  Sirve el build estático de Vue (carpeta dist/)
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback para rutas de cliente: siempre devuelve index.html
// Usando app.use sin path, evita path-to-regexp en cadenas
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});