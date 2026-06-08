const sql = require('mssql/msnodesqlv8'); // Подключаем специальную версию драйвера

const config = {
    server: 'sql-class',         // Имя сервера из SSMS
    database: 'vorobyev_db',     // Твоя база данных
    driver: 'msnodesqlv8',       // Используем системный драйвер Windows
    options: {
        trustedConnection: true, // Использовать текущую учетку Windows (без ввода пароля!)
        encrypt: false,
        trustServerCertificate: true
    }
};

async function initDB() {
    try {
        console.log("Пробуем подключиться к MS SQL Server (sql-class) через сквозную авторизацию...");
        let pool = await sql.connect(config);
        console.log("УСПЕШНО ПОДКЛЮЧЕНО!");

        // 1. Создаем таблицу услуг (в нашем случае товаров)
        await pool.request().query("DROP TABLE IF EXISTS services");
        await pool.request().query(`
            CREATE TABLE services (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(255) NOT NULL,
                price NVARCHAR(255) NOT NULL,
                image NVARCHAR(255) NOT NULL,
                ozon_url NVARCHAR(MAX) NOT NULL
            )
        `);

        // 2. Создаем таблицу заявок
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='leads' AND xtype='U')
            CREATE TABLE leads (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(255) NOT NULL,
                phone NVARCHAR(255) NOT NULL,
                message NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETDATE()
            )
        `);

        // 3. Создаем таблицу пользователей
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
            CREATE TABLE users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(255) UNIQUE NOT NULL,
                password NVARCHAR(255) NOT NULL
            )
        `);

        // Заполняем базу товарами «Мороз Плей»
        await pool.request().query(`
            INSERT INTO services (name, price, image, ozon_url) VALUES 
            (N'Портативный вентилятор Холод (белый)', N'475 ₽', N'https://i.ibb.co/k6bYf90/fan.png', N'https://www.ozon.ru/seller/moroz-pley/'),
            (N'Мягкая игрушка-сюрприз Стич (15 см)', N'255 ₽', N'https://i.ibb.co/zH6mCgN/stitch.png', N'https://www.ozon.ru/seller/moroz-pley/'),
            (N'Мягкая игрушка-сюрприз Человек-Паук', N'444 ₽', N'https://i.ibb.co/fD7vXGZ/spiderman.png', N'https://www.ozon.ru/seller/moroz-pley/'),
            (N'Антистресс-брелок клавиатура RGB', N'165 ₽', N'https://i.ibb.co/gZfX0fQ/clicker.png', N'https://www.ozon.ru/seller/moroz-pley/')
        `);

        console.log("База данных «Мороз Плей» успешно инициализирована!");

    } catch (err) {
        console.error("Ошибка подключения к MS SQL:", err);
    } finally {
        await sql.close();
    }
}

initDB();