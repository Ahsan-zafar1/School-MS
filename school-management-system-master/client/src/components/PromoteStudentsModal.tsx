import React from 'react';
import IconActionButton from './IconActionButton';

export interface PromotionFormValues {
  fromClass: string;
  toClass: string;
  toSection: string;
  fromAcademicYear: string;
  toAcademicYear: string;
  includeInactive: boolean;
}

export interface PromotionCandidatePreview {
  _id: string;
  name: string;
  rollNumber?: string;
  section?: string;
}

export interface PromotionPreviewState {
  candidateCount: number;
  candidates: PromotionCandidatePreview[];
}

export type PromotionModalMode = 'class' | 'students';

/** How to render "From class" when mode is `class`. `students` mode always shows selected count. */
export type FromClassControl = 'select' | 'readonly';

interface PromoteStudentsModalProps {
  open: boolean;
  mode: PromotionModalMode;
  selectedStudentCount: number;
  form: PromotionFormValues;
  onFormChange: (partial: Partial<PromotionFormValues>) => void;
  classNameOptions: string[];
  sectionOptionsForToClass: string[];
  fromClassControl: FromClassControl;
  promotionPreview: PromotionPreviewState | null;
  promoteLoading: boolean;
  promoteDryRunLoading: boolean;
  onClose: () => void;
  onDryRun: () => void;
  onPromote: () => void;
}

const PromoteStudentsModal: React.FC<PromoteStudentsModalProps> = ({
  open,
  mode,
  selectedStudentCount,
  form,
  onFormChange,
  classNameOptions,
  sectionOptionsForToClass,
  fromClassControl,
  promotionPreview,
  promoteLoading,
  promoteDryRunLoading,
  onClose,
  onDryRun,
  onPromote,
}) => {
  if (!open) return null;

  const title =
    mode === 'class'
      ? 'Promote Class'
      : `Promote ${selectedStudentCount} Student(s)`;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <IconActionButton
            onClick={onClose}
            tooltip="Close promotion dialog"
            className="text-gray-400 hover:text-gray-600 focus:ring-gray-400"
            sizeClass="p-1 rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconActionButton>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Promotion updates only current class placement. Historical exam/results remain unchanged.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mode === 'class' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">From Class</label>
              {fromClassControl === 'select' ? (
                <select
                  value={form.fromClass}
                  onChange={(e) => onFormChange({ fromClass: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select class</option>
                  {classNameOptions.map((className) => (
                    <option key={`from-${className}`} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.fromClass}
                  className="input-field bg-gray-50"
                  readOnly
                />
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700">Selected Students</label>
              <div className="input-field bg-gray-50">{selectedStudentCount}</div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">To Class</label>
            <select
              value={form.toClass}
              onChange={(e) => onFormChange({ toClass: e.target.value, toSection: '' })}
              className="input-field"
            >
              <option value="">Select class</option>
              {classNameOptions.map((className) => (
                <option key={`to-${className}`} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To Section (optional)</label>
            <select
              value={form.toSection}
              onChange={(e) => onFormChange({ toSection: e.target.value })}
              className="input-field"
              disabled={!form.toClass}
            >
              <option value="">Auto / Keep current</option>
              {sectionOptionsForToClass.map((section) => (
                <option key={`to-sec-${section}`} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">From Academic Year (optional)</label>
            <input
              value={form.fromAcademicYear}
              onChange={(e) => onFormChange({ fromAcademicYear: e.target.value })}
              className="input-field"
              placeholder="e.g. 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To Academic Year (optional)</label>
            <input
              value={form.toAcademicYear}
              onChange={(e) => onFormChange({ toAcademicYear: e.target.value })}
              className="input-field"
              placeholder="e.g. 2027"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.includeInactive}
              onChange={(e) => onFormChange({ includeInactive: e.target.checked })}
            />
            Include inactive students
          </label>
        </div>

        {promotionPreview && (
          <div className="mt-4 border rounded-md p-3 bg-gray-50">
            <p className="text-sm font-medium text-gray-800">
              Dry run: {promotionPreview.candidateCount} student(s) eligible
            </p>
            {promotionPreview.candidates.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded bg-white">
                {promotionPreview.candidates.map((s) => (
                  <div key={s._id} className="px-3 py-2 text-sm border-b last:border-b-0">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-gray-500"> ({s.rollNumber || 'N/A'})</span>
                    {s.section ? (
                      <span className="text-gray-500"> · {s.section}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={promoteLoading || promoteDryRunLoading}
            title="Close without promoting"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDryRun}
            className="btn-secondary"
            disabled={promoteLoading || promoteDryRunLoading}
            title="Preview how many students would be promoted"
          >
            {promoteDryRunLoading ? 'Running Dry Run...' : 'Dry Run'}
          </button>
          <button
            type="button"
            onClick={onPromote}
            className="btn-primary"
            disabled={promoteLoading || promoteDryRunLoading}
            title="Confirm and run promotion"
          >
            {promoteLoading ? 'Promoting...' : 'Promote Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteStudentsModal;
