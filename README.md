<div align="center">

# 🔗 LinkGist AI

<img src="<img width="497" height="739" alt="image" src="https://github.com/user-attachments/assets/d7bf49ca-d800-4b4a-99d5-e60119a1f90c" />
" width="250" />

</div>

A Chrome extension that generates quick, AI-powered summaries of web links and lets you ask follow-up questions — without leaving the page.

---

## Features

- 🔍 **Hover Link Summaries** – Get instant summaries by hovering over links on any webpage  
- 🧠 **AI-Powered Summarization** using Hugging Face models  
- 🪟 **Popup URL Summarizer** – Paste any URL and generate a concise summary  
- 💬 **Follow-up Q&A** based on page content and summary  
- 💾 **Local Storage Caching** for faster repeated access  
- ⚡ Works on any website  
- 🔐 No sign-in required

---

## File Structure

<img width="739" height="337" alt="image" src="https://github.com/user-attachments/assets/700be07c-aa5b-4ccb-b4d3-d95b40086817" />

## Installation
### Clone the repository
```bash
git clone [https://github.com/anushkaChat10/GrooveBox.git](https://github.com/anushkaChat10/LinkGist)
cd LinkGist

```
### Load on Chrome
1. Open Chrome and navigate to chrome://extensions/
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the cloned directory
4. The extension will be loaded and ready to use

## Usage
Hover Summaries

1.Open any webpage
2.Hover over a link
3.A tooltip appears with an AI-generated summary

Popup Summarizer

1.Click the LinkGist AI extension icon

2.Paste a URL

3.Click Summarize

4.View the generated summary

Follow-Up Questions

1.After generating a summary

2.Type a question in the Ask a question input

3.Get a contextual AI-generated answer

Hugging Face API Key Setup

This extension uses the Hugging Face Inference API.

Steps:

1.Create a free Hugging Face account

2.Generate an access token with Inference Providers permission

3.Open background.js

4.Add your API key:

``` javascript
const HF_API_KEY = "hf_XXXXXXXXXXXXXXXX";
```
⚠️ Do NOT commit your API key to GitHub

#Models Used

-facebook/bart-large-cnn – Text summarization

-google/flan-t5-base – Question answering

#Technologies Used

-HTML5

-CSS3

-Vanilla JavaScript

-Chrome Extension Manifest V3

-Hugging Face Inference API

#Troubleshooting

Extension won’t load

-Check manifest.json for valid JSON

-Ensure Developer mode is enabled

-Reload the extension

No summary generated

-Verify API key is correctly added

-Ensure the page is publicly accessible

-Try a shorter or simpler URL

-Hover tooltip not showing

-Refresh the page

-Ensure the extension is enabled

-Check permissions in chrome://extensions/
