import psycopg2

conn = psycopg2.connect(
    dbname="legalai",
    user="legalai",
    password="legalai_dev_password",
    host="localhost",
    port="5432"
)
print("Connected successfully!")
conn.close()