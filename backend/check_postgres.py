from sqlalchemy import create_engine, text
import sys

db_url = 'postgresql://neondb_owner:npg_CEHG4dfpz7cb@ep-mute-mountain-aoz2ny10.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
engine = create_engine(db_url)
with engine.connect() as conn:
    try:
        res = conn.execute(text("SELECT id, name, parent_id FROM categories LIMIT 20;"))
        for row in res:
            print(row)
    except Exception as e:
        print(e)
