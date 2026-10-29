import requests

API_KEY = "AIzaSyBvDnMRTtShG0aEHFMkUB1wujkJPGGMnz0"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

response = requests.get(url)
print(f"Status: {response.status_code}\n")

if response.status_code == 200:
    models = response.json().get('models', [])
    print("Available models that support generateContent:\n")
    for model in models:
        if 'generateContent' in model.get('supportedGenerationMethods', []):
            print(f"✅ {model['name']}")
else:
    print(f"Error: {response.json()}")
