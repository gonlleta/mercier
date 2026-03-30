require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Permitir base64 grandes
app.use(express.static(path.join(__dirname, '..', 'public'))); // Servir la web estática

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (!process.env.MONGODB_URI) {
    console.log('No MONGODB_URI provided. Database operations will fail.');
    return;
  }
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, 
    };
    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

app.use('/api', async (req, res, next) => {
    try {
        await dbConnect();
        next();
    } catch (e) {
        console.error('Error in DB Connect Middleware:', e);
        res.status(500).json({ error: 'Falla al conectar a la base de datos (Serverless Timeout). Revisa MONGODB_URI o IP.' });
    }
});

const productSchema = new mongoose.Schema({
    id: Number
}, { strict: false, versionKey: false });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

app.get('/api/products', async (req, res) => {
    try {
        // En MongoDB localizamos los productos y los devolvemos.
        const products = await Product.find().sort({ id: -1 });
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const productData = req.body;
        if (!productData.id) {
            const lastProduct = await Product.findOne().sort({ id: -1 });
            productData.id = lastProduct && lastProduct.id ? lastProduct.id + 1 : 1;
        }
        const newProduct = new Product(productData);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updated = await Product.findOneAndUpdate({ id }, req.body, { new: true });
        if (updated) {
            res.json(updated);
        } else {
            res.status(404).json({ error: 'No encontrado' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await Product.findOneAndDelete({ id });
        res.status(204).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// En entornos que no sean de producción, o si Vercel no está definido, arrancar el servidor
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`API y Web corriendo en http://localhost:${PORT}`);
    });
}

// Exportar Express para módulos serverless de Vercel
module.exports = app;
