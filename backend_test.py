import requests
import sys
from datetime import datetime

class SimpleAPITester:
    def __init__(self, base_url="https://logiflow-docs.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        print(f"Response: {response.json()}")
                    except:
                        print(f"Response: {response.text[:200]}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}")

            return success, response.json() if success and response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "api/",
            200
        )
        return success

    def test_status_endpoints(self):
        """Test status endpoints"""
        # Test GET status
        success_get, _ = self.run_test(
            "Get Status Checks",
            "GET", 
            "api/status",
            200
        )
        
        # Test POST status
        test_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        success_post, response = self.run_test(
            "Create Status Check",
            "POST",
            "api/status", 
            200,
            data=test_data
        )
        
        return success_get and success_post

def main():
    print("🚀 Starting Backend API Tests for Document Management App")
    print("=" * 60)
    
    # Setup
    tester = SimpleAPITester()
    
    # Run basic API tests
    print("\n📡 Testing Basic API Endpoints...")
    tester.test_root_endpoint()
    tester.test_status_endpoints()
    
    # Print results
    print(f"\n📊 Backend API Test Results:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All backend API tests passed!")
        return 0
    else:
        print("❌ Some backend API tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())