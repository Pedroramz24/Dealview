"""
SendGrid Email Service
Handles transactional emails and campaign sends via SendGrid API
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, Personalization, CustomArg, ClickTracking, OpenTracking, TrackingSettings
from cryptography.fernet import Fernet
import base64
import logging

logger = logging.getLogger(__name__)


class SendGridService:
    """Service for sending emails via SendGrid API"""
    
    def __init__(self):
        # Encryption key for storing API keys (should be in environment)
        self.encryption_key = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key())
        if isinstance(self.encryption_key, str):
            self.encryption_key = self.encryption_key.encode()
        self.cipher = Fernet(self.encryption_key)
    
    def encrypt_api_key(self, api_key: str) -> str:
        """Encrypt SendGrid API key for storage"""
        return self.cipher.encrypt(api_key.encode()).decode()
    
    def decrypt_api_key(self, encrypted_key: str) -> str:
        """Decrypt SendGrid API key"""
        return self.cipher.decrypt(encrypted_key.encode()).decode()
    
    async def test_connection(self, api_key: str) -> Dict[str, Any]:
        """
        Test SendGrid API key validity by checking if it can access the API
        Returns: {
            "valid": bool,
            "message": str
        }
        """
        try:
            import httpx
            
            # Simple GET request to validate API key
            # Using the scopes endpoint which just checks if key is valid
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    'https://api.sendgrid.com/v3/scopes',
                    headers=headers,
                    timeout=10.0
                )
            
            if response.status_code == 200:
                return {
                    "valid": True,
                    "message": "SendGrid API key is valid",
                    "scopes": response.json().get('scopes', [])
                }
            else:
                return {
                    "valid": False,
                    "message": f"Invalid API key (Status: {response.status_code})"
                }
        
        except Exception as e:
            return {
                "valid": False,
                "message": f"Connection test failed: {str(e)}"
            }
    
    async def send_transactional_email(
        self,
        api_key: str,
        from_email: str,
        from_name: str,
        to_email: str,
        to_name: Optional[str],
        subject: str,
        html_content: str,
        plain_text_content: Optional[str] = None,
        cc_emails: Optional[List[str]] = None,
        bcc_emails: Optional[List[str]] = None,
        custom_args: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Send a single transactional email
        Args:
            cc_emails: List of CC email addresses
            bcc_emails: List of BCC email addresses
            custom_args: Custom arguments for tracking
        Returns: {
            "success": bool,
            "message_id": str (if successful),
            "error": str (if failed)
        }
        """
        try:
            import httpx
            
            # Build SendGrid API request
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            
            # Prepare email data
            personalizations = [{
                "to": [{"email": to_email, "name": to_name or ""}],
                "subject": subject
            }]
            
            # Add CC emails if provided
            if cc_emails and len(cc_emails) > 0:
                personalizations[0]["cc"] = [{"email": email} for email in cc_emails]
            
            # Add BCC emails if provided
            if bcc_emails and len(bcc_emails) > 0:
                personalizations[0]["bcc"] = [{"email": email} for email in bcc_emails]
            
            # Add custom args if provided
            if custom_args:
                personalizations[0]["custom_args"] = custom_args
            
            content = []
            if plain_text_content:
                content.append({"type": "text/plain", "value": plain_text_content})
            content.append({"type": "text/html", "value": html_content})
            
            data = {
                "personalizations": personalizations,
                "from": {"email": from_email, "name": from_name},
                "content": content,
                "tracking_settings": {
                    "click_tracking": {"enable": True, "enable_text": True},
                    "open_tracking": {"enable": True}
                }
            }
            
            # Send via SendGrid API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    'https://api.sendgrid.com/v3/mail/send',
                    headers=headers,
                    json=data,
                    timeout=30.0
                )
            
            if response.status_code in [200, 202]:
                message_id = response.headers.get('X-Message-Id', '')
                return {
                    "success": True,
                    "message_id": message_id
                }
            else:
                return {
                    "success": False,
                    "error": f"SendGrid returned status {response.status_code}",
                    "status_code": response.status_code
                }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def send_campaign_email(
        self,
        api_key: str,
        from_email: str,
        from_name: str,
        recipients: List[Dict[str, str]],  # [{"email": "...", "name": "...", "id": "..."}]
        subject: str,
        html_content: str,
        plain_text_content: Optional[str] = None,
        campaign_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email to multiple recipients (campaign)
        Uses SendGrid API v3 with proper format
        Returns: {
            "success": bool,
            "results": List[Dict],  # Per-recipient results
            "total_sent": int,
            "total_failed": int
        }
        """
        logger.info(f"[SendGrid] Starting campaign send to {len(recipients)} recipients")
        logger.info(f"[SendGrid] From: {from_email} ({from_name})")
        logger.info(f"[SendGrid] Subject: {subject}")
        
        results = []
        total_sent = 0
        total_failed = 0
        
        try:
            import httpx
            
            logger.info(f"[SendGrid] Using API key (length: {len(api_key)})")
            
            # Send to each recipient individually for better tracking
            for recipient in recipients:
                logger.info(f"[SendGrid] Sending to: {recipient['email']} ({recipient.get('name', 'No name')})")
                
                try:
                    # Build SendGrid API request using proper v3 format
                    headers = {
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json'
                    }
                    
                    # Prepare email data
                    personalizations = [{
                        "to": [{"email": recipient['email'], "name": recipient.get('name', '')}],
                        "subject": subject
                    }]
                    
                    # Add custom args if campaign_id provided
                    if campaign_id:
                        personalizations[0]["custom_args"] = {
                            "campaign_id": campaign_id,
                            "contact_id": recipient.get('id', ''),
                            "type": "campaign"
                        }
                    
                    content = []
                    if plain_text_content:
                        content.append({"type": "text/plain", "value": plain_text_content})
                    content.append({"type": "text/html", "value": html_content})
                    
                    data = {
                        "personalizations": personalizations,
                        "from": {"email": from_email, "name": from_name},
                        "content": content,
                        "tracking_settings": {
                            "click_tracking": {"enable": True, "enable_text": True},
                            "open_tracking": {"enable": True}
                        }
                    }
                    
                    logger.info(f"[SendGrid] Calling SendGrid API for {recipient['email']}")
                    
                    # Send via SendGrid API
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            'https://api.sendgrid.com/v3/mail/send',
                            headers=headers,
                            json=data,
                            timeout=30.0
                        )
                    
                    logger.info(f"[SendGrid] Response status: {response.status_code}")
                    
                    if response.status_code in [200, 202]:
                        message_id = response.headers.get('X-Message-Id', '')
                        logger.info(f"[SendGrid] Email sent successfully. Message ID: {message_id}")
                        results.append({
                            "contact_id": recipient.get('id'),
                            "email": recipient['email'],
                            "success": True,
                            "message_id": message_id
                        })
                        total_sent += 1
                    else:
                        error_body = response.text
                        logger.error(f"[SendGrid] Failed with status {response.status_code}: {error_body}")
                        results.append({
                            "contact_id": recipient.get('id'),
                            "email": recipient['email'],
                            "success": False,
                            "error": f"Status {response.status_code}: {error_body[:100]}"
                        })
                        total_failed += 1
                
                except Exception as e:
                    logger.error(f"[SendGrid] Exception sending to {recipient['email']}: {str(e)}")
                    logger.error(f"[SendGrid] Exception type: {type(e).__name__}")
                    import traceback
                    logger.error(f"[SendGrid] Traceback: {traceback.format_exc()}")
                    results.append({
                        "contact_id": recipient.get('id'),
                        "email": recipient['email'],
                        "success": False,
                        "error": str(e)
                    })
                    total_failed += 1
            
            logger.info(f"[SendGrid] Campaign complete. Sent: {total_sent}, Failed: {total_failed}")
            return {
                "success": total_sent > 0,
                "results": results,
                "total_sent": total_sent,
                "total_failed": total_failed
            }
        
        except Exception as e:
            logger.error(f"[SendGrid] Fatal error in send_campaign_email: {str(e)}")
            return {
                "success": False,
                "results": [],
                "total_sent": 0,
                "total_failed": len(recipients),
                "error": str(e)
            }


# Singleton instance
sendgrid_service = SendGridService()
