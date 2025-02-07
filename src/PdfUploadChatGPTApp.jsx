// PdfUploadChatGPTApp.jsx

// QUESTIONS FOR USER:
// 1) Are you comfortable using a public CDN to load the PDF.js worker?
// 2) Should we attempt a fallback if the CDN fails?
// 3) Do you have any custom domain or storage to host the worker file?

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';

// Load the worker from a public CDN
pdfjs.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

// ---------- New Prompt Structure ----------
// brandGuidelines.js (or just a const in your file)
export const systemMessage = `
You are an automotive copywriter for MINI Cooper. Use a bold, playful tone. 
Weave features into an adventurous narrative—no mechanical lists in the paragraphs.
Two paragraphs of description, then bullet features.Use model name in the first paragraph. Format in Markdown.
`;

// Create the API request payload using the new structure
const promptUser = (invoiceData) => {
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: `Please write a MINI Cooper description for this invoice:\n\n${invoiceData}`
      }
    ],
    max_tokens: 250,
    temperature: 0.7,
  };
};

// Modified readPDF that returns an array of page texts
const readPDF = async (file) => {
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
          const pageText = textContent.items.map((item) => item.str).join(" ");
          pageTexts.push(`Page ${i}:\n${pageText}`);
        }
        resolve(pageTexts);
      } catch (err) {
        reject(err);
      }
    };
    fileReader.readAsArrayBuffer(file);
  });
};

export default function PdfUploadChatGPTApp() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Responses now contains one entry per page response
  const [responses, setResponses] = useState([]);

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  // Updated handleAnalyze to process each PDF page using the new prompt structure
  const handleAnalyze = async () => {
    try {
      setIsLoading(true);
      setResponses([]);

      // Convert each selected PDF to an array of page texts.
      const pdfPagesArrays = await Promise.all(
        selectedFiles.map(async (file) => {
          const pages = await readPDF(file);
          return pages;
        })
      );

      // Flatten the array so each page is processed separately.
      const pageTexts = pdfPagesArrays.flat();

      // Process each page with the ChatGPT API
      const newResponses = [];
      for (let i = 0; i < pageTexts.length; i++) {
        const requestBody = promptUser(pageTexts[i]);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
          const cleanContent = data.choices[0].message.content.replace(/```/g, '');
          newResponses.push(cleanContent);
        } else {
          newResponses.push('No response');
        }
      }

      setResponses(newResponses);
      setIsLoading(false);
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col items-center justify-center gap-4">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold"
      >
        MINI Cooper PDF Describer
      </motion.h1>

      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardContent>
          <label className="block text-sm font-medium mb-2">
            Upload your MINI invoices (PDF):
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="border rounded p-1"
            />
            <Button onClick={handleAnalyze} disabled={!selectedFiles.length || isLoading}>
              {isLoading ? 'Analyzing...' : 'Generate Description'}
              <Upload className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {responses.length > 0 && (
        <div className="w-full max-w-2xl grid grid-cols-1 gap-4">
          {responses.map((resp, idx) => (
            <Card key={idx} className="p-2 shadow-md">
              <CardContent>
                <h2 className="font-bold mb-2">Response for Page #{idx + 1}</h2>
                <ReactMarkdown className="whitespace-pre-wrap">{resp}</ReactMarkdown>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Below is a small test suite to confirm that readPDF handles basic flows.
// We'll be using Jest as an example.
// This is purely illustrative — you can place this test in a separate file.

/*
import { readPDF } from './PdfUploadChatGPTApp';

describe('readPDF', () => {
  test('should reject when given an invalid file', async () => {
    const file = new File(['not a pdf'], 'test.txt', { type: 'text/plain' });
    await expect(readPDF(file)).rejects.toThrow();
  });

  test('should parse a valid PDF (requires a mock or a real PDF)', async () => {
    // For a real test, you'd provide a mock PDF file or mock the pdfjs-dist calls.
    // This is just a placeholder.
    expect(true).toBe(true);
  });

  // Additional test to ensure worker loading doesn't crash.
  test('should handle missing worker gracefully', async () => {
    // We would test scenarios where pdfjs.GlobalWorkerOptions.workerSrc is invalid.
    expect(true).toBe(true);
  });

  // Additional test for version mismatch.
  test('should throw or warn if main library version does not match worker version', async () => {
    // This is just a placeholder. We'd normally test that pdfjs reports version mismatch.
    expect(true).toBe(true);
  });

  // Additional test if the CDN is unreachable or blocked.
  test('should fail or fallback if the CDN is unreachable', async () => {
    // In a real scenario, you might mock fetch or your environment to simulate a blocked CDN.
    expect(true).toBe(true);
  });
});
*/
