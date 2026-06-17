import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Навигация (SPA роутинг)
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Состояния витрины
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Корзина
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Оформление заказа
  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [orderStatus, setOrderStatus] = useState(null);

  // Состояния админки
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [adminLeads, setAdminLeads] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);

  // Форма нового товара
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdOzon, setNewProdOzon] = useState('');
  const [newProdUrls, setNewProdUrls] = useState('');
  const [newProdFiles, setNewProdFiles] = useState(null);
  // Отслеживание кнопок «Назад»/«Вперед» в браузере
  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Функция переключения страниц
  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Анимация падающего снега
  useEffect(() => {
    const createSnowflake = () => {
      const snowflake = document.createElement('div');
      snowflake.classList.add('snowflake');
      snowflake.textContent = '❄';
      snowflake.style.left = Math.random() * 100 + 'vw';
      snowflake.style.animationDuration = Math.random() * 3 + 2 + 's';
      snowflake.style.opacity = Math.random();
      snowflake.style.fontSize = Math.random() * 10 + 10 + 'px';
      document.body.appendChild(snowflake);
      setTimeout(() => snowflake.remove(), 5000);
    };
    const snowInterval = setInterval(createSnowflake, 250);
    return () => clearInterval(snowInterval);
  }, []);

  // Синхронизация корзины с локальной памятью браузера
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);
  // Загрузка товаров на главную страницу
  const loadProducts = async (currentPage) => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/products?page=${currentPage}&limit=4`);
      const data = await response.json();
      if (data.error) return;
      if (data.length < 4) setHasMore(false);
      if (currentPage === 1) {
        setProducts(data);
      } else {
        setProducts((prev) => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = data.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPath === '/' || currentPath === '/services') {
      loadProducts(1);
    }
  }, [currentPath]);

  // Проверка сессии админа при заходе на /admin
  useEffect(() => {
    if (currentPath === '/admin') {
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          if (data.loggedIn) {
            setIsAdminLoggedIn(true);
            loadAdminData();
          }
        });
    }
  }, [currentPath]);

  // Загрузка данных лидов и продуктов для админки
  const loadAdminData = async () => {
    try {
      const res = await fetch('/api/admin/data');
      if (res.ok) {
        const data = await res.json();
        setAdminLeads(data.leads || []);
        setAdminProducts(data.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Авторизация администратора
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminLoggedIn(true);
        loadAdminData();
      } else {
        setLoginError(data.error || 'Неверный логин или пароль');
      }
    } catch (err) {
      setLoginError('Ошибка подключения к серверу');
    }
  };

  // Выход из админки
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAdminLoggedIn(false);
    navigateTo('/');
  };

  // Добавление нового товара из админки
  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newProdName);
    formData.append('price', newProdPrice);
    formData.append('ozon_url', newProdOzon);
    formData.append('images_urls', newProdUrls);
    
    if (newProdFiles) {
      for (let i = 0; i < newProdFiles.length; i++) {
        formData.append('images_files', newProdFiles[i]);
      }
    }

    try {
      const res = await fetch('/api/admin/products/add', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        alert('Товар успешно добавлен!');
        setNewProdName(''); setNewProdPrice(''); setNewProdOzon(''); setNewProdUrls('');
        setNewProdFiles(null);
        e.target.reset();
        loadAdminData();
      }
    } catch (err) {
      alert('Ошибка добавления товара');
    }
  };

  // Работа с корзиной (добавление, изменение количества, подсчет суммы)
  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, amount) => {
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + amount } : item)).filter((item) => item.quantity > 0));
  };

  const getTotalPrice = () => cart.reduce((sum, item) => sum + (parseInt(item.price.replace(/[^\d]/g, '')) || 0) * item.quantity, 0);

  // Отправка заявки клиента в базу
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    const itemsSummary = cart.map((i) => `${i.name} x${i.quantity}`).join(', ');
    const fullMessage = `Заказ: [${itemsSummary}]. Комментарий: ${orderMessage}`;
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orderName, phone: orderPhone, message: fullMessage }),
      });
      const data = await response.json();
      if (data.success) {
        setOrderStatus('success');
        setCart([]);
        setOrderName(''); setOrderPhone(''); setOrderMessage('');
      } else {
        setOrderStatus('error');
      }
    } catch (err) { setOrderStatus('error'); }
  };
  // --- ВИТРИНА МАГАЗИНА (ГЛАВНАЯ) ---
  const renderMainShop = () => (
    <>
      <section className="hero">
        <h1>Магазин «Мороз Плей»</h1>
        <p>Уникальные товары, мягкие игрушки-сюрпризы и крутые антистрессы с доставкой через Ozon!</p>
      </section>

      <section className="products-section">
        <div className="products-grid">
          {products.map((product) => {
            const imagesArray = product.images.split(';');
            const firstImage = imagesArray[0] || '';
            const imgPath = firstImage.startsWith('http') ? firstImage : `http://localhost:3000${firstImage}`;
            
            return (
              <div key={product.id} className="product-card">
                <div className="image-container">
                  <img src={imgPath} alt={product.name} className="product-img" />
                </div>
                <div className="product-info">
                  <h3 className="product-title">{product.name}</h3>
                  <div className="product-bottom">
                    <span className="product-price">{product.price}</span>
                    <button className="btn-buy" onClick={() => addToCart(product)}>Купить</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {hasMore && (
          <div className="load-more-container">
            <button className="btn-load-more" onClick={() => { const n = page + 1; setPage(n); loadProducts(n); }} disabled={loading}>
              {loading ? 'Загрузка...' : 'Показать еще'}
            </button>
          </div>
        )}
      </section>
    </>
  );

  // --- СТРАНИЦА КОНТАКТОВ ---
  const renderContacts = () => (
    <section className="hero" style={{ padding: '120px 20px' }}>
      <h1>Наши контакты</h1>
      <p style={{ marginTop: '20px', fontSize: '20px' }}>📍 Мы доставляем товары по всей России прямо в пункты выдачи <strong>Ozon</strong>!</p>
      <p style={{ marginTop: '10px' }}>По любым вопросам пишите менеджеру или оформляйте заявку через корзину.</p>
    </section>
  );
  // --- СТРАНИЦА АДМИНКИ ---
  const renderAdminPanel = () => {
    if (!isAdminLoggedIn) {
      return (
        <div className="login-screen">
          <div className="login-card">
            <h2 style={{ textAlign: 'center', marginBottom: '25px' }}>Вход в админку</h2>
            <form onSubmit={handleLogin} className="admin-form">
              <input type="text" placeholder="Логин" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required />
              <input type="password" placeholder="Пароль" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              {loginError && <p style={{ color: '#ff007f', fontSize: '14px', margin: 0 }}>{loginError}</p>}
              <button type="submit" className="btn-admin-submit">Войти</button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Панель управления «Мороз Плей»</h1>
          <button className="btn-logout" onClick={handleLogout}>Выйти</button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Всего заявок</h3>
            <p>{adminLeads.length}</p>
          </div>
          <div className="stat-card">
            <h3>Товаров в базе</h3>
            <p>{adminProducts.length}</p>
          </div>
        </div>

        <div className="admin-content-layout">
          <div className="admin-block">
            <h2>Поступившие заявки (Лиды)</h2>
            <div className="leads-list">
              {adminLeads.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Новых заявок нет</p> : 
                adminLeads.map(lead => (
                  <div key={lead.id} className="lead-item-card">
                    <div className="lead-meta">
                      <span>ID: #{lead.id}</span>
                      <span>{lead.created_at ? new Date(lead.created_at).toLocaleString() : ''}</span>
                    </div>
                    <div className="lead-name">👤 {lead.name}</div>
                    <div className="lead-phone">📞 {lead.phone}</div>
                    {lead.message && <p className="lead-msg">{lead.message}</p>}
                  </div>
                ))
              }
            </div>
          </div>

          <div className="admin-block">
            <h2>Добавить товар</h2>
            <form onSubmit={handleAddProduct} className="admin-form">
              <div className="form-group">
                <label>Название товара *</label>
                <input type="text" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Цена (например, 450 ₽) *</label>
                <input type="text" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Ссылка на Ozon *</label>
                <input type="url" value={newProdOzon} onChange={(e) => setNewProdOzon(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Ссылки на фото (через точку с запятой `;` )</label>
                <textarea value={newProdUrls} onChange={(e) => setNewProdUrls(e.target.value)} rows="2" placeholder="https://img1; https://img2" />
              </div>
              <div className="form-group">
                <label>Или загрузить файлы картинок</label>
                <input type="file" multiple onChange={(e) => setNewProdFiles(e.target.files)} accept="image/*" />
              </div>
              <button type="submit" className="btn-admin-submit">Добавить на витрину</button>
            </form>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="app-container">
      <header className="navbar">
        <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>❄️ Мороз Плей</div>
        <nav className="nav-links">
          <button onClick={() => navigateTo('/')} className={currentPath === '/' || currentPath === '/services' ? 'active' : ''} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}>Главная</button>
          <button onClick={() => navigateTo('/contacts')} className={currentPath === '/contacts' ? 'active' : ''} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}>Контакты</button>
          <button onClick={() => navigateTo('/admin')} className={currentPath === '/admin' ? 'active' : ''} style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}>Админка</button>
        </nav>
        <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
          🛒 Корзина ({cart.reduce((sum, i) => sum + i.quantity, 0)})
        </button>
      </header>

      {currentPath === '/' || currentPath === '/services' ? renderMainShop() : null}
      {currentPath === '/contacts' ? renderContacts() : null}
      {currentPath === '/admin' ? renderAdminPanel() : null}

      {isCartOpen && (
        <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h3>Ваша корзина</h3>
              <button className="close-cart" onClick={() => setIsCartOpen(false)}>×</button>
            </div>
            <div className="cart-items">
              {cart.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Корзина пуста</p> : 
                cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <h4>{item.name}</h4>
                      <p>{item.price}</p>
                    </div>
                    <div className="quantity-controls">
                      <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                  </div>
                ))
              }
            </div>
            {cart.length > 0 && (
              <div className="cart-footer">
                <div className="total-price"><span>Итого:</span><strong>{getTotalPrice()} ₽</strong></div>
                <button className="btn-checkout" onClick={() => setIsOrderModalOpen(true)}>Оформить заказ</button>
              </div>
            )}
          </div>
        </div>
      )}

      {isOrderModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOrderModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header" style={{ padding: '0 0 20px 0' }}>
              <h3>Оформление</h3>
              <button className="close-cart" onClick={() => setIsOrderModalOpen(false)}>×</button>
            </div>
            {orderStatus === 'success' ? <p style={{ color: 'var(--accent-purple)', fontWeight: '600' }}>🎉 Заказ успешно оформлен!</p> : (
              <form onSubmit={handlePlaceOrder} className="order-form">
                <input type="text" placeholder="Ваше имя" value={orderName} onChange={(e) => setOrderName(e.target.value)} required />
                <input type="text" placeholder="Телефон" value={orderPhone} onChange={(e) => setOrderPhone(e.target.value)} required />
                <textarea placeholder="Комментарий" value={orderMessage} onChange={(e) => setOrderMessage(e.target.value)} rows="3" />
                <button type="submit" className="btn-checkout">Отправить заявку</button>
              </form>
            )}
          </div>
        </div>
      )}

      <footer className="footer">
        <p>&copy; 2026 Мороз Плей. Код полностью собран по кусочкам!</p>
      </footer>
    </div>
  );
}

export default App;
