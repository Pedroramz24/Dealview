import os
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)

class PerplexityService:
    """Service for querying Perplexity AI for commercial real estate research"""
    
    def __init__(self):
        api_key = os.getenv("PERPLEXITY_API_KEY")
        if not api_key:
            raise ValueError("PERPLEXITY_API_KEY environment variable not set")
        
        # Initialize OpenAI client with Perplexity base URL
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.perplexity.ai"
        )
    
    def search_real_estate(self, query: str, messages: list[dict] = None) -> dict:
        """
        Search for commercial real estate information using Perplexity API.
        
        Args:
            query: The search query related to commercial real estate
            messages: Optional conversation history for context
            
        Returns:
            Dictionary containing response content and citations
        """
        try:
            # Build messages array with context
            if not messages:
                messages = []
            
            # Add system context for real estate queries
            system_message = {
                "role": "system",
                "content": (
                    "You are a commercial real estate market research assistant. "
                    "Provide accurate, sourced information about commercial real estate markets, "
                    "rental rates, property values, market trends, and investment opportunities. "
                    "Always cite your sources with specific data points and URLs. "
                    "Focus on actionable insights for commercial real estate professionals."
                )
            }
            
            # Combine all messages
            all_messages = [system_message] + messages
            
            # Add user query
            all_messages.append({
                "role": "user",
                "content": query
            })
            
            logger.info(f"Querying Perplexity with: {query}")
            
            # Call Perplexity API with Sonar model for web-grounded responses
            response = self.client.chat.completions.create(
                model="sonar",
                messages=all_messages,
                max_tokens=2000,
                temperature=0.2
            )
            
            # Extract content
            content = response.choices[0].message.content
            
            # Extract citations from response
            citations = []
            if hasattr(response, 'citations') and response.citations:
                for citation_url in response.citations:
                    citations.append({
                        "url": citation_url,
                        "title": self._extract_title(citation_url)
                    })
            
            # Check if citations are in a different attribute
            if not citations and hasattr(response.choices[0], 'citations'):
                for citation_url in response.choices[0].citations:
                    citations.append({
                        "url": citation_url,
                        "title": self._extract_title(citation_url)
                    })
            
            # Extract related questions if available
            related_questions = []
            if hasattr(response, 'related_questions'):
                related_questions = response.related_questions or []
            
            logger.info(f"Successfully retrieved response with {len(citations)} citations")
            
            return {
                "content": content,
                "citations": citations,
                "related_questions": related_questions,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error querying Perplexity API: {str(e)}")
            return {
                "content": f"I encountered an error while researching. Please try again. Error: {str(e)}",
                "citations": [],
                "related_questions": [],
                "success": False,
                "error": str(e)
            }
    
    def _extract_title(self, url: str) -> str:
        """Extract a readable title from a URL"""
        try:
            # Remove protocol
            title = url.replace("https://", "").replace("http://", "")
            # Get domain name
            domain = title.split("/")[0]
            # Clean up common patterns
            domain = domain.replace("www.", "")
            return domain.title()
        except:
            return url

# Singleton instance
perplexity_service = PerplexityService()
