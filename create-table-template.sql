CREATE TABLE users(  
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT,
    name TEXT,
    

);

CREATE TABLE files(
    filename TEXT,
    id INTEGER
)