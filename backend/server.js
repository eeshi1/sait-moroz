const express = require('express');
const sql = require('mssql/msnodesqlv8');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Убедимся, что папка для загрузок существует
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Подключение к MS SQL Server
const dbConfig = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS;Database=vorobyev_db;Trusted_Connection=yes;',
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(async pool => {
        console.log('✅ Успешное подключение к MS SQL Server!');
        try {
            await pool.request().query(`
                IF OBJECT_ID('dbo.settings', 'U') IS NULL
                CREATE TABLE dbo.settings (
                    key_name NVARCHAR(255) PRIMARY KEY,
                    key_value NVARCHAR(MAX) NOT NULL
                )
            `);
            await pool.request().query(`
                IF NOT EXISTS (SELECT 1 FROM dbo.settings WHERE key_name = 'hero_image')
                INSERT INTO dbo.settings (key_name, key_value) VALUES ('hero_image', '/uploads/hero.png')
            `);
            console.log('✅ Таблица settings проверена/создана!');
        } catch (dbErr) {
            console.error('❌ Ошибка при инициализации таблицы settings:', dbErr.message);
        }
        return pool;
    })
    .catch(err => {
        console.error('❌ Ошибка подключения MS SQL:', err.message);
        process.exit(1);
    });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Раздача загруженных файлов
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Раздача собранного React-приложения (в production)
const distPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

app.use(session({
    secret: 'my-super-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 2,
        secure: false 
    }
}));

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Middleware для проверки авторизации
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

// --- API ТОВАРОВ ---
app.get('/api/products', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
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

// --- API ЗАЯВОК ---
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

// --- API НАСТРОЕК ---
app.get('/api/settings', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM settings");
        const settings = {};
        result.recordset.forEach(row => {
            settings[row.key_name] = row.key_value;
        });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: "Ошибка получения настроек" });
    }
});

const http = require('http');
const https = require('https');

function downloadImage(url, destFolder, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (response) => {
            // Обработка редиректов (301, 302, 303, 307, 308)
            if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
                if (maxRedirects <= 0) {
                    return reject(new Error('Too many redirects'));
                }
                let redirectUrl = response.headers.location;
                if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
                    redirectUrl = new URL(redirectUrl, url).toString();
                }
                return downloadImage(redirectUrl, destFolder, maxRedirects - 1)
                    .then(resolve)
                    .catch(reject);
            }

            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download image, status: ${response.statusCode}`));
            }

            let ext = '.png';
            const contentType = response.headers['content-type'];
            if (contentType) {
                if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
                else if (contentType.includes('gif')) ext = '.gif';
                else if (contentType.includes('webp')) ext = '.webp';
                else if (contentType.includes('svg')) ext = '.svg';
            } else {
                try {
                    const parsed = path.parse(new URL(url).pathname);
                    if (parsed.ext) ext = parsed.ext;
                } catch (e) {}
            }

            const filename = 'url-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
            const destPath = path.join(destFolder, filename);
            const fileStream = fs.createWriteStream(destPath);

            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve(`/uploads/${filename}`);
            });

            fileStream.on('error', (err) => {
                fs.unlink(destPath, () => {});
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

app.post('/api/admin/settings', checkAuthAPI, upload.single('hero_image_file'), async (req, res) => {
    const { hero_image_url } = req.body;
    let heroImageVal = hero_image_url || '';

    if (req.file) {
        heroImageVal = `/uploads/${req.file.filename}`;
    }

    if (!heroImageVal) {
        return res.status(400).json({ error: "Не указана ссылка и не загружен файл" });
    }

    try {
        // Если указана внешняя ссылка (http/https), скачиваем её локально
        if (heroImageVal.startsWith('http://') || heroImageVal.startsWith('https://')) {
            try {
                console.log(`📥 Скачивание внешнего изображения: ${heroImageVal}`);
                const localPath = await downloadImage(heroImageVal, uploadsDir);
                heroImageVal = localPath;
                console.log(`✅ Изображение скачано локально: ${heroImageVal}`);
            } catch (dlErr) {
                console.error("❌ Ошибка скачивания изображения по URL:", dlErr.message);
                // Сохраняем исходный URL как резервный вариант, если загрузка не удалась
            }
        }

        const pool = await poolPromise;
        await pool.request()
            .input('value', sql.NVarChar, heroImageVal)
            .query("UPDATE settings SET key_value = @value WHERE key_name = 'hero_image'");
        res.json({ success: true, hero_image: heroImageVal });
    } catch (err) {
        res.status(500).json({ error: "Ошибка сохранения настроек: " + err.message });
    }
});

// --- API АДМИНКИ ---
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

app.post('/api/admin/products/add', checkAuthAPI, upload.array('images_files', 5), async (req, res) => {
    const { name, price, ozon_url, images_urls, stock, is_available } = req.body;
    console.log('🔧 Добавление товара:', { name, price });

    let imagesList = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    if (images_urls) {
        const urls = images_urls.split(';').map(u => u.trim()).filter(u => u !== '');
        const processedUrls = [];
        for (const url of urls) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                try {
                    console.log(`📥 Скачивание картинки товара: ${url}`);
                    const localPath = await downloadImage(url, uploadsDir);
                    processedUrls.push(localPath);
                    console.log(`✅ Картинка скачана: ${localPath}`);
                } catch (dlErr) {
                    console.error(`❌ Ошибка скачивания картинки товара: ${url}, ошибка:`, dlErr.message);
                    processedUrls.push(url); // fallback to original URL
                }
            } else {
                processedUrls.push(url);
            }
        }
        imagesList = [...imagesList, ...processedUrls];
    }
    const imagesString = imagesList.join(';') || '';
    const stockVal = parseInt(stock) || 0;
    const isAvailableVal = is_available === 'true' || is_available === true || is_available === '1' ? 1 : 0;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('name', sql.NVarChar, String(name || ''))
            .input('price', sql.NVarChar, String(price || ''))
            .input('ozon_url', sql.NVarChar, String(ozon_url || ''))
            .input('images', sql.NVarChar, imagesString)
            .input('stock', sql.Int, stockVal)
            .input('is_available', sql.Bit, isAvailableVal)
            .query(`
                INSERT INTO services (name, price, ozon_url, images, stock, is_available)
                VALUES (@name, @price, @ozon_url, @images, @stock, @is_available)
            `);
        console.log('✅ Товар добавлен:', name);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Полная ошибка SQL при добавлении товара:', err);
        res.status(500).json({ error: "Ошибка добавления товара: " + err.message });
    }
});

app.post('/api/admin/products/edit', checkAuthAPI, upload.array('images_files', 5), async (req, res) => {
    const { id, name, price, ozon_url, images_urls, stock, is_available } = req.body;
    console.log('🔧 Редактирование товара, body:', JSON.stringify({ id, name, price }));

    let imagesList = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    if (images_urls) {
        const urls = images_urls.split(';').map(u => u.trim()).filter(u => u !== '');
        const processedUrls = [];
        for (const url of urls) {
            if (url.startsWith('http://') || url.startsWith('https://')) {
                try {
                    console.log(`📥 Скачивание картинки товара при редактировании: ${url}`);
                    const localPath = await downloadImage(url, uploadsDir);
                    processedUrls.push(localPath);
                    console.log(`✅ Картинка скачана: ${localPath}`);
                } catch (dlErr) {
                    console.error(`❌ Ошибка скачивания картинки товара: ${url}, ошибка:`, dlErr.message);
                    processedUrls.push(url); // fallback to original URL
                }
            } else {
                processedUrls.push(url);
            }
        }
        imagesList = [...imagesList, ...processedUrls];
    }
    const imagesString = imagesList.join(';') || '';
    const stockVal = parseInt(stock) || 0;
    const isAvailableVal = is_available === 'true' || is_available === true || is_available === '1' ? 1 : 0;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(id, 10))
            .input('name', sql.NVarChar, String(name || ''))
            .input('price', sql.NVarChar, String(price || ''))
            .input('ozon_url', sql.NVarChar, String(ozon_url || ''))
            .input('images', sql.NVarChar, imagesString)
            .input('stock', sql.Int, stockVal)
            .input('is_available', sql.Bit, isAvailableVal)
            .query(`
                UPDATE services
                SET name = @name,
                    price = @price,
                    ozon_url = @ozon_url,
                    images = @images,
                    stock = @stock,
                    is_available = @is_available
                WHERE id = @id
            `);
        console.log('✅ Товар обновлён, ID:', id);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Полная ошибка SQL при редактировании товара:', err);
        res.status(500).json({ error: "Ошибка редактирования товара: " + err.message });
    }
});

app.delete('/api/admin/products/:id', checkAuthAPI, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(req.params.id))
            .query("DELETE FROM services WHERE id = @id");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Ошибка удаления товара" });
    }
});

app.delete('/api/admin/leads/:id', checkAuthAPI, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(req.params.id))
            .query("DELETE FROM leads WHERE id = @id");
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Ошибка удаления заявки" });
    }
});

// Быстрое переключение is_available
app.post('/api/admin/products/:id/toggle', checkAuthAPI, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(req.params.id))
            .query(`
                UPDATE services
                SET is_available = CASE WHEN is_available = 1 THEN 0 ELSE 1 END
                WHERE id = @id
            `);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Ошибка переключения доступности:', err);
        res.status(500).json({ error: "Ошибка переключения доступности" });
    }
});

// SPA fallback: все не-API запросы направляем в React
app.get(/^\/(?!api\/).*/, (req, res) => {
    if (fs.existsSync(distPath)) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        res.status(200).json({ 
            message: 'React SPA сервер. Для разработки запустите: cd frontend && npm run dev',
            note: 'В production соберите фронтенд: cd frontend && npm run build'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`   API эндпоинты: http://localhost:${PORT}/api/...`);
    console.log(`   Админка: http://localhost:${PORT}/admin`);
    console.log(`   В dev-режиме фронтенд: http://localhost:5173`);
});
