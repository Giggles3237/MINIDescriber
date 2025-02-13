import React, { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { ClipboardCopy } from 'lucide-react';
import { marked } from 'marked';

const CopyOptions = ({ text, onCopy }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const copyOptions = {
    'Plain Text': () => text.replace(/[#*_]/g, ''),
    'Markdown': () => text,
    'HTML': () => {
      // Configure marked for GitHub Flavored Markdown
      marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: false,
        mangle: false
      });
      
      // Convert markdown to HTML
      const html = marked(text);
      
      // Clean up any double line breaks and extra spaces
      return html
        .replace(/\n\s*\n/g, '\n')
        .replace(/<p><br><\/p>/g, '<br>')
        .trim();
    }
  };

  const handleCopyOption = (format) => {
    const content = copyOptions[format]();
    navigator.clipboard.writeText(content);
    onCopy(`Copied as ${format}`);
    handleClose();
  };

  return (
    <>
      <Button onClick={handleClick}>
        <ClipboardCopy className="h-4 w-4" />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {Object.keys(copyOptions).map((format) => (
          <MenuItem key={format} onClick={() => handleCopyOption(format)}>
            Copy as {format}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default CopyOptions;