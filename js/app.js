// Product Data Management
const defaultProducts = [];

let products = [];
const storedProducts = localStorage.getItem('mercier_catalog_v2');
if (storedProducts) {
    products = JSON.parse(storedProducts);
} else {
    products = defaultProducts;
    localStorage.setItem('mercier_catalog_v2', JSON.stringify(products));
}

let cart = [];
let currentCategory = 'all';

function renderProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    const filtered = currentCategory === 'all' 
        ? products 
        : products.filter(p => p.category === currentCategory);
        
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-secondary); grid-column:1/-1; text-align:center;">No hay productos en esta categoría.</p>';
        return;
    }
    
    grid.innerHTML = filtered.map(product => `
        <article class="product-card">
            <div class="image-container">
                <img src="${product.image}" alt="${product.name} Retro" class="product-image">
            </div>
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${product.name}</h3>
                    <span class="product-price">$${product.price.toLocaleString('es-AR')}</span>
                </div>
                <span class="product-season">${product.season}</span>
                <button class="add-to-cart" onclick="addToCart(${product.id}, this)">Añadir al Carrito</button>
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

window.addToCart = function(productId, btn) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCartUI();
    document.getElementById('cartSidebar').classList.add('active');
    document.getElementById('cartOverlay').classList.add('active');
    
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = "Añadido ✓";
        btn.style.background = "#fff";
        btn.style.color = "#000";
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = "";
            btn.style.color = "";
        }, 2000);
    }
};

window.removeFromCart = function(productId) {
    cart = cart.filter(item => item.id !== productId);
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
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
                <div>
                    <h4 class="cart-item-title">${item.name}</h4>
                    <span class="cart-item-price">${item.quantity} x $${item.price.toLocaleString('es-AR')}</span>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">Eliminar</button>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
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
        } else {
            alert("¡Proceso de pago simulado! Has pagado tu carrito exitosamente. Gracias por ser parte de Mercier.");
            cart = [];
            updateCartUI();
            toggleCart();
        }
    });
});
