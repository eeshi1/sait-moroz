import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const MOSCOW_COORDS = { latitude: 55.7558, longitude: 37.6173 };

const WEATHER_CODES_RU = {
  0: 'Ясно', 1: 'Преим. ясно', 2: 'Облачно', 3: 'Пасмурно',
  45: 'Туман', 48: 'Изморозь', 51: 'Морось', 53: 'Морось', 55: 'Сильная морось',
  56: 'Ледяная морось', 57: 'Ледяная морось', 61: 'Небольшой дождь', 63: 'Дождь',
  65: 'Ливень', 66: 'Ледяной дождь', 67: 'Ледяной ливень', 71: 'Небольшой снег',
  73: 'Снег', 75: 'Снегопад', 77: 'Снежная крупа', 80: 'Небольшие ливни',
  81: 'Ливни', 82: 'Сильные ливни', 85: 'Снежные ливни', 86: 'Сильные снежные ливни',
  95: 'Гроза', 96: 'Гроза с градом', 99: 'Сильная гроза'
};

const WEATHER_EMOJI = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️', 56: '🌧️', 57: '🌧️',
  61: '🌦️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️', 77: '🌨️', 80: '🌦️', 81: '🌧️', 82: '🌧️',
  85: '🌨️', 86: '❄️', 95: '⛈️', 96: '⛈️', 99: '⛈️'
};

function WeatherBadge({ fallbackCoords, style }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const abortRef = useRef(null);

  const fetchWeather = useCallback(async (coords) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(false);
    try {
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code,is_day&timezone=auto`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const current = data.current || {};
      setWeather({
        temp: Math.round(current.temperature_2m),
        code: current.weather_code,
        isDay: current.is_day,
      });
      setError(false);
    } catch (e) {
      if (e.name !== 'AbortError') setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let coords = fallbackCoords;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => fetchWeather(coords),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    } else {
      fetchWeather(coords);
    }
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [fallbackCoords, fetchWeather]);

  if (error || (!loading && !weather)) return null;

  if (loading) {
    return (
      <span style={style} className="weather-badge-loading">
        <span className="weather-badge-spinner"></span>
      </span>
    );
  }

  const emoji = WEATHER_EMOJI[weather.code] || '🌡️';
  const desc = WEATHER_CODES_RU[weather.code] || '';

  return (
    <button
      type="button"
      onClick={() => fetchWeather(fallbackCoords)}
      style={style}
      title={`${desc} • Нажмите для обновления`}
      className="weather-badge"
    >
      <span>{emoji}</span>
      <span>{weather.temp > 0 ? '+' : ''}{weather.temp}°C</span>
    </button>
  );
}

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const [newProdStock, setNewProdStock] = useState(0);
  const [newProdAvailable, setNewProdAvailable] = useState(true);
  const [editProductId, setEditProductId] = useState(null);    // режим редактирования
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // подтверждение удаления
  // ===== СТЕЙТ ДЛЯ МОДАЛКИ ДОБАВЛЕНИЯ ТОВАРА =====
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // ===== СТЕЙТ ДЛЯ НАСТРОЕК ГЛАВНОГО ЭКРАНА =====
  const [heroImage, setHeroImage] = useState('https://i.ibb.co/zH6mCgN/stitch.png');
  const [settingsHeroUrl, setSettingsHeroUrl] = useState('');
  const [settingsHeroFile, setSettingsHeroFile] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
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
      // Сбрасываем hasMore корректно: если вернулось меньше 4 — больше нечего грузить
      setHasMore(data.length === 4);
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

  // Загрузка настроек главного экрана
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.hero_image) {
          setHeroImage(data.hero_image);
          setSettingsHeroUrl(data.hero_image);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    const formData = new FormData();
    formData.append('hero_image_url', settingsHeroUrl);
    if (settingsHeroFile) {
      formData.append('hero_image_file', settingsHeroFile);
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        alert('✅ Изображение главного экрана обновлено!');
        if (data.hero_image) {
          setHeroImage(data.hero_image);
          setSettingsHeroUrl(data.hero_image);
          setSettingsHeroFile(null);
          const fileInput = document.getElementById('hero-file-input');
          if (fileInput) fileInput.value = '';
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert('❌ Ошибка сохранения настроек: ' + (errData.error || `Код ${res.status}`));
      }
    } catch (err) {
      alert('❌ Ошибка: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

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
    formData.append('stock', String(newProdStock));
    formData.append('is_available', String(newProdAvailable));

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
    setNewProdStock(0);
    setNewProdAvailable(true);
    setEditProductId(null);
  };

  // Заполнить форму для редактирования
  const startEditProduct = (product) => {
    setNewProdName(product.name);
    setNewProdPrice(formatPrice(product.price));
    setNewProdOzon(product.ozon_url);
    setNewProdUrls(product.images);
    setNewProdStock(product.stock ?? 0);
    setNewProdAvailable(product.is_available === true || product.is_available === 1);
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

  // Удаление заявки
  const handleDeleteLead = async (id) => {
    if (!window.confirm(`Вы уверены, что хотите удалить заявку #${id}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/leads/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAdminData();
      } else if (res.status === 401) {
        setIsAdminLoggedIn(false);
        alert('Сессия истекла. Пожалуйста, войдите в панель управления заново.');
      } else {
        const textData = await res.text();
        let errData = {};
        try { errData = JSON.parse(textData); } catch (e) {}
        alert('❌ Ошибка удаления заявки: ' + (errData.error || `Код ${res.status}`));
      }
    } catch (err) {
      alert('Ошибка подключения к серверу при удалении');
    }
  };

  // Переключение наличия товара прямо из таблицы
  const handleToggleAvailability = async (product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}/toggle`, { method: 'POST' });
      if (res.ok) {
        loadAdminData();
      } else {
        alert('❌ Ошибка переключения доступности');
      }
    } catch (err) {
      alert('❌ Ошибка: ' + err.message);
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

  // Маска цены (рубль)
  const formatPrice = (value) => {
    if (typeof value !== 'string') return '';
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return '';
    const formattedDigits = Number(digits).toLocaleString('ru-RU');
    return `${formattedDigits} ₽`;
  };

  const handlePriceChange = (e) => {
    let val = e.target.value;
    
    if (val === '') {
      setNewProdPrice('');
      return;
    }

    const oldDigits = newProdPrice.replace(/[^\d]/g, '');
    const newDigits = val.replace(/[^\d]/g, '');

    // Если количество цифр не изменилось, но длина строки уменьшилась,
    // значит стёрли пробел или символ рубля. В таком случае удаляем последнюю цифру.
    if (newDigits === oldDigits && val.length < newProdPrice.length) {
      if (oldDigits.length > 0) {
        val = oldDigits.slice(0, -1);
      }
    }

    setNewProdPrice(formatPrice(val));
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
          <img src={heroImage} alt="Хит продаж" className="hero-image" />
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
            const hasLimitedStock = inStock && product.stock > 0 && product.stock <= 5;

            return (
              <div key={product.id} className="product-card" style={{ animationDelay: `${index * 0.08}s` }}>
                <div className="image-container">
                  {hasLimitedStock && (
                    <span className="badge badge-hot">🔥 Хит</span>
                  )}
                  {inStock && product.stock > 20 && (
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
                  {inStock && (
                    <div className="stock-info">
                      <span className="stock-dot"></span>
                      {hasLimitedStock ? `Осталось ${product.stock} шт` : 'В наличии'}
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
                <>
                  {/* Десктопная таблица */}
                  <div className="products-table products-table-desktop">
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

                  {/* Мобильные карточки товаров */}
                  <div className="products-cards-mobile">
                    {adminProducts.map(product => {
                      const imagesArray = product.images.split(';');
                      const firstImage = imagesArray[0] || '';
                      const inStock = product.is_available === true || product.is_available === 1 || product.is_available === 'true';

                      return (
                        <div key={product.id} className="admin-product-card">
                          <div className="admin-product-card-top">
                            <div className="admin-product-card-img">
                              {firstImage && (
                                <img src={firstImage.startsWith('http') ? firstImage : ''} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
                              )}
                            </div>
                            <div className="admin-product-card-info">
                              <span className="admin-product-card-id">#{product.id}</span>
                              <h4 className="admin-product-card-name">{product.name}</h4>
                              <span className="admin-product-card-price">{product.price}</span>
                            </div>
                          </div>
                          <div className="admin-product-card-bottom">
                            <label className="toggle-switch">
                              <input 
                                type="checkbox" 
                                checked={inStock} 
                                onChange={() => handleToggleAvailability(product)}
                              />
                              <span className="toggle-slider"></span>
                              <span className="toggle-label">{inStock ? 'В наличии' : 'Нет'}</span>
                            </label>
                            <div className="admin-product-card-actions">
                              <button className="btn-edit" onClick={() => {
                                startEditProduct(product);
                                setIsAddModalOpen(true);
                              }} title="Редактировать">✏️</button>
                              <button className="btn-delete" onClick={() => setDeleteConfirmId(product.id)} title="Удалить">🗑️</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
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
            <div className="admin-block">
              <h3>Настройки главного экрана</h3>
              <form onSubmit={handleSaveSettings} className="admin-form">
                <div className="form-group">
                  <label>Текущий хит продаж:</label>
                  {heroImage && (
                    <img 
                      src={heroImage} 
                      alt="Превью" 
                      style={{ 
                        width: '100%', 
                        maxHeight: '180px', 
                        objectFit: 'contain', 
                        borderRadius: 'var(--radius-sm)', 
                        marginTop: '8px', 
                        border: '1.5px solid var(--glass-border)',
                        background: 'rgba(255, 255, 255, 0.40)'
                      }} 
                    />
                  )}
                </div>
                <div className="form-group">
                  <label>Ссылка на изображение</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/image.png" 
                    value={settingsHeroUrl} 
                    onChange={(e) => setSettingsHeroUrl(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>Или загрузить файл</label>
                  <input 
                    id="hero-file-input"
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setSettingsHeroFile(e.target.files ? e.target.files[0] : null)} 
                  />
                </div>
                <button type="submit" className="btn-admin-submit" disabled={isSavingSettings}>
                  {isSavingSettings ? 'Сохранение...' : '💾 Сохранить изображение'}
                </button>
              </form>
            </div>

            <div className="admin-block admin-block-compact">
              <h3>Поступившие заявки (Лиды)</h3>
              <div className="leads-list">
                {adminLeads.length === 0 ? <p className="admin-empty-hint">Новых заявок нет</p> : 
                  adminLeads.map(lead => (
                    <div key={lead.id} className="lead-item-card">
                      <div className="lead-meta">
                        <span>ID: #{lead.id}</span>
                        <div className="lead-meta-right">
                          <span>{lead.created_at ? new Date(lead.created_at).toLocaleString() : ''}</span>
                          <button 
                            className="btn-delete-lead" 
                            onClick={() => handleDeleteLead(lead.id)}
                            title="Удалить заявку"
                          >
                            🗑️
                          </button>
                        </div>
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
                  <input 
                    type="text" 
                    value={newProdPrice} 
                    onChange={handlePriceChange} 
                    placeholder="450 ₽" 
                    required 
                  />
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
                <div className="form-group">
                  <label>Количество на складе</label>
                  <input
                    type="number"
                    min="0"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                  <label style={{ margin: 0 }}>В наличии</label>
                  <input
                    type="checkbox"
                    checked={newProdAvailable}
                    onChange={(e) => setNewProdAvailable(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
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
        <div className="navbar-left">
          <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigateTo('/')}>
            ❄️ <span>Мороз Плей</span>
          </div>
          {currentPath !== '/admin' && (
            <nav className="nav-links nav-links-desktop">
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
          )}
        </div>
        <div className="navbar-right">
          {currentPath === '/admin' ? (
            <>
              <span className="admin-header-title">Панель управления</span>
              {isAdminLoggedIn && (
                <button className="btn-logout" onClick={handleLogout}>Выйти</button>
              )}
            </>
          ) : (
            <>
              <WeatherBadge
                fallbackCoords={MOSCOW_COORDS}
                style={{
                  background: 'rgba(58,160,232,0.10)',
                  border: '1px solid rgba(58,160,232,0.25)',
                  borderRadius: '20px',
                  color: 'var(--accent-dark)',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '5px 14px',
                  minHeight: '32px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              />
              <button className="cart-btn cart-btn-desktop" onClick={() => setIsCartOpen(true)}>
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
              {/* Мобильная кнопка корзины (компактная) */}
              <button className="cart-btn-mobile" onClick={() => setIsCartOpen(true)}>
                🛒
                {cart.reduce((sum, i) => sum + i.quantity, 0) > 0 && (
                  <span className="cart-mobile-badge">
                    {cart.reduce((sum, i) => sum + i.quantity, 0)}
                  </span>
                )}
              </button>
            </>
          )}
          {/* Гамбургер-меню (только мобилка) */}
          {currentPath !== '/admin' && (
            <button
              className={`hamburger-btn ${isMobileMenuOpen ? 'open' : ''}`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Меню"
            >
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </button>
          )}
        </div>
      </header>

      {/* Мобильное меню (overlay) */}
      {isMobileMenuOpen && currentPath !== '/admin' && (
        <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { navigateTo('/'); setIsMobileMenuOpen(false); }}
              className={currentPath === '/' || currentPath === '/services' ? 'active' : ''}
            >
              🏠 Главная
            </button>
            <button
              onClick={() => { navigateTo('/contacts'); setIsMobileMenuOpen(false); }}
              className={currentPath === '/contacts' ? 'active' : ''}
            >
              📞 Контакты
            </button>
            <button
              onClick={() => { navigateTo('/admin'); setIsMobileMenuOpen(false); }}
              className={currentPath === '/admin' ? 'active' : ''}
            >
              ⚙️ Админка
            </button>
          </nav>
        </div>
      )}

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
