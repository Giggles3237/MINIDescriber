import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
// MUI Components
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { CircularProgress, Snackbar, Alert, Accordion, AccordionSummary, AccordionDetails, TextField, LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Select from 'react-select';
import { ClipboardCopy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
// MUI Icon for accordion expansion
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CopyOptions from './components/CopyOptions';

import describerLogo from './icons/Logo 2.png';
import miniLogo from './icons/MOP.png';
import bmwLogo from './icons/BOP.png';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Custom styles for react-select to force a white background
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'white',
    borderColor: state.isFocused ? '#3f51b5' : provided.borderColor,
    boxShadow: state.isFocused ? '0 0 0 1px #3f51b5' : provided.boxShadow,
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: 'white',
  })
};

export const systemMessage = `
You are an expert Car Sales Manager. Your knowledge of vehicles is exact and up to date. All brands, all models, options, specs, and features are known to you.

You are given a PDF of a vehicle. Your job is to create a description of the vehicle that is engaging, informative, and persuasive.

The description should be written in the style of a car sales manager writing a description for a vehicle listing on a car dealership website meant to engage and convert clients.
- Seamlessly integrate features into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of key features.
- Use the model name (not the code), and format in Markdown.
- Write two compelling paragraphs that capture the essence of the vehicle, emphasizing its standout features, performance, and design in an engaging, conversational, brand appropriate tone.
`;

const invoiceOptions = [
  { value: 'MINI', label: 'MINI' },
  { value: 'BMW', label: 'BMW' },
  { value: 'USED', label: 'Used' },
  { value: 'DEEPSEEK', label: 'DeepSeek (Beta)' },
];

const toneOptions = [
  { value: 'Conversational', label: 'Conversational' },
  { value: 'Luxury-Focused', label: 'Luxury-Focused' },
  { value: 'Energetic', label: 'Energetic' },
];

const defaultPrompts = {
  MINI: `You are an expert automotive copywriter specializing in MINI Cooper vehicles.
You are given a document containing multiple invoices. Each invoice starts with the header "Vehicle Inquiry".
For each invoice, generate an engaging, high-converting description for a car listing:
- Write two compelling paragraphs capturing the vehicle's essence.List options in BOLD
- Follow with a clear, skimmable bullet-point list of key features.
- Avoid technical jargon and use Markdown formatting.`,
  BMW: `You are an expert automotive copywriter specializing in BMW vehicles. Your task is to create engaging, high-converting descriptions that appeal to online car shoppers.
Avoid overly technical jargon. NO model codes. Ensure that Year Make and model only once in the description.
Augment the documents with your own knowledge of the vehicle to make the description more engaging and informative.
- Write two compelling paragraphs capturing the vehicle's essence.List options in BOLD
Seamlessly integrate key details into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of essential options only expanding package content where applicable.
- Use the model name (not the code), and format in Markdown.`,
  USED: `You are an automotive copywriter specializing in used cars. Examine this document thoroughly, building a comprehensive description of the vehicle. 
Your task is to create persuasive, conversion-focused descriptions that effectively showcase the vehicle's standout options, proven reliability, and exceptional value to convert buyers.
Avoid overly technical jargon. NO model codes. Ensure that Year Make and model only once in the description.
Augment the documents with your own knowledge of the vehicle to make the description more accurate, engaging and informative.
- Write two compelling paragraphs capturing the vehicle's essence.List options in BOLD
- Seamlessly integrate key details into the narrative rather than listing them mechanically.
- Follow the description with a clear, skimmable bullet-point list of essential options only.
- Use the model name (not the code), and format in Markdown.`,
  DEEPSEEK: `You are an automotive copywriter with a unique voice—a stereotypical, angry Asian woman who isn't afraid to yell her praises (and critiques) in broken English. Your task is to craft a compelling and concise description for a used car that doesn't just sell the car, but also entertains the reader.
Write a sharp, witty paragraph that highlights the key features and unique qualities of the vehicle, using language that's both punchy and playful.
Emphasize the car's newness, luxury features, and smart technology in a way that feels like you're both boasting and poking fun at its sophistication.
Include a brief, bullet-point list of essential features, keeping the tone light and the details clear.
Use the model name (not the code), and format the description in Markdown.`
};

// PdfThumbnail component renders the first page of a PDF as a thumbnail and supports a click
function PdfThumbnail({ file, onClick }) {
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    const renderPdf = async () => {
      try {
        const data = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(new Uint8Array(data)).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL();
        setImageSrc(dataUrl);
      } catch (err) {
        console.error("Error rendering PDF thumbnail", err);
      }
    };
    renderPdf();
  }, [file]);

  return (
    <div style={{ marginBottom: '16px', textAlign: 'center', cursor: 'pointer' }} onClick={() => onClick(file)}>
      {imageSrc ? (
        <img src={imageSrc} alt={file.name} style={{ width: '100%', maxWidth: '200px' }} />
      ) : (
        <CircularProgress size={24} />
      )}
      <Typography variant="caption">{file.name}</Typography>
    </div>
  );
}

// PdfViewerDialog renders all pages of the PDF in a scrollable modal
function PdfViewerDialog({ file, open, onClose }) {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    if (file && open) {
      const renderAllPages = async () => {
        try {
          const data = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument(new Uint8Array(data)).promise;
          const numPages = pdf.numPages;
          const pagesData = [];
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
            pagesData.push(canvas.toDataURL());
          }
          setPages(pagesData);
        } catch (err) {
          console.error("Error rendering PDF pages", err);
        }
      };
      renderAllPages();
    }
  }, [file, open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{file ? file.name : "PDF Viewer"}</DialogTitle>
      <DialogContent dividers style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        {pages.length > 0 ? (
          pages.map((src, index) => (
            <img key={index} src={src} alt={`Page ${index + 1}`} style={{ width: '100%', marginBottom: '16px' }} />
          ))
        ) : (
          <CircularProgress />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function PdfUploadChatGPTApp() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedType, setSelectedType] = useState("MINI");
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('idle');
  const [mileage, setMileage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [refinementInputs, setRefinementInputs] = useState({});
  const [refinementOpen, setRefinementOpen] = useState({});
  const [revisionHistory, setRevisionHistory] = useState({});
  const [toneStyle, setToneStyle] = useState("Conversational");
  const [callToAction, setCallToAction] = useState("");
  const [customPrompts, setCustomPrompts] = useState(defaultPrompts);
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [previewGroups, setPreviewGroups] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [selectedPdf, setSelectedPdf] = useState(null);

  const isVehicleInquiryHeader = (text) => /^Vehicle Inquiry/i.test(text);
  const getRealText = (pageText) => pageText.replace(/^Page \d+:\s*/, '');
  const groupInvoices = (pageTexts) => {
    const invoiceGroups = [];
    let currentGroup = [];
    const blankThreshold = 20;
    const isBlankPage = (text) => text.trim().length < blankThreshold;
    pageTexts.forEach((pageText) => {
      const cleanText = getRealText(pageText);
      if (isBlankPage(cleanText)) {
        if (currentGroup.length > 0) {
          invoiceGroups.push(currentGroup.join("\n"));
          currentGroup = [];
        }
        return;
      }
      if (isVehicleInquiryHeader(cleanText)) {
        if (currentGroup.length > 0) {
          invoiceGroups.push(currentGroup.join("\n"));
          currentGroup = [];
        }
      }
      currentGroup.push(pageText);
    });
    if (currentGroup.length > 0) {
      invoiceGroups.push(currentGroup.join("\n"));
    }
    return invoiceGroups;
  };

  const readPDF = useCallback(async (file) => {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
      fileReader.onload = async function () {
        try {
          const typedArray = new Uint8Array(this.result);
          const pdf = await pdfjs.getDocument(typedArray).promise;
          const pageTexts = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            pageTexts.push(`Page ${i}:\n${pageText}`);
          }
          resolve(pageTexts);
        } catch (err) {
          reject(err);
        }
      };
      fileReader.readAsArrayBuffer(file);
    });
  }, []);

  const validateFiles = useCallback((files) => {
    const MAX_SIZE = 5 * 1024 * 1024;
    const validFiles = [];
    Array.from(files).forEach(file => {
      if (file.type !== 'application/pdf') {
        setError(`Invalid file type: ${file.name} is not a PDF`);
      } else if (file.size > MAX_SIZE) {
        setError(`File too large: ${file.name} exceeds 5MB`);
      } else {
        validFiles.push(file);
      }
    });
    return validFiles;
  }, []);

  const handlePreview = useCallback(async () => {
    try {
      setIsLoading(true);
      let allGroups = [];
      for (const file of selectedFiles) {
        const pages = await readPDF(file);
        const groups = groupInvoices(pages);
        groups.forEach((groupText, index) => {
          allGroups.push({ id: `${file.name}-${index}`, text: groupText, selected: true });
        });
      }
      setPreviewGroups(allGroups);
      setNotification({ open: true, message: `${allGroups.length} content groups extracted for preview.`, severity: "info" });
    } catch (error) {
      console.error(error);
      setError(`Error generating preview: ${error.message}`);
      setNotification({ open: true, message: `Error generating preview: ${error.message}`, severity: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiles, readPDF]);

  const handleAnalyze = useCallback(async () => {
    setError(null);
    setResponses([]);
    setProgress(0);
    try {
      setIsLoading(true);
      setApiStatus('loading');
      let groupsToProcess;
      if (previewGroups.length > 0) {
        groupsToProcess = previewGroups.filter(g => g.selected).map(g => g.text);
      } else {
        groupsToProcess = [];
        for (const file of selectedFiles) {
          const pages = await readPDF(file);
          const invoiceGroups = groupInvoices(pages);
          groupsToProcess.push(...invoiceGroups);
        }
      }
      const totalGroups = groupsToProcess.length;
      for (let i = 0; i < totalGroups; i++) {
        const groupText = groupsToProcess[i];
        const requestBody = generateCombinedPrompt(groupText, selectedType, mileage);
        if (callToAction) {
          requestBody.messages[1].content += `\n\nCall-to-Action: ${callToAction}`;
        }
        if (toneStyle) {
          requestBody.messages[1].content += `\n\nTone & Style: ${toneStyle}`;
        }
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
        const data = await response.json();
        let generatedResponse = "No Response";
        if (data.choices && data.choices.length > 0) {
          generatedResponse = data.choices[0].message.content;
        }
        setResponses(prev => [...prev, generatedResponse]);
        setProgress(Math.round(((i + 1) / totalGroups) * 100));
      }
      setApiStatus("idle");
      setNotification({ open: true, message: "Response generated successfully!", severity: "success" });
    } catch (error) {
      console.error(error);
      setError(`Error processing files: ${error.message}`);
      setApiStatus("error");
      setNotification({ open: true, message: `Error: ${error.message}`, severity: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiles, selectedType, mileage, previewGroups, callToAction, toneStyle, readPDF]);

  const generateCombinedPrompt = (documentData, selectedType, mileage) => {
    const customPrompt = customPrompts[selectedType] || `Default prompt for ${selectedType}`;
    if (selectedType === 'MINI') {
      return {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: customPrompt,
          },
          {
            role: "user",
            content: `Please analyze the following document containing multiple invoices:\n\n${documentData}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      };
    }
    return {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: customPrompt,
        },
        {
          role: "user",
          content: `Please analyze the following document:\n\n${documentData}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };
  };

  const handleFileChange = useCallback((e) => {
    const validFiles = validateFiles(e.target.files);
    setSelectedFiles(validFiles);
    if (validFiles.length > 0) {
      setNotification({ open: true, message: `${validFiles.length} file(s) selected.`, severity: "info" });
    }
  }, [validateFiles]);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setNotification({ open: true, message: "Copied to clipboard!", severity: "success" });
  }, []);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = [...e.dataTransfer.files];
    const validFiles = validateFiles(files);
    setSelectedFiles(validFiles);
    if (validFiles.length > 0) {
      setNotification({ open: true, message: `${validFiles.length} file(s) dropped.`, severity: "info" });
    }
  }, [validateFiles]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Space') {
      e.preventDefault();
      document.getElementById('file-upload').click();
    }
  }, []);

  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const togglePromptSettings = () => {
    setShowPromptSettings(prev => !prev);
  };

  const handlePromptChange = (e) => {
    setCustomPrompts(prev => ({
      ...prev,
      [selectedType]: e.target.value,
    }));
  };

  const toggleGroupSelection = (id) => {
    setPreviewGroups(prev => prev.map(group => group.id === id ? { ...group, selected: !group.selected } : group));
  };

  const handleThumbnailClick = (file) => {
    setSelectedPdf(file);
  };

  const handleFeatureRequest = () => {
    window.location.href = "mailto:laskocreative@gmail.com?subject=Feature%20Request&body=Hi,%0A%0APlease describe the feature you would like to request:";
  };

  const improveDescription = async (currentDescription, improvementRequest) => {
    const messages = [
      { role: "system", content: systemMessage },
      { role: "assistant", content: currentDescription },
      { role: "user", content: `Please improve this description based on the following request: ${improvementRequest}. Maintain the same format and style.` }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const handleImprove = (response) => {
    const currentIndex = responses.indexOf(response);
    setRefinementOpen(prev => ({
      ...prev,
      [currentIndex]: true
    }));
  };

  const handleRefinement = async (index) => {
    const refinementPrompt = refinementInputs[index];
    if (!refinementPrompt) return;

    setIsLoading(true);
    setError(null);

    try {
      const improvedResponse = await improveDescription(responses[index], refinementPrompt);
      setResponses(prev => [...prev, improvedResponse]);
      setRefinementOpen(prev => ({
        ...prev,
        [index]: false
      }));
      setRefinementInputs(prev => ({
        ...prev,
        [index]: ''
      }));
      setNotification({
        open: true,
        message: 'Description improved successfully!',
        severity: 'success'
      });
    } catch (err) {
      setError('Failed to improve description: ' + err.message);
      setNotification({
        open: true,
        message: 'Failed to improve description',
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
        <div style={{ gridColumn: '1' }}>
          <Card>
            <CardContent>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <img 
                  src={selectedType === 'MINI' ? miniLogo : bmwLogo} 
                  alt={`${selectedType} Logo`}
                  style={{ height: '40px', width: 'auto' }}
                />
              </div>
              <Typography variant="h6" gutterBottom align="center">
                Upload PDF
              </Typography>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload">
                <Button
                  variant="contained"
                  component="span"
                  style={{ 
                    marginBottom: '10px',
                    backgroundColor: selectedType === 'MINI' ? '#70B62C' : '#0066B1',
                    width: '100%'
                  }}
                >
                  Choose File
                </Button>
              </label>
              {selectedFiles.length > 0 && (
                <Typography variant="body2" align="center">
                  Selected: {selectedFiles[0].name}
                </Typography>
              )}

              <div style={{ marginTop: '20px' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Description Type
                </Typography>
                <Select
                  options={invoiceOptions}
                  value={invoiceOptions.find(option => option.value === selectedType)}
                  onChange={(option) => setSelectedType(option.value)}
                  styles={customSelectStyles}
                />
              </div>

              <div style={{ marginTop: '20px' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Tone & Style
                </Typography>
                <Select
                  options={toneOptions}
                  value={toneOptions.find(option => option.value === toneStyle)}
                  onChange={(option) => setToneStyle(option.value)}
                  styles={customSelectStyles}
                />
              </div>

              <Button
                variant="contained"
                color="primary"
                onClick={handleAnalyze}
                disabled={isLoading || selectedFiles.length === 0}
                style={{ marginTop: '20px', width: '100%' }}
              >
                {isLoading ? 'Processing...' : 'Generate Description'}
              </Button>

              <Accordion 
                expanded={showAdvanced}
                onChange={() => setShowAdvanced(!showAdvanced)}
                style={{ marginTop: '20px' }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Advanced Settings</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    label="Call to Action"
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    fullWidth
                    margin="normal"
                  />
                  <Button
                    variant="outlined"
                    onClick={togglePromptSettings}
                    style={{ marginTop: '10px' }}
                  >
                    Edit Prompts
                  </Button>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
          
          {selectedFiles.length > 0 && (
            <Card style={{ marginTop: '20px', height: '500px', overflow: 'auto' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  PDF Preview
                </Typography>
                <PdfThumbnail file={selectedFiles[0]} onClick={handleThumbnailClick} />
              </CardContent>
            </Card>
          )}
        </div>

        <div style={{ gridColumn: '2 / span 2' }}>
          <Card>
            <CardContent>
              {isLoading && <LinearProgress />}
              {error && (
                <Alert severity="error" style={{ marginBottom: '10px' }}>
                  {error}
                </Alert>
              )}
              {responses.map((response, index) => (
                <div key={index} style={{ marginBottom: '20px', position: 'relative' }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Version {index + 1}
                  </Typography>
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <Typography variant="body1">{children}</Typography>
                      ),
                      h1: ({ children }) => (
                        <Typography variant="h3">{children}</Typography>
                      ),
                      h2: ({ children }) => (
                        <Typography variant="h4">{children}</Typography>
                      ),
                      h3: ({ children }) => (
                        <Typography variant="h5">{children}</Typography>
                      ),
                      li: ({ children }) => (
                        <Typography component="li" variant="body1" style={{ display: 'list-item' }}>{children}</Typography>
                      ),
                    }}
                  >
                    {response}
                  </ReactMarkdown>
                  <div style={{ position: 'absolute', top: '0', right: '0', display: 'flex', gap: '8px' }}>
                    <CopyOptions 
                      text={response} 
                      onCopy={(message) => setNotification({ open: true, message, severity: 'success' })} 
                    />
                    {index === responses.length - 1 && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleImprove(response)}
                        disabled={isLoading}
                      >
                        Improve
                      </Button>
                    )}
                  </div>
                  {refinementOpen[index] && (
                    <div style={{ marginTop: '10px' }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        variant="outlined"
                        placeholder="What would you like to improve about this description?"
                        value={refinementInputs[index] || ''}
                        onChange={(e) => {
                          setRefinementInputs(prev => ({
                            ...prev,
                            [index]: e.target.value
                          }));
                        }}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleRefinement(index)}
                        style={{ marginTop: '10px' }}
                        disabled={isLoading || !refinementInputs[index]}
                      >
                        Submit Improvement
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>

      <PdfViewerDialog
        file={selectedPdf}
        open={Boolean(selectedPdf)}
        onClose={() => setSelectedPdf(null)}
      />
    </div>
  );
}

export default PdfUploadChatGPTApp;
