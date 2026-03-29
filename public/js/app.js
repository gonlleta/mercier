// Product Data Management
const defaultProducts = [];

let products = [];
let cart = [];

let isAdminUnlocked = false;
let editingProdId = null;

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
        alert("Modo edición activado. Aparecerá el botón Editar en las camisetas.");
        renderProducts();
    } else if (pass !== null) {
        alert("Contraseña incorrecta.");
    }
}

window.openEditModal = function(id, event) {
    if (event) event.stopPropagation();
    const p = products.find(x => x.id === id);
    if(!p) return;
    editingProdId = id;
    document.getElementById('editName').value = p.name;
    document.getElementById('editPrice').value = p.price;
    document.getElementById('editSeason').value = p.season;
    document.getElementById('editModalOverlay').style.display = 'block';
    document.getElementById('editModal').style.display = 'block';
}

window.closeEditModal = function() {
    document.getElementById('editModalOverlay').style.display = 'none';
    document.getElementById('editModal').style.display = 'none';
    editingProdId = null;
}

window.savePublicEdit = async function() {
    if(!editingProdId) return;
    const p = products.find(x => x.id === editingProdId);
    if(!p) return;
    
    const payload = {
        ...p,
        name: document.getElementById('editName').value,
        price: parseInt(document.getElementById('editPrice').value) || p.price,
        season: document.getElementById('editSeason').value
    };
    
    try {
        const res = await fetch(`/api/products/${editingProdId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            closeEditModal();
            const updated = await res.json();
            const idx = products.findIndex(x => x.id === editingProdId);
            if(idx !== -1) products[idx] = updated;
            renderProducts();
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
    
    grid.innerHTML = filtered.map(product => `
        <article class="product-card">
            <div class="image-container">
                <img src="${product.images && product.images.length > 0 ? product.images[0] : (product.image || 'assets/arg_retro.png')}" alt="${product.name} Retro" class="product-image">
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
