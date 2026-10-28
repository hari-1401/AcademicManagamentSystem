import requests
import json

BASE_URL = "http://localhost:8000"

# Step 1: Login as staff
def login_staff():
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "staff@example.com",
        "password": "staff123"
    })
    print("1. Login Response:", response.json())
    return response.json()["access_token"]

# Step 2: Create subject with modules and topics
def create_subject(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/staff/create-subject", 
        headers=headers,
        json={
            "subjectId": "CS101",
            "subjectName": "Data Structures and Algorithms",
            "modules": [
                "Arrays and Linked Lists",
                "Stacks and Queues",
                "Trees and Graphs",
                "Sorting Algorithms"
            ],
            "topics": [
                "Array operations and time complexity",
                "Singly and doubly linked lists",
                "Stack implementation using arrays",
                "Binary trees and BST operations",
                "Graph traversal - BFS and DFS",
                "Quick sort and Merge sort"
            ],
            "totalStudents": 60
        }
    )
    print("\n2. Create Subject Response:", response.json())
    return response.json()

# Step 3: Generate quiz
def generate_quiz(token, subject_id):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/staff/generate-quiz",
        headers=headers,
        json={
            "subjectId": subject_id,
            "title": "Midterm Quiz - DSA",
            "numQuestions": 10
        }
    )
    result = response.json()
    print("\n3. Generate Quiz Response:")
    print(f"   Quiz ID: {result.get('quizId')}")
    print(f"   Total Questions: {result.get('totalQuestions')}")
    print(f"   First Question: {result.get('questions', [{}])[0].get('question', 'N/A')}")
    return result

if __name__ == "__main__":
    print("=== Testing New Subject Creation API ===\n")
    
    try:
        # Run tests
        token = login_staff()
        subject = create_subject(token)
        quiz = generate_quiz(token, "CS101")
        
        print("\n✅ All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
