import PropTypes from 'prop-types';
import './PdfViewerDialog.css';

/**
 * PdfViewerDialog component
 * This component renders a modal dialog for viewing a PDF document. It displays an iframe containing the PDF and a close button.
 * 
 * Props:
 * - isOpen: boolean (required) - Determines whether the dialog is visible.
 * - pdfUrl: string (required) - The URL of the PDF document to display.
 * - onClose: function (required) - Callback function to close the dialog.
 *
 * @param {object} props
 * @returns {JSX.Element|null} The rendered dialog if open, otherwise null.
 */
const PdfViewerDialog = ({ isOpen, pdfUrl, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="pdf-viewer-dialog-overlay" onClick={onClose}>
      <div className="pdf-viewer-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <iframe 
          src={pdfUrl}
          title="PDF Viewer"
          className="pdf-viewer-iframe"
          frameBorder="0"
        />
      </div>
    </div>
  );
};

PdfViewerDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  pdfUrl: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default PdfViewerDialog;
