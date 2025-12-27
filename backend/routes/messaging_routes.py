"""Messaging routes for DealLinked Marketplace.

Real-time chat between buyers and brokers.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime, timezone
import logging
import uuid

from models.marketplace import (
    MarketplaceMessage, MessageCreate, MessageUpdate,
    MarketplaceInquiry, InquiryCreate,
    Conversation
)
from utils.auth_helpers import get_current_user_supabase
from utils.db import get_supabase

router = APIRouter(prefix="/messages", tags=["Messaging"])
logger = logging.getLogger(__name__)


@router.get("/conversations")
async def get_conversations(user = Depends(get_current_user_supabase)):
    """
    Get all conversations for the current user.
    Returns list with other user info, deal info, last message, and unread count.
    """
    supabase = get_supabase()
    
    try:
        # Get all messages where user is sender or recipient
        messages = supabase.table('marketplace_messages').select(
            'conversation_id, sender_id, recipient_id, deal_id, message, created_at, read'
        ).or_(f'sender_id.eq.{user.id},recipient_id.eq.{user.id}').order('created_at', desc=True).execute()
        
        # Group by conversation_id
        conversations_dict = {}
        for msg in messages.data:
            conv_id = msg['conversation_id']
            if conv_id not in conversations_dict:
                # Get the other user (not current user)
                other_user_id = msg['recipient_id'] if msg['sender_id'] == str(user.id) else msg['sender_id']
                
                conversations_dict[conv_id] = {
                    'conversation_id': conv_id,
                    'other_user_id': other_user_id,
                    'deal_id': msg['deal_id'],
                    'last_message': msg['message'],
                    'last_message_at': msg['created_at'],
                    'unread_count': 0
                }
            
            # Count unread messages
            if msg['recipient_id'] == str(user.id) and not msg['read']:
                conversations_dict[conv_id]['unread_count'] += 1
        
        # Get deal and user info for each conversation
        for conv_id, conv in conversations_dict.items():
            # Get deal info
            deal = supabase.table('deals').select('id, title, address, image_url').eq('id', conv['deal_id']).single().execute()
            if deal.data:
                conv['deal_title'] = deal.data.get('title') or deal.data.get('address')
                conv['deal_image'] = deal.data.get('image_url')
            
            # Get other user info
            user_profile = supabase.table('user_profiles').select('full_name').eq('id', conv['other_user_id']).single().execute()
            if user_profile.data:
                conv['other_user_name'] = user_profile.data.get('full_name', 'Unknown User')
            else:
                conv['other_user_name'] = 'Unknown User'
        
        return {
            "conversations": list(conversations_dict.values()),
            "count": len(conversations_dict)
        }
        
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch conversations"
        )


@router.get("/conversation/{conversation_id}")
async def get_conversation_messages(
    conversation_id: str,
    user = Depends(get_current_user_supabase)
):
    """Get all messages in a conversation."""
    supabase = get_supabase()
    
    try:
        # Verify user is part of this conversation
        messages = supabase.table('marketplace_messages').select('*').eq(
            'conversation_id', conversation_id
        ).or_(f'sender_id.eq.{user.id},recipient_id.eq.{user.id}').order('created_at', desc=False).execute()
        
        if not messages.data:
            return {"messages": [], "count": 0}
        
        # Mark all received messages as read
        supabase.table('marketplace_messages').update({'read': True}).eq(
            'conversation_id', conversation_id
        ).eq('recipient_id', str(user.id)).execute()
        
        return {
            "messages": messages.data,
            "count": len(messages.data)
        }
        
    except Exception as e:
        logger.error(f"Error fetching conversation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch conversation"
        )


@router.post("/send")
async def send_message(
    message_data: MessageCreate,
    user = Depends(get_current_user_supabase)
):
    """
    Send a message to another user about a deal.
    Creates a conversation if it doesn't exist.
    Creates an inquiry record if this is the first message.
    """
    supabase = get_supabase()
    
    try:
        # Generate or use existing conversation_id
        if message_data.conversation_id:
            conversation_id = message_data.conversation_id
        else:
            # Create new conversation_id as proper UUID
            conversation_id = str(uuid.uuid4())
        
        # Check if this is the first message (create inquiry)
        existing_messages = supabase.table('marketplace_messages').select('id').eq(
            'conversation_id', conversation_id
        ).execute()
        
        is_first_message = len(existing_messages.data) == 0
        
        # Insert message
        message = {
            'id': str(uuid.uuid4()),
            'conversation_id': conversation_id,
            'sender_id': str(user.id),
            'recipient_id': message_data.recipient_id,
            'deal_id': message_data.deal_id,
            'message': message_data.message,
            'read': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        result = supabase.table('marketplace_messages').insert(message).execute()
        
        # If first message, create inquiry
        if is_first_message:
            # Get deal to find broker
            deal = supabase.table('deals').select('owner_id').eq('id', message_data.deal_id).single().execute()
            
            if deal.data:
                inquiry = {
                    'deal_id': message_data.deal_id,
                    'inquirer_id': str(user.id),
                    'broker_id': deal.data['owner_id'],
                    'message': message_data.message,
                    'status': 'new',
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                supabase.table('marketplace_inquiries').insert(inquiry).execute()
                logger.info(f"Created inquiry for deal {message_data.deal_id}")
        
        return {
            "success": True,
            "message": result.data[0],
            "conversation_id": conversation_id,
            "inquiry_created": is_first_message
        }
        
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )




@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    user = Depends(get_current_user_supabase)
):
    """Delete a message. Only the sender can delete their own messages."""
    supabase = get_supabase()
    
    try:
        # Verify message exists and user is the sender
        message_result = supabase.table('marketplace_messages').select('*').eq(
            'id', message_id
        ).execute()
        
        if not message_result.data or len(message_result.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        message = message_result.data[0]
        
        if message['sender_id'] != str(user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own messages"
            )
        
        # Delete the message
        supabase.table('marketplace_messages').delete().eq('id', message_id).execute()
        
        return {
            "success": True,
            "message": "Message deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete message"
        )
@router.put("/{message_id}/mark-read")
async def mark_message_read(
    message_id: str,
    user = Depends(get_current_user_supabase)
):
    """Mark a message as read."""
    supabase = get_supabase()
    
    try:
        # Verify user is the recipient
        result = supabase.table('marketplace_messages').update({
            'read': True
        }).eq('id', message_id).eq('recipient_id', str(user.id)).execute()
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Error marking message as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark message as read"
        )


@router.get("/unread-count")
async def get_unread_count(user = Depends(get_current_user_supabase)):
    """Get count of unread messages for badge display."""
    supabase = get_supabase()
    
    try:
        unread = supabase.table('marketplace_messages').select('id').eq(
            'recipient_id', str(user.id)
        ).eq('read', False).execute()
        
        return {
            "unread_count": len(unread.data)
        }
        
    except Exception as e:
        logger.error(f"Error fetching unread count: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch unread count"
        )
