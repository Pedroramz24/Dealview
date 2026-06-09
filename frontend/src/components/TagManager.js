import React, { useState, useEffect } from 'react';
import { Tag, Plus, X, Edit2, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient';

const TagManager = ({ contactId, currentTags = [], onTagsUpdate }) => {
  const [tags, setTags] = useState(currentTags || []);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [editTagValue, setEditTagValue] = useState('');

  // Predefined tag suggestions
  const tagSuggestions = [
    { name: 'Hot Lead', color: '#ef4444' },
    { name: 'Cold Lead', color: '#64748b' },
    { name: 'VIP', color: '#f59e0b' },
    { name: 'Newsletter', color: '#22c55e' },
    { name: 'Follow Up', color: '#8b5cf6' },
    { name: 'Investor', color: '#ff0000' },
    { name: 'Broker', color: '#ec4899' },
    { name: 'Seller', color: '#10b981' },
    { name: 'Buyer', color: '#3b82f6' },
  ];

  const addTag = async (tagName) => {
    if (!tagName || !tagName.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }

    const trimmedTag = tagName.trim();
    
    if (tags.includes(trimmedTag)) {
      toast.error('Tag already exists');
      return;
    }

    const updatedTags = [...tags, trimmedTag];
    await updateTags(updatedTags);
    setNewTagName('');
    setShowAddTag(false);
  };

  const removeTag = async (tagToRemove) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    await updateTags(updatedTags);
  };

  const editTag = async (oldTag, newTag) => {
    if (!newTag || !newTag.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }

    const trimmedNewTag = newTag.trim();
    
    if (trimmedNewTag === oldTag) {
      setEditingTagIndex(null);
      return;
    }

    if (tags.includes(trimmedNewTag)) {
      toast.error('Tag already exists');
      return;
    }

    const updatedTags = tags.map(tag => tag === oldTag ? trimmedNewTag : tag);
    await updateTags(updatedTags);
    setEditingTagIndex(null);
  };

  const updateTags = async (updatedTags) => {
    try {
      if (contactId) {
        // Update in database
        const { error } = await supabase
          .from('contacts')
          .update({ tags: updatedTags })
          .eq('id', contactId);

        if (error) throw error;
      }

      setTags(updatedTags);
      onTagsUpdate && onTagsUpdate(updatedTags);
      toast.success('Tags updated');
    } catch (error) {
      console.error('Error updating tags:', error);
      toast.error('Failed to update tags');
    }
  };

  const getTagColor = (tagName) => {
    const suggestion = tagSuggestions.find(s => s.name.toLowerCase() === tagName.toLowerCase());
    return suggestion?.color || '#ff0000';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
          Smart Tags
        </label>
        <button
          onClick={() => setShowAddTag(!showAddTag)}
          style={{
            padding: '4px 10px',
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '6px',
            color: '#ff0000',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Plus size={12} />
          Add Tag
        </button>
      </div>

      {/* Add New Tag */}
      {showAddTag && (
        <div className="mb-3 p-3" style={{
          background: 'rgba(255, 0, 0, 0.05)',
          border: '1px solid rgba(255, 0, 0, 0.2)',
          borderRadius: '6px'
        }}>
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addTag(newTagName);
              }
            }}
            placeholder="Enter tag name..."
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              marginBottom: '8px'
            }}
          />
          
          {/* Tag Suggestions */}
          <div className="flex flex-wrap gap-2 mb-3">
            <p style={{ color: 'var(--text-secondary)', fontSize: '11px', width: '100%', marginBottom: '4px' }}>
              Quick suggestions:
            </p>
            {tagSuggestions.map((suggestion) => (
              <button
                key={suggestion.name}
                onClick={() => addTag(suggestion.name)}
                style={{
                  padding: '4px 8px',
                  background: `${suggestion.color}15`,
                  border: `1px solid ${suggestion.color}40`,
                  borderRadius: '4px',
                  color: suggestion.color,
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                {suggestion.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => addTag(newTagName)}
              style={{
                flex: 1,
                padding: '6px 12px',
                background: '#ff0000',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Add Tag
            </button>
            <button
              onClick={() => {
                setShowAddTag(false);
                setNewTagName('');
              }}
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Display Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>
            No tags added
          </p>
        ) : (
          tags.map((tag, index) => (
            <div
              key={index}
              style={{
                padding: '6px 10px',
                background: `${getTagColor(tag)}15`,
                border: `1px solid ${getTagColor(tag)}40`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {editingTagIndex === index ? (
                <>
                  <input
                    type="text"
                    value={editTagValue}
                    onChange={(e) => setEditTagValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        editTag(tag, editTagValue);
                      }
                    }}
                    onBlur={() => setEditingTagIndex(null)}
                    autoFocus
                    style={{
                      padding: '2px 6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: '3px',
                      color: getTagColor(tag),
                      fontSize: '12px',
                      width: '80px'
                    }}
                  />
                  <button
                    onClick={() => editTag(tag, editTagValue)}
                    style={{
                      padding: '2px',
                      background: 'transparent',
                      border: 'none',
                      color: getTagColor(tag),
                      cursor: 'pointer'
                    }}
                  >
                    <Check size={12} />
                  </button>
                </>
              ) : (
                <>
                  <Tag size={12} style={{ color: getTagColor(tag) }} />
                  <span style={{ color: getTagColor(tag), fontSize: '12px', fontWeight: 500 }}>
                    {tag}
                  </span>
                  <button
                    onClick={() => {
                      setEditingTagIndex(index);
                      setEditTagValue(tag);
                    }}
                    style={{
                      padding: '2px',
                      background: 'transparent',
                      border: 'none',
                      color: getTagColor(tag),
                      cursor: 'pointer',
                      opacity: 0.6
                    }}
                  >
                    <Edit2 size={10} />
                  </button>
                  <button
                    onClick={() => removeTag(tag)}
                    style={{
                      padding: '2px',
                      background: 'transparent',
                      border: 'none',
                      color: getTagColor(tag),
                      cursor: 'pointer',
                      opacity: 0.6
                    }}
                  >
                    <X size={10} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TagManager;
