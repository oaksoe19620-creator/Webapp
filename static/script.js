// Telegram Web App JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Telegram Web App
    let tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
        
        // Apply Telegram theme
        document.body.classList.add('telegram-web-app');
        
        // Set CSS custom properties from Telegram theme
        if (tg.themeParams) {
            const root = document.documentElement;
            Object.keys(tg.themeParams).forEach(key => {
                root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, tg.themeParams[key]);
            });
        }
        
        // Display user info
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        
        if (tg.initDataUnsafe?.user && userName) {
            const user = tg.initDataUnsafe.user;
            userName.textContent = `@${user.username || user.first_name || 'User'}`;
        } else if (userName) {
            userName.textContent = '@demo_user';
        }
    }

    // Cart functionality
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Update cart display
    function updateCartDisplay() {
        const cartCount = document.getElementById('cartCount');
        const cartItems = document.getElementById('cartItems');
        const cartFooter = document.getElementById('cartFooter');
        const cartTotal = document.getElementById('cartTotal');
        
        if (!cartCount) return;
        
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        cartCount.textContent = totalItems;
        cartTotal.textContent = totalPrice.toFixed(2);
        
        // Clear cart items
        cartItems.innerHTML = '';
        
        if (cart.length === 0) {
            cartItems.style.display = 'none';
            cartFooter.style.display = 'none';
            return;
        }
        
        // Add cart items
        cart.forEach((item, index) => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
            `;
            cartItems.appendChild(cartItem);
        });
        
        cartItems.style.display = 'block';
        cartFooter.style.display = 'block';
    }
    
    // Add to cart
    window.addToCart = function(id, name, price, image) {
        const existingItem = cart.find(item => item.id === id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: id,
                name: name,
                price: parseFloat(price),
                image: image,
                quantity: 1
            });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
        
        // Show feedback
        const button = document.querySelector(`[data-id="${id}"]`);
        if (button) {
            const originalText = button.textContent;
            button.textContent = 'Added!';
            button.style.background = '#22c55e';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 1000);
        }
    };
    
    // Update quantity
    window.updateQuantity = function(index, change) {
        if (cart[index]) {
            cart[index].quantity += change;
            
            if (cart[index].quantity <= 0) {
                cart.splice(index, 1);
            }
            
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();
        }
    };
    
    // Toggle cart visibility
    const toggleCart = document.getElementById('toggleCart');
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');
    
    if (toggleCart) {
        toggleCart.addEventListener('click', function() {
            const isVisible = cartItems.style.display !== 'none';
            
            if (isVisible) {
                cartItems.style.display = 'none';
                cartFooter.style.display = 'none';
                toggleCart.textContent = 'Show';
            } else {
                cartItems.style.display = 'block';
                if (cart.length > 0) {
                    cartFooter.style.display = 'block';
                }
                toggleCart.textContent = 'Hide';
            }
        });
    }
    
    // Add to cart button event listeners
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const name = this.dataset.name;
            const price = parseFloat(this.dataset.price);
            const image = this.dataset.image;
            
            addToCart(id, name, price, image);
        });
    });
    
    // Category filtering
    const categoryBtns = document.querySelectorAll('.category-btn');
    const productCards = document.querySelectorAll('.product-card');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            
            // Update active button
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Filter products
            productCards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
    
    // Checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            if (cart.length === 0) {
                alert('Your cart is empty!');
                return;
            }
            
            window.location.href = '/checkout';
        });
    }
    
    // Initialize cart display
    updateCartDisplay();
    
    // Auto-hide cart on mobile after 3 seconds
    if (window.innerWidth <= 768 && cart.length > 0) {
        setTimeout(() => {
            if (toggleCart && cartItems.style.display !== 'none') {
                toggleCart.click();
            }
        }, 3000);
    }
});

// Utility functions for API calls
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Product management functions for admin
async function loadProducts(category = null) {
    try {
        const url = category ? `/api/products?category=${category}` : '/api/products';
        const products = await apiCall(url);
        
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) {
            productsGrid.innerHTML = '';
            
            products.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.dataset.category = product.category;
                productCard.innerHTML = `
                    <img src="${product.image_url}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-price">$${product.price.toFixed(2)}</p>
                        <p class="product-description">${product.description}</p>
                        <button class="add-to-cart-btn" 
                                data-id="${product.id}"
                                data-name="${product.name}"
                                data-price="${product.price}"
                                data-image="${product.image_url}">
                            Add to Cart
                        </button>
                    </div>
                `;
                productsGrid.appendChild(productCard);
            });
            
            // Re-attach event listeners
            document.querySelectorAll('.add-to-cart-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    const name = this.dataset.name;
                    const price = parseFloat(this.dataset.price);
                    const image = this.dataset.image;
                    
                    addToCart(id, name, price, image);
                });
            });
        }
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

// Initialize Telegram Web App theme handling
function initTelegramTheme() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Listen for theme changes
        tg.onEvent('themeChanged', function() {
            if (tg.themeParams) {
                const root = document.documentElement;
                Object.keys(tg.themeParams).forEach(key => {
                    root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, tg.themeParams[key]);
                });
            }
        });
        
        // Set initial theme
        if (tg.themeParams) {
            const root = document.documentElement;
            Object.keys(tg.themeParams).forEach(key => {
                root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, tg.themeParams[key]);
            });
        }
    }
}

// Call theme initialization
initTelegramTheme();

// Handle back button
if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    
    // Show back button on checkout page
    if (window.location.pathname === '/checkout') {
        tg.BackButton.show();
        tg.BackButton.onClick(function() {
            window.location.href = '/';
        });
    }
    
    // Show main button for checkout
    if (window.location.pathname === '/checkout') {
        tg.MainButton.setText('Complete Order');
        tg.MainButton.show();
        tg.MainButton.onClick(function() {
            document.getElementById('submitOrder')?.click();
        });
    }
}

// Error handling and user feedback
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 3000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Network status handling
window.addEventListener('online', function() {
    showMessage('Connection restored', 'success');
});

window.addEventListener('offline', function() {
    showMessage('Connection lost. Some features may not work.', 'error');
});