// Product Data Management
const defaultProducts = [];

let products = [];
let cart = [];

let isAdminUnlocked = false;
let editingProdId = null;
let currentImagesBase64 = [];

window.checkAdminAccess = function() {
    if(isAdminUnlocked) {
        isAdminUnlocked = false; 
        alert("Modo edición desactivado.");
        renderProducts();
        return;
    }
    const pass = prompt("Acceso Administrador Oculto - Contraseña:");
    if(pass === "nono3232") {
        isAdminUnlocked = true;
        alert("Modo administrador completo activado.");
        renderProducts();
    } else if (pass !== null) {
        alert("Contraseña incorrecta.");
    }
}

window.handleImageUpload = async function(event) {
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
            <img src="${src}" style="max-width:80px; max-height:80px; object-fit:cover; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">
            <button onclick="removeImage(event, ${i})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer; font-size:10px; display:flex; align-items:center; justify-content:center;">X</button>
        </div>
    `).join('');
}

window.removeImage = function(event, index) {
    if (event) event.preventDefault();
    currentImagesBase64.splice(index, 1);
    renderImagePreviews();
}

window.openEditModal = function(id = null, event = null) {
    if (event) event.stopPropagation();
    
    document.getElementById('editModalOverlay').style.display = 'block';
    document.getElementById('editModal').style.display = 'block';
    
    editingProdId = id;
    
    // Reset Form
    document.getElementById('editName').value = '';
    document.getElementById('editPrice').value = '';
    document.getElementById('editSeason').value = '';
    document.getElementById('publicImageUrl').value = '';
    document.getElementById('editImage').value = '';
    ['stockS','stockM','stockL','stockXL','stockXXL'].forEach(s => document.getElementById(s).value = 0);
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    currentImagesBase64 = [];
    renderImagePreviews();
    
    const titleEl = document.getElementById('adminModalTitle');
    const delBtn = document.getElementById('deleteBtn');
    
    if (id) {
        // Edit Mode
        const p = products.find(x => x.id === id);
        if(!p) return;
        
        titleEl.innerHTML = '✏️ Editar Producto';
        delBtn.style.display = 'block';
        
        document.getElementById('editName').value = p.name;
        document.getElementById('editPrice').value = p.price;
        document.getElementById('editSeason').value = p.season;
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
    } else {
        // Add Mode
        titleEl.innerHTML = '✨ Añadir Nueva Prenda';
        delBtn.style.display = 'none';
        document.querySelector('.category-checkbox[value="novedades"]').checked = true;
    }
}

window.closeEditModal = function() {
    document.getElementById('editModalOverlay').style.display = 'none';
    document.getElementById('editModal').style.display = 'none';
    editingProdId = null;
}

window.deletePublicProduct = async function() {
    if(!editingProdId) return;
    if(confirm("¿Estás seguro de que deseas eliminar este producto permanentemente?")) {
        await fetch(`/api/products/${editingProdId}`, { method: 'DELETE' });
        closeEditModal();
        fetchProducts(); // Refresh
    }
}

window.savePublicEdit = async function() {
    const name = document.getElementById('editName').value;
    const price = parseInt(document.getElementById('editPrice').value);
    const season = document.getElementById('editSeason').value;
    const publicImageUrl = document.getElementById('publicImageUrl').value.trim();
    
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox:checked');
    const category = Array.from(categoryCheckboxes).map(cb => cb.value);

    if (!name || isNaN(price) || !season || category.length === 0) {
        alert("Por favor completa los campos principales y selecciona al menos una categoría.");
        return;
    }

    let imgs = currentImagesBase64.length > 0 ? [...currentImagesBase64] : [];
    if (imgs.length === 0) imgs.push("assets/arg_retro.png");

    let payload = {
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
        images: imgs
    };
    
    const url = editingProdId ? `/api/products/${editingProdId}` : '/api/products';
    const method = editingProdId ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            closeEditModal();
            fetchProducts();
            alert(editingProdId ? "¡Producto actualizado exitosamente!" : "¡Nueva prenda cargada al catálogo!");
        } else {
            alert("Error al guardar en el servidor.");
        }
    } catch(e) {
        alert("Error de conexión al guardar.");
    }
}

async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        products = await response.json();
        renderProducts();
    } catch (e) {
        console.error("Error cargando productos:", e);
    }
}

let currentCategory = 'all';

function renderProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    const titleContainer = document.querySelector('.section-title');
    if (titleContainer) {
        let addBtn = document.getElementById('addPublicBtn');
        if (isAdminUnlocked && !addBtn) {
            addBtn = document.createElement('button');
            addBtn.id = 'addPublicBtn';
            addBtn.className = 'btn-primary btn-gold';
            addBtn.innerHTML = '+ Nueva Camiseta';
            addBtn.style.padding = '0.5rem 1rem';
            addBtn.onclick = () => openEditModal(null, null);
            titleContainer.appendChild(addBtn);
        } else if (!isAdminUnlocked && addBtn) {
            addBtn.remove();
        }
    }
    
    const filtered = currentCategory === 'all' 
        ? products 
        : products.filter(p => {
            if (Array.isArray(p.category)) {
                return p.category.includes(currentCategory);
            }
            return p.category === currentCategory;
        });
        
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-secondary); grid-column:1/-1; text-align:center;">No hay productos en esta categoría.</p>';
        return;
    }
    
    grid.innerHTML = filtered.map((product, index) => `
        <article class="product-card stagger-item" style="animation-delay: ${0.2 + (index * 0.1)}s;">
            <div class="image-container" style="position: relative; cursor: pointer;" onclick="openProductModal(${product.id})">
                <img src="${product.images && product.images.length > 0 ? product.images[0] : (product.image || 'assets/arg_retro.png')}" alt="${product.name} Retro" class="product-image">
                <img src="assets/watermark.svg" class="watermark-overlay" alt="Mercier Watermark">
                ${isAdminUnlocked ? `<button onclick="openEditModal(${product.id}, event)" style="position:absolute; top:10px; right:10px; background:rgba(212,175,55,0.95); color:black; border:none; border-radius:4px; padding:6px 12px; cursor:pointer; font-weight:bold; z-index:10; font-size:0.8rem; box-shadow:0 4px 10px rgba(0,0,0,0.5);">✏️ Editar</button>` : ''}
            </div>
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${product.name}</h3>
                    <span class="product-price">$${product.price.toLocaleString('es-AR')}</span>
                </div>
                <span class="product-season">${product.season}</span>
                <button class="add-to-cart" onclick="openProductModal(${product.id})">Ver Detalles</button>
            </div>
        </article>
    `).join('');
}

window.filterCategory = function(category, event) {
    if (event) event.preventDefault();
    currentCategory = category;
    
    const titles = {
        'all': 'Todas las Prendas',
        'retro': 'Colección Retro',
        'selecciones': 'Selecciones Nacionales',
        'novedades': 'Lanzamientos y Novedades'
    };
    const titleEl = document.getElementById('catalogTitle');
    if (titleEl) titleEl.textContent = titles[category];
    
    renderProducts();
    
    const targetElement = document.querySelector('#catalogo');
    if (targetElement) {
        const navbarHeight = document.querySelector('.navbar').offsetHeight;
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight - 40;
        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    }
};

let currentModalProduct = null;
let currentSelectedSize = null;

window.openProductModal = function(id) {
    const product = products.find(p => p.id === id);
    if(!product) return;
    
    currentModalProduct = product;
    currentSelectedSize = null;
    
    document.getElementById('modalTitle').textContent = product.name;
    document.getElementById('modalSeason').textContent = product.season;
    document.getElementById('modalPrice').textContent = '$' + product.price.toLocaleString('es-AR');
    
    const imgs = product.images && product.images.length > 0 ? product.images : [product.image || 'assets/arg_retro.png'];
    document.getElementById('modalMainImage').src = imgs[0];
    
    const thumbsContainer = document.getElementById('modalThumbnails');
    if (imgs.length > 1) {
        thumbsContainer.innerHTML = imgs.map(src => `<img src="${src}" onclick="document.getElementById('modalMainImage').src='${src}'" style="width:60px; height:60px; object-fit:cover; border-radius:4px; cursor:pointer; border:1px solid rgba(255,255,255,0.2);">`).join('');
    } else {
        thumbsContainer.innerHTML = '';
    }
    
    const sizesContainer = document.getElementById('modalSizes');
    const stock = product.stock || {S:10, M:10, L:10, XL:10, XXL:10}; 
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
    
    const availableSizes = sizes.filter(size => (stock[size] || 0) > 0);
    
    if (availableSizes.length > 0) {
        sizesContainer.innerHTML = availableSizes.map(size => {
            return `<button onclick="selectSize('${size}')" id="sizeBtn_${size}" style="padding:0.5rem 1rem; background:transparent; border:1px solid rgba(255,255,255,0.3); color:white; border-radius:4px; transition:0.3s; cursor:pointer;">${size}</button>`;
        }).join('');
    } else {
        sizesContainer.innerHTML = '<span style="color:#ff4444; font-size:0.9rem;">Producto agotado actualmente.</span>';
    }
    
    const addBtn = document.getElementById('modalAddToCartBtn');
    addBtn.disabled = true;
    addBtn.textContent = 'Selecciona un talle';
    addBtn.onclick = () => {
        if(currentSelectedSize) {
            addToCartWithVariant(product.id, currentSelectedSize);
            closeModal();
            document.getElementById('cartSidebar').classList.add('active');
            document.getElementById('cartOverlay').classList.add('active');
        }
    };
    
    document.getElementById('productModalOverlay').style.display = 'block';
    document.getElementById('productModal').style.display = 'block';
}

window.selectSize = function(size) {
    currentSelectedSize = size;
    ['S','M','L','XL','XXL'].forEach(s => {
        const btn = document.getElementById('sizeBtn_'+s);
        if(btn && !btn.disabled) {
            btn.style.background = s === size ? 'white' : 'transparent';
            btn.style.color = s === size ? 'black' : 'white';
        }
    });
    
    const addBtn = document.getElementById('modalAddToCartBtn');
    addBtn.disabled = false;
    addBtn.textContent = 'Añadir al Carrito';
}

window.closeModal = function() {
    document.getElementById('productModalOverlay').style.display = 'none';
    document.getElementById('productModal').style.display = 'none';
}

document.getElementById('closeProductModal')?.addEventListener('click', closeModal);
document.getElementById('productModalOverlay')?.addEventListener('click', closeModal);

window.addToCartWithVariant = function(productId, size) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = cart.find(item => item.id === productId && item.size === size);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1, size });
    }
    updateCartUI();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    updateCartUI();
};

function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelector('.cart-count').textContent = count;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotalValue').textContent = '$' + total.toLocaleString('es-AR');
    
    const cartItems = document.getElementById('cartItems');
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top: 2rem;">El carrito está vacío.</p>';
        return;
    }
    
    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.images && item.images.length > 0 ? item.images[0] : (item.image || 'assets/arg_retro.png')}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
                <div>
                    <h4 class="cart-item-title" style="margin-bottom:0.2rem;">${item.name}</h4>
                    <span style="display:block; font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.5rem;">Talle: ${item.size}</span>
                    <span class="cart-item-price">${item.quantity} x $${item.price.toLocaleString('es-AR')}</span>
                </div>
                <button class="remove-item" onclick="removeFromCart(${index})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartUI();

    const cartIcon = document.querySelector('.cart-icon');
    const closeCart = document.getElementById('closeCart');
    const cartSidebar = document.getElementById('cartSidebar');
    const cartOverlay = document.getElementById('cartOverlay');

    function toggleCart() {
        cartSidebar.classList.toggle('active');
        cartOverlay.classList.toggle('active');
    }

    cartIcon.addEventListener('click', toggleCart);
    closeCart.addEventListener('click', toggleCart);
    cartOverlay.addEventListener('click', toggleCart);
    
    // Smooth Scroll targeting the product grid
    document.querySelectorAll('a[href^="#"], .btn-primary').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetElement = document.querySelector('#catalogo');
            if (targetElement) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight - 40;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(5, 5, 5, 0.9)';
            nav.style.backdropFilter = 'blur(10px)';
            nav.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        } else {
            nav.style.background = 'transparent';
            nav.style.backdropFilter = 'blur(0px)';
            nav.style.borderBottom = '1px solid transparent';
        }
    });

    // Handle checkout
    document.querySelector('.btn-checkout').addEventListener('click', () => {
        if (cart.length === 0) {
            alert("Tu carrito está vacío. Agrega una de nuestras camisetas primero.");
            return;
        } 
        
        let text = "¡Hola! Quiero hacer el siguiente pedido en la tienda:\n\n";
        cart.forEach(item => {
            text += `- ${item.quantity}x ${item.name} (Talle ${item.size}) - $${(item.price * item.quantity).toLocaleString('es-AR')}\n`;
            if (item.publicImageUrl) {
                text += `  🖼️ Ver modelo: ${item.publicImageUrl}\n`;
            }
        });
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        text += `\nTotal: *$${total.toLocaleString('es-AR')}*\n\nAvisame los métodos de pago disponibles.`;
        
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/5491173651853?text=${encodedText}`, '_blank');
        
        cart = [];
        updateCartUI();
        toggleCart();
    });
});
