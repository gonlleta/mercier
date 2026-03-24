const ADMIN_PASS = "admin";

let localProducts = [];

function attemptLogin() {
    const pw = document.getElementById('adminPassword').value;
    if (pw === ADMIN_PASS) {
        document.getElementById('loginView').style.display = 'none';
        document.getElementById('adminView').style.display = 'block';
        loadProducts();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

function loadProducts() {
    const stored = localStorage.getItem('mercier_catalog_v2');
    if (stored) {
        localProducts = JSON.parse(stored);
    } else {
        localProducts = [];
    }
    renderAdminList();
}

function saveProducts() {
    localStorage.setItem('mercier_catalog_v2', JSON.stringify(localProducts));
    renderAdminList();
}

function toggleAddForm() {
    const form = document.getElementById('addFormContainer');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function addProduct() {
    const name = document.getElementById('newName').value;
    const price = parseInt(document.getElementById('newPrice').value);
    const season = document.getElementById('newSeason').value;
    const category = document.getElementById('newCategory').value;

    if (!name || isNaN(price) || !season) {
        alert("Por favor completa todos los campos correctamente.");
        return;
    }

    const newId = localProducts.length > 0 ? Math.max(...localProducts.map(p => p.id)) + 1 : 1;
    
    // Assign generic placeholder image 
    let imageSrc = "assets/arg_retro.png";
    const nameLow = name.toLowerCase();
    if (nameLow.includes("river")) imageSrc = "assets/river_retro.png";
    else if (nameLow.includes("boca")) imageSrc = "assets/boca_retro.png";

    localProducts.unshift({
        id: newId,
        name,
        price,
        season,
        category,
        image: imageSrc
    });

    saveProducts();
    
    // Reset form
    document.getElementById('newName').value = '';
    document.getElementById('newPrice').value = '';
    document.getElementById('newSeason').value = '';
    toggleAddForm();
    
    alert("¡Prenda cargada al catálogo interactivo!");
}

function deleteProduct(id) {
    if(confirm("¿Estás seguro de que quieres eliminar esta prenda de tu tienda permanentemente?")) {
        localProducts = localProducts.filter(p => p.id !== id);
        saveProducts();
    }
}

function renderAdminList() {
    const list = document.getElementById('adminProductList');
    if(localProducts.length === 0) {
        list.innerHTML = "<p style='text-align:center; color: var(--text-secondary); padding: 2rem;'>El catálogo está vacío.</p>";
        return;
    }
    
    list.innerHTML = localProducts.map(p => `
        <div class="admin-item">
            <div class="admin-item-info">
                <strong>${p.name}</strong> 
                <span>Temp: ${p.season}</span>
                <span>$${p.price.toLocaleString('es-AR')}</span>
                <span>[${p.category}]</span>
            </div>
            <button class="btn-danger" onclick="deleteProduct(${p.id})">Eliminar</button>
        </div>
    `).join('');
}
