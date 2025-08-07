#!/usr/bin/env python3
"""
Local testing script for Gemini Orchestration Service
Tests all endpoints without requiring deployment
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_health():
    """Test health check endpoint"""
    print("Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        response.raise_for_status()
        print(f"✅ Health check passed: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_root():
    """Test root endpoint"""
    print("\nTesting root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Service info retrieved:")
        print(f"  - Service: {data.get('service')}")
        print(f"  - Version: {data.get('version')}")
        print(f"  - Available models: {data.get('models')}")
        return True
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
        return False

def test_generate():
    """Test text generation"""
    print("\nTesting text generation...")
    payload = {
        "prompt": "Write a haiku about cloud computing",
        "model": "gemini-1.5-flash",
        "temperature": 0.7,
        "max_tokens": 100
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate",
            json=payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        data = response.json()
        print(f"✅ Text generation successful:")
        print(f"  Generated text: {data.get('text', '')[:200]}...")
        print(f"  Model used: {data.get('model')}")
        print(f"  Tokens: {data.get('usage', {})}")
        return True
    except Exception as e:
        print(f"❌ Text generation failed: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"  Response: {e.response.text}")
        return False

def test_chat():
    """Test chat conversation"""
    print("\nTesting chat conversation...")
    payload = {
        "messages": [
            {"role": "user", "content": "What is Docker?"},
            {"role": "assistant", "content": "Docker is a containerization platform that packages applications and dependencies."},
            {"role": "user", "content": "How is it different from a VM?"}
        ],
        "model": "gemini-1.5-pro",
        "temperature": 0.5
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat",
            json=payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        data = response.json()
        print(f"✅ Chat successful:")
        print(f"  Response: {data.get('text', '')[:200]}...")
        print(f"  Conversation length: {data.get('metadata', {}).get('conversation_length')}")
        return True
    except Exception as e:
        print(f"❌ Chat failed: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"  Response: {e.response.text}")
        return False

def test_analyze_code():
    """Test code analysis"""
    print("\nTesting code analysis...")
    code = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
"""
    
    payload = {
        "code": code,
        "language": "python",
        "analysis_type": "optimize"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/analyze-code",
            json=payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        data = response.json()
        print(f"✅ Code analysis successful:")
        print(f"  Analysis: {data.get('text', '')[:300]}...")
        return True
    except Exception as e:
        print(f"❌ Code analysis failed: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"  Response: {e.response.text}")
        return False

def test_workflow():
    """Test workflow execution"""
    print("\nTesting workflow execution...")
    payload = {
        "workflow_type": "code_optimization",
        "steps": [
            {
                "type": "generate",
                "name": "explain_task",
                "prompt": "Explain binary search algorithm in one sentence",
                "temperature": 0.5
            },
            {
                "type": "analyze",
                "name": "analyze_code",
                "code": "def search(arr, x): return x in arr",
                "language": "python",
                "analysis_type": "optimize"
            }
        ],
        "context": {"task": "optimization"}
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/workflow",
            json=payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        data = response.json()
        print(f"✅ Workflow execution successful:")
        print(f"  Workflow type: {data.get('workflow_type')}")
        print(f"  Results count: {len(data.get('results', []))}")
        for i, result in enumerate(data.get('results', []), 1):
            print(f"  Step {i} ({result.get('step')}): {result.get('result', '')[:100]}...")
        return True
    except Exception as e:
        print(f"❌ Workflow execution failed: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"  Response: {e.response.text}")
        return False

def test_orchestrate():
    """Test orchestration endpoint"""
    print("\nTesting orchestration...")
    payload = {
        "task_type": "code",
        "prompt": "Write a Python function to calculate factorial",
        "temperature": 0.5,
        "context": {"language": "python"}
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/orchestrate",
            json=payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        data = response.json()
        print(f"✅ Orchestration successful:")
        print(f"  Model selected: {data.get('model_used')}")
        print(f"  Response: {data.get('response', '')[:200]}...")
        return True
    except Exception as e:
        print(f"❌ Orchestration failed: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"  Response: {e.response.text}")
        return False

def test_models():
    """Test models listing"""
    print("\nTesting models endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/models", timeout=TIMEOUT)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Models listing successful:")
        for model in data.get('models', []):
            print(f"  - {model.get('name')}: {', '.join(model.get('capabilities', []))}")
        return True
    except Exception as e:
        print(f"❌ Models listing failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Gemini Orchestration Service - Local Testing")
    print("=" * 60)
    print(f"Testing service at: {BASE_URL}")
    print("Note: Make sure the service is running locally first!")
    print("Run: python -m uvicorn app.main:app --reload --port 8080")
    print("=" * 60)
    
    # Check if service is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
    except requests.exceptions.ConnectionError:
        print("\n❌ Service is not running!")
        print("Please start the service first:")
        print("  cd cloud-run-gemini-service")
        print("  python -m uvicorn app.main:app --reload --port 8080")
        sys.exit(1)
    
    # Run all tests
    tests = [
        test_health,
        test_root,
        test_models,
        test_generate,
        test_chat,
        test_analyze_code,
        test_workflow,
        test_orchestrate
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"Test error: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("✅ All tests passed! Service is ready for deployment.")
    else:
        print(f"⚠️  {total - passed} test(s) failed. Please check the errors above.")
        if not any(results[:2]):  # Health and root tests
            print("\nNote: If health/root tests fail, the API key might not be configured.")
            print("Set GEMINI_API_KEY environment variable or create a .env file.")
    
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()