const express = require('express');
const sql = require('mssql/msnodesqlv8'); // Используем msnodesqlv8
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');

const app = express();

// Настройки подключения (Сквозная авторизация Windows)
const dbConfig = {
    server: 'sql-class',
    database: 'vorobyev_db',
    driver: 'msnodesqlv8',
    options: {
        trustedConnection: true, // Вход без пароля под твоей учеткой Windows
        encrypt: false,
        trustServerCertificate: true
    }
};

// Создаем пул подключений
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Успешное подключение к пулу MS SQL Server (sql-class)!');
        return pool;
    })
    .catch(err => {
        console.error('Ошибка создания пула подключений MS SQL:', err);
        process.exit(1);
    });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'my-super-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 30 }
}));

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function checkAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// --- МАРШРУТЫ АВТОРИЗАЦИИ ---

app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = hashPassword(password);

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query("INSERT INTO users (username, password) VALUES (@username, @password)");
            
        console.log(`[MS SQL] Зарегистрирован админ: ${username}`);
        res.redirect('/login');
    } catch (err) {
        res.render('register', { error: 'Этот логин уже занят или произошла ошибка!' });
    }
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
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
            console.log(`[Сессия] Пользователь ${username} вошел!`);
            res.redirect('/admin');
        } else {
            res.render('login', { error: 'Неверный логин или пароль!' });
        }
    } catch (err) {
        res.send("Ошибка авторизации на сервере");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// --- СТРАНИЦЫ САЙТА ---

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/services', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM services");
        res.render('services', { services: result.recordset }); 
    } catch (err) {
        res.send("Ошибка при загрузке услуг из MS SQL");
    }
});

app.get('/contacts', (req, res) => {
    res.render('contacts', { success: false });
});

app.post('/contacts', async (req, res) => {
    const { name, phone, message } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('phone', sql.NVarChar, phone)
            .input('message', sql.NVarChar, message)
            .query("INSERT INTO leads (name, phone, message) VALUES (@name, @phone, @message)");
            
        console.log(`[MS SQL] Новая заявка успешно записана!`);
        res.render('contacts', { success: true });
    } catch (err) {
        console.error(err);
        res.send("Ошибка при сохранении заявки в MS SQL");
    }
});

app.get('/admin', checkAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT * FROM leads ORDER BY id DESC");
        res.render('admin', { leads: result.recordset });
    } catch (err) {
        res.send("Ошибка при загрузке заявок из MS SQL");
    }
});

app.listen(3005, () => {
    console.log('==================================================');
    console.log(' СЕРВЕР НА MS SQL SERVER ЗАПУЩЕН НА ПОРТУ 3005!');
    console.log(' Ссылки для проверки:');
    console.log(' 1. Главная:    http://localhost:3005/');
    console.log(' 2. Контакты:   http://localhost:3005/contacts');
    console.log(' 3. Админка:    http://localhost:3005/admin');
    console.log('==================================================');
});