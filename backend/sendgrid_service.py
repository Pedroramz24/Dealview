"""
SendGrid Email Service
Handles transactional emails and campaign sends via SendGrid API
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, Personalization
from cryptography.fernet import Fernet
import base64


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
                    scopes = response.json().get('scopes', [])
                    
                    # Check if it has mail send permission
                    has_mail_send = any('mail.send' in scope for scope in scopes)
                    
                    if has_mail_send or 'admin' in str(scopes).lower():
                        return {
                            "valid": True,
                            "message": "✅ SendGrid API key is valid and has email sending permissions!"
                        }
                    else:
                        return {
                            "valid": False,
                            "message": "API key is valid but lacks 'Mail Send' permissions. Please edit your API key in SendGrid and grant 'Full Access' or 'Mail Send' permission."
                        }
                elif response.status_code == 401:
                    return {
                        "valid": False,
                        "message": "Invalid API key. Please verify you copied the complete key (it should start with 'SG.')."
                    }
                elif response.status_code == 403:
                    return {
                        "valid": False,
                        "message": "API key doesn't have sufficient permissions. In SendGrid, edit your API key and select 'Full Access' or grant 'Mail Send' permission."
                    }
                else:
                    return {
                        "valid": False,
                        "message": f"Unexpected response from SendGrid (Status {response.status_code}). Please verify your API key."
                    }
                    
        except httpx.TimeoutException:
            return {
                "valid": False,
                "message": "Connection timeout. Please check your internet connection and try again."
            }
        except Exception as e:
            error_msg = str(e)
            
            # Provide helpful error messages
            if 'forbidden' in error_msg.lower() or '403' in error_msg:
                return {
                    "valid": False,
                    "message": "Permission denied. Your API key needs 'Full Access' or 'Mail Send' permissions. Edit the key in SendGrid → Settings → API Keys."
                }
            elif 'unauthorized' in error_msg.lower() or '401' in error_msg:
                return {
                    "valid": False,
                    "message": "Invalid API key. Please copy the complete key from SendGrid (starts with 'SG.')."
                }
            else:
                return {
                    "valid": False,
                    "message": f"Connection failed: {error_msg}"
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
        Returns: {
            "success": bool,
            "message_id": str (if success),
            "error": str (if failure)
        }
        """
        try:
            sg = SendGridAPIClient(api_key)
            
            # Create message
            message = Mail(
                from_email=Email(from_email, from_name),
                to_emails=To(to_email, to_name),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            # Add plain text version if provided
            if plain_text_content:
                message.content = [
                    Content("text/plain", plain_text_content),
                    Content("text/html", html_content)
                ]
            
            # Add CC emails
            if cc_emails:
                for cc_email in cc_emails:
                    message.add_cc(Email(cc_email))
            
            # Add BCC emails
            if bcc_emails:
                for bcc_email in bcc_emails:
                    message.add_bcc(Email(bcc_email))
            
            # Add custom args for tracking
            if custom_args:
                message.custom_arg = custom_args
            
            # Enable click tracking
            message.tracking_settings = {
                "click_tracking": {"enable": True, "enable_text": True},
                "open_tracking": {"enable": True}
            }
            
            # Send email
            response = sg.send(message)
            
            if response.status_code in [200, 202]:
                # Extract message ID from response headers
                message_id = response.headers.get('X-Message-Id', '')
                
                return {
                    "success": True,
                    "message_id": message_id,
                    "status_code": response.status_code
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
        Uses personalizations to send individual emails
        Returns: {
            "success": bool,
            "results": List[Dict],  # Per-recipient results
            "total_sent": int,
            "total_failed": int
        }
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[SendGrid] Starting campaign send to {len(recipients)} recipients")
        logger.info(f"[SendGrid] From: {from_email} ({from_name})")
        logger.info(f"[SendGrid] Subject: {subject}")
        
        results = []
        total_sent = 0
        total_failed = 0
        
        try:
            logger.info(f"[SendGrid] Initializing SendGrid client with API key (length: {len(api_key)})")
            sg = SendGridAPIClient(api_key)
            logger.info(f"[SendGrid] Client initialized successfully")
            
            # Send to each recipient individually (better for tracking)
            for recipient in recipients:
                logger.info(f"[SendGrid] Sending to: {recipient['email']} ({recipient.get('name', 'No name')})")
                try:
                    message = Mail(
                        from_email=Email(from_email, from_name),
                        to_emails=To(recipient['email'], recipient.get('name')),
                        subject=subject,
                        html_content=Content("text/html", html_content)
                    )
                    
                    # Add plain text version
                    if plain_text_content:
                        message.content = [
                            Content("text/plain", plain_text_content),
                            Content("text/html", html_content)
                        ]
                    
                    # Add custom args for tracking
                    message.custom_arg = {
                        "campaign_id": campaign_id or "",
                        "contact_id": recipient.get('id', ''),
                        "type": "campaign"
                    }
                    
                    # Enable tracking
                    message.tracking_settings = {
                        "click_tracking": {"enable": True, "enable_text": True},
                        "open_tracking": {"enable": True}
                    }
                    
                    logger.info(f"[SendGrid] Calling sg.send() for {recipient['email']}")
                    response = sg.send(message)
                    logger.info(f"[SendGrid] Response status: {response.status_code}")
                    
                    if response.status_code in [200, 202]:
                        message_id = response.headers.get('X-Message-Id', '')
                        logger.info(f"[SendGrid] ✅ Email sent successfully. Message ID: {message_id}")
                        results.append({
                            "contact_id": recipient.get('id'),
                            "email": recipient['email'],
                            "success": True,
                            "message_id": message_id
                        })
                        total_sent += 1
                    else:
                        logger.error(f"[SendGrid] ❌ Failed with status {response.status_code}")
                        results.append({
                            "contact_id": recipient.get('id'),
                            "email": recipient['email'],
                            "success": False,
                            "error": f"Status {response.status_code}"
                        })
                        total_failed += 1
                
                except Exception as e:
                    logger.error(f"[SendGrid] ❌ Exception sending to {recipient['email']}: {str(e)}")
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
            return {
                "success": False,
                "error": str(e),
                "results": results,
                "total_sent": total_sent,
                "total_failed": total_failed
            }
    
    def process_webhook_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process SendGrid webhook event
        Event types: delivered, open, click, bounce, dropped, etc.
        Returns normalized event data
        """
        try:
            event_type = event_data.get('event', '')
            message_id = event_data.get('sg_message_id', '')
            email = event_data.get('email', '')
            timestamp = event_data.get('timestamp', 0)
            
            # Extract custom args (campaign_id, contact_id)
            custom_args = {}
            if isinstance(event_data.get('campaign_id'), str):
                custom_args['campaign_id'] = event_data['campaign_id']
            if isinstance(event_data.get('contact_id'), str):
                custom_args['contact_id'] = event_data['contact_id']
            
            # Normalize event type
            status_mapping = {
                'delivered': 'delivered',
                'open': 'opened',
                'click': 'clicked',
                'bounce': 'bounced',
                'dropped': 'failed',
                'deferred': 'pending',
                'processed': 'sent'
            }
            
            return {
                "event_type": event_type,
                "status": status_mapping.get(event_type, event_type),
                "message_id": message_id,
                "email": email,
                "timestamp": datetime.fromtimestamp(timestamp),
                "custom_args": custom_args,
                "raw_data": event_data
            }
        
        except Exception as e:
            return {
                "error": str(e),
                "raw_data": event_data
            }
    
    def replace_merge_fields(self, content: str, data: Dict[str, str]) -> str:
        """
        Replace merge fields in email content
        Example: {{firstName}} -> John
        """
        for key, value in data.items():
            placeholder = f"{{{{{key}}}}}"
            content = content.replace(placeholder, str(value))
        return content
    
    def generate_unsubscribe_link(self, user_id: str, contact_id: str, base_url: str) -> str:
        """Generate unsubscribe link for campaigns"""
        # This would include a secure token in production
        return f"{base_url}/unsubscribe?user={user_id}&contact={contact_id}"


# Global instance
sendgrid_service = SendGridService()
