/**
 * CommentsSection Component
 * Displays and manages comments for characters/scenes in Community Hub
 */

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Edit2, Trash2, X } from 'lucide-react';

const CommentsSection = ({
  itemId,
  itemType, // 'character' or 'scene'
  apiRequest
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');

  const endpoint = itemType === 'character' ? 'character-comments' : 'scene-comments';

  useEffect(() => {
    loadComments();
  }, [itemId, itemType]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/${endpoint}/${itemId}`);
      setComments(data || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const data = await apiRequest(`/api/${endpoint}/${itemId}`, {
        method: 'POST',
        body: JSON.stringify({ comment: newComment.trim() })
      });
      setComments(prev => [data, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const data = await apiRequest(`/api/${endpoint}/comment/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ comment: editText.trim() })
      });
      setComments(prev => prev.map(c => c.id === commentId ? data : c));
      setEditingComment(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to update comment:', error);
      alert('Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await apiRequest(`/api/${endpoint}/comment/${commentId}`, {
        method: 'DELETE'
      });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <MessageCircle size={16} className="text-orange-400" />
        <h3 className="text-sm font-medium text-white">
          Comments ({comments.length})
        </h3>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          maxLength={1000}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 resize-none text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {newComment.length} / 1000 characters
          </span>
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
          >
            <Send size={14} />
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto"></div>
            <p className="text-sm text-gray-400 mt-2">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-xs text-white font-bold">
                    {comment.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{comment.display_name || comment.username}</p>
                    <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                  </div>
                </div>

                {/* Edit/Delete buttons for own comments */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingComment(comment.id);
                      setEditText(comment.comment);
                    }}
                    className="p-1 text-gray-400 hover:text-orange-400 transition-colors"
                    title="Edit comment"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 text-gray-400 hover:text-orange-400 transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {editingComment === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-orange-400 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingComment(null);
                        setEditText('');
                      }}
                      className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={12} className="inline mr-1" />
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateComment(comment.id)}
                      disabled={!editText.trim() || submitting}
                      className="px-3 py-1 text-xs bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.comment}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentsSection;
