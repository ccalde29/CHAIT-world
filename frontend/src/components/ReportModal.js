// ============================================================================
// Report Modal Component
// Allows users to report inappropriate community content
// ============================================================================

import React, { useState } from 'react';
import { X, Flag, AlertTriangle } from 'lucide-react';

const REPORT_REASONS = [
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'spam', label: 'Spam or Advertising' },
  { value: 'harassment', label: 'Harassment or Hate Speech' },
  { value: 'violence', label: 'Violence or Gore' },
  { value: 'nsfw', label: 'NSFW Content' },
  { value: 'copyright', label: 'Copyright Violation' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' }
];

const ReportModal = ({ isOpen, onClose, character, scene, itemType = 'character', onSubmit }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const item = itemType === 'character' ? character : scene;
  const itemName = item?.name || 'Unknown';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedReason) {
      setError('Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        [itemType === 'character' ? 'characterId' : 'sceneId']: item.id,
        reason: selectedReason,
        details: details.trim()
      });

      // Close and reset
      setSelectedReason('');
      setDetails('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedReason('');
      setDetails('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Flag className="text-orange-500" size={24} />
            <h2 className="text-xl font-bold text-white">
              Report {itemType === 'character' ? 'Character' : 'Scene'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Info */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-sm text-gray-400 mb-1">Reporting:</p>
            <p className="text-white font-medium">{itemName}</p>
          </div>

          {/* Warning Notice */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex gap-2">
            <AlertTriangle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-200">
              False reports may result in restrictions on your account. Please only report content that violates community guidelines.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-orange-600/10 border border-orange-500/20 rounded-lg p-3">
              <p className="text-sm text-orange-400">{error}</p>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for reporting *
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedReason === reason.value
                      ? 'bg-orange-500/20 border-orange-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500 focus:ring-offset-gray-900"
                  />
                  <span className="text-sm text-white">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Additional details (optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context that might help moderators..."
              rows={4}
              maxLength={500}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {details.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedReason}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Flag size={16} />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
