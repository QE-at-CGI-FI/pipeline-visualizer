# Pipeline Visualizer

A web-based tool to visualize and model software deployment pipelines with drag-and-drop step cards.

## Features

- **Drag and Drop**: Easily rearrange pipeline steps by dragging cards
- **Step Types**: Support for different step types (Delivery step, Deploy step, Package)
- **Manual Steps**: Mark steps as manual interventions
- **Lead Time Tracking**: Automatically calculates deployment lead time
- **Fixed Steps**: Start ("A developer commits code") and end ("Deploy to production") steps are fixed
- **Custom Steps**: Add your own custom pipeline steps
- **Import/Export**: Save and load pipelines as JSON

## Development

Built with vanilla HTML, CSS, and JavaScript - no frameworks required!

- `index.html` - Main application structure
- `style.css` - Styling and layout
- `script.js` - Pipeline logic and drag-and-drop functionality
