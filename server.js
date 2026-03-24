const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Permitir base64 grandes
app.use(express.static(path.join(__dirname))); // Servir la web estática

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

function getProducts() {
    try {
        const data = fs.readFileSync(DATA_FILE);
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

function saveProducts(products) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

app.get('/api/products', (req, res) => {
    res.json(getProducts());
});

app.post('/api/products', (req, res) => {
    const products = getProducts();
    const newProduct = req.body;
    newProduct.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.unshift(newProduct);
    saveProducts(products);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
    const products = getProducts();
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);
    
    if (index !== -1) {
        products[index] = { ...products[index], ...req.body, id };
        saveProducts(products);
        res.json(products[index]);
    } else {
        res.status(404).json({ error: 'No encontrado' });
    }
});

app.delete('/api/products/:id', (req, res) => {
    let products = getProducts();
    const id = parseInt(req.params.id);
    products = products.filter(p => p.id !== id);
    saveProducts(products);
    res.status(204).send();
});

app.listen(PORT, () => {
    console.log(`API y Web corriendo en http://localhost:${PORT}`);
});
