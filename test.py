import os, json
from dotenv import load_dotenv
load_dotenv('.env.local')
import requests

url = f"{os.environ['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/webhook_logs?select=*&order=created_at.desc&limit=5"
headers = {
    'apikey': os.environ['SUPABASE_SERVICE_ROLE_KEY'],
    'Authorization': f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}"
}
res = requests.get(url, headers=headers)
print(json.dumps(res.json(), indent=2))
