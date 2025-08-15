"""
Claude-Gemini Collaborative Orchestration Service
Intelligently routes and coordinates between Claude and Gemini AI models for optimal results
"""

import os
import json
import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from enum import Enum
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
import anthropic
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Claude-Gemini Collaborative Orchestration Service",
    description="Intelligent AI orchestration combining Claude and Gemini models",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model types - Custom Configuration as Requested
class AIModel(str, Enum):
    # Claude Models - Using requested naming
    CLAUDE_4_1 = "claude-3-5-sonnet-20241022"  # Maps to Claude 3.5 Sonnet (latest available)
    SONNET_4_0 = "claude-3-5-sonnet-20241022"  # Maps to Claude 3.5 Sonnet
    CLAUDE_3_OPUS = "claude-3-opus-20240229"  # Most capable classic
    CLAUDE_3_HAIKU = "claude-3-haiku-20240307"  # Fastest
    
    # Gemini Models - Using requested naming  
    GEMINI_2_5_PRO = "gemini-2.0-flash-exp"  # Maps to Gemini 2.0 Flash (latest available)
    GEMINI_2_0_FLASH = "gemini-2.0-flash-exp"  # Latest Gemini 2.0
    GEMINI_1_5_PRO = "gemini-1.5-pro-002"  # Latest 1.5 Pro
    GEMINI_1_5_FLASH = "gemini-1.5-flash-002"  # Latest 1.5 Flash

class TaskType(str, Enum):
    ANALYSIS = "analysis"
    GENERATION = "generation"
    CODE = "code"
    VISION = "vision"
    REASONING = "reasoning"
    CREATIVE = "creative"
    TRANSLATION = "translation"
    SUMMARIZATION = "summarization"
    COLLABORATIVE = "collaborative"

class CollaborationMode(str, Enum):
    PARALLEL = "parallel"  # Both models work simultaneously
    SEQUENTIAL = "sequential"  # One model then another
    DEBATE = "debate"  # Models discuss and refine
    CONSENSUS = "consensus"  # Models must agree
    SPECIALIZED = "specialized"  # Each model handles their strength

# Request/Response models
class OrchestrationRequest(BaseModel):
    prompt: str = Field(..., description="The input prompt")
    task_type: TaskType = Field(..., description="Type of task to perform")
    collaboration_mode: CollaborationMode = Field(default=CollaborationMode.SPECIALIZED)
    preferred_model: Optional[AIModel] = Field(default=None, description="Preferred model if any")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    max_tokens: int = Field(default=2048, ge=1, le=8192)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    require_consensus: bool = Field(default=False, description="Require agreement between models")

class CollaborativeWorkflow(BaseModel):
    name: str = Field(..., description="Workflow name")
    steps: List[Dict[str, Any]] = Field(..., description="Workflow steps")
    mode: CollaborationMode = Field(default=CollaborationMode.SEQUENTIAL)
    context: Dict[str, Any] = Field(default_factory=dict)

class OrchestrationResponse(BaseModel):
    primary_response: str
    supporting_response: Optional[str] = None
    model_used: str
    supporting_model: Optional[str] = None
    collaboration_mode: str
    confidence_score: float
    consensus_achieved: Optional[bool] = None
    metadata: Dict[str, Any]

# AI Service Orchestrator
class AIOrchestrator:
    def __init__(self):
        # Initialize Claude
        self.claude_api_key = os.environ.get("ANTHROPIC_API_KEY")
        if self.claude_api_key:
            self.claude_client = anthropic.Anthropic(api_key=self.claude_api_key)
            logger.info("Claude API initialized")
        else:
            logger.warning("ANTHROPIC_API_KEY not found")
            self.claude_client = None
        
        # Initialize Gemini
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
            logger.info("Gemini API initialized")
        else:
            logger.warning("GEMINI_API_KEY not found")
        
        # Model capabilities matrix - Updated for latest models
        self.model_capabilities = {
            AIModel.CLAUDE_4_1: {
                "strengths": ["reasoning", "code", "analysis", "creative", "latest"],
                "context_window": 200000,
                "speed": "fast",
                "cost": "medium",
                "version": "3.5"
            },
            AIModel.CLAUDE_3_OPUS: {
                "strengths": ["reasoning", "analysis", "code", "creative"],
                "context_window": 200000,
                "speed": "slow",
                "cost": "high",
                "version": "3.0"
            },
            AIModel.CLAUDE_3_HAIKU: {
                "strengths": ["speed", "simple_tasks"],
                "context_window": 200000,
                "speed": "very_fast",
                "cost": "low",
                "version": "3.0"
            },
            AIModel.GEMINI_2_5_PRO: {
                "strengths": ["latest", "speed", "multimodal", "reasoning"],
                "context_window": 1000000,
                "speed": "very_fast",
                "cost": "low",
                "version": "2.0"
            },
            AIModel.GEMINI_1_5_PRO: {
                "strengths": ["vision", "multimodal", "long_context"],
                "context_window": 2000000,
                "speed": "medium",
                "cost": "medium",
                "version": "1.5"
            },
            AIModel.GEMINI_1_5_FLASH: {
                "strengths": ["speed", "efficiency"],
                "context_window": 1000000,
                "speed": "very_fast",
                "cost": "low",
                "version": "1.5"
            }
        }
        
        self.task_model_mapping = {
            TaskType.ANALYSIS: [AIModel.CLAUDE_4_1, AIModel.GEMINI_2_5_PRO],
            TaskType.CODE: [AIModel.CLAUDE_4_1, AIModel.CLAUDE_3_OPUS],
            TaskType.VISION: [AIModel.GEMINI_2_5_PRO, AIModel.GEMINI_1_5_PRO],
            TaskType.REASONING: [AIModel.CLAUDE_4_1, AIModel.GEMINI_2_5_PRO],
            TaskType.CREATIVE: [AIModel.CLAUDE_4_1, AIModel.GEMINI_2_5_PRO],
            TaskType.TRANSLATION: [AIModel.GEMINI_2_5_PRO, AIModel.CLAUDE_3_HAIKU],
            TaskType.SUMMARIZATION: [AIModel.GEMINI_1_5_FLASH, AIModel.CLAUDE_3_HAIKU]
        }
    
    def select_optimal_model(self, task_type: TaskType, context: Dict[str, Any] = None) -> AIModel:
        """Select the optimal model based on task type and context"""
        preferred_models = self.task_model_mapping.get(task_type, [AIModel.CLAUDE_4_1])
        
        # Consider context for model selection
        if context:
            if context.get("require_speed"):
                # Prefer faster models
                if AIModel.GEMINI_2_5_PRO in preferred_models:
                    return AIModel.GEMINI_2_5_PRO
                elif AIModel.GEMINI_1_5_FLASH in preferred_models:
                    return AIModel.GEMINI_1_5_FLASH
                elif AIModel.CLAUDE_3_HAIKU in preferred_models:
                    return AIModel.CLAUDE_3_HAIKU
            
            if context.get("require_accuracy"):
                # Prefer more capable models
                if AIModel.CLAUDE_4_1 in preferred_models:
                    return AIModel.CLAUDE_4_1
                elif AIModel.SONNET_4_0 in preferred_models:
                    return AIModel.SONNET_4_0
                elif AIModel.CLAUDE_3_OPUS in preferred_models:
                    return AIModel.CLAUDE_3_OPUS
                elif AIModel.GEMINI_2_5_PRO in preferred_models:
                    return AIModel.GEMINI_2_5_PRO
            
            if context.get("use_latest"):
                # Prefer latest models
                if AIModel.CLAUDE_4_1 in preferred_models:
                    return AIModel.CLAUDE_4_1
                elif AIModel.SONNET_4_0 in preferred_models:
                    return AIModel.SONNET_4_0
                elif AIModel.GEMINI_2_5_PRO in preferred_models:
                    return AIModel.GEMINI_2_5_PRO
        
        return preferred_models[0] if preferred_models else AIModel.CLAUDE_4_1
    
    async def call_claude(self, prompt: str, model: AIModel, max_tokens: int = 2048, temperature: float = 0.7) -> str:
        """Call Claude API"""
        if not self.claude_client:
            raise HTTPException(status_code=500, detail="Claude API not configured")
        
        try:
            message = self.claude_client.messages.create(
                model=model.value,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text
        except Exception as e:
            logger.error(f"Claude API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Claude API error: {str(e)}")
    
    async def call_gemini(self, prompt: str, model: AIModel, max_tokens: int = 2048, temperature: float = 0.7) -> str:
        """Call Gemini API"""
        if not self.gemini_api_key:
            raise HTTPException(status_code=500, detail="Gemini API not configured")
        
        try:
            # Map to actual Gemini model names
            model_mapping = {
                AIModel.GEMINI_2_5_PRO: "gemini-2.0-flash-exp",
                AIModel.GEMINI_1_5_PRO: "gemini-1.5-pro-002",
                AIModel.GEMINI_1_5_FLASH: "gemini-1.5-flash-002",
                AIModel.GEMINI_PRO: "gemini-pro",
                AIModel.GEMINI_PRO_VISION: "gemini-pro-vision"
            }
            
            gemini_model = genai.GenerativeModel(
                model_name=model_mapping.get(model, "gemini-2.0-flash-exp"),
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                }
            )
            
            response = gemini_model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")
    
    async def parallel_execution(self, request: OrchestrationRequest) -> OrchestrationResponse:
        """Execute tasks in parallel using both models"""
        logger.info(f"Parallel execution for task: {request.task_type}")
        
        # Select models - use latest models
        primary_model = self.select_optimal_model(request.task_type, request.context)
        secondary_model = AIModel.GEMINI_2_5_PRO if "claude" in primary_model.value else AIModel.CLAUDE_4_1
        
        # Execute in parallel
        tasks = []
        if "claude" in primary_model.value:
            tasks.append(self.call_claude(request.prompt, primary_model, request.max_tokens, request.temperature))
        else:
            tasks.append(self.call_gemini(request.prompt, primary_model, request.max_tokens, request.temperature))
        
        if "claude" in secondary_model.value:
            tasks.append(self.call_claude(request.prompt, secondary_model, request.max_tokens, request.temperature))
        else:
            tasks.append(self.call_gemini(request.prompt, secondary_model, request.max_tokens, request.temperature))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle results
        primary_response = results[0] if not isinstance(results[0], Exception) else "Error in primary model"
        secondary_response = results[1] if not isinstance(results[1], Exception) else None
        
        return OrchestrationResponse(
            primary_response=primary_response,
            supporting_response=secondary_response,
            model_used=primary_model.value,
            supporting_model=secondary_model.value,
            collaboration_mode=CollaborationMode.PARALLEL,
            confidence_score=0.85,
            metadata={
                "execution_time": datetime.utcnow().isoformat(),
                "parallel_execution": True
            }
        )
    
    async def sequential_execution(self, request: OrchestrationRequest) -> OrchestrationResponse:
        """Execute tasks sequentially, with output from one feeding into another"""
        logger.info(f"Sequential execution for task: {request.task_type}")
        
        # First model analyzes - use latest models
        analysis_model = AIModel.CLAUDE_4_1 if request.task_type in [TaskType.ANALYSIS, TaskType.REASONING] else AIModel.GEMINI_2_5_PRO
        
        analysis_prompt = f"Analyze this request and provide key insights:\n{request.prompt}"
        
        if "claude" in analysis_model.value:
            analysis = await self.call_claude(analysis_prompt, analysis_model, 1024, 0.5)
        else:
            analysis = await self.call_gemini(analysis_prompt, analysis_model, 1024, 0.5)
        
        # Second model builds on analysis
        synthesis_model = AIModel.GEMINI_2_5_PRO if "claude" in analysis_model.value else AIModel.CLAUDE_4_1
        
        synthesis_prompt = f"""Based on this analysis:
{analysis}

Now provide a comprehensive response to the original request:
{request.prompt}"""
        
        if "claude" in synthesis_model.value:
            final_response = await self.call_claude(synthesis_prompt, synthesis_model, request.max_tokens, request.temperature)
        else:
            final_response = await self.call_gemini(synthesis_prompt, synthesis_model, request.max_tokens, request.temperature)
        
        return OrchestrationResponse(
            primary_response=final_response,
            supporting_response=analysis,
            model_used=synthesis_model.value,
            supporting_model=analysis_model.value,
            collaboration_mode=CollaborationMode.SEQUENTIAL,
            confidence_score=0.9,
            metadata={
                "execution_time": datetime.utcnow().isoformat(),
                "analysis_first": True
            }
        )
    
    async def debate_execution(self, request: OrchestrationRequest) -> OrchestrationResponse:
        """Models debate and refine each other's responses"""
        logger.info(f"Debate execution for task: {request.task_type}")
        
        # Initial responses from both latest models
        claude_model = AIModel.CLAUDE_4_1
        gemini_model = AIModel.GEMINI_2_5_PRO
        
        # Round 1: Initial responses
        claude_response = await self.call_claude(request.prompt, claude_model, 1024, request.temperature)
        gemini_response = await self.call_gemini(request.prompt, gemini_model, 1024, request.temperature)
        
        # Round 2: Critique and refine
        critique_prompt = f"""Original question: {request.prompt}

Model A's response: {claude_response}

Model B's response: {gemini_response}

Provide a refined answer that combines the best insights from both responses and addresses any gaps or disagreements."""
        
        # Final synthesis by Claude 3.5 Sonnet (latest and best)
        final_response = await self.call_claude(critique_prompt, AIModel.CLAUDE_4_1, request.max_tokens, 0.5)
        
        return OrchestrationResponse(
            primary_response=final_response,
            supporting_response=f"Claude: {claude_response[:500]}...\n\nGemini: {gemini_response[:500]}...",
            model_used=AIModel.CLAUDE_4_1.value,
            supporting_model=f"{claude_model.value} + {gemini_model.value}",
            collaboration_mode=CollaborationMode.DEBATE,
            confidence_score=0.95,
            consensus_achieved=True,
            metadata={
                "execution_time": datetime.utcnow().isoformat(),
                "debate_rounds": 2
            }
        )
    
    async def consensus_execution(self, request: OrchestrationRequest) -> OrchestrationResponse:
        """Both models must reach consensus"""
        logger.info(f"Consensus execution for task: {request.task_type}")
        
        model1 = AIModel.CLAUDE_4_1
        model2 = AIModel.GEMINI_2_5_PRO
        
        # Get initial responses
        response1 = await self.call_claude(request.prompt, model1, request.max_tokens, request.temperature)
        response2 = await self.call_gemini(request.prompt, model2, request.max_tokens, request.temperature)
        
        # Check for consensus
        consensus_prompt = f"""Compare these two responses and determine if they fundamentally agree:

Response 1: {response1}

Response 2: {response2}

If they agree, provide a unified response. If they disagree, identify the key differences and provide a balanced perspective."""
        
        consensus_response = await self.call_claude(consensus_prompt, AIModel.CLAUDE_4_1, request.max_tokens, 0.3)
        
        # Simple consensus check
        consensus_achieved = "agree" in consensus_response.lower() or "consensus" in consensus_response.lower()
        
        return OrchestrationResponse(
            primary_response=consensus_response,
            supporting_response=f"Model 1: {response1[:300]}...\n\nModel 2: {response2[:300]}...",
            model_used=f"{model1.value} + {model2.value}",
            supporting_model=AIModel.CLAUDE_4_1.value,
            collaboration_mode=CollaborationMode.CONSENSUS,
            confidence_score=0.9 if consensus_achieved else 0.7,
            consensus_achieved=consensus_achieved,
            metadata={
                "execution_time": datetime.utcnow().isoformat(),
                "consensus_evaluator": AIModel.CLAUDE_4_1.value
            }
        )
    
    async def specialized_execution(self, request: OrchestrationRequest) -> OrchestrationResponse:
        """Each model handles what they do best"""
        logger.info(f"Specialized execution for task: {request.task_type}")
        
        responses = {}
        
        # Determine specializations needed
        if request.task_type == TaskType.CODE:
            # Claude 3.5 Sonnet handles code logic (best for code)
            code_response = await self.call_claude(
                f"Provide code implementation for: {request.prompt}",
                AIModel.CLAUDE_4_1,
                request.max_tokens,
                request.temperature
            )
            responses["code"] = code_response
            
            # Gemini 2.0 handles documentation
            doc_response = await self.call_gemini(
                f"Write clear documentation for this code:\n{code_response[:1000]}",
                AIModel.GEMINI_2_5_PRO,
                512,
                0.7
            )
            responses["documentation"] = doc_response
            
            final_response = f"**Implementation:**\n{code_response}\n\n**Documentation:**\n{doc_response}"
            primary_model = AIModel.CLAUDE_4_1.value
            supporting_model = AIModel.GEMINI_2_5_PRO.value
            
        elif request.task_type == TaskType.ANALYSIS:
            # Claude 3.5 Sonnet does deep analysis
            analysis = await self.call_claude(
                f"Provide detailed analysis: {request.prompt}",
                AIModel.CLAUDE_4_1,
                request.max_tokens,
                0.5
            )
            responses["analysis"] = analysis
            
            # Gemini 2.0 provides quick summary
            summary = await self.call_gemini(
                f"Summarize this analysis in bullet points:\n{analysis[:1500]}",
                AIModel.GEMINI_2_5_PRO,
                512,
                0.7
            )
            responses["summary"] = summary
            
            final_response = f"**Analysis:**\n{analysis}\n\n**Summary:**\n{summary}"
            primary_model = AIModel.CLAUDE_4_1.value
            supporting_model = AIModel.GEMINI_2_5_PRO.value
            
        else:
            # Default specialized handling
            primary_model_enum = self.select_optimal_model(request.task_type, request.context)
            
            if "claude" in primary_model_enum.value:
                final_response = await self.call_claude(request.prompt, primary_model_enum, request.max_tokens, request.temperature)
            else:
                final_response = await self.call_gemini(request.prompt, primary_model_enum, request.max_tokens, request.temperature)
            
            primary_model = primary_model_enum.value
            supporting_model = None
        
        return OrchestrationResponse(
            primary_response=final_response,
            supporting_response=responses.get("summary") or responses.get("documentation"),
            model_used=primary_model,
            supporting_model=supporting_model,
            collaboration_mode=CollaborationMode.SPECIALIZED,
            confidence_score=0.92,
            metadata={
                "execution_time": datetime.utcnow().isoformat(),
                "specializations": list(responses.keys())
            }
        )
    
    async def orchestrate(self, request: OrchestrationRequest) -> OrchestrationResponse:
        """Main orchestration logic"""
        logger.info(f"Orchestrating request: task={request.task_type}, mode={request.collaboration_mode}")
        
        # Route to appropriate execution mode
        if request.collaboration_mode == CollaborationMode.PARALLEL:
            return await self.parallel_execution(request)
        elif request.collaboration_mode == CollaborationMode.SEQUENTIAL:
            return await self.sequential_execution(request)
        elif request.collaboration_mode == CollaborationMode.DEBATE:
            return await self.debate_execution(request)
        elif request.collaboration_mode == CollaborationMode.CONSENSUS:
            return await self.consensus_execution(request)
        elif request.collaboration_mode == CollaborationMode.SPECIALIZED:
            return await self.specialized_execution(request)
        else:
            # Default to specialized execution
            return await self.specialized_execution(request)

# Initialize orchestrator
orchestrator = AIOrchestrator()

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Claude-Gemini Collaborative Orchestration",
        "version": "2.0.0",
        "status": "running",
        "capabilities": {
            "models": [model.value for model in AIModel],
            "task_types": [task.value for task in TaskType],
            "collaboration_modes": [mode.value for mode in CollaborationMode]
        },
        "endpoints": [
            "/health",
            "/orchestrate",
            "/workflow",
            "/compare",
            "/capabilities",
            "/models"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "claude-gemini-orchestrator",
        "claude_configured": orchestrator.claude_client is not None,
        "gemini_configured": orchestrator.gemini_api_key is not None
    }

@app.post("/orchestrate", response_model=OrchestrationResponse)
async def orchestrate_request(request: OrchestrationRequest):
    """Main orchestration endpoint"""
    return await orchestrator.orchestrate(request)

@app.post("/workflow")
async def execute_workflow(workflow: CollaborativeWorkflow):
    """Execute complex collaborative workflows"""
    results = []
    context = workflow.context.copy()
    
    for i, step in enumerate(workflow.steps):
        step_name = step.get("name", f"step_{i}")
        step_type = TaskType(step.get("task_type", "generation"))
        step_prompt = step.get("prompt", "")
        
        # Add previous results to context
        if results:
            step_prompt = f"{step_prompt}\n\nPrevious results:\n{results[-1]['response'][:500]}"
        
        request = OrchestrationRequest(
            prompt=step_prompt,
            task_type=step_type,
            collaboration_mode=workflow.mode,
            context=context,
            max_tokens=step.get("max_tokens", 2048),
            temperature=step.get("temperature", 0.7)
        )
        
        response = await orchestrator.orchestrate(request)
        
        results.append({
            "step": step_name,
            "response": response.primary_response,
            "model": response.model_used,
            "metadata": response.metadata
        })
        
        # Update context with results
        context[f"step_{i}_result"] = response.primary_response[:500]
    
    return {
        "workflow": workflow.name,
        "mode": workflow.mode,
        "results": results,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/compare")
async def compare_models(request: OrchestrationRequest):
    """Compare responses from different models"""
    # Get responses from both Claude and Gemini latest models
    claude_models = [AIModel.CLAUDE_4_1, AIModel.CLAUDE_3_OPUS]
    gemini_models = [AIModel.GEMINI_2_5_PRO, AIModel.GEMINI_1_5_PRO]
    
    comparisons = []
    
    for claude_model in claude_models[:1]:  # Limit to avoid excessive API calls
        for gemini_model in gemini_models[:1]:
            try:
                claude_response = await orchestrator.call_claude(
                    request.prompt,
                    claude_model,
                    min(request.max_tokens, 1024),
                    request.temperature
                )
                
                gemini_response = await orchestrator.call_gemini(
                    request.prompt,
                    gemini_model,
                    min(request.max_tokens, 1024),
                    request.temperature
                )
                
                comparisons.append({
                    "claude_model": claude_model.value,
                    "claude_response": claude_response[:500],
                    "gemini_model": gemini_model.value,
                    "gemini_response": gemini_response[:500]
                })
            except Exception as e:
                logger.error(f"Comparison error: {str(e)}")
    
    return {
        "prompt": request.prompt[:200],
        "comparisons": comparisons,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/capabilities")
async def get_capabilities():
    """Get detailed capabilities of each model"""
    return {
        "model_capabilities": orchestrator.model_capabilities,
        "task_model_mapping": {
            task.value: [model.value for model in models]
            for task, models in orchestrator.task_model_mapping.items()
        },
        "collaboration_modes": {
            CollaborationMode.PARALLEL: "Both models work simultaneously on the same task",
            CollaborationMode.SEQUENTIAL: "One model's output feeds into another",
            CollaborationMode.DEBATE: "Models discuss and refine each other's responses",
            CollaborationMode.CONSENSUS: "Models must reach agreement",
            CollaborationMode.SPECIALIZED: "Each model handles their area of expertise"
        }
    }

@app.get("/models")
async def list_models():
    """List all available models and their status"""
    models_status = []
    
    for model in AIModel:
        is_claude = "claude" in model.value
        is_configured = orchestrator.claude_client is not None if is_claude else orchestrator.gemini_api_key is not None
        
        models_status.append({
            "model": model.value,
            "provider": "Anthropic" if is_claude else "Google",
            "configured": is_configured,
            "capabilities": orchestrator.model_capabilities.get(model, {})
        })
    
    return {"models": models_status}

@app.post("/smart-route")
async def smart_route(request: Request):
    """Intelligently route requests based on content analysis"""
    body = await request.json()
    prompt = body.get("prompt", "")
    
    # Analyze prompt to determine best approach
    task_indicators = {
        TaskType.CODE: ["code", "function", "implement", "debug", "program"],
        TaskType.ANALYSIS: ["analyze", "evaluate", "assess", "examine"],
        TaskType.VISION: ["image", "picture", "visual", "see", "look"],
        TaskType.REASONING: ["why", "how", "explain", "reason", "logic"],
        TaskType.CREATIVE: ["create", "write", "story", "poem", "design"],
        TaskType.TRANSLATION: ["translate", "convert", "language"],
        TaskType.SUMMARIZATION: ["summarize", "summary", "brief", "tldr"]
    }
    
    # Detect task type
    detected_task = TaskType.GENERATION
    for task_type, keywords in task_indicators.items():
        if any(keyword in prompt.lower() for keyword in keywords):
            detected_task = task_type
            break
    
    # Determine collaboration mode based on complexity
    if len(prompt.split()) > 100 or "complex" in prompt.lower():
        mode = CollaborationMode.DEBATE
    elif "compare" in prompt.lower() or "versus" in prompt.lower():
        mode = CollaborationMode.PARALLEL
    elif detected_task == TaskType.CODE:
        mode = CollaborationMode.SPECIALIZED
    else:
        mode = CollaborationMode.SEQUENTIAL
    
    # Create orchestration request
    orch_request = OrchestrationRequest(
        prompt=prompt,
        task_type=detected_task,
        collaboration_mode=mode,
        context=body.get("context", {}),
        max_tokens=body.get("max_tokens", 2048),
        temperature=body.get("temperature", 0.7)
    )
    
    response = await orchestrator.orchestrate(orch_request)
    
    return {
        "response": response.primary_response,
        "supporting": response.supporting_response,
        "detected_task": detected_task,
        "collaboration_mode": mode,
        "models_used": {
            "primary": response.model_used,
            "supporting": response.supporting_model
        },
        "confidence": response.confidence_score,
        "metadata": response.metadata
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)