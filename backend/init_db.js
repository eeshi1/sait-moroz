const sql = require('mssql/msnodesqlv8');

const config = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=localhost\\SQLEXPRESS;Database=vorobyev_db;Trusted_Connection=yes;',
};

async function initDB() {
    try {
        console.log("Подключение к MS SQL Server...");
        let pool = await sql.connect(config);
        console.log("УСПЕШНО ПОДКЛЮЧЕНО!");

        console.log("Удаляем старую таблицу services (если она существует)...");
        await pool.request().query(`
            IF OBJECT_ID('dbo.services', 'U') IS NOT NULL
            DROP TABLE dbo.services;
        `);

        console.log("Создаем таблицу services...");
        await pool.request().query(`
            CREATE TABLE services (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(255) NOT NULL,
                price NVARCHAR(255) NOT NULL,
                images NVARCHAR(MAX) NOT NULL,
                ozon_url NVARCHAR(MAX) NOT NULL,
                stock INT DEFAULT 0,
                is_available BIT DEFAULT 1
            )
        `);

        console.log("Проверяем таблицу leads...");
        await pool.request().query(`
            IF OBJECT_ID('dbo.leads', 'U') IS NULL
            CREATE TABLE leads (
                id INT IDENTITY(1,1) PRIMARY KEY,
                name NVARCHAR(255) NOT NULL,
                phone NVARCHAR(255) NOT NULL,
                message NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETDATE()
            )
        `);

        console.log("Проверяем таблицу users...");
        await pool.request().query(`
            IF OBJECT_ID('dbo.users', 'U') IS NULL
            CREATE TABLE users (
                id INT IDENTITY(1,1) PRIMARY KEY,
                username NVARCHAR(255) UNIQUE NOT NULL,
                password NVARCHAR(255) NOT NULL
            )
        `);

        console.log("Проверяем таблицу settings...");
        await pool.request().query(`
            IF OBJECT_ID('dbo.settings', 'U') IS NULL
            CREATE TABLE settings (
                key_name NVARCHAR(255) PRIMARY KEY,
                key_value NVARCHAR(MAX) NOT NULL
            )
        `);
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.settings WHERE key_name = 'hero_image')
            INSERT INTO dbo.settings (key_name, key_value) VALUES ('hero_image', '/uploads/hero.png')
        `);

        console.log("Заполняем базу товарами «Мороз Плей»...");
        await pool.request().query(`
            INSERT INTO services (name, price, images, ozon_url, stock, is_available) VALUES 
            (N'Портативный вентилятор Холод (белый)', N'475 ₽', 
             N'https://i.ibb.co/zH6mCgN/stitch.png', 
             N'https://ozon.ru', 10, 1),

            (N'Мягкая игрушка-сюрприз Стич (15 см)', N'255 ₽', 
             N'https://i.ibb.co/zH6mCgN/stitch.png', 
             N'https://ozon.ru', 25, 1),

            (N'Мягкая игрушка-сюрприз Человек-Паук', N'444 ₽', 
             N'https://i.ibb.co/zH6mCgN/stitch.png', 
             N'https://ozon.ru', 15, 1),

            (N'Антистресс-брелок клавиатура RGB', N'165 ₽', 
             N'https://i.ibb.co/zH6mCgN/stitch.png', 
             N'https://ozon.ru', 30, 1)
        `);

                console.log("База данных успешно обновлена! Все таблицы созданы.");

    } catch (err) {
        console.error("Ошибка при работе с MS SQL:", err);
    } finally {
        await sql.close();
        console.log("Подключение закрыто.");
    }
}

initDB();
