import sqlite3

# Connect to the correct DB file in backend/
conn = sqlite3.connect("test.db")
cursor = conn.cursor()

email = "admin123@gmail.com"

cursor.execute("SELECT id, email, username, role FROM users WHERE email=?", (email,))
user = cursor.fetchone()

if user:
    print(f"User found before update: {user}")
    cursor.execute("UPDATE users SET role='admin' WHERE email=?", (email,))
    conn.commit()
    print("✅ User role updated to admin.")
    
    # Verify update
    cursor.execute("SELECT id, email, username, role FROM users WHERE email=?", (email,))
    print("User after update:", cursor.fetchone())
else:
    print("❌ User not found.")

conn.close()
