#!/bin/bash

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       AI Assistant Chat Interface                     ║${NC}"
echo -e "${BLUE}║   Models: Claude4.1, ChatGPT5, GEMINI 2.5, Grok4      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to send message to AI
send_message() {
    local prompt="$1"
    local task_type="$2"
    local mode="$3"
    
    echo -e "${YELLOW}🤖 AI is thinking...${NC}"
    echo ""
    
    response=$(curl -s -X POST http://localhost:8081/orchestrate \
        -H "Content-Type: application/json" \
        -d "{
            \"prompt\": \"$prompt\",
            \"task_type\": \"$task_type\",
            \"collaboration_mode\": \"$mode\",
            \"max_tokens\": 500,
            \"temperature\": 0.7
        }")
    
    # Extract and display the response
    primary=$(echo "$response" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('primary_response', 'No response'))" 2>/dev/null)
    model=$(echo "$response" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('model_used', 'Unknown'))" 2>/dev/null)
    
    echo -e "${GREEN}[$model]:${NC}"
    echo "$primary"
    echo ""
    echo "────────────────────────────────────────────────────────"
}

# Main chat loop
while true; do
    echo -e "${BLUE}Choose communication mode:${NC}"
    echo "1) Quick Question (specialized mode)"
    echo "2) Code Help (specialized mode)"
    echo "3) Analysis (debate mode)"
    echo "4) Creative (parallel mode)"
    echo "5) Complex Problem (sequential mode)"
    echo "6) Custom mode"
    echo "7) Exit"
    echo ""
    
    read -p "Select mode (1-7): " mode_choice
    
    if [ "$mode_choice" == "7" ]; then
        echo -e "${GREEN}Goodbye! 👋${NC}"
        exit 0
    fi
    
    # Set parameters based on choice
    case $mode_choice in
        1)
            task_type="generation"
            collab_mode="specialized"
            ;;
        2)
            task_type="code"
            collab_mode="specialized"
            ;;
        3)
            task_type="analysis"
            collab_mode="debate"
            ;;
        4)
            task_type="creative"
            collab_mode="parallel"
            ;;
        5)
            task_type="reasoning"
            collab_mode="sequential"
            ;;
        6)
            echo "Task types: analysis, generation, code, reasoning, creative, translation, summarization"
            read -p "Enter task type: " task_type
            echo "Modes: parallel, sequential, debate, consensus, specialized"
            read -p "Enter collaboration mode: " collab_mode
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            continue
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}Type your message (or 'back' to change mode):${NC}"
    read -p "> " user_message
    
    if [ "$user_message" == "back" ]; then
        continue
    fi
    
    echo ""
    send_message "$user_message" "$task_type" "$collab_mode"
done