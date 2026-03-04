# Pipeline Visualizer

A web-based tool to visualize and model software deployment pipelines with drag-and-drop step cards.

## Features

- **Drag and Drop**: Easily rearrange pipeline steps by dragging cards
- **Step Types**: Support for different step types (Delivery step, Deploy step, Package)
- **Manual Steps**: Mark steps as manual interventions
- **Constraint Validation**: Built-in rules to ensure pipeline integrity
- **Lead Time Tracking**: Automatically calculates deployment lead time
- **Fixed Steps**: Start ("A developer commits code") and end ("Deploy to production") steps are fixed
- **Custom Steps**: Add your own custom pipeline steps
- **Import/Export**: Save and load pipelines as JSON

## Constraints

The application enforces these constraints:

1. "Code is merged to main/trunk" must happen before "Build release candidate"
2. "Build release candidate" must happen before "Deploy to production"
3. "Package" steps must happen before "Deploy step" types
4. "Deploy step" types must happen before "System test"

## Usage

1. Open `index.html` in a web browser
2. Reorder steps by dragging them within the pipeline
3. Click "Validate Constraints" to check if your pipeline is valid
4. Use "+ Add Step" to create custom steps
5. Use "Import Steps" or "Export Steps" to load/save pipelines
6. Remove steps using the "Remove" button on each card

## Development

Built with vanilla HTML, CSS, and JavaScript - no frameworks required!

- `index.html` - Main application structure
- `style.css` - Styling and layout
- `script.js` - Pipeline logic and drag-and-drop functionality
