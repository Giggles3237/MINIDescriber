import PropTypes from 'prop-types';
import './ResponseDisplay.css';

/**
 * ResponseDisplay component
 * This component displays a text response from the application. It can optionally display a title above the response text.
 * 
 * Props:
 * - response: string (required) - The response text to display.
 * - title: string (optional) - An optional title for the response.
 * 
 * @param {object} props
 * @returns {JSX.Element}
 */
const ResponseDisplay = ({ response, title }) => {
  return (
    <div className="response-display">
      {title && <h2 className="response-title">{title}</h2>}
      <pre className="response-content">{response}</pre>
    </div>
  );
};

ResponseDisplay.propTypes = {
  response: PropTypes.string.isRequired,
  title: PropTypes.string,
};

export default ResponseDisplay;
