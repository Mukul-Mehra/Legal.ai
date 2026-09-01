import pdfplumber

pdf_path = r"D:\legal-ai\legal-docs\acts\A1955-25Eng.pdf"
output_path = r"D:\legal-ai\legal-docs\acts\hindu_marriage_act_1955.txt"

with pdfplumber.open(pdf_path) as pdf:
    text = ""
    for page in pdf.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"

with open(output_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Extracted successfully.")