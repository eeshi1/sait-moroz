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
                ozon_url NVARCHAR(MAX) NOT NULL
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

        console.log("Заполняем базу товарами «Мороз Плей»...");
        await pool.request().query(`
            INSERT INTO services (name, price, images, ozon_url) VALUES 
            (N'Портативный вентилятор Холод (белый)', N'475 ₽', 
             N'https://ibb.co', 
             N'https://ozon.ru'),

            (N'Мягкая игрушка-сюрприз Стич (15 см)', N'255 ₽', 
             N'https://ibb.co', 
             N'https://ozon.ru'),

            (N'Мягкая игрушка-сюрприз Человек-Паук', N'444 ₽', 
             N'https://ibb.co', 
             N'https://ozon.ru'),

            (N'Антистресс-брелок клавиатура RGB', N'165 ₽', 
             N'https://ibb.co', 
             N'https://ozon.ru')
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
