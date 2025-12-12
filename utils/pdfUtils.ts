declare const pdfjsLib: any;

/**
 * Extracts text from a PDF file, attempting to preserve paragraph structure.
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error("PDF.js library not loaded");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    let lastY = -1;
    let pageText = '';

    // Iterate through text items to reconstruct layout
    for (const item of textContent.items) {
      if ('str' in item) {
        const text = item.str;
        const transform = item.transform;
        const y = transform[5]; // The y-coordinate

        // If specific y-coordinate changes significantly, assume new line/paragraph
        if (lastY !== -1 && Math.abs(y - lastY) > 10) {
           pageText += '\n';
           // Double newline for larger gaps (likely paragraphs)
           if (Math.abs(y - lastY) > 20) {
             pageText += '\n';
           }
        }
        
        pageText += text + ' '; // Add space between words
        lastY = y;
      }
    }
    
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
};

/**
 * Splits long text into chunks suitable for alternating narration.
 * Logic: Splits by double newlines (paragraphs), or groups sentences if paragraphs are too long.
 */
export const splitTextForNarration = (text: string): string[] => {
  // First, normalize newlines
  const normalized = text.replace(/\r\n/g, '\n');
  
  // Split by double newlines to find paragraphs
  const paragraphs = normalized.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length < 500) {
      chunks.push(paragraph.trim());
    } else {
      // If paragraph is very long, split by sentences to keep engagement high
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > 300) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += sentence + ' ';
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
    }
  }

  return chunks;
};