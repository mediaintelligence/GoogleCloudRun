"""
Gemini AI Integration Service for Cloud Run
Provides intelligent AI orchestration with Gemini Pro and Gemini Vision models
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Gemini AI Orchestration Service",
    description="Cloud Run service for Gemini AI model integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model types
class ModelType(str, Enum):
    GEMINI_PRO = "gemini-pro"
    GEMINI_PRO_VISION = "gemini-pro-vision"
    GEMINI_1_5_PRO = "gemini-1.5-pro"
    GEMINI_1_5_FLASH = "gemini-1.5-flash"

# Request/Response models
class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="The input prompt for generation")
    model: ModelType = Field(default=ModelType.GEMINI_1_5_PRO, description="The Gemini model to use")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for generation")
    max_tokens: int = Field(default=2048, ge=1, le=8192, description="Maximum tokens to generate")
    top_p: float = Field(default=0.95, ge=0.0, le=1.0, description="Top-p sampling parameter")
    top_k: int = Field(default=40, ge=1, le=100, description="Top-k sampling parameter")
    system_instruction: Optional[str] = Field(default=None, description="System instruction for the model")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")

class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role (user/assistant)")
    content: str = Field(..., description="Message content")

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="Chat conversation history")
    model: ModelType = Field(default=ModelType.GEMINI_1_5_PRO, description="The Gemini model to use")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=8192)
    system_instruction: Optional[str] = Field(default=None)

class GenerateResponse(BaseModel):
    text: str = Field(..., description="Generated text response")
    model: str = Field(..., description="Model used for generation")
    usage: Dict[str, int] = Field(..., description="Token usage statistics")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class AnalyzeCodeRequest(BaseModel):
    code: str = Field(..., description="Code to analyze")
    language: str = Field(..., description="Programming language")
    analysis_type: str = Field(default="review", description="Type of analysis (review/optimize/explain/debug)")
    context: Optional[str] = Field(default=None, description="Additional context for analysis")

class WorkflowRequest(BaseModel):
    workflow_type: str = Field(..., description="Type of workflow to execute")
    steps: List[Dict[str, Any]] = Field(..., description="Workflow steps to execute")
    context: Dict[str, Any] = Field(default_factory=dict, description="Workflow context")

# Gemini AI Service
class GeminiService:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not found in environment variables")
            self.api_key = None
        else:
            genai.configure(api_key=self.api_key)
            logger.info("Gemini API configured successfully")
        
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 2048,
        }
        
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        }
    
    def _check_api_key(self):
        if not self.api_key:
            raise HTTPException(
                status_code=500,
                detail="Gemini API key not configured. Please set GEMINI_API_KEY environment variable."
            )
    
    async def generate_text(self, request: GenerateRequest) -> GenerateResponse:
        """Generate text using Gemini models"""
        self._check_api_key()
        
        try:
            # Configure generation parameters
            config = self.generation_config.copy()
            config.update({
                "temperature": request.temperature,
                "top_p": request.top_p,
                "top_k": request.top_k,
                "max_output_tokens": request.max_tokens,
            })
            
            # Initialize the model
            model = genai.GenerativeModel(
                model_name=request.model,
                generation_config=config,
                safety_settings=self.safety_settings,
                system_instruction=request.system_instruction
            )
            
            # Generate response
            response = model.generate_content(request.prompt)
            
            # Extract token usage if available
            usage = {
                "prompt_tokens": len(request.prompt.split()),  # Approximate
                "completion_tokens": len(response.text.split()),  # Approximate
                "total_tokens": len(request.prompt.split()) + len(response.text.split())
            }
            
            return GenerateResponse(
                text=response.text,
                model=request.model,
                usage=usage,
                metadata={
                    "temperature": request.temperature,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error generating text: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
    
    async def chat(self, request: ChatRequest) -> GenerateResponse:
        """Handle chat conversations with Gemini"""
        self._check_api_key()
        
        try:
            # Configure generation parameters
            config = self.generation_config.copy()
            config.update({
                "temperature": request.temperature,
                "max_output_tokens": request.max_tokens,
            })
            
            # Initialize the model
            model = genai.GenerativeModel(
                model_name=request.model,
                generation_config=config,
                safety_settings=self.safety_settings,
                system_instruction=request.system_instruction
            )
            
            # Start chat session
            chat = model.start_chat(history=[])
            
            # Process conversation history
            for message in request.messages[:-1]:  # All except the last message
                if message.role == "user":
                    chat.send_message(message.content)
            
            # Send the last message and get response
            response = chat.send_message(request.messages[-1].content)
            
            # Calculate usage
            total_input = " ".join([m.content for m in request.messages])
            usage = {
                "prompt_tokens": len(total_input.split()),
                "completion_tokens": len(response.text.split()),
                "total_tokens": len(total_input.split()) + len(response.text.split())
            }
            
            return GenerateResponse(
                text=response.text,
                model=request.model,
                usage=usage,
                metadata={
                    "conversation_length": len(request.messages),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error in chat: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
    
    async def analyze_code(self, request: AnalyzeCodeRequest) -> GenerateResponse:
        """Analyze code using Gemini's code understanding capabilities"""
        self._check_api_key()
        
        analysis_prompts = {
            "review": f"Review this {request.language} code and provide feedback on quality, best practices, and potential improvements:\n\n{request.code}",
            "optimize": f"Optimize this {request.language} code for better performance and efficiency:\n\n{request.code}",
            "explain": f"Explain what this {request.language} code does in detail:\n\n{request.code}",
            "debug": f"Debug this {request.language} code and identify any issues or bugs:\n\n{request.code}"
        }
        
        prompt = analysis_prompts.get(
            request.analysis_type,
            f"Analyze this {request.language} code:\n\n{request.code}"
        )
        
        if request.context:
            prompt = f"{request.context}\n\n{prompt}"
        
        gen_request = GenerateRequest(
            prompt=prompt,
            model=ModelType.GEMINI_1_5_PRO,
            temperature=0.3,  # Lower temperature for code analysis
            max_tokens=4096
        )
        
        return await self.generate_text(gen_request)

# Initialize service
gemini_service = GeminiService()

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Gemini AI Orchestration Service",
        "version": "1.0.0",
        "status": "running",
        "models": [model.value for model in ModelType],
        "endpoints": [
            "/health",
            "/generate",
            "/chat",
            "/analyze-code",
            "/workflow",
            "/models"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "gemini-orchestration",
        "api_configured": gemini_service.api_key is not None
    }

@app.post("/generate", response_model=GenerateResponse)
async def generate_text(request: GenerateRequest):
    """Generate text using Gemini models"""
    logger.info(f"Generate request: model={request.model}, prompt_length={len(request.prompt)}")
    return await gemini_service.generate_text(request)

@app.post("/chat", response_model=GenerateResponse)
async def chat_conversation(request: ChatRequest):
    """Handle chat conversations with Gemini"""
    logger.info(f"Chat request: model={request.model}, messages={len(request.messages)}")
    return await gemini_service.chat(request)

@app.post("/analyze-code", response_model=GenerateResponse)
async def analyze_code(request: AnalyzeCodeRequest):
    """Analyze code using Gemini"""
    logger.info(f"Code analysis request: language={request.language}, type={request.analysis_type}")
    return await gemini_service.analyze_code(request)

@app.post("/workflow")
async def execute_workflow(request: WorkflowRequest, background_tasks: BackgroundTasks):
    """Execute complex AI workflows"""
    logger.info(f"Workflow request: type={request.workflow_type}, steps={len(request.steps)}")
    
    # Workflow execution logic
    results = []
    for step in request.steps:
        step_type = step.get("type", "generate")
        
        if step_type == "generate":
            gen_request = GenerateRequest(
                prompt=step.get("prompt", ""),
                model=step.get("model", ModelType.GEMINI_1_5_PRO),
                temperature=step.get("temperature", 0.7)
            )
            result = await gemini_service.generate_text(gen_request)
            results.append({
                "step": step.get("name", "unnamed"),
                "result": result.text
            })
        elif step_type == "analyze":
            analyze_request = AnalyzeCodeRequest(
                code=step.get("code", ""),
                language=step.get("language", "python"),
                analysis_type=step.get("analysis_type", "review")
            )
            result = await gemini_service.analyze_code(analyze_request)
            results.append({
                "step": step.get("name", "unnamed"),
                "result": result.text
            })
    
    return {
        "workflow_type": request.workflow_type,
        "results": results,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/models")
async def list_models():
    """List available Gemini models"""
    return {
        "models": [
            {
                "id": model.value,
                "name": model.value,
                "description": f"Google Gemini {model.value} model",
                "capabilities": ["text-generation", "chat", "code-analysis"]
            }
            for model in ModelType
        ]
    }

@app.post("/orchestrate")
async def orchestrate_request(request: Request):
    """Advanced orchestration endpoint for complex AI tasks"""
    body = await request.json()
    
    task_type = body.get("task_type", "general")
    context = body.get("context", {})
    
    # Intelligent routing based on task type
    if task_type == "vision":
        model = ModelType.GEMINI_PRO_VISION
    elif task_type == "code":
        model = ModelType.GEMINI_1_5_PRO
    elif task_type == "fast":
        model = ModelType.GEMINI_1_5_FLASH
    else:
        model = ModelType.GEMINI_1_5_PRO
    
    gen_request = GenerateRequest(
        prompt=body.get("prompt", ""),
        model=model,
        temperature=body.get("temperature", 0.7),
        max_tokens=body.get("max_tokens", 2048),
        context=context
    )
    
    result = await gemini_service.generate_text(gen_request)
    
    return {
        "response": result.text,
        "model_used": model,
        "usage": result.usage,
        "metadata": {
            "task_type": task_type,
            "orchestrated": True,
            "timestamp": datetime.utcnow().isoformat()
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)