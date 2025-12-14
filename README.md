<div align="center">

# 🔗 LinkGist AI

<img 
    src="https://github.com/user-attachments/assets/c10fb07f-53de-4136-b2d7-ece8fb85cdcb" 
    alt="image" 
    width="350" 
/>

</div>


A Chrome extension that provides instant AI-powered summaries of web links. Hover over any link to see a summary, or use the popup interface for detailed analysis and follow-up questions.

## Features

- 🎯 Hover over links for instant AI summaries
- 📝 Popup interface for detailed URL summarization
- 💬 Ask follow-up questions about summarized content
- 🤖 Powered by Hugging Face AI models
- ⚡ Fast and lightweight
- 🔒 Privacy-focused

## Files Structure

```
LinkGist-AI/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Installation

### Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/LinkGist-AI.git
cd LinkGist-AI
```

### Set Up Hugging Face API Key

1. Create a free [Hugging Face account](https://huggingface.co/join)
2. Generate an access token with **Inference Providers** permission
3. Open `background.js` and add your API key:

```javascript
const HF_API_KEY = "hf_XXXXXXXXXXXXXXXX";
```

⚠️ **Important:** Do NOT commit your API key to GitHub

### Load on Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the cloned directory
4. The extension will be loaded and ready to use

## Usage

### Hover Summaries

1. Open any webpage
2. Hover over a link
3. A tooltip appears with an AI-generated summary

### Popup Summarizer

1. Click the LinkGist AI extension icon
2. Paste a URL
3. Click **Summarize**
4. View the generated summary

### Follow-Up Questions

1. After generating a summary
2. Type a question in the **Ask a question** input
3. Get a contextual AI-generated answer

## Models Used

- **facebook/bart-large-cnn** – Text summarization
- **google/flan-t5-base** – Question answering

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Chrome Extension Manifest V3
- Hugging Face Inference API

## Troubleshooting

**Extension won't load**
- Check `manifest.json` for valid JSON syntax
- Ensure Developer mode is enabled
- Reload the extension

**No summary generated**
- Verify API key is correctly added in `background.js`
- Ensure the page is publicly accessible
- Try a shorter or simpler URL
- Check browser console for error messages

**Hover tooltip not showing**
- Refresh the page after installing the extension
- Ensure the extension is enabled in `chrome://extensions/`
- Check that content script permissions are granted


## Contributing

1. Fork the repository
2. Create a feature branch:

```bash
git checkout -b feature/your-feature
```

3. Commit changes:

```bash
git commit -m "Add new feature"
```

4. Push to branch:

```bash
git push origin feature/your-feature
```

5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Hugging Face for providing free AI model inference
- Chrome Extension documentation and community

---

<div align="center">



</div>
