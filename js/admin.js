const ADMIN_PASS = "nono3232";

let localProducts = [];
let currentImagesBase64 = [];
let editingProductId = null;

async function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    for (const file of files) {
        const base64 = await readFileAsBase64(file);
        currentImagesBase64.push(base64);
    }
    renderImagePreviews();
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

function renderImagePreviews() {
    const container = document.getElementById('imagePreviewContainer');
    if(!container) return;
    container.innerHTML = currentImagesBase64.map((src, i) => `
        <div style="position:relative; display:inline-block;">
            <img src="${src}" style="max-width:100px; max-height:100px; object-fit:cover; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">
            <button onclick="removeImage(event, ${i})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:10px; display:flex; align-items:center; justify-content:center;">X</button>
        </div>
    `).join('');
}

window.removeImage = function(event, index) {
    event.preventDefault();
    currentImagesBase64.splice(index, 1);
    renderImagePreviews();
}

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

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        localProducts = await response.json();
        renderAdminList();
    } catch(e) {
        console.error("Error cargando productos", e);
    }
}

function toggleAddForm() {
    const form = document.getElementById('addFormContainer');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

window.saveProductAction = function() {
    const name = document.getElementById('newName').value;
    const price = parseInt(document.getElementById('newPrice').value);
    const season = document.getElementById('newSeason').value;
    const publicImageUrl = document.getElementById('publicImageUrl').value.trim();
    
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox:checked');
    const category = Array.from(categoryCheckboxes).map(cb => cb.value);

    if (!name || isNaN(price) || !season || category.length === 0) {
        alert("Por favor completa todos los campos y selecciona al menos una categoría.");
        return;
    }

    let imgs = currentImagesBase64.length > 0 ? [...currentImagesBase64] : [];
    if (imgs.length === 0) {
        let defaultImg = "assets/arg_retro.png";
        const nameLow = name.toLowerCase();
        if (nameLow.includes("river")) defaultImg = "assets/river_retro.png";
        else if (nameLow.includes("boca")) defaultImg = "assets/boca_retro.png";
        imgs.push(defaultImg);
    }

    const payload = {
        name,
        price,
        season,
        category,
        publicImageUrl,
        stock: {
            S: parseInt(document.getElementById('stockS').value) || 0,
            M: parseInt(document.getElementById('stockM').value) || 0,
            L: parseInt(document.getElementById('stockL').value) || 0,
            XL: parseInt(document.getElementById('stockXL').value) || 0,
            XXL: parseInt(document.getElementById('stockXXL').value) || 0
        },
        images: imgs // Support for array of images
    };

    if (editingProductId) {
        fetch(`/api/products/${editingProductId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(() => {
            alert("¡Producto actualizado exitosamente!");
            cancelEdit();
            loadProducts();
        });
    } else {
        fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(() => {
            alert("¡Prenda cargada al catálogo interactivo!");
            cancelEdit();
            loadProducts();
        });
    }
}

window.cancelEdit = function() {
    editingProductId = null;
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    if(saveBtn) saveBtn.textContent = 'Guardar Producto Público';
    if(cancelBtn) cancelBtn.style.display = 'none';
    
    document.getElementById('newName').value = '';
    document.getElementById('newPrice').value = '';
    document.getElementById('newSeason').value = '';
    document.getElementById('newImage').value = '';
    document.getElementById('publicImageUrl').value = '';
    ['stockS','stockM','stockL','stockXL','stockXXL'].forEach(id => document.getElementById(id).value = 0);
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    currentImagesBase64 = [];
    renderImagePreviews();
    
    const form = document.getElementById('addFormContainer');
    if(form.style.display !== 'none') toggleAddForm();
}

window.initEdit = function(id) {
    const p = localProducts.find(x => x.id === id);
    if(!p) return;
    
    editingProductId = id;
    document.getElementById('newName').value = p.name;
    document.getElementById('newPrice').value = p.price;
    document.getElementById('newSeason').value = p.season;
    document.getElementById('publicImageUrl').value = p.publicImageUrl || '';
    
    document.getElementById('stockS').value = p.stock?.S || 0;
    document.getElementById('stockM').value = p.stock?.M || 0;
    document.getElementById('stockL').value = p.stock?.L || 0;
    document.getElementById('stockXL').value = p.stock?.XL || 0;
    document.getElementById('stockXXL').value = p.stock?.XXL || 0;
    
    document.querySelectorAll('.category-checkbox').forEach(cb => {
        cb.checked = Array.isArray(p.category) ? p.category.includes(cb.value) : p.category === cb.value;
    });

    currentImagesBase64 = p.images ? [...p.images] : (p.image ? [p.image] : []);
    renderImagePreviews();

    document.getElementById('saveBtn').textContent = 'Guardar Cambios';
    document.getElementById('cancelBtn').style.display = 'block';

    const form = document.getElementById('addFormContainer');
    if (form.style.display === 'none') {
        toggleAddForm();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteProduct(id) {
    if(confirm("¿Estás seguro de que quieres eliminar esta prenda de tu tienda permanentemente?")) {
        fetch(`/api/products/${id}`, { method: 'DELETE' })
            .then(() => loadProducts());
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
                <span>[${Array.isArray(p.category) ? p.category.join(', ') : p.category}]</span>
            </div>
            <div>
                <button class="btn-primary" style="margin-right:10px; padding:0.8rem 1.5rem;" onclick="initEdit(${p.id})">Editar</button>
                <button class="btn-danger" onclick="deleteProduct(${p.id})">Eliminar</button>
            </div>
        </div>
    `).join('');
}
