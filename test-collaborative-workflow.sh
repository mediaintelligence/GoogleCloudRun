#!/bin/bash

echo "🚀 Testing Collaborative AI Workflow"
echo "====================================="
echo ""

# Test 1: Parallel Collaboration - All models work simultaneously
echo "📊 Test 1: PARALLEL MODE - All models analyze simultaneously"
echo "-------------------------------------------------------------"
curl -X POST http://localhost:8081/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Analyze the benefits and challenges of microservices architecture",
    "task_type": "analysis",
    "collaboration_mode": "parallel",
    "max_tokens": 500,
    "temperature": 0.7
  }' | python3 -m json.tool

echo ""
echo "Press Enter to continue..."
read

# Test 2: Debate Mode - Models discuss and refine
echo "💬 Test 2: DEBATE MODE - Models debate and reach consensus"
echo "-----------------------------------------------------------"
curl -X POST http://localhost:8081/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is the best programming paradigm: functional or object-oriented?",
    "task_type": "reasoning",
    "collaboration_mode": "debate",
    "max_tokens": 600,
    "temperature": 0.7
  }' | python3 -m json.tool

echo ""
echo "Press Enter to continue..."
read

# Test 3: Sequential Mode - Chain of reasoning
echo "🔗 Test 3: SEQUENTIAL MODE - Models build on each other"
echo "--------------------------------------------------------"
curl -X POST http://localhost:8081/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Design a scalable real-time chat application",
    "task_type": "code",
    "collaboration_mode": "sequential",
    "max_tokens": 800,
    "temperature": 0.6
  }' | python3 -m json.tool

echo ""
echo "Press Enter to continue..."
read

# Test 4: Specialized Mode - Each model handles their strength
echo "🎯 Test 4: SPECIALIZED MODE - Each model uses their strengths"
echo "--------------------------------------------------------------"
curl -X POST http://localhost:8081/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a Python function for binary search with comprehensive documentation",
    "task_type": "code",
    "collaboration_mode": "specialized",
    "max_tokens": 700,
    "temperature": 0.5
  }' | python3 -m json.tool

echo ""
echo "Press Enter to continue..."
read

# Test 5: Multi-Step Workflow
echo "🔄 Test 5: MULTI-STEP WORKFLOW - Complex task chain"
echo "----------------------------------------------------"
curl -X POST http://localhost:8081/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Complete Feature Development",
    "mode": "sequential",
    "steps": [
      {
        "name": "requirements",
        "task_type": "analysis",
        "prompt": "Analyze requirements for a user authentication system",
        "max_tokens": 400
      },
      {
        "name": "design",
        "task_type": "generation",
        "prompt": "Design the system architecture based on the requirements",
        "max_tokens": 500
      },
      {
        "name": "implementation",
        "task_type": "code",
        "prompt": "Implement the core authentication logic in Python",
        "max_tokens": 600
      },
      {
        "name": "testing",
        "task_type": "code",
        "prompt": "Write unit tests for the implementation",
        "max_tokens": 400
      }
    ],
    "context": {
      "project": "Authentication Service",
      "language": "Python",
      "framework": "FastAPI"
    }
  }' | python3 -m json.tool

echo ""
echo "====================================="
echo "✅ Collaborative Workflow Tests Complete!"
echo "====================================="