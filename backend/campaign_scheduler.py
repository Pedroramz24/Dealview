"""
Campaign Scheduler Service
Handles scheduled and batch campaign sending
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from sendgrid_service import sendgrid_service

logger = logging.getLogger(__name__)


class CampaignScheduler:
    """Service for scheduling and batch sending campaigns"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.is_running = False
    
    async def schedule_campaign(
        self,
        campaign_id: str,
        contact_ids: List[str],
        scheduled_time: datetime,
        batch_mode: bool = False,
        batch_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Schedule a campaign for future sending
        
        Args:
            campaign_id: Campaign ID
            contact_ids: List of contact IDs to send to
            scheduled_time: When to send (for immediate send or batch start)
            batch_mode: If True, spread sends over time
            batch_config: {
                'start_date': datetime,
                'end_date': datetime,
                'emails_per_day': int
            }
        """
        try:
            if batch_mode and batch_config:
                # Batch scheduling
                return await self._schedule_batch_campaign(
                    campaign_id,
                    contact_ids,
                    batch_config
                )
            else:
                # Single scheduled send
                return await self._schedule_single_campaign(
                    campaign_id,
                    contact_ids,
                    scheduled_time
                )
        except Exception as e:
            logger.error(f"Error scheduling campaign: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _schedule_single_campaign(
        self,
        campaign_id: str,
        contact_ids: List[str],
        scheduled_time: datetime
    ) -> Dict[str, Any]:
        """Schedule campaign to send at specific time"""
        try:
            # Create queue entries for all contacts
            queue_entries = []
            for contact_id in contact_ids:
                queue_entries.append({
                    'campaign_id': campaign_id,
                    'contact_id': contact_id,
                    'scheduled_for': scheduled_time.isoformat(),
                    'status': 'queued'
                })
            
            # Insert into queue
            result = self.supabase.table('scheduled_campaigns_queue').insert(queue_entries).execute()
            
            # Update campaign status
            self.supabase.table('email_campaigns').update({
                'status': 'scheduled',
                'scheduled_at': scheduled_time.isoformat(),
                'total_recipients': len(contact_ids)
            }).eq('id', campaign_id).execute()
            
            return {
                "success": True,
                "message": f"Campaign scheduled for {scheduled_time.strftime('%Y-%m-%d %I:%M %p')}",
                "queued_count": len(contact_ids)
            }
        except Exception as e:
            raise e
    
    async def _schedule_batch_campaign(
        self,
        campaign_id: str,
        contact_ids: List[str],
        batch_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Schedule campaign to send in batches over time"""
        try:
            start_date = batch_config['start_date']
            end_date = batch_config['end_date']
            emails_per_day = batch_config['emails_per_day']
            
            # Calculate how many days we have
            delta = end_date - start_date
            total_days = delta.days + 1
            
            # Distribute contacts across days
            total_contacts = len(contact_ids)
            contacts_per_day = min(emails_per_day, total_contacts // total_days + 1)
            
            queue_entries = []
            current_date = start_date
            contact_index = 0
            batch_group = 0
            
            while contact_index < total_contacts and current_date <= end_date:
                # Get contacts for this day
                day_contacts = contact_ids[contact_index:contact_index + contacts_per_day]
                
                # Schedule them throughout the day (spread evenly)
                for i, contact_id in enumerate(day_contacts):
                    # Spread throughout business hours (9 AM - 5 PM)
                    hour_offset = (i % 8) + 9  # 9 AM to 5 PM
                    minute_offset = (i * 15) % 60  # Spread within each hour
                    
                    send_time = current_date.replace(
                        hour=hour_offset,
                        minute=minute_offset,
                        second=0,
                        microsecond=0
                    )
                    
                    queue_entries.append({
                        'campaign_id': campaign_id,
                        'contact_id': contact_id,
                        'scheduled_for': send_time.isoformat(),
                        'status': 'queued',
                        'batch_group': batch_group
                    })
                
                contact_index += contacts_per_day
                current_date += timedelta(days=1)
                batch_group += 1
            
            # Insert all queue entries
            result = self.supabase.table('scheduled_campaigns_queue').insert(queue_entries).execute()
            
            # Update campaign with batch info
            self.supabase.table('email_campaigns').update({
                'status': 'scheduled',
                'scheduled_at': start_date.isoformat(),
                'batch_mode': True,
                'batch_start_date': start_date.isoformat(),
                'batch_end_date': end_date.isoformat(),
                'batch_emails_per_day': emails_per_day,
                'total_recipients': total_contacts
            }).eq('id', campaign_id).execute()
            
            return {
                "success": True,
                "message": f"Batch campaign scheduled: {total_contacts} emails over {total_days} days",
                "queued_count": len(queue_entries),
                "batches": batch_group,
                "days": total_days
            }
        except Exception as e:
            raise e
    
    async def process_scheduled_queue(self, batch_size: int = 50) -> Dict[str, Any]:
        """
        Process scheduled campaigns that are ready to send
        This should be called periodically (e.g., every 5 minutes)
        """
        try:
            # Get ready emails from queue
            result = self.supabase.rpc('get_ready_scheduled_emails', {'batch_size': batch_size}).execute()
            
            if not result.data or len(result.data) == 0:
                return {
                    "processed": 0,
                    "message": "No emails ready to send"
                }
            
            sent_count = 0
            failed_count = 0
            
            for queue_item in result.data:
                try:
                    # Mark as processing
                    self.supabase.table('scheduled_campaigns_queue').update({
                        'status': 'processing'
                    }).eq('id', queue_item['id']).execute()
                    
                    # Get campaign details
                    campaign = self.supabase.table('email_campaigns').select('*').eq('id', queue_item['campaign_id']).single().execute()
                    
                    if not campaign.data:
                        raise Exception("Campaign not found")
                    
                    campaign_data = campaign.data
                    
                    # Get contact details
                    contact = self.supabase.table('contacts').select('email, full_name, name').eq('id', queue_item['contact_id']).single().execute()
                    
                    if not contact.data or not contact.data.get('email'):
                        raise Exception("Contact email not found")
                    
                    contact_data = contact.data
                    
                    # Get user's email settings
                    settings = self.supabase.table('email_settings').select('*').eq('user_id', campaign_data['user_id']).single().execute()
                    
                    if not settings.data:
                        raise Exception("Email settings not found")
                    
                    settings_data = settings.data
                    api_key = sendgrid_service.decrypt_api_key(settings_data['sendgrid_api_key'])
                    
                    # Send the email
                    send_result = await sendgrid_service.send_transactional_email(
                        api_key=api_key,
                        from_email=settings_data['sender_email'],
                        from_name=settings_data['sender_name'],
                        to_email=contact_data['email'],
                        to_name=contact_data.get('full_name') or contact_data.get('name'),
                        subject=campaign_data['subject'],
                        html_content=campaign_data['html_content'],
                        plain_text_content=campaign_data.get('plain_text_content'),
                        custom_args={
                            "campaign_id": campaign_data['id'],
                            "contact_id": queue_item['contact_id'],
                            "type": "campaign"
                        }
                    )
                    
                    if send_result['success']:
                        # Mark as sent
                        self.supabase.table('scheduled_campaigns_queue').update({
                            'status': 'sent',
                            'sent_at': datetime.now(timezone.utc).isoformat()
                        }).eq('id', queue_item['id']).execute()
                        
                        # Log in campaign sends
                        self.supabase.table('email_campaign_sends').insert({
                            'campaign_id': campaign_data['id'],
                            'contact_id': queue_item['contact_id'],
                            'sendgrid_message_id': send_result.get('message_id'),
                            'status': 'sent',
                            'sent_at': datetime.now(timezone.utc).isoformat()
                        }).execute()
                        
                        sent_count += 1
                    else:
                        # Mark as failed
                        self.supabase.table('scheduled_campaigns_queue').update({
                            'status': 'failed',
                            'error_message': send_result.get('error')
                        }).eq('id', queue_item['id']).execute()
                        
                        failed_count += 1
                    
                    # Small delay to avoid rate limiting
                    await asyncio.sleep(0.1)
                
                except Exception as e:
                    logger.error(f"Error processing queue item {queue_item['id']}: {str(e)}")
                    
                    # Mark as failed
                    self.supabase.table('scheduled_campaigns_queue').update({
                        'status': 'failed',
                        'error_message': str(e)
                    }).eq('id', queue_item['id']).execute()
                    
                    failed_count += 1
            
            # Update campaign stats
            await self._update_campaign_stats(result.data[0]['campaign_id'])
            
            return {
                "processed": len(result.data),
                "sent": sent_count,
                "failed": failed_count
            }
        
        except Exception as e:
            logger.error(f"Error processing scheduled queue: {str(e)}")
            return {
                "processed": 0,
                "error": str(e)
            }
    
    async def _update_campaign_stats(self, campaign_id: str):
        """Update campaign statistics after sending"""
        try:
            # Count sends by status
            sends = self.supabase.table('email_campaign_sends').select('status').eq('campaign_id', campaign_id).execute()
            
            if sends.data:
                stats = {
                    'total_sent': len([s for s in sends.data if s['status'] in ['sent', 'delivered', 'opened', 'clicked']]),
                    'total_delivered': len([s for s in sends.data if s['status'] in ['delivered', 'opened', 'clicked']]),
                    'total_opened': len([s for s in sends.data if s.get('status') == 'opened']),
                    'total_clicked': len([s for s in sends.data if s.get('status') == 'clicked']),
                    'total_failed': len([s for s in sends.data if s['status'] == 'failed'])
                }
                
                # Update campaign
                self.supabase.table('email_campaigns').update(stats).eq('id', campaign_id).execute()
        except Exception as e:
            logger.error(f"Error updating campaign stats: {str(e)}")
    
    async def cancel_scheduled_campaign(self, campaign_id: str) -> Dict[str, Any]:
        """Cancel a scheduled campaign"""
        try:
            # Delete all queued items
            result = self.supabase.table('scheduled_campaigns_queue').delete().eq('campaign_id', campaign_id).eq('status', 'queued').execute()
            
            # Update campaign status
            self.supabase.table('email_campaigns').update({
                'status': 'cancelled'
            }).eq('id', campaign_id).execute()
            
            return {
                "success": True,
                "message": "Campaign cancelled",
                "cancelled_count": len(result.data) if result.data else 0
            }
        except Exception as e:
            logger.error(f"Error cancelling campaign: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_campaign_queue_status(self, campaign_id: str) -> Dict[str, Any]:
        """Get status of scheduled campaign"""
        try:
            result = self.supabase.table('scheduled_campaigns_queue').select('status').eq('campaign_id', campaign_id).execute()
            
            if not result.data:
                return {
                    "total": 0,
                    "queued": 0,
                    "sent": 0,
                    "failed": 0
                }
            
            statuses = result.data
            return {
                "total": len(statuses),
                "queued": len([s for s in statuses if s['status'] == 'queued']),
                "processing": len([s for s in statuses if s['status'] == 'processing']),
                "sent": len([s for s in statuses if s['status'] == 'sent']),
                "failed": len([s for s in statuses if s['status'] == 'failed'])
            }
        except Exception as e:
            logger.error(f"Error getting queue status: {str(e)}")
            return {"error": str(e)}


# Global instance
campaign_scheduler = None

def get_scheduler(supabase_client):
    global campaign_scheduler
    if campaign_scheduler is None:
        campaign_scheduler = CampaignScheduler(supabase_client)
    return campaign_scheduler
