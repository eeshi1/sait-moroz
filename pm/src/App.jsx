import React, { useState, useEffect } from 'react';
// ИМПОРТИРУЕМ ТВОЙ МОДУЛЬ №3 (ПОГОДА И ГЕОЛОКАЦИЯ)
import GeoWeather from './modules/geo-weather';

export default function App() {
  // Навигация: 'shop' | 'login' | 'admin'
  const [view, setView] = useState('shop');
  const [user, setUser] = useState(null);

  // Состояние каталога
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Состояние админки
  const [adminLeads, setAdminLeads] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminTab, setAdminTab] = useState('leads'); // 'leads' | 'products'

  // Модалки на главном сайте
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', message: '' });
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Модалки в админке
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditProduct, setCurrentEditProduct] = useState(null);

  // Форма логина
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Проверка авторизации при загрузке
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn) {
          setUser(data.username);
        }
      });
    loadProducts(1, true);
  }, []);

  // Загрузка товаров для главного сайта
  const loadProducts = async (pageNum, replace = false) => {
    try {
      const res = await fetch(`/api/products?page=${pageNum}&limit=4`);
      const data = await res.json();
      if (data.length < 4) setHasMore(false);
      if (replace) {
        setProducts(data);
      } else {
        setProducts(prev => [...prev, ...data]);
      }
    } catch (err) {
      console.error("Ошибка загрузки товаров:", err);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadProducts(nextPage, false);
  };

  // Загрузка данных для админки
  const loadAdminData = async () => {
    try {
      const res = await fetch('/api/admin/data');
      if (res.status === 401) {
        setView('login');
        return;
      }
      const data = await res.json();
      setAdminLeads(data.leads);
      setAdminProducts(data.products);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (view === 'admin') {
      loadAdminData();
    }
  }, [view]);

  // Обработка отправки заявки
  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadForm)
      });
      const data = await res.json();
      if (data.success) {
        setLeadSuccess(true);
        setLeadForm({ name: '', phone: '', message: '' });
        setTimeout(() => {
          setIsLeadModalOpen(false);
          setLeadSuccess(false);
        }, 2000);
      }
    } catch (err) {
      alert('Ошибка отправки заявки');
    }
  };

  // Авторизация
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.username);
        setView('admin');
      } else {
        setLoginError(data.error);
      }
    } catch (err) {
      setLoginError('Ошибка соединения с сервером');
    }
  };

  // Выход
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setView('shop');
  };

  // Быстрое сохранение (цена, склад, статус)
  const handleQuickSave = async (productId, price, stock, is_available) => {
    try {
      const res = await fetch('/api/admin/products/update-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, price, stock, is_available })
      });
      const data = await res.json();
      if (data.success) {
        const row = document.getElementById(`row-${productId}`);
        row.classList.add('bg-emerald-500/10');
        setTimeout(() => row.classList.remove('bg-emerald-500/10'), 1000);
        loadAdminData();
      }
    } catch (err) {
      alert('Ошибка быстрого сохранения');
    }
  };

  // Удаление товара
  const handleDeleteProduct = async (id) => {
    if (!confirm('Вы уверены, что хотите удалить товар?')) return;
    try {
      const res = await fetch(`/api/admin/products/delete/${id}`, { method: 'POST' });
      if (res.ok) {
        loadAdminData();
        loadProducts(1, true);
      }
    } catch (err) {
      alert('Ошибка удаления');
    }
  };

  // Добавление товара (Form Data)
  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const res = await fetch('/api/admin/products/add', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        loadAdminData();
        loadProducts(1, true);
      }
    } catch (err) {
      alert('Ошибка добавления товара');
    }
  };

  // Полное редактирование товара (Form Data)
  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const res = await fetch('/api/admin/products/edit', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        loadAdminData();
        loadProducts(1, true);
      }
    } catch (err) {
      alert('Ошибка редактирования товара');
    }
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen flex flex-col">
      {/* ШАПКА САЙТА */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button onClick={() => setView('shop')} className="brand-font text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
            <i className="fa-solid fa-snowflake text-cyan-400"></i> Мороз Плей
          </button>
          
          {/* ПРАВАЯ ЧАСТЬ ШАПКИ */}
          <div className="flex items-center gap-6">
            
            {/* ТВОЙ ПОДКЛЮЧЕННЫЙ МОДУЛЬ №3 (ПОГОДА И ГЕОЛОКАЦИЯ) */}
            <div className="hidden md:block bg-slate-950/50 border border-slate-800/60 px-4 py-1.5 rounded-2xl">
              <GeoWeather />
            </div>

            <nav className="flex items-center gap-6">
              <button onClick={() => setView('shop')} className="text-slate-300 hover:text-white transition font-semibold">Главная</button>
              {user ? (
                <>
                  <button onClick={() => setView('admin')} className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-500 hover:text-slate-950 transition">
                    Панель управления
                  </button>
                  <button onClick={handleLogout} className="text-red-400 hover:text-red-300 transition text-sm font-semibold">Выйти</button>
                </>
              ) : (
                <button onClick={() => setView('login')} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1">
                  <i className="fa-solid fa-user-gear"></i> Войти
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* ГЛАВНЫЙ ЭКРАН МАГАЗИНА */}
      {view === 'shop' && (
        <main className="flex-grow">
          {/* Герой-секция */}
          <section className="max-w-7xl mx-auto px-6 py-20 text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
              Территория Крутых Игрушек <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">и Трендов!</span>
            </h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Добро пожаловать в официальный магазин бренда Мороз Плей. Мы находим самые хайповые антистрессы, милые мягкие игрушки и гаджеты, которые обожают дети и взрослые!
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setIsLeadModalOpen(true)} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-8 py-4 rounded-2xl transition shadow-lg shadow-cyan-500/20 flex items-center gap-2">
                <i className="fa-solid fa-envelope"></i> Сотрудничество
              </button>
              <a href="#catalog" className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-8 py-4 rounded-2xl font-bold transition flex items-center gap-2">
                Смотреть каталог <i className="fa-solid fa-arrow-down"></i>
              </a>
            </div>
          </section>

          {/* Каталог товаров */}
          <section id="catalog" className="max-w-7xl mx-auto px-6 py-12 space-y-8">
            <div className="border-t border-slate-900 pt-12">
              <h2 className="text-3xl font-bold">Каталог товаров</h2>
              <p className="text-slate-500 mt-1">Листайте фотографии товаров. Нажмите «Показать еще» для загрузки остальных новинок!</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {products.map(product => {
                const firstImg = (product.images || '').split(';')[0] || 'https://via.placeholder.com/150';
                return (
                  <div key={product.id} className="bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden hover:border-cyan-500/30 transition flex flex-col group">
                    <div className="relative aspect-square bg-slate-950 flex items-center justify-center p-4">
                      <img src={firstImg} className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300" alt={product.name} />
                    </div>
                    <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
                      <div>
                        <h3 className="font-bold text-lg text-white line-clamp-2">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-semibold">
                            {product.stock > 0 ? `В наличии: ${product.stock} шт` : 'Под заказ'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xl font-extrabold text-cyan-400">{product.price}</span>
                        <a href={product.ozon_url} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition flex items-center gap-1.5">
                          Купить на Ozon <i className="fa-solid fa-up-right-from-square text-xs"></i>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="text-center pt-8">
                <button onClick={handleLoadMore} className="bg-slate-900 hover:bg-slate-800 border border-slate-800 px-8 py-3.5 rounded-xl font-bold transition">
                  Показать еще товары
                </button>
              </div>
            )}
          </section>
        </main>
      )}

      {/* ОКНО АВТОРИЗАЦИИ */}
      {view === 'login' && (
        <main className="flex-grow flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <h2 className="brand-font text-2xl font-bold text-cyan-400">Вход в панель управления</h2>
              <p className="text-slate-500 text-sm">Введите логин и пароль администратора</p>
            </div>

            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center font-semibold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Логин</label>
                <input type="text" required value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Пароль</label>
                <input type="password" required value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:border-cyan-500 focus:outline-none transition" />
              </div>
              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-cyan-500/20">
                Войти в админку
              </button>
            </form>
          </div>
        </main>
      )}

      {/* ПАНЕЛЬ УПРАВЛЕНИЯ (АДМИНКА) */}
      {view === 'admin' && (
        <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-grow space-y-8">
          {/* Вкладки навигации */}
          <div className="flex border-b border-slate-800 gap-6">
            <button onClick={() => setAdminTab('leads')} className={`pb-4 text-base font-bold border-b-2 transition flex items-center gap-2 ${adminTab === 'leads' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-envelope"></i> Заявки клиентов 
              <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">{adminLeads.length}</span>
            </button>
            <button onClick={() => setAdminTab('products')} className={`pb-4 text-base font-bold border-b-2 transition flex items-center gap-2 ${adminTab === 'products' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-white'}`}>
              <i className="fa-solid fa-boxes-stacked"></i> Каталог товаров
              <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">{adminProducts.length}</span>
            </button>
          </div>

          {/* ВКЛАДКА ЗАЯВОК */}
          {adminTab === 'leads' && (
            <section className="space-y-6">
              <h2 className="text-2xl font-bold">Входящие предложения о сотрудничестве</h2>
              {adminLeads.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center text-slate-500">
                  <i className="fa-solid fa-folder-open text-4xl mb-3"></i>
                  <p>Заявок пока нет</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {adminLeads.map(lead => (
                    <div key={lead.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-lg">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg text-white">{lead.name}</h3>
                        <span className="text-xs text-slate-500">ID: {lead.id}</span>
                      </div>
                      <div className="space-y-2 text-sm text-slate-300">
                        <p><strong className="text-slate-500">Телефон:</strong> <a href={`tel:${lead.phone}`} className="text-cyan-400 hover:underline">{lead.phone}</a></p>
                        <p className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-slate-400 italic">
                          "{lead.message}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ВКЛАДКА ТОВАРОВ */}
          {adminTab === 'products' && (
            <section className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Управление товарами</h2>
                  <p className="text-slate-500 text-sm mt-1">Добавляйте новинки и редактируйте цены или остатки «на лету».</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-3 rounded-2xl transition flex items-center gap-2 shadow-lg shadow-cyan-500/10">
                  <i className="fa-solid fa-plus"></i> Добавить товар
                </button>
              </div>

              {/* Таблица */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="p-5">Товар</th>
                        <th className="p-5">Цена (₽)</th>
                        <th className="p-5">На складе (шт)</th>
                        <th className="p-5">Статус</th>
                        <th className="p-5 text-center">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {adminProducts.map(product => {
                        const firstImg = (product.images || '').split(';')[0] || 'https://via.placeholder.com/150';
                        return (
                          <tr key={product.id} id={`row-${product.id}`} className="hover:bg-slate-850/40 transition">
                            <td className="p-5 flex items-center gap-4">
                              <img src={firstImg} className="w-12 h-12 rounded-xl object-contain bg-slate-950 p-1 border border-slate-800" alt="" />
                              <div>
                                <div className="font-bold text-white max-w-xs truncate">{product.name}</div>
                                <a href={product.ozon_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                                  <i className="fa-solid fa-up-right-from-square text-[10px]"></i> Ссылка на Ozon
                                </a>
                              </div>
                            </td>
                            <td className="p-5">
                              <input type="text" defaultValue={product.price} id={`price-${product.id}`} className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-white w-24 text-center focus:border-cyan-500 focus:outline-none transition" />
                            </td>
                            <td className="p-5">
                              <input type="number" defaultValue={product.stock || 0} id={`stock-${product.id}`} className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-white w-20 text-center focus:border-cyan-500 focus:outline-none transition" />
                            </td>
                            <td className="p-5">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked={product.is_available} id={`avail-${product.id}`} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-cyan-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-950"></div>
                                <span className="ml-3 text-xs font-semibold text-slate-400 peer-checked:text-cyan-400">
                                  В наличии
                                </span>
                              </label>
                            </td>
                            <td className="p-5">
                              <div className="flex items-center justify-center gap-2">
                                {/* Быстрое сохранение */}
                                <button onClick={() => {
                                  const pr = document.getElementById(`price-${product.id}`).value;
                                  const st = document.getElementById(`stock-${product.id}`).value;
                                  const av = document.getElementById(`avail-${product.id}`).checked;
                                  handleQuickSave(product.id, pr, st, av);
                                }} className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white p-2.5 rounded-xl border border-emerald-500/20 transition" title="Сохранить цену и склад">
                                  <i className="fa-solid fa-floppy-disk"></i>
                                </button>
                                
                                {/* Полное редактирование */}
                                <button onClick={() => {
                                  setCurrentEditProduct(product);
                                  setIsEditModalOpen(true);
                                }} className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white p-2.5 rounded-xl border border-amber-500/20 transition" title="Редактировать всё">
                                  <i className="fa-solid fa-pen-to-square"></i>
                                </button>

                                {/* Удаление */}
                                <button onClick={() => handleDeleteProduct(product.id)} className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white p-2.5 rounded-xl border border-red-500/20 transition" title="Удалить товар">
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {/* МОДАЛКА: СОТРУДНИЧЕСТВО (ГЛАВНАЯ) */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="brand-font text-xl font-bold">Сотрудничество</h3>
              <button onClick={() => setIsLeadModalOpen(false)} className="text-slate-400 hover:text-white text-xl"><i className="fa-solid fa-xmark"></i></button>
            </div>
            {leadSuccess ? (
              <div className="text-center py-8 space-y-2">
                <i className="fa-solid fa-circle-check text-5xl text-emerald-400"></i>
                <h4 className="text-lg font-bold">Заявка успешно отправлена!</h4>
                <p className="text-slate-400 text-sm">Мы свяжемся с вами в ближайшее время.</p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Ваше имя</label>
                  <input type="text" required value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} placeholder="Иван" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Телефон</label>
                  <input type="tel" required value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} placeholder="+7 (999) 999-99-99" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Сообщение</label>
                  <textarea required value={leadForm.message} onChange={e => setLeadForm({...leadForm, message: e.target.value})} placeholder="Расскажите о предложении..." rows="3" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 rounded-xl">Отправить заявку</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* МОДАЛКА: ДОБАВЛЕНИЕ ТОВАРА (АДМИНКА) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="brand-font text-xl font-bold">Добавить новый товар</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white text-xl"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-4 overflow-y-auto flex-grow">
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Название товара</label>
                <input type="text" name="name" required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Цена</label>
                  <input type="text" name="price" required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">На складе</label>
                  <input type="number" name="stock" required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Ссылка на Ozon</label>
                <input type="url" name="ozon_url" required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <label className="block text-slate-400 text-xs mb-1">Загрузить фото</label>
                <input type="file" name="images_files" multiple accept="image/*" className="w-full text-sm text-slate-400" />
                <label className="block text-slate-400 text-xs mb-1">Или ссылки на фото (через `;` )</label>
                <textarea name="images_urls" rows="2" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"></textarea>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" name="is_available" value="1" defaultChecked id="add-avail" className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-cyan-500" />
                <label htmlFor="add-avail" className="text-sm text-slate-300 font-semibold cursor-pointer">Опубликовать</label>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold py-3 rounded-xl">Опубликовать товар</button>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА: РЕДАКТИРОВАНИЕ ТОВАРА (АДМИНКА) */}
      {isEditModalOpen && currentEditProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="brand-font text-xl font-bold text-amber-400">Редактировать товар</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white text-xl"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleEditProductSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              <input type="hidden" name="id" value={currentEditProduct.id} />
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Название товара</label>
                <input type="text" name="name" defaultValue={currentEditProduct.name} required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Цена</label>
                  <input type="text" name="price" defaultValue={currentEditProduct.price} required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">На складе</label>
                  <input type="number" name="stock" defaultValue={currentEditProduct.stock} required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase mb-1.5">Ссылка на Ozon</label>
                <input type="url" name="ozon_url" defaultValue={currentEditProduct.ozon_url} required className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <label className="block text-slate-400 text-xs mb-1">Загрузить новые фото (оставьте пустым, чтобы не менять)</label>
                <input type="file" name="images_files" multiple accept="image/*" className="w-full text-sm text-slate-400" />
                <label className="block text-slate-400 text-xs mb-1">Ссылки на фото через `;`</label>
                <textarea name="images_urls" defaultValue={currentEditProduct.images} rows="2" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"></textarea>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" name="is_available" value="1" defaultChecked={currentEditProduct.is_available} id="edit-avail" className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-cyan-500" />
                <label htmlFor="edit-avail" className="text-sm text-slate-300 font-semibold cursor-pointer">Опубликовать</label>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold py-3 rounded-xl">Сохранить изменения</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}