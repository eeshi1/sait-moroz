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
  const [editProductId, setEditProductId] = useState(null);    // режим редактирования
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // подтверждение удаления
  // ===== НОВЫЙ СТЕЙТ ДЛЯ МОДАЛКИ ДОБАВЛЕНИЯ ТОВАРА =====
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

                                // Добавление / Редактирование товара из админки
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

    // Если редактируем — добавляем ID
    if (editProductId) {
      formData.append('id', editProductId);
    }

    try {
      const url = editProductId
        ? '/api/admin/products/edit'
        : '/api/admin/products/add';
      const res = await fetch(url, {
        method: 'POST',
        body: formData
      });
            if (res.ok) {
        alert(editProductId ? '✅ Товар обновлён!' : '✅ Товар добавлен!');
        resetProductForm();
        e.target.reset();
        setIsAddModalOpen(false);
        loadAdminData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert('❌ Ошибка: ' + (errData.error || `Сервер вернул ${res.status}`));
      }
    } catch (err) {
      alert('❌ Ошибка сохранения товара: ' + err.message);
    }
  };

    // Сброс формы товара
  const resetProductForm = () => {
    setNewProdName('');
    setNewProdPrice('');
    setNewProdOzon('');
    setNewProdUrls('');
        setNewProdFiles(null);
    setEditProductId(null);
  };

    // Заполнить форму для редактирования
  const startEditProduct = (product) => {
    setNewProdName(product.name);
    setNewProdPrice(product.price);
    setNewProdOzon(product.ozon_url);
        setNewProdUrls(product.images);
    setEditProductId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

    // Удаление товара
  const handleDeleteProduct = async (id) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirmId(null);
        loadAdminData();
      }
    } catch (err) {
      alert('Ошибка удаления товара');
    }
  };

    // Переключение наличия товара прямо из таблицы
  const handleToggleAvailability = async (product) => {
    // Поля stock и is_available физически отсутствуют в БД,
    // поэтому ничего не делаем
    alert('⏳ Статус «В наличии» временно недоступен, т.к. колонки нет в БД');
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

  // Удаление товара из корзины
  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Маска телефона
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    let formatted = '+7';
    if (digits.length > 1) formatted += ' (' + digits.slice(1, 4);
    if (digits.length > 4) formatted += ') ' + digits.slice(4, 7);
    if (digits.length > 7) formatted += '-' + digits.slice(7, 9);
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11);
    return formatted;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setOrderPhone(formatted);
  };

  // Получить первую картинку товара
  const getProductImage = (item) => {
    if (item.images) {
      const imagesArray = item.images.split(';');
      const first = imagesArray[0] || '';
      return first.startsWith('http') ? first : '';
    }
    return '';
  };
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
      {/* HERO-СЕКЦИЯ */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🔥 Хиты продаж на OZON 2026</div>
          <h1 className="hero-title">
            Территория{' '}
            <span className="hero-gradient">Крутых Игрушек</span>
            {' '}и Трендов!
          </h1>
          <p className="hero-description">
            Официальный магазин <strong>Мороз Плей</strong>. Мы находим самые хайповые
            антистрессы, милые мягкие игрушки и гаджеты, которые обожают дети и взрослые!
          </p>
          <div className="hero-actions">
            <a href="https://www.ozon.ru" target="_blank" rel="noreferrer" className="btn-ozon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              Купить на OZON
            </a>
            <button className="btn-catalog" onClick={() => {
              document.querySelector('.products-section')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Смотреть каталог
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-glow"></div>
          <img src="https://i.ibb.co/zH6mCgN/stitch.png" alt="Стич" className="hero-image" />
          <div className="hero-badge-card top-left">⭐ Хит продаж</div>
          <div className="hero-badge-card bottom-right">🚀 Новинка 2026</div>
        </div>
      </section>

      {/* СЕКЦИЯ СТАТИСТИКИ */}
      <section className="stats-section">
        <div className="stats-inner">
          <div className="stat-item">
            <span className="stat-number">4.8</span>
            <span className="stat-icon">⭐</span>
            <span className="stat-label">Средняя оценка</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">457+</span>
            <span className="stat-icon">💬</span>
            <span className="stat-label">Честных отзывов</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">1 984+</span>
            <span className="stat-icon">📦</span>
            <span className="stat-label">Заказов доставлено</span>
          </div>
        </div>
      </section>

      {/* КАТАЛОГ ТОВАРОВ */}
      <section className="products-section">
        <div className="section-header">
          <h2>Наш ассортимент</h2>
          <p>Антистрессы, мягкие игрушки и гаджеты с доставкой по всей России</p>
        </div>

        {/* Скелетоны загрузки */}
        {loading && products.length === 0 && (
          <div className="products-grid">
            {[1,2,3,4].map((i) => (
              <div key={i} className="product-card skeleton">
                <div className="image-container skeleton-img"></div>
                <div className="product-info">
                  <div className="skeleton-line skeleton-title"></div>
                  <div className="skeleton-line skeleton-price"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="products-grid">
          {products.map((product, index) => {
            const imagesArray = product.images.split(';');
            const firstImage = imagesArray[0] || '';
            const imgPath = firstImage.startsWith('http') ? firstImage : firstImage;
            const inStock = product.is_available === true || product.is_available === 1 || product.is_available === 'true';

            return (
              <div key={product.id} className="product-card" style={{ animationDelay: `${index * 0.08}s` }}>
                <div className="image-container">
                  {product.stock > 0 && product.stock <= 5 && (
                    <span className="badge badge-hot">🔥 Хит</span>
                  )}
                  {product.stock > 20 && (
                    <span className="badge badge-new">🆕 Новинка</span>
                  )}
                  {!inStock && (
                    <div className="out-of-stock-overlay">
                      <span>Нет в наличии</span>
                    </div>
                  )}
                  <img src={imgPath} alt={product.name} className="product-img" loading="lazy" />
                </div>
                <div className="product-info">
                  <h3 className="product-title">{product.name}</h3>
                  {inStock && product.stock > 0 && (
                    <div className="stock-info">
                      <span className="stock-dot"></span>
                      {product.stock <= 5 ? `Осталось ${product.stock} шт` : 'В наличии'}
                    </div>
                  )}
                  <div className="product-bottom">
                    <div className="price-block">
                      <span className="product-price">{product.price}</span>
                      {product.ozon_url && (
                        <a href={product.ozon_url} target="_blank" rel="noreferrer" className="ozon-link">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                          На OZON
                        </a>
                      )}
                    </div>
                    <button className="btn-buy" onClick={() => addToCart(product)} disabled={!inStock}>
                      {inStock ? 'В корзину' : 'Нет'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="load-more-container">
            <button
              className="btn-load-more"
              onClick={() => { const n = page + 1; setPage(n); loadProducts(n); }}
              disabled={loading}
            >
              {loading ? <span className="loading-spinner"></span> : 'Показать ещё'}
            </button>
          </div>
        )}
      </section>
    </>
  );

  // --- СТРАНИЦА КОНТАКТОВ ---
  const renderContacts = () => (
    <section className="contacts-section">
      <h1 className="contacts-title">Свяжитесь с нами</h1>
      <p className="contacts-subtitle">
        Мы доставляем товары по всей России в пункты выдачи <strong>Ozon</strong>.
        По любым вопросам пишите нам в Telegram!
      </p>
      <div className="contacts-cards">
        <a
          href="https://t.me/moroz_play"
          target="_blank"
          rel="noreferrer"
          className="contact-card tg"
        >
          <span className="contact-card-icon">✈️</span>
          <span className="contact-card-label">Telegram</span>
          <span className="contact-card-desc">@moroz_play</span>
        </a>
        <a
          href="https://www.ozon.ru"
          target="_blank"
          rel="noreferrer"
          className="contact-card ozon"
        >
          <span className="contact-card-icon">🛒</span>
          <span className="contact-card-label">Магазин на Ozon</span>
          <span className="contact-card-desc">Мороз Плей</span>
        </a>
      </div>
      <div className="contacts-info">
        📍 Доставка по всей России через пункты выдачи Ozon.<br />
        По вопросам заказов и наличия товаров — пишите в Telegram.
        Отвечаем быстро! 😊
      </div>
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
              {loginError && <p className="login-error">{loginError}</p>}
              <button type="submit" className="btn-admin-submit">Войти</button>
            </form>
          </div>
        </div>
      );
    }

        return (
      <div className="admin-container">
        {/* КОМПАКТНЫЕ КАРТОЧКИ СТАТИСТИКИ */}
        <div className="admin-stats-compact">
          <div className="stat-chip">
            <span className="stat-chip-icon">📦</span>
            <span>Товаров: <strong>{adminProducts.length}</strong></span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip-icon">📋</span>
            <span>Заявок: <strong>{adminLeads.length}</strong></span>
          </div>
        </div>

        <div className="admin-content-layout">
          {/* ОСНОВНАЯ КОЛОНКА — СПИСОК ТОВАРОВ */}
          <div className="admin-main-col">
            <div className="admin-block admin-products-table">
              <div className="products-table-header">
                <h2>Список товаров в базе ({adminProducts.length})</h2>
                <button className="btn-add-product" onClick={() => setIsAddModalOpen(true)}>
                  + Добавить новый товар
                </button>
              </div>
              {adminProducts.length === 0 ? <p className="admin-empty-hint">Товаров пока нет</p> : 
                <div className="products-table">
                  <div className="table-header">
                    <span className="col-id">ID</span>
                    <span className="col-img">Фото</span>
                    <span className="col-name">Название</span>
                    <span className="col-price">Цена</span>
                    <span className="col-status">Статус</span>
                    <span className="col-actions">Действия</span>
                  </div>
                  {adminProducts.map(product => {
                    const imagesArray = product.images.split(';');
                    const firstImage = imagesArray[0] || '';
                    const inStock = product.is_available === true || product.is_available === 1 || product.is_available === 'true';
                      
                    return (
                      <div key={product.id} className="table-row">
                        <span className="col-id">#{product.id}</span>
                        <span className="col-img">
                          {firstImage && (
                            <img src={firstImage.startsWith('http') ? firstImage : ''} alt="" className="table-product-img" onError={(e) => { e.target.style.display = 'none'; }} />
                          )}
                        </span>
                        <span className="col-name">{product.name}</span>
                        <span className="col-price">{product.price}</span>
                        <span className="col-status">
                          <label className="toggle-switch">
                            <input 
                              type="checkbox" 
                              checked={inStock} 
                              onChange={() => handleToggleAvailability(product)}
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">{inStock ? 'В наличии' : 'Нет'}</span>
                          </label>
                        </span>
                        <span className="col-actions">
                          <button className="btn-edit" onClick={() => {
                            startEditProduct(product);
                            setIsAddModalOpen(true);
                          }} title="Редактировать">✏️</button>
                          <button className="btn-delete" onClick={() => setDeleteConfirmId(product.id)} title="Удалить">🗑️</button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              }

              {/* Подтверждение удаления */}
              {deleteConfirmId && (
                <div className="delete-confirm">
                  <p>Удалить товар ID #{deleteConfirmId}?</p>
                  <div className="delete-confirm-buttons">
                    <button className="btn-delete-yes" onClick={() => handleDeleteProduct(deleteConfirmId)}>Да, удалить</button>
                    <button className="btn-delete-no" onClick={() => setDeleteConfirmId(null)}>Отмена</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* САЙДБАР — ЛИДЫ И СТАТИСТИКА */}
          <div className="admin-sidebar">
            <div className="admin-block admin-block-compact">
              <h3>Поступившие заявки (Лиды)</h3>
              <div className="leads-list">
                {adminLeads.length === 0 ? <p className="admin-empty-hint">Новых заявок нет</p> : 
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
          </div>
        </div>

        {/* ===== МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ / РЕДАКТИРОВАНИЯ ТОВАРА ===== */}
        {isAddModalOpen && (
          <div className="modal-overlay" onClick={() => {
            if (!editProductId) setIsAddModalOpen(false);
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editProductId ? '✏️ Редактировать товар' : '➕ Добавить товар'}</h2>
                <button className="modal-close-btn" onClick={() => {
                  setIsAddModalOpen(false);
                  if (editProductId) resetProductForm();
                }}>×</button>
              </div>
              <form onSubmit={(e) => {
                handleAddProduct(e);
                if (!editProductId) setIsAddModalOpen(false);
              }} className="admin-form">
                {editProductId && (
                  <div className="edit-product-banner">
                    ✏️ Редактирование товара ID: #{editProductId}
                    <button type="button" className="edit-product-cancel" onClick={() => {
                      resetProductForm();
                      setIsAddModalOpen(false);
                    }}>Отмена</button>
                  </div>
                )}
                <div className="form-group">
                  <label>Название товара *</label>
                  <input type="text" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Цена *</label>
                  <input type="text" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} placeholder="450 ₽" required />
                </div>
                <div className="form-group">
                  <label>Ссылка на Ozon *</label>
                  <input type="url" value={newProdOzon} onChange={(e) => setNewProdOzon(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Ссылки на фото</label>
                  <div className="image-url-zone">
                    <div className="image-url-preview-list">
                      {newProdUrls.split(';').map((url, idx) => {
                        const trimmed = url.trim();
                        return trimmed ? (
                          <div key={idx} className="image-url-item">
                            <img src={trimmed} alt={`preview ${idx}`} onError={(e) => { e.target.style.display = 'none'; }} />
                            <button type="button" className="image-url-remove" onClick={() => {
                              const items = newProdUrls.split(';').map(u => u.trim()).filter(u => u !== '');
                              items.splice(idx, 1);
                              setNewProdUrls(items.join('; '));
                            }}>×</button>
                          </div>
                        ) : null;
                      })}
                    </div>
                    <div className="image-url-add">
                      <input
                        type="url"
                        className="image-url-input"
                        placeholder="Вставьте ссылку на фото и нажмите Enter"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.target.value.trim();
                            if (val) {
                              const existing = newProdUrls ? newProdUrls.split(';').map(u => u.trim()).filter(u => u !== '') : [];
                              setNewProdUrls([...existing, val].join('; '));
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                      <button type="button" className="image-url-add-btn"
                        onClick={() => {
                          const input = document.querySelector('.image-url-input');
                          if (input) {
                            const val = input.value.trim();
                            if (val) {
                              const existing = newProdUrls ? newProdUrls.split(';').map(u => u.trim()).filter(u => u !== '') : [];
                              setNewProdUrls([...existing, val].join('; '));
                              input.value = '';
                            }
                          }
                        }}
                      >+</button>
                    </div>
                    <p className="image-url-hint">Или загрузите файлы ниже</p>
                  </div>
                </div>
                <div className="form-group">
                  <label>Загрузить файлы картинок</label>
                  <input type="file" multiple onChange={(e) => setNewProdFiles(e.target.files)} accept="image/*" />
                </div>
                <button type="submit" className="btn-admin-submit">
                  {editProductId ? '💾 Сохранить изменения' : '➕ Добавить на витрину'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="app-container">
            <header className="navbar">
        <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>
          ❄️ <span>Мороз Плей</span>
        </div>
        {currentPath === '/admin' ? (
          <div className="admin-header-bar">
            <span className="admin-header-title">Панель управления</span>
            {isAdminLoggedIn && (
              <button className="btn-logout" onClick={handleLogout}>Выйти</button>
            )}
          </div>
        ) : (
          <>
            <nav className="nav-links">
              <button
                onClick={() => navigateTo('/')}
                className={currentPath === '/' || currentPath === '/services' ? 'active' : ''}
              >
                Главная
              </button>
              <button
                onClick={() => navigateTo('/contacts')}
                className={currentPath === '/contacts' ? 'active' : ''}
              >
                Контакты
              </button>
              <button
                onClick={() => navigateTo('/admin')}
                className={currentPath === '/admin' ? 'active' : ''}
              >
                Админка
              </button>
            </nav>
            <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
              🛒 Корзина
              {cart.reduce((sum, i) => sum + i.quantity, 0) > 0 && (
                <span style={{
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: '100px',
                  padding: '1px 7px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </button>
          </>
        )}
      </header>

      {currentPath === '/' || currentPath === '/services' ? renderMainShop() : null}
      {currentPath === '/contacts' ? renderContacts() : null}
      {currentPath === '/admin' ? renderAdminPanel() : null}

            {isCartOpen && (
        <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h3>Корзина <span className="cart-count-badge">{cart.length}</span></h3>
              <button className="close-cart" onClick={() => setIsCartOpen(false)}>×</button>
            </div>
            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="cart-empty">
                  <span className="cart-empty-icon">🛒</span>
                  <p>Корзина пуста</p>
                  <span className="cart-empty-hint">Добавьте товары из каталога</span>
                </div>
              ) : (
                cart.map((item) => {
                  const imgPath = getProductImage(item);
                  return (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-img">
                        {imgPath ? (
                          <img src={imgPath} alt={item.name} onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <div className="cart-item-placeholder">📦</div>
                        )}
                      </div>
                      <div className="cart-item-info">
                        <h4>{item.name}</h4>
                        <p className="cart-item-price">{item.price}</p>
                      </div>
                      <div className="cart-item-right">
                        <div className="quantity-controls">
                          <button onClick={() => updateQuantity(item.id, -1)}>−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                        </div>
                        <button className="cart-item-remove" onClick={() => removeFromCart(item.id)} title="Удалить">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {cart.length > 0 && (
              <div className="cart-footer">
                <div className="cart-summary">
                  <span>Товаров: <strong>{cart.reduce((sum, i) => sum + i.quantity, 0)} шт</strong></span>
                  <div className="total-price">
                    <span>Итого:</span>
                    <strong className="total-price-value">{getTotalPrice().toLocaleString()} ₽</strong>
                  </div>
                </div>
                <button className="btn-checkout" onClick={() => {
                  setIsOrderModalOpen(true);
                  setIsCartOpen(false);
                }}>
                  Оформить заказ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isOrderModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOrderModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header" style={{ padding: '0 0 20px 0' }}>
              <h3>
                {orderStatus === 'success' ? '✅ Заказ оформлен!' : '📝 Оформление заказа'}
              </h3>
              <button className="close-cart" onClick={() => {
                setIsOrderModalOpen(false);
                if (orderStatus === 'success') setOrderStatus(null);
              }}>×</button>
            </div>
            
            {orderStatus === 'success' ? (
              <div className="order-success">
                <div className="order-success-icon">🎉</div>
                <h4>Спасибо за заказ!</h4>
                <p>Мы получили вашу заявку и свяжемся с вами в ближайшее время.</p>
                <button className="btn-checkout" onClick={() => {
                  setIsOrderModalOpen(false);
                  setOrderStatus(null);
                }} style={{ marginTop: '20px' }}>
                  Продолжить покупки
                </button>
              </div>
            ) : (
              <>
                {/* Список товаров в заказе */}
                <div className="order-items-summary">
                  <h4>Ваш заказ:</h4>
                  {cart.map((item) => (
                    <div key={item.id} className="order-item-line">
                      <span className="order-item-name">{item.name}</span>
                      <span className="order-item-qty">x{item.quantity}</span>
                      <span className="order-item-total">
                        {((parseInt(item.price.replace(/[^\d]/g, '')) || 0) * item.quantity).toLocaleString()} ₽
                      </span>
                    </div>
                  ))}
                  <div className="order-total-line">
                    <strong>Итого:</strong>
                    <strong>{getTotalPrice().toLocaleString()} ₽</strong>
                  </div>
                </div>

                <form onSubmit={handlePlaceOrder} className="order-form">
                  <input 
                    type="text" 
                    placeholder="Ваше имя *" 
                    value={orderName} 
                    onChange={(e) => setOrderName(e.target.value)} 
                    required 
                  />
                  <input 
                    type="text" 
                    placeholder="+7 (___) ___-__-__ *" 
                    value={orderPhone} 
                    onChange={handlePhoneChange} 
                    required 
                  />
                  <textarea 
                    placeholder="Комментарий к заказу (необязательно)" 
                    value={orderMessage} 
                    onChange={(e) => setOrderMessage(e.target.value)} 
                    rows="3" 
                  />
                  <button type="submit" className="btn-checkout">Отправить заявку</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <footer className="footer">
        <p>
          &copy; 2026 <strong>Мороз Плей</strong> &nbsp;·&nbsp; Антистрессы, игрушки и гаджеты с доставкой по всей России
        </p>
      </footer>
    </div>
  );
}

export default App;
