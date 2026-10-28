"""
Test script for Word file topic extraction and classification

Usage:
1. Create a Word file with case study topics (one per paragraph)
2. Run: python test_docx_topics.py path/to/your/file.docx
"""

import asyncio
from docx import Document


async def test_extraction(file_path: str):
    """Test basic extraction from Word file"""
    print(f"Reading: {file_path}\n")
    
    doc = Document(file_path)
    topics = []
    
    for i, para in enumerate(doc.paragraphs, 1):
        text = para.text.strip()
        if text and len(text) > 20:
            topics.append(text)
            print(f"Topic {i}: {text[:100]}...")
    
    print(f"\n✓ Extracted {len(topics)} topics from Word file")
    return topics


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python test_docx_topics.py <path_to_word_file.docx>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    asyncio.run(test_extraction(file_path))
