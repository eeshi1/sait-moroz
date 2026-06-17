const express = require('express');
const sql = require('mssql/msnodesqlv8'); // Используем локальный драйвер Windows
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const multer = require('multer');

const app = express();

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Прямая строка подключения к локальному инстансу (обходит сетевые блокировки портов)
const dbConfig = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS;Database=vorobyev_db;Trusted_Connection=yes;',
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Успешное подключение к MS SQL Server!');
        return pool;
    })
    .catch(err => {
        console.error('Ошибка подключения MS SQL:', err);
        process.exit(1);
    });

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 

// Раздача статических файлов (загруженные картинки бэкенда)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// Раздача собранного React-приложения (production)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use(session({
    secret: 'my-super-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 2, // 2 часа
        secure: false 
    }
}));

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Middleware для проверки авторизации через API
function checkAuthAPI(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: "Не авторизован" });
    }
}

// --- API АВТОРИЗАЦИИ ---
app.get('/api/auth/me', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.json({ loggedIn: false });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = hashPassword(password);
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query("INSERT INTO users (username, password) VALUES (@username, @password)");
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: 'Этот логин уже занят!' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = hashPassword(password);
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query("SELECT * FROM users WHERE username = @username AND password = @password");
        const user = result.recordset[0];
        if (user) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ success: true, username: user.username });
        } else {
            res.status(400).json({ error: 'Неверный логин или пароль!' });
        }
    } catch (err) {
        res.status(500).json({ error: "Ошибка авторизации на сервере" });
    }
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// --- API ТОВАРОВ И ЗАЯВОК ---
app.get('/api/products', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const offset = (page - 1) * limit;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, limit)
            .query(`
                SELECT * FROM services 
                ORDER BY id DESC
                OFFSET @offset ROWS 
                FETCH NEXT @limit ROWS ONLY
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Ошибка БД" });
    }
});

app.post('/api/leads', async (req, res) => {
    const { name, phone, message } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('phone', sql.NVarChar, phone)
            .input('message', sql.NVarChar, message)
            .query("INSERT INTO leads (name, phone, message) VALUES (@name, @phone, @message)");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- API АДМИНКА (ЗАЩИЩЕННЫЕ) ---
app.get('/api/admin/data', checkAuthAPI, async (req, res) => {
    try {
        const pool = await poolPromise;
        const leadsResult = await pool.request().query("SELECT * FROM leads ORDER BY id DESC");
        const productsResult = await pool.request().query("SELECT * FROM services ORDER BY id DESC");
        res.json({
            leads: leadsResult.recordset,
            products: productsResult.recordset
        });
    } catch (err) {
        res.status(500).json({ error: "Ошибка загрузки данных админки" });
    }
});

// Добавление товара через API
app.post('/api/admin/products/add', checkAuthAPI, upload.array('images_files', 5), async (req, res) => {
    const { name, price, ozon_url, stock, is_available, images_urls } = req.body;
    let imagesList = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    if (images_urls) {
        const urls = images_urls.split(';').map(u => u.trim()).filter(u => u !== '');
        imagesList = [...imagesList, ...urls];
    }
    const imagesString = imagesList.join(';');
    const stockVal = parseInt(stock) || 0;
    const availableVal = is_available === 'true' || is_available === '1' || is_available === 'on' ? 1 : 0;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('price', sql.NVarChar, price)
            .input('ozon_url', sql.NVarChar, ozon_url)
            .input('images', sql.NVarChar, imagesString)
            .input('stock', sql.Int, stockVal)
            .input('is_available', sql.Bit, availableVal)
            .query(`
                INSERT INTO services (name, price, ozon_url, images, stock, is_available) 
                VALUES (@name, @price, @ozon_url, @images, @stock, @is_available)
            `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Ошибка добавления товара" });
    }
});

// Редактирование товара через API
app.post('/api/admin/products/edit', checkAuthAPI, upload.array('images_files', 5), async (req, res) => {
    const { id, name, price, ozon_url, stock, is_available, images_urls } = req.body;
    
    let imagesList = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    if (images_urls) {
        const urls = images_urls.split(';').map(u => u.trim()).filter(u => u !== '');
        imagesList = [...imagesList, ...urls];
    }
    const imagesString = imagesList.join(';');
    const stockVal = parseInt(stock) || 0;
    const availableVal = is_available === 'true' || is_available === '1' || is_available === 'on' ? 1 : 0;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('name', sql.NVarChar, name)
            .input('price', sql.NVarChar, price)
            .input('ozon_url', sql.NVarChar, ozon_url)
            .input('images', sql.NVarChar, imagesString)
            .input('stock', sql.Int, stockVal)
            .input('is_available', sql.Bit, availableVal)
            .query(`
                UPDATE services 
                SET name = @name, price = @price, ozon_url = @ozon_url, images = @images, stock = @stock, is_available = @is_available
                WHERE id = @id
            `);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Ошибка редактирования товара" });
    }
});
// Правило для работы роутинга React: перенаправляет все GET-запросы на index.html
app.get('*any', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}. Админка доступна: http://localhost:3000/admin`);
});
