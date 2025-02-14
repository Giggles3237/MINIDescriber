import PropTypes from 'prop-types';
import './PdfThumbnail.css';

/**
 * PDFThumbnail component
 * This component renders a thumbnail representation of a PDF document.
 * It displays the PDF's title, a thumbnail image (if available), and a brief description.
 *
 * Props:
 * - title: string (required) - The title of the PDF document.
 * - thumbnailUrl: string (optional) - The URL of the PDF thumbnail image.
 * - description: string (optional) - A brief description of the PDF.
 * - onClick: function (optional) - A click handler for the thumbnail.
 *
 * @param {object} props
 * @returns {JSX.Element} The rendered PDF thumbnail component.
 */
const PDFThumbnail = ({ title, thumbnailUrl, description, onClick }) => {
  return (
    <div className="pdf-thumbnail" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={`Thumbnail for ${title}`} className="thumbnail-image" />
      ) : (
        <div className="thumbnail-placeholder">No Image Available</div>
      )}
      <div className="pdf-details">
        <h3 className="pdf-title">{title}</h3>
        {description && <p className="pdf-description">{description}</p>}
      </div>
    </div>
  );
};

PDFThumbnail.propTypes = {
  title: PropTypes.string.isRequired,
  thumbnailUrl: PropTypes.string,
  description: PropTypes.string,
  onClick: PropTypes.func,
};

export default PDFThumbnail;
