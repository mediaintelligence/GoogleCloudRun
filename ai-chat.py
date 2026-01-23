#!/usr/bin/env python3
"""
Interactive AI Chat Interface
Communicate with Claude4.1, ChatGPT5, GEMINI 2.5 pro, and Grok4Heavy
"""

import requests
import json
import sys
from typing import Dict, Any

# ANSI color codes
BLUE = '\033[94m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
CYAN = '\033[96m'
MAGENTA = '\033[95m'
BOLD = '\033[1m'
RESET = '\033[0m'

ORCHESTRATOR_URL = "http://localhost:8081"

def print_header():
    """Print the application header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN}    🤖 AI Multi-Model Chat Interface{RESET}")
    print(f"{GREEN}    Models: Claude4.1, ChatGPT5, GEMINI 2.5, Grok4Heavy{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_menu():
    """Print the main menu"""
    print(f"\n{YELLOW}Select an option:{RESET}")
    print("1. 💬 Quick Chat")
    print("2. 💻 Code Assistant")
    print("3. 🔍 Deep Analysis")
    print("4. 🎨 Creative Writing")
    print("5. 🧠 Problem Solving")
    print("6. ⚔️  Model Debate")
    print("7. 🔗 Sequential Reasoning")
    print("8. 📊 Compare Models")
    print("9. 🔧 Custom Settings")
    print("0. 👋 Exit")
    print()

def get_task_config(choice: str) -> Dict[str, Any]:
    """Get task configuration based on user choice"""
    configs = {
        '1': {'task_type': 'generation', 'mode': 'specialized', 'desc': 'Quick Chat'},
        '2': {'task_type': 'code', 'mode': 'specialized', 'desc': 'Code Assistant'},
        '3': {'task_type': 'analysis', 'mode': 'debate', 'desc': 'Deep Analysis'},
        '4': {'task_type': 'creative', 'mode': 'parallel', 'desc': 'Creative Writing'},
        '5': {'task_type': 'reasoning', 'mode': 'sequential', 'desc': 'Problem Solving'},
        '6': {'task_type': 'reasoning', 'mode': 'debate', 'desc': 'Model Debate'},
        '7': {'task_type': 'analysis', 'mode': 'sequential', 'desc': 'Sequential Reasoning'},
        '8': {'task_type': 'analysis', 'mode': 'parallel', 'desc': 'Model Comparison'},
    }
    return configs.get(choice, {})

def send_to_orchestrator(prompt: str, task_type: str, mode: str, max_tokens: int = 500) -> Dict:
    """Send request to the orchestrator"""
    try:
        response = requests.post(
            f"{ORCHESTRATOR_URL}/orchestrate",
            json={
                "prompt": prompt,
                "task_type": task_type,
                "collaboration_mode": mode,
                "max_tokens": max_tokens,
                "temperature": 0.7
            },
            timeout=30
        )
        return response.json()
    except requests.exceptions.ConnectionError:
        return {"error": "Cannot connect to orchestrator. Make sure it's running on port 8081"}
    except Exception as e:
        return {"error": str(e)}

def compare_models(prompt: str) -> Dict:
    """Compare responses from different models"""
    try:
        response = requests.post(
            f"{ORCHESTRATOR_URL}/compare",
            json={
                "prompt": prompt,
                "task_type": "analysis",
                "max_tokens": 300,
                "temperature": 0.7
            },
            timeout=30
        )
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def display_response(response: Dict):
    """Display the AI response"""
    if "error" in response:
        print(f"\n{RED}❌ Error: {response['error']}{RESET}")
        return
    
    if "primary_response" in response:
        model = response.get('model_used', 'Unknown')
        print(f"\n{GREEN}{BOLD}[{model}]:{RESET}")
        print(f"{response['primary_response']}")
        
        if response.get('supporting_response'):
            supporting_model = response.get('supporting_model', 'Supporting Model')
            print(f"\n{CYAN}{BOLD}[{supporting_model}]:{RESET}")
            print(f"{response['supporting_response'][:500]}...")
        
        if response.get('confidence_score'):
            print(f"\n{YELLOW}Confidence: {response['confidence_score']:.2%}{RESET}")
    
    elif "comparisons" in response:
        for comp in response['comparisons']:
            print(f"\n{GREEN}{BOLD}[{comp['claude_model']}]:{RESET}")
            print(comp['claude_response'])
            print(f"\n{BLUE}{BOLD}[{comp['gemini_model']}]:{RESET}")
            print(comp['gemini_response'])

def custom_settings():
    """Get custom settings from user"""
    print(f"\n{CYAN}Custom Settings:{RESET}")
    print("Task types: analysis, generation, code, reasoning, creative, translation, summarization")
    task_type = input("Enter task type: ").strip() or "generation"
    
    print("\nCollaboration modes: parallel, sequential, debate, consensus, specialized")
    mode = input("Enter mode: ").strip() or "specialized"
    
    max_tokens = input("Max tokens (default 500): ").strip()
    max_tokens = int(max_tokens) if max_tokens.isdigit() else 500
    
    return task_type, mode, max_tokens

def main():
    """Main chat loop"""
    print_header()
    
    # Check orchestrator health
    try:
        health = requests.get(f"{ORCHESTRATOR_URL}/health", timeout=5).json()
        if health['status'] == 'healthy':
            print(f"{GREEN}✅ Orchestrator connected!{RESET}")
            print(f"Available models: Claude={health['claude_configured']}, "
                  f"ChatGPT={health['openai_configured']}, "
                  f"Gemini={health['gemini_configured']}, "
                  f"Grok={health['grok_configured']}")
    except:
        print(f"{RED}⚠️  Warning: Cannot connect to orchestrator at {ORCHESTRATOR_URL}{RESET}")
        print("Make sure to run: ./launch-orchestrator-local.sh")
    
    while True:
        print_menu()
        choice = input(f"{BOLD}Enter choice (0-9): {RESET}").strip()
        
        if choice == '0':
            print(f"\n{GREEN}Goodbye! Thanks for chatting! 👋{RESET}\n")
            break
        
        if choice == '9':
            task_type, mode, max_tokens = custom_settings()
            config = {'task_type': task_type, 'mode': mode, 'desc': 'Custom'}
        else:
            config = get_task_config(choice)
            max_tokens = 500
        
        if not config:
            print(f"{RED}Invalid choice. Please try again.{RESET}")
            continue
        
        print(f"\n{MAGENTA}Mode: {config['desc']}{RESET}")
        print(f"{CYAN}Type your message (or 'back' to return to menu):{RESET}")
        prompt = input(f"{BOLD}> {RESET}").strip()
        
        if prompt.lower() == 'back':
            continue
        
        if not prompt:
            print(f"{RED}Please enter a message{RESET}")
            continue
        
        print(f"\n{YELLOW}🤖 AI is processing...{RESET}")
        
        if choice == '8':
            response = compare_models(prompt)
        else:
            response = send_to_orchestrator(
                prompt, 
                config['task_type'], 
                config['mode'],
                max_tokens
            )
        
        display_response(response)
        print(f"\n{BLUE}{'-'*60}{RESET}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{GREEN}Goodbye! 👋{RESET}\n")
        sys.exit(0)