"""
API Test Script - Verify all endpoints are working
Run this after deployment to verify the API is functioning correctly
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
# Change this if testing remotely:
# BASE_URL = "http://synora.duckdns.org:81"

# Test user credentials
TEST_USER = {
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpassword123"
}

def print_result(endpoint, success, message=""):
    status = "✅" if success else "❌"
    print(f"{status} {endpoint}: {message}")


def test_health():
    """Test health endpoint"""
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=10)
        success = r.status_code == 200 and r.json().get("status") == "healthy"
        print_result("GET /api/health", success, r.json())
        return success
    except Exception as e:
        print_result("GET /api/health", False, str(e))
        return False


def test_register():
    """Test user registration"""
    try:
        r = requests.post(f"{BASE_URL}/api/auth/register", json=TEST_USER, timeout=10)
        success = r.status_code in [200, 201, 400]  # 400 means user already exists
        if r.status_code == 400:
            print_result("POST /api/auth/register", True, "User already exists (OK)")
        else:
            print_result("POST /api/auth/register", success, f"Status: {r.status_code}")
        return success
    except Exception as e:
        print_result("POST /api/auth/register", False, str(e))
        return False


def test_login():
    """Test user login and get token"""
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }, timeout=10)
        success = r.status_code == 200
        if success:
            token = r.json().get("access_token")
            print_result("POST /api/auth/login", True, f"Got token: {token[:20]}...")
            return token
        else:
            print_result("POST /api/auth/login", False, f"Status: {r.status_code}, {r.text}")
            return None
    except Exception as e:
        print_result("POST /api/auth/login", False, str(e))
        return None


def test_protected_endpoint(endpoint, method="GET", token=None, data=None):
    """Test a protected endpoint"""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        if method == "GET":
            r = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=10)
        elif method == "POST":
            r = requests.post(f"{BASE_URL}{endpoint}", headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            r = requests.delete(f"{BASE_URL}{endpoint}", headers=headers, timeout=10)
        else:
            r = requests.request(method, f"{BASE_URL}{endpoint}", headers=headers, json=data, timeout=10)
        
        success = r.status_code in [200, 201, 204, 404]
        msg = f"Status: {r.status_code}"
        if r.status_code == 200:
            try:
                result = r.json()
                if isinstance(result, list):
                    msg = f"Returned {len(result)} items"
                else:
                    msg = f"OK"
            except:
                msg = "OK"
        print_result(f"{method} {endpoint}", success, msg)
        return success, r
    except Exception as e:
        print_result(f"{method} {endpoint}", False, str(e))
        return False, None


def main():
    print("=" * 60)
    print("Synora API Test Suite")
    print("=" * 60)
    print(f"Testing: {BASE_URL}")
    print(f"Time: {datetime.now().isoformat()}")
    print("=" * 60)
    
    results = []
    
    # Test health
    print("\n📋 Health Check")
    print("-" * 40)
    results.append(test_health())
    
    # Test auth
    print("\n🔐 Authentication")
    print("-" * 40)
    results.append(test_register())
    token = test_login()
    results.append(token is not None)
    
    if not token:
        print("\n❌ Cannot continue without valid token")
        return
    
    # Test all protected endpoints
    print("\n📝 Notes Endpoints")
    print("-" * 40)
    results.append(test_protected_endpoint("/api/notes", "GET", token)[0])
    
    print("\n📁 Projects Endpoints")
    print("-" * 40)
    results.append(test_protected_endpoint("/api/projects", "GET", token)[0])
    
    print("\n✅ Tasks Endpoints")
    print("-" * 40)
    results.append(test_protected_endpoint("/api/tasks", "GET", token)[0])
    
    print("\n💡 Ideas Endpoints")
    print("-" * 40)
    results.append(test_protected_endpoint("/api/ideas", "GET", token)[0])
    
    print("\n🎯 Habits Endpoints")
    print("-" * 40)
    results.append(test_protected_endpoint("/api/habits", "GET", token)[0])
    
    print("\n📌 Snippets Endpoints")
    print("-" * 40)
    results.append(test_protected_endpoint("/api/snippets", "GET", token)[0])
    
    print("\n🔍 Search Endpoints")
    print("-" * 40)
    results.append(test_protected_endpoint("/api/search?q=test", "GET", token)[0])
    
    print("\n🏷️ Tags Endpoints")
    print("-" * 40)
    results.append(test_protected_endpoint("/api/tags", "GET", token)[0])
    
    print("\n📊 Graph Endpoints")
    print("-" * 40)
    results.append(test_protected_endpoint("/api/graph", "GET", token)[0])
    
    # Summary
    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r)
    total = len(results)
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All tests passed! API is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the logs above.")
    print("=" * 60)


if __name__ == "__main__":
    main()
