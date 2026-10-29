import requests

API_KEY = "API_HERE"
url = f"{API_KEY}"

payload = {
    "contents": [{
        "parts": [{"text": "Say hello"}]
    }]
}

response = requests.post(url, json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

if response.status_code == 200:
    print("\n✅ API Key is VALID and working!")
else:
    print("\n❌ API Key has issues")
