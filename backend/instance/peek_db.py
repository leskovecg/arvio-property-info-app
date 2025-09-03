import sqlite3
con = sqlite3.connect(r'.\backend\instance\favorites.db')
cur = con.cursor()
print('Tabele:', cur.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall())
print('Zadnjih 10 iskanj:', cur.execute("SELECT query, timestamp FROM search_history ORDER BY timestamp DESC LIMIT 10").fetchall())
print('Favorites:', cur.execute("SELECT id, re_key, address, label, created_at FROM favorites ORDER BY created_at DESC LIMIT 10").fetchall())
con.close()
