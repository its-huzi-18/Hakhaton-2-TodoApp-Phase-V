"""
AI Service for OpenRouter + MCP tools
Handles task management with robust JSON parsing and fallback
"""

import os
import json
import re
from typing import Dict, Any, List, Optional
from uuid import UUID

from dotenv import load_dotenv
from openai import AsyncOpenAI
from app.services.mcp_tool_wrappers import get_mcp_tools_wrapper, TOOLS_DEFINITIONS

load_dotenv()


def safe_uuid(val: Optional[str]) -> Optional[UUID]:
    """Convert string to UUID safely"""
    if val is None:
        return None
    try:
        return UUID(val)
    except ValueError:
        return val  # leave as-is if invalid


class AIService:
    def __init__(self):
        # Try OpenAI API key first, then fallback to OpenRouter
        self.api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENROUTER_API_KEY")
        
        if not self.api_key:
            print("[WARNING] OPENAI_API_KEY or OPENROUTER_API_KEY not set. AI functionality will be limited.")
            self.client = None
        else:
            # Use OpenAI directly if OPENAI_API_KEY is set, otherwise use OpenRouter
            if os.getenv("OPENAI_API_KEY"):
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url="https://api.openai.com/v1",
                )
                self.model_name = os.getenv("AI_MODEL", "gpt-3.5-turbo")
            else:
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url="https://openrouter.ai/api/v1",
                )
                self.model_name = os.getenv("AI_MODEL", "mistralai/devstral-2512:free")

    # ---------------- System Prompt ----------------
    def _system_prompt(self) -> str:
        return f"""
You are a strict task management AI agent.
You can perform: add, list, update, complete, delete tasks.

TOOLS:
{json.dumps(TOOLS_DEFINITIONS, indent=2)}

RULES:
- If a tool is needed, respond ONLY in valid JSON:
{{
  "tool_name": "<tool_name>",
  "arguments": {{ ... }}
}}
- Do NOT include user_id; it will be added automatically.
- If no tool is needed, respond in plain text.
- Always confirm your actions.
"""

    def _detect_ambiguous_request(self, msg: str) -> bool:
        """Detect vague requests that need clarification"""
        ambiguous = ["it", "that", "the task", "that one", "first one", "last one",
                     "mentioned", "above", "previous", "next", "another", "more",
                     "do it", "handle this", "take care of", "manage this"]
        msg = msg.lower()
        return any(word in msg for word in ambiguous)

    # ---------------- Main Processing ----------------
    async def process_natural_language_request(
        self,
        user_message: str,
        user_id: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        db_session=None
    ) -> Dict[str, Any]:

        wrapper = get_mcp_tools_wrapper(db_session)
        response_payload = {"response": "", "tool_calls": [], "task_updates": []}

        if not self.client:
            return {
                "response": "⚠️ AI service not configured. Set OPENROUTER_API_KEY to enable AI features.",
                "tool_calls": [],
                "task_updates": []
            }

        if self._detect_ambiguous_request(user_message):
            return {"response": "Please clarify which task you mean.", **response_payload}

        # ---------------- Build Messages ----------------
        messages = [{"role": "system", "content": self._system_prompt()}]

        if conversation_history:
            for msg in conversation_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": user_message})

        try:
            # ---------------- Call OpenRouter ----------------
            resp = await self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7
            )

            # ---------------- Extract text robustly ----------------
            text = ""
            if resp.choices:
                choice = resp.choices[0]
                # Handle normal OpenAI style
                if hasattr(choice, "message") and choice.message:
                    text = getattr(choice.message, "content", "") or ""
                # Handle OpenRouter delta-style
                elif hasattr(choice, "delta"):
                    text = getattr(choice.delta, "content", "") or ""
            text = text.strip()
            if not text:
                text = "⚠️ AI returned no response."

            # ---------------- Try JSON parsing ----------------
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group())
                    if isinstance(parsed, dict) and "tool_name" in parsed:
                        tool_name = parsed["tool_name"]
                        arguments = parsed.get("arguments", {})
                        # Add user_id automatically if needed
                        if tool_name in ["create_task", "get_tasks", "find_task_by_title"] and "user_id" not in arguments:
                            arguments["user_id"] = user_id
                        # Convert UUID args safely
                        for k in ["user_id", "task_id"]:
                            if k in arguments:
                                arguments[k] = str(safe_uuid(arguments[k]))
                        # Execute tool
                        if hasattr(wrapper, tool_name):
                            data = await getattr(wrapper, tool_name)(**arguments)
                            response_payload["tool_calls"].append({
                                "name": tool_name,
                                "arguments": arguments,
                                "response": data
                            })
                            response_payload["task_updates"].append({
                                "action": tool_name.replace("_task", "").replace("task_", ""),
                                "task": data
                            })
                            # Friendly response
                            if "create" in tool_name:
                                response_payload["response"] = "✅ Task added successfully!"
                            elif "delete" in tool_name:
                                response_payload["response"] = "🗑️ Task deleted successfully!"
                            elif "complete" in tool_name:
                                response_payload["response"] = "✅ Task marked as completed!"
                            elif "update" in tool_name:
                                response_payload["response"] = "✏️ Task updated successfully!"
                            elif "get" in tool_name:
                                if isinstance(data, list) and not data:
                                    response_payload["response"] = "📋 You have no tasks."
                                else:
                                    response_payload["response"] = "📋 Here are your tasks!"
                            return response_payload
                        else:
                            response_payload["response"] = f"⚠️ Unknown tool: {tool_name}"
                            return response_payload
                except json.JSONDecodeError:
                    pass  # fallback to semantic parsing

            # ---------------- Fallback: Add task via semantic parsing ----------------
            user_lower = user_message.lower()
            if any(k in user_lower for k in ["add task", "create task", "new task", "task for"]):
                title_match = re.search(r'(?:add|create|new)\s+(?:a\s+)?(?:task|todo)\s+(?:for\s+|to\s+|)(.+)', user_lower, re.IGNORECASE)
                if not title_match:
                    title_match = re.search(r'task\s+(?:for\s+|to\s+|)(.+)', user_lower, re.IGNORECASE)
                if title_match:
                    title = title_match.group(1).strip().split(".")[0]
                    data = await wrapper.create_task(title=title.title(), user_id=user_id)
                    response_payload["tool_calls"].append({
                        "name": "create_task",
                        "arguments": {"title": title.title(), "user_id": user_id},
                        "response": data
                    })
                    response_payload["task_updates"].append({"action": "create", "task": data})
                    response_payload["response"] = "✅ Task added successfully!"
                    return response_payload

            # ---------------- Default fallback ----------------
            response_payload["response"] = text
            return response_payload

        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"response": f"⚠️ Error processing request: {str(e)}", **response_payload}


# ---------------- Singleton ----------------
_ai_service_instance = None

def get_ai_service() -> AIService:
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = AIService()
    return _ai_service_instance






# """
# AI Service for OpenRouter + MCP tools
# Handles task management with robust JSON parsing and fallback
# """

# import os
# import json
# import re
# from typing import Dict, Any, List, Optional
# from uuid import UUID

# from dotenv import load_dotenv
# from openai import AsyncOpenAI
# from app.services.mcp_tool_wrappers import get_mcp_tools_wrapper, TOOLS_DEFINITIONS

# load_dotenv()


# def safe_uuid(val: Optional[str]) -> Optional[UUID]:
#     """Convert string to UUID safely"""
#     if val is None:
#         return None
#     try:
#         return UUID(val)
#     except ValueError:
#         return val  # leave as-is if invalid


# class AIService:
#     def __init__(self):
#         self.model_name = os.getenv("AI_MODEL", "mistralai/devstral-2512:free")
#         self.api_key = os.getenv("OPENROUTER_API_KEY")

#         if not self.api_key:
#             print("⚠️ OPENROUTER_API_KEY not set. AI functionality will be limited.")
#             self.client = None
#         else:
#             self.client = AsyncOpenAI(
#                 api_key=self.api_key,
#                 base_url="https://openrouter.ai/api/v1",
#             )

#     # ---------------- System Prompt ----------------
#     def _system_prompt(self) -> str:
#         return f"""
# You are a strict task management AI agent.
# You can perform: add, list, update, complete, delete tasks.

# TOOLS:
# {json.dumps(TOOLS_DEFINITIONS, indent=2)}

# RULES:
# - If a tool is needed, respond ONLY in valid JSON:
# {{
#   "tool_name": "<tool_name>",
#   "arguments": {{ ... }}
# }}
# - Do NOT include user_id; it will be added automatically.
# - If no tool is needed, respond in plain text.
# - Always confirm your actions.
# """

#     def _detect_ambiguous_request(self, msg: str) -> bool:
#         """Detect vague requests that need clarification"""
#         ambiguous = ["it", "that", "the task", "that one", "first one", "last one",
#                      "mentioned", "above", "previous", "next", "another", "more",
#                      "do it", "handle this", "take care of", "manage this"]
#         msg = msg.lower()
#         return any(word in msg for word in ambiguous)

#     # ---------------- Main Processing ----------------
#     async def process_natural_language_request(
#         self,
#         user_message: str,
#         user_id: str,
#         conversation_history: Optional[List[Dict[str, str]]] = None,
#         db_session=None
#     ) -> Dict[str, Any]:

#         wrapper = get_mcp_tools_wrapper(db_session)
#         response_payload = {"response": "", "tool_calls": [], "task_updates": []}

#         if not self.client:
#             return {
#                 "response": "⚠️ AI service not configured. Set OPENROUTER_API_KEY to enable AI features.",
#                 "tool_calls": [],
#                 "task_updates": []
#             }

#         if self._detect_ambiguous_request(user_message):
#             return {"response": "Please clarify which task you mean.", **response_payload}

#         # ---------------- Build Messages ----------------
#         messages = [{"role": "system", "content": self._system_prompt()}]

#         if conversation_history:
#             for msg in conversation_history:
#                 role = msg.get("role", "user")
#                 content = msg.get("content", "")
#                 messages.append({"role": role, "content": content})

#         messages.append({"role": "user", "content": user_message})

#         try:
#             # ---------------- Call OpenRouter ----------------
#             resp = await self.client.chat.completions.create(
#                 model=self.model_name,
#                 messages=messages,
#                 temperature=0.7
#             )

#             # ---------------- Extract text robustly ----------------
#             text = ""
#             if resp.choices:
#                 choice = resp.choices[0]
#                 # Handle normal OpenAI style
#                 if hasattr(choice, "message") and choice.message:
#                     text = getattr(choice.message, "content", "") or ""
#                 # Handle OpenRouter delta-style
#                 elif hasattr(choice, "delta"):
#                     text = getattr(choice.delta, "content", "") or ""
#             text = text.strip()
#             if not text:
#                 text = "⚠️ AI returned no response."

#             # ---------------- Try JSON parsing ----------------
#             json_match = re.search(r'\{.*\}', text, re.DOTALL)
#             if json_match:
#                 try:
#                     parsed = json.loads(json_match.group())
#                     if isinstance(parsed, dict) and "tool_name" in parsed:
#                         tool_name = parsed["tool_name"]
#                         arguments = parsed.get("arguments", {})
#                         # Add user_id automatically if needed
#                         if tool_name in ["create_task", "get_tasks", "find_task_by_title"] and "user_id" not in arguments:
#                             arguments["user_id"] = user_id
#                         # Convert UUID args safely
#                         for k in ["user_id", "task_id"]:
#                             if k in arguments:
#                                 arguments[k] = str(safe_uuid(arguments[k]))
#                         # Execute tool
#                         if hasattr(wrapper, tool_name):
#                             data = await getattr(wrapper, tool_name)(**arguments)
#                             response_payload["tool_calls"].append({
#                                 "name": tool_name,
#                                 "arguments": arguments,
#                                 "response": data
#                             })
#                             response_payload["task_updates"].append({
#                                 "action": tool_name.replace("_task", "").replace("task_", ""),
#                                 "task": data
#                             })
#                             # Friendly response
#                             if "create" in tool_name:
#                                 response_payload["response"] = "✅ Task added successfully!"
#                             elif "delete" in tool_name:
#                                 response_payload["response"] = "🗑️ Task deleted successfully!"
#                             elif "complete" in tool_name:
#                                 response_payload["response"] = "✅ Task marked as completed!"
#                             elif "update" in tool_name:
#                                 response_payload["response"] = "✏️ Task updated successfully!"
#                             elif "get" in tool_name:
#                                 response_payload["response"] = "📋 Here are your tasks!"
#                             return response_payload
#                         else:
#                             response_payload["response"] = f"⚠️ Unknown tool: {tool_name}"
#                             return response_payload
#                 except json.JSONDecodeError:
#                     pass  # fallback to semantic parsing

#             # ---------------- Fallback: Add task via semantic parsing ----------------
#             user_lower = user_message.lower()
#             if any(k in user_lower for k in ["add task", "create task", "new task", "task for"]):
#                 title_match = re.search(r'(?:add|create|new)\s+(?:a\s+)?(?:task|todo)\s+(?:for\s+|to\s+|)(.+)', user_lower, re.IGNORECASE)
#                 if not title_match:
#                     title_match = re.search(r'task\s+(?:for\s+|to\s+|)(.+)', user_lower, re.IGNORECASE)
#                 if title_match:
#                     title = title_match.group(1).strip().split(".")[0]
#                     data = await wrapper.create_task(title=title.title(), user_id=user_id)
#                     response_payload["tool_calls"].append({
#                         "name": "create_task",
#                         "arguments": {"title": title.title(), "user_id": user_id},
#                         "response": data
#                     })
#                     response_payload["task_updates"].append({"action": "create", "task": data})
#                     response_payload["response"] = "✅ Task added successfully!"
#                     return response_payload

#             # ---------------- Default fallback ----------------
#             response_payload["response"] = text
#             return response_payload

#         except Exception as e:
#             import traceback
#             traceback.print_exc()
#             return {"response": f"⚠️ Error processing request: {str(e)}", **response_payload}


# # ---------------- Singleton ----------------
# _ai_service_instance = None

# def get_ai_service() -> AIService:
#     global _ai_service_instance
#     if _ai_service_instance is None:
#         _ai_service_instance = AIService()
#     return _ai_service_instance




# """
# AI Service for Gemini (via OpenRouter) – STABLE WORKING VERSION
# """

# import os
# import json
# import re
# from typing import Dict, Any, List, Optional
# from dotenv import load_dotenv
# from openai import AsyncOpenAI
# from app.services.mcp_tool_wrappers import get_mcp_tools_wrapper, TOOLS_DEFINITIONS

# load_dotenv()


# class AIService:
#     def __init__(self):
#         self.model_name = os.getenv("AI_MODEL", "mistralai/devstral-2512:free")
#         self.api_key = os.getenv("OPENROUTER_API_KEY")

#         if not self.api_key:
#             print("⚠️ OPENROUTER_API_KEY not set")
#             self.client = None
#         else:
#             self.client = AsyncOpenAI(
#                 api_key=self.api_key,
#                 base_url="https://openrouter.ai/api/v1",
#                 default_headers={
#                     "HTTP-Referer": "http://localhost",
#                     "X-Title": "Task AI Agent"
#                 }
#             )

#     def _is_ambiguous(self, text: str) -> bool:
#         vague = ["it", "that", "this", "previous", "last one"]
#         return any(v in text.lower() for v in vague)

#     def _system_prompt(self) -> str:
#         return f"""
# You are a task management AI agent.

# TOOLS:
# {json.dumps(TOOLS_DEFINITIONS, indent=2)}

# STRICT RULES:
# - If an action is required → OUTPUT ONLY JSON
# - JSON FORMAT:
# {{
#   "tool_name": "create_task | update_task | delete_task | complete_task | get_tasks",
#   "arguments": {{ ... }}
# }}
# - DO NOT add user_id (system adds it)
# - No markdown
# - No explanations
# """

#     async def process_natural_language_request(
#         self,
#         user_message: str,
#         user_id: str,
#         conversation_history: Optional[List[Dict[str, str]]] = None,
#         db_session=None
#     ) -> Dict[str, Any]:

#         if not self.client:
#             return {"response": "⚠️ AI not configured", "tool_calls": [], "task_updates": []}

#         if self._is_ambiguous(user_message):
#             return {"response": "Please clarify which task you mean.", "tool_calls": [], "task_updates": []}

#         messages = [{"role": "system", "content": self._system_prompt()}]

#         if conversation_history:
#             for msg in conversation_history:
#                 messages.append({
#                     "role": msg.get("role", "user"),
#                     "content": msg.get("content", "")
#                 })

#         messages.append({"role": "user", "content": user_message})

#         try:
#             res = await self.client.chat.completions.create(
#                 model=self.model_name,
#                 messages=messages,
#                 temperature=0.2
#             )

#             text = res.choices[0].message.content.strip()
#             payload = {"response": "", "tool_calls": [], "task_updates": []}

#             # --- SAFE JSON EXTRACTION ---
#             if "{" in text and "}" in text:
#                 json_text = text[text.find("{"): text.rfind("}") + 1]
#                 try:
#                     parsed = json.loads(json_text)
#                 except:
#                     parsed = None
#             else:
#                 parsed = None

#             wrapper = get_mcp_tools_wrapper(db_session)

#             if parsed and "tool_name" in parsed:
#                 tool = parsed["tool_name"]
#                 args = parsed.get("arguments", {})
#                 args["user_id"] = user_id

#                 if hasattr(wrapper, tool):
#                     data = await getattr(wrapper, tool)(**args)

#                     payload["tool_calls"].append({"name": tool, "arguments": args})
#                     payload["task_updates"].append({"action": tool, "task": data})

#                     payload["response"] = tool.replace("_", " ").capitalize() + " successful"
#                     return payload

#             # --- FALLBACK TASK CREATE ---
#             if any(k in user_message.lower() for k in ["add task", "create task", "new task"]):
#                 title = user_message.split("task")[-1].strip().capitalize()
#                 data = await wrapper.create_task(title=title, user_id=user_id)

#                 payload["task_updates"].append({"action": "create", "task": data})
#                 payload["response"] = "Task added successfully"
#                 return payload

#             payload["response"] = text
#             return payload

#         except Exception as e:
#             import traceback
#             traceback.print_exc()
#             return {"response": str(e), "tool_calls": [], "task_updates": []}


# # Singleton
# _ai = None
# def get_ai_service():
#     global _ai
#     if not _ai:
#         _ai = AIService()
#     return _ai




# """
# AI Service using COHERE (Command-R / Command-R-Plus)
# Works with Neon PostgreSQL + SQLAlchemy + MCP tools
# """

# import os
# import json
# from typing import Dict, Any, List, Optional
# from dotenv import load_dotenv
# import cohere

# from app.services.mcp_tool_wrappers import get_mcp_tools_wrapper, TOOLS_DEFINITIONS

# load_dotenv()


# class AIService:
#     def __init__(self):
#         self.api_key = os.getenv("COHERE_API_KEY")
#         self.model_name = os.getenv("COHERE_MODEL", "command")

#         if not self.api_key:
#             print("⚠️ COHERE_API_KEY not set")
#             self.client = None
#         else:
#             self.client = cohere.Client(self.api_key)

#     # ---------------- SYSTEM PROMPT ----------------
#     def _system_prompt(self) -> str:
#         return f"""
# You are a STRICT task management AI agent.

# AVAILABLE TOOLS:
# {json.dumps(TOOLS_DEFINITIONS, indent=2)}

# IMPORTANT RULES:
# - For ADD → create_task
# - For LIST → get_tasks
# - For DELETE / COMPLETE / UPDATE:
#     • FIRST resolve task using title
#     • THEN use task_id
# - If tool is required → OUTPUT ONLY VALID JSON
# - NO explanations, NO markdown
# - NEVER claim success unless tool is executed
# JSON FORMAT:
# {{
#   "tool_name": "...",
#   "arguments": {{ ... }}
# }}
# """

#     # ---------------- MAIN METHOD ----------------
#     async def process_natural_language_request(
#         self,
#         user_message: str,
#         user_id: str,
#         conversation_history: Optional[List[Dict[str, str]]] = None,
#         db_session=None
#     ) -> Dict[str, Any]:

#         if not self.client:
#             return {
#                 "response": "⚠️ AI not configured",
#                 "tool_calls": [],
#                 "task_updates": []
#             }

#         wrapper = get_mcp_tools_wrapper(db_session)

#         # ---- COHERE CHAT ----
#         response = self.client.chat(
#             model=self.model_name,
#             message=user_message,
#             temperature=0.2,
#             preamble=self._system_prompt()
#         )

#         text = response.text.strip()

#         payload = {
#             "response": "",
#             "tool_calls": [],
#             "task_updates": []
#         }

#         # ---------------- SAFE JSON EXTRACTION ----------------
#         parsed = None
#         if "{" in text and "}" in text:
#             try:
#                 parsed = json.loads(text[text.find("{"): text.rfind("}") + 1])
#             except:
#                 parsed = None

#         # ---------------- TOOL HANDLING ----------------
#         if parsed and isinstance(parsed, dict) and "tool_name" in parsed:
#             tool_name = parsed["tool_name"]
#             args = parsed.get("arguments", {})
#             args["user_id"] = user_id

#             # ---- RESOLVE task_id FROM TITLE ----
#             if tool_name in ["delete_task", "complete_task", "update_task"]:
#                 if "task_id" not in args:
#                     title = args.get("title")
#                     if not title:
#                         return {
#                             "response": "Please specify which task.",
#                             "tool_calls": [],
#                             "task_updates": []
#                         }

#                     found = await wrapper.find_task_by_title(
#                         title=title,
#                         user_id=user_id
#                     )

#                     if not found:
#                         return {
#                             "response": f"No task found with title '{title}'",
#                             "tool_calls": [],
#                             "task_updates": []
#                         }

#                     args["task_id"] = found["id"]

#             # ---- CALL TOOL ----
#             if hasattr(wrapper, tool_name):
#                 data = await getattr(wrapper, tool_name)(**args)

#                 payload["tool_calls"].append({
#                     "name": tool_name,
#                     "arguments": args
#                 })

#                 if tool_name == "create_task":
#                     payload["task_updates"].append({"action": "create", "task": data})
#                     payload["response"] = "✅ Task added successfully"

#                 elif tool_name == "get_tasks":
#                     payload["tasks"] = data
#                     payload["response"] = "📋 Here are your tasks"

#                 elif tool_name == "complete_task":
#                     payload["task_updates"].append({"action": "complete", "task": data})
#                     payload["response"] = "✅ Task marked as completed"

#                 elif tool_name == "delete_task":
#                     payload["task_updates"].append({"action": "delete", "task": data})
#                     payload["response"] = "🗑️ Task deleted successfully"

#                 elif tool_name == "update_task":
#                     payload["task_updates"].append({"action": "update", "task": data})
#                     payload["response"] = "✏️ Task updated successfully"

#                 return payload

#         # ---------------- FALLBACK ADD TASK ----------------
#         if any(k in user_message.lower() for k in ["add task", "create task", "new task"]):
#             title = user_message.split("task")[-1].strip().capitalize() 
#             data = await wrapper.create_task(title=title, user_id=user_id)

#             payload["task_updates"].append({"action": "create", "task": data})
#             payload["response"] = "✅ Task added successfully"
#             return payload

#         payload["response"] = text
#         return payload


# # ---------------- SINGLETON ----------------
# _ai_service_instance = None

# def get_ai_service() -> AIService:
#     global _ai_service_instance
#     if _ai_service_instance is None:
#         _ai_service_instance = AIService()
#     return _ai_service_instance



# """
# AI Service using OpenAI Agent SDK + Gemini
# Works with Neon PostgreSQL + SQLAlchemy + MCP tools
# """

# import os
# import json
# from typing import Dict, Any, List, Optional
# from dotenv import load_dotenv

# from agents import Agent, Runner
# from agents import Agent, Runner, AsyncOpenAI, OpenAIChatCompletionsModel
# from agents import OpenAIChatCompletionsModel
# from agents.run import RunConfig

# from app.services.mcp_tool_wrappers import get_mcp_tools_wrapper, TOOLS_DEFINITIONS
 
# load_dotenv()


# class AIService:
#     def __init__(self):
#         self.api_key = os.getenv("GEMINI_API_KEY")
#         self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

#         if not self.api_key:
#             raise RuntimeError("❌ GEMINI_API_KEY not set")

#         # 🔑 Gemini OpenAI-compatible client
#         self.client = AsyncOpenAI(
#             api_key=self.api_key,
#             base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
#         )

#         self.model = OpenAIChatCompletionsModel(
#             model=self.model_name,
#             openai_client=self.client
#         )

#         self.agent = Agent(
#             name="TaskAgent",
#             instructions=self._system_prompt(),
#             model=self.model,
#             tools=[]  # tools handled manually (MCP)
#         )

#         self.runner = Runner()

#     # ---------------- SYSTEM PROMPT ----------------
#     def _system_prompt(self) -> str:
#         return f"""
# You are a STRICT task management AI agent.

# AVAILABLE TOOLS:
# {json.dumps(TOOLS_DEFINITIONS, indent=2)}

# IMPORTANT RULES:
# - For ADD → create_task
# - For LIST → get_tasks
# - For DELETE / COMPLETE / UPDATE:
#   - FIRST resolve task using title
#   - THEN use task_id
# - If tool is required → OUTPUT ONLY VALID JSON
# - NO explanations
# - NO markdown
# - NEVER claim success unless tool is executed

# JSON FORMAT ONLY:
# {{
#   "tool_name": "...",
#   "arguments": {{ ... }}
# }}
# """

#     # ---------------- MAIN METHOD ----------------
#     async def process_natural_language_request(
#         self,
#         user_message: str,
#         user_id: str,
#         conversation_history: Optional[List[Dict[str, str]]] = None,
#         db_session=None
#     ) -> Dict[str, Any]:

#         wrapper = get_mcp_tools_wrapper(db_session)

#         run_config = RunConfig(
#             model=self.model,
#             tracing_disabled=True
#         )

#         result = await self.runner.run(
#             self.agent,
#             input=user_message,
#             run_config=run_config
#         )

#         text = result.final_output.strip()

#         payload = {
#             "response": "",
#             "tool_calls": [],
#             "task_updates": []
#         }

#         # ---------------- SAFE JSON PARSE ----------------
#         parsed = None
#         if "{" in text and "}" in text:
#             try:
#                 parsed = json.loads(text[text.find("{"): text.rfind("}") + 1])
#             except Exception:
#                 parsed = None

#         # ---------------- TOOL HANDLING ----------------
#         if parsed and "tool_name" in parsed:
#             tool_name = parsed["tool_name"] 
#             args = parsed.get("arguments", {})
#             args["user_id"] = user_id 

#             # ---- RESOLVE task_id FROM TITLE ----
#             if tool_name in ["delete_task", "complete_task", "update_task"]:
#                 if "task_id" not in args:
#                     title = args.get("title")
#                     if not title:
#                         payload["response"] = "Please specify which task."
#                         return payload

#                     found = await wrapper.find_task_by_title(
#                         title=title,
#                         user_id=user_id
#                     )

#                     if not found:
#                         payload["response"] = f"No task found with title '{title}'"
#                         return payload

#                     args["task_id"] = found["id"]

#             # ---- EXECUTE TOOL ----
#             if hasattr(wrapper, tool_name):
#                 data = await getattr(wrapper, tool_name)(**args)

#                 payload["tool_calls"].append({
#                     "name": tool_name,
#                     "arguments": args
#                 })

#                 if tool_name == "create_task":
#                     payload["task_updates"].append({"action": "create", "task": data})
#                     payload["response"] = "✅ Task added successfully"

#                 elif tool_name == "get_tasks":
#                     payload["tasks"] = data
#                     payload["response"] = "📋 Here are your tasks"

#                 elif tool_name == "complete_task":
#                     payload["task_updates"].append({"action": "complete", "task": data})
#                     payload["response"] = "✅ Task marked as completed"

#                 elif tool_name == "delete_task":
#                     payload["task_updates"].append({"action": "delete", "task": data})
#                     payload["response"] = "🗑️ Task deleted successfully"

#                 elif tool_name == "update_task":
#                     payload["task_updates"].append({"action": "update", "task": data})
#                     payload["response"] = "✏️ Task updated successfully"

#                 return payload

#         # ---------------- FALLBACK ADD TASK ----------------
#         if any(k in user_message.lower() for k in ["add task", "create task", "new task"]):
#             title = user_message.split("task")[-1].strip().capitalize()
#             data = await wrapper.create_task(title=title, user_id=user_id)

#             payload["task_updates"].append({"action": "create", "task": data})
#             payload["response"] = "✅ Task added successfully"
#             return payload

#         payload["response"] = text
#         return payload


# # ---------------- SINGLETON ----------------
# _ai_service_instance = None

# def get_ai_service() -> AIService:
#     global _ai_service_instance
#     if _ai_service_instance is None:
#         _ai_service_instance = AIService()
#     return _ai_service_instance


# """
# AI Service using OpenRouter (Gemini or OpenAI-compatible models)
# Works with MCP tools + PostgreSQL
# """

# import os
# import json
# from typing import Dict, Any, List, Optional
# from dotenv import load_dotenv

# from agents import Agent, Runner
# from agents.run import RunConfig
# from app.services.mcp_tool_wrappers import get_mcp_tools_wrapper, TOOLS_DEFINITIONS
# from openai import AsyncOpenAI  # still used as the client, but via OpenRouter

# load_dotenv()

# class AIService:
#     def __init__(self):
#         self.api_key = os.getenv("OPENROUTER_API_KEY")
#         self.model_name = os.getenv("OPENROUTER_MODEL", "gemini-2.0-flash")

#         if not self.api_key:
#             raise RuntimeError("❌ OPENROUTER_API_KEY not set")

#         # 🔑 Async client pointing to OpenRouter
#         self.client = AsyncOpenAI(
#             api_key=self.api_key,
#             base_url="https://openrouter.ai/api/v1"  # OpenRouter endpoint
#         )

#         # Agent with model name (OpenRouter compatible)
#         self.agent = Agent(
#             name="TaskAgent",
#             instructions=self._system_prompt(),
#             model=self.model_name,
#             tools=[]  # MCP tools handled manually
#         )

#         self.runner = Runner()

#     # ---------------- SYSTEM PROMPT ----------------
#     def _system_prompt(self) -> str:
#         return f"""
# You are a STRICT task management AI agent.

# AVAILABLE TOOLS:
# {json.dumps(TOOLS_DEFINITIONS, indent=2)}

# IMPORTANT RULES:
# - For ADD → create_task
# - For LIST → get_tasks
# - For DELETE / COMPLETE / UPDATE:
#   - FIRST resolve task using title
#   - THEN use task_id
# - If tool is required → OUTPUT ONLY VALID JSON
# - NO explanations
# - NO markdown
# - NEVER claim success unless tool is executed

# JSON FORMAT ONLY:
# {{
#   "tool_name": "...",
#   "arguments": {{ ... }}
# }}
# """

#     # ---------------- MAIN METHOD ----------------
#     async def process_natural_language_request(
#         self,
#         user_message: str,
#         user_id: str,
#         conversation_history: Optional[List[Dict[str, str]]] = None,
#         db_session=None
#     ) -> Dict[str, Any]:

#         wrapper = get_mcp_tools_wrapper(db_session)

#         run_config = RunConfig(model=self.model_name, tracing_disabled=True)

#         # Run agent via Runner
#         result = await self.runner.run(
#             self.agent,
#             input=user_message,
#             run_config=run_config
#         )

#         text = result.final_output.strip()

#         payload = {
#             "response": "",
#             "tool_calls": [],
#             "task_updates": []
#         }

#         # ---------------- SAFE JSON PARSE ----------------
#         parsed = None
#         if "{" in text and "}" in text:
#             try:
#                 parsed = json.loads(text[text.find("{"): text.rfind("}") + 1])
#             except Exception:
#                 parsed = None

#         # ---------------- TOOL HANDLING ----------------
#         if parsed and "tool_name" in parsed:
#             tool_name = parsed["tool_name"]
#             args = parsed.get("arguments", {})
#             args["user_id"] = user_id

#             if tool_name in ["delete_task", "complete_task", "update_task"]:
#                 if "task_id" not in args:
#                     title = args.get("title")
#                     if not title:
#                         payload["response"] = "Please specify which task."
#                         return payload

#                     found = await wrapper.find_task_by_title(title=title, user_id=user_id)
#                     if not found:
#                         payload["response"] = f"No task found with title '{title}'"
#                         return payload
#                     args["task_id"] = found["id"]

#             # ---- EXECUTE TOOL ----
#             if hasattr(wrapper, tool_name):
#                 data = await getattr(wrapper, tool_name)(**args)
#                 payload["tool_calls"].append({"name": tool_name, "arguments": args})

#                 if tool_name == "create_task":
#                     payload["task_updates"].append({"action": "create", "task": data})
#                     payload["response"] = "✅ Task added successfully"
#                 elif tool_name == "get_tasks":
#                     payload["tasks"] = data
#                     payload["response"] = "📋 Here are your tasks"
#                 elif tool_name == "complete_task":
#                     payload["task_updates"].append({"action": "complete", "task": data})
#                     payload["response"] = "✅ Task marked as completed"
#                 elif tool_name == "delete_task":
#                     payload["task_updates"].append({"action": "delete", "task": data})
#                     payload["response"] = "🗑️ Task deleted successfully"
#                 elif tool_name == "update_task":
#                     payload["task_updates"].append({"action": "update", "task": data})
#                     payload["response"] = "✏️ Task updated successfully"
#                 return payload

#         # ---------------- FALLBACK ADD TASK ----------------
#         if any(k in user_message.lower() for k in ["add task", "create task", "new task"]):
#             title = user_message.split("task")[-1].strip().capitalize()
#             data = await wrapper.create_task(title=title, user_id=user_id)
#             payload["task_updates"].append({"action": "create", "task": data})
#             payload["response"] = "✅ Task added successfully"
#             return payload

#         payload["response"] = text
#         return payload


# # ---------------- SINGLETON ----------------
# _ai_service_instance = None

# def get_ai_service() -> AIService:
#     global _ai_service_instance
#     if _ai_service_instance is None:
#         _ai_service_instance = AIService()
#     return _ai_service_instance
